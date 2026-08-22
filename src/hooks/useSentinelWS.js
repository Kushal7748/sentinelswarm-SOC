import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL, WS_URL } from '../config/api.js';

export function useSentinelWS() {
  const [events, setEvents] = useState([]);
  const [agentScores, setAgentScores] = useState({});
  const [activeIncident, setActiveIncident] = useState(null);
  const [recentSwaps, setRecentSwaps] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Fetch initial state & history via REST
  const fetchInitialData = useCallback(async () => {
    try {
      const [eventsRes, scoresRes, incidentRes] = await Promise.allSettled([
        fetch(`${API_URL}/events?limit=50`),
        fetch(`${API_URL}/api/demo/health-scores`),
        fetch(`${API_URL}/api/demo/active-incident`),
      ]);

      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        const evs = await eventsRes.value.json();
        setEvents(evs);
      }

      if (scoresRes.status === 'fulfilled' && scoresRes.value.ok) {
        const scores = await scoresRes.value.json();
        setAgentScores(scores);
      }

      if (incidentRes.status === 'fulfilled' && incidentRes.value.ok) {
        const inc = await incidentRes.value.json();
        if (inc && inc.incident_id) {
          setActiveIncident(inc);
        }
      }
    } catch (err) {
      console.warn('Could not fetch initial state:', err);
    }
  }, []);

  const connectWS = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Connected to SentinelSwarm Context Bus WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Append new event
          setEvents((prev) => [data, ...prev.slice(0, 199)]);

          // Handle special event types
          if (data.type === 'agent_score_update' && data.payload?.agent) {
            const agentName = data.payload.agent;
            setAgentScores((prev) => ({
              ...prev,
              [agentName]: data.payload.metrics
            }));
          }

          if (data.type === 'agent_swap' && data.payload?.failed_agent) {
            const failedAgent = data.payload.failed_agent;
            setRecentSwaps((prev) => [failedAgent, ...prev.filter((a) => a !== failedAgent)].slice(0, 5));
            // Trigger visual flash
            setTimeout(() => {
              setRecentSwaps((prev) => prev.filter((a) => a !== failedAgent));
            }, 6000);
          }

          if (data.type === 'analysis' && data.payload) {
            setActiveIncident({
              incident_id: data.incident_id,
              attacker_ip: data.payload.attacker_ip,
              narrative: data.payload.narrative,
              mitre_chain: data.payload.mitre_chain || [],
              outcome: 'ANALYZING',
              status: 'IN_PROGRESS'
            });
          }

          if (data.type === 'decision' && data.payload) {
            setActiveIncident((prev) => ({
              ...(prev || {}),
              incident_id: data.incident_id,
              outcome: data.payload.outcome,
              score: data.payload.score,
              status: data.payload.outcome === 'AUTO_EXECUTE' ? 'RESOLVED' : 'AWAITING_HUMAN'
            }));
          }

          if (data.type === 'action_executed' && data.payload) {
            setActiveIncident((prev) => ({
              ...(prev || {}),
              status: 'RESOLVED',
              action_executed: data.payload
            }));
          }

          if (data.type === 'human_response' && data.payload) {
            const dec = (data.payload.decision || '').toUpperCase();
            let newStatus = 'RESOLVED';
            if (['INVESTIGATE', '3', 'QUARANTINE'].includes(dec) || dec.includes('INVESTIGATE') || dec.includes('QUARANTINE')) {
              newStatus = 'UNDER_INVESTIGATION';
            } else if (['DONT_EXECUTE', 'HOLD', '2', 'DONT_EXECUTE_AUTOMATICALLY'].includes(dec) || dec.includes('HOLD') || dec.includes('DONT')) {
              newStatus = 'HELD_BY_HUMAN';
            } else if (['APPROVE', 'EXECUTE', '1', 'EXECUTE_AUTOMATICALLY', 'CUSTOM_DIRECTIVE'].includes(dec) || dec.includes('EXECUTE') || dec.includes('RESOLV') || dec.includes('DIRECTIVE')) {
              newStatus = 'RESOLVED';
            }
            setActiveIncident((prev) => ({
              ...(prev || {}),
              status: newStatus,
              human_decision: data.payload.decision
            }));
          }

        } catch (e) {
          console.error('Error parsing WebSocket frame:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWS, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error, will retry...', err);
        ws.close();
      };
    } catch (err) {
      console.warn('Failed to establish WebSocket:', err);
      reconnectTimeoutRef.current = setTimeout(connectWS, 2000);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    connectWS();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWS, fetchInitialData]);

  return {
    events,
    agentScores,
    activeIncident,
    recentSwaps,
    isConnected,
    refetchScores: fetchInitialData
  };
}
