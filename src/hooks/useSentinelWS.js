import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL, WS_URL } from '../config/api.js';
import { generateAttackTelemetry } from '../utils/demoSimulation.js';

export const DEFAULT_AGENT_SCORES = {
  'detector.phishing':  { health: 100, latency_ms: 12, drift: 0.01 },
  'detector.intrusion': { health: 100, latency_ms: 18, drift: 0.02 },
  'detector.exfil':     { health: 100, latency_ms: 15, drift: 0.01 },
  'analyst':            { health: 100, latency_ms: 220, drift: 0.03 },
  'remediation':        { health: 100, latency_ms: 45, drift: 0.01 },
  'caution':            { health: 100, latency_ms: 30, drift: 0.01 },
  'decision':           { health: 100, latency_ms: 85, drift: 0.02 },
  'main_agent':         { health: 100, latency_ms: 10, drift: 0.00 }
};

export const INITIAL_DEMO_EVENTS = [
  {
    id: 'ev-init-3',
    type: 'action_executed',
    incident_id: 'INC-DEMO-001',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    payload: {
      action: 'FIREWALL_DROP',
      target: '192.168.43.103',
      result: 'CONTAINED',
      details: 'Perimeter firewall policy automatically pushed and enforced across swarm nodes.'
    }
  },
  {
    id: 'ev-init-2',
    type: 'decision',
    incident_id: 'INC-DEMO-001',
    confidence: 0.98,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    payload: {
      outcome: 'AUTO_EXECUTE',
      score: 0.98,
      reasoning: 'High-confidence attack chain match (Phishing + SQLi + Exfil). Approved by Voting Engine.'
    }
  },
  {
    id: 'ev-init-1',
    type: 'system_ready',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    payload: {
      status: 'OPERATIONAL',
      message: 'SentinelSwarm Autonomous Self-Healing SOC operational. All 8 swarm agents active.'
    }
  }
];

export function useSentinelWS() {
  const [events, setEvents] = useState(INITIAL_DEMO_EVENTS);
  const [agentScores, setAgentScores] = useState(DEFAULT_AGENT_SCORES);
  const [activeIncident, setActiveIncident] = useState(null);
  const [recentSwaps, setRecentSwaps] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('DEMO'); // 'LIVE' | 'DEMO' | 'RECONNECTING'

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Fetch initial state & history via REST if available
  const fetchInitialData = useCallback(async () => {
    try {
      const [eventsRes, scoresRes, incidentRes] = await Promise.allSettled([
        fetch(`${API_URL}/events?limit=50`),
        fetch(`${API_URL}/api/demo/health-scores`),
        fetch(`${API_URL}/api/demo/active-incident`),
      ]);

      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        const evs = await eventsRes.value.json();
        if (Array.isArray(evs) && evs.length > 0) {
          setEvents(evs);
        }
      }

      if (scoresRes.status === 'fulfilled' && scoresRes.value.ok) {
        const scores = await scoresRes.value.json();
        if (scores && Object.keys(scores).length > 0) {
          setAgentScores(scores);
        }
      }

      if (incidentRes.status === 'fulfilled' && incidentRes.value.ok) {
        const inc = await incidentRes.value.json();
        if (inc && inc.incident_id) {
          setActiveIncident(inc);
        }
      }
    } catch (err) {
      console.warn('Could not fetch initial state from API, using demo fallback:', err);
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
        setConnectionStatus('LIVE');
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
        const hasCustomEnv = Boolean(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL);
        setConnectionStatus(hasCustomEnv ? 'RECONNECTING' : 'DEMO');
        reconnectTimeoutRef.current = setTimeout(connectWS, 4000);
      };

      ws.onerror = () => {
        const hasCustomEnv = Boolean(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL);
        setConnectionStatus(hasCustomEnv ? 'RECONNECTING' : 'DEMO');
        ws.close();
      };
    } catch {
      const hasCustomEnv = Boolean(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL);
      setConnectionStatus(hasCustomEnv ? 'RECONNECTING' : 'DEMO');
      reconnectTimeoutRef.current = setTimeout(connectWS, 4000);
    }
  }, []);

  const triggerDemoAttack = useCallback((attackType = 'full_chain', forceEscalate = true) => {
    const { events: newEvents, incident } = generateAttackTelemetry(attackType, forceEscalate);
    setEvents((prev) => [...newEvents.slice().reverse(), ...prev.slice(0, 199)]);
    setActiveIncident(incident);
    return incident;
  }, []);

  const triggerAgentDegradation = useCallback((agentName, penalty = 35) => {
    setAgentScores((prev) => {
      const current = prev[agentName]?.health ?? 100;
      const newHealth = Math.max(0, current - penalty);
      const updated = {
        ...prev,
        [agentName]: {
          ...(prev[agentName] || {}),
          health: newHealth
        }
      };

      if (newHealth < 60) {
        setRecentSwaps((swaps) => [agentName, ...swaps.filter((a) => a !== agentName)].slice(0, 5));
        setTimeout(() => {
          setRecentSwaps((swaps) => swaps.filter((a) => a !== agentName));
        }, 6000);

        setEvents((evs) => [
          {
            id: `ev-swap-${Date.now()}`,
            type: 'agent_swap',
            timestamp: new Date().toISOString(),
            payload: {
              failed_agent: agentName,
              new_agent: `${agentName}_backup_v2`,
              message: `Watchdog detected health degradation below 60%. Hot-swapped ${agentName} to backup unit.`
            }
          },
          ...evs.slice(0, 199)
        ]);
      }

      return updated;
    });
  }, []);

  const triggerHumanAction = useCallback((incidentId, decision, targetIp = '192.168.1.8') => {
    const dec = (decision || '').toUpperCase();
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
      incident_id: incidentId || prev?.incident_id,
      status: newStatus,
      human_decision: decision
    }));

    setEvents((prev) => [
      {
        id: `ev-human-${Date.now()}`,
        type: 'human_response',
        incident_id: incidentId || 'INC-LIVE',
        timestamp: new Date().toISOString(),
        payload: {
          decision,
          target_ip: targetIp,
          status: newStatus,
          message: `Human directive recorded: "${decision}". Incident status updated to ${newStatus}.`
        }
      },
      ...prev.slice(0, 199)
    ]);
  }, []);

  const resetDemoState = useCallback(() => {
    setEvents(INITIAL_DEMO_EVENTS);
    setAgentScores(DEFAULT_AGENT_SCORES);
    setActiveIncident(null);
    setRecentSwaps([]);
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
    connectionStatus,
    triggerDemoAttack,
    triggerAgentDegradation,
    triggerHumanAction,
    resetDemoState,
    refetchScores: fetchInitialData
  };
}
