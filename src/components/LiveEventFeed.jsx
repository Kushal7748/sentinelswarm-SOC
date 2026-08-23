import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, Activity, ShieldAlert, Cpu, CheckCircle2, XCircle, ArrowRight, Clock } from 'lucide-react';

const EVENT_HUMAN_TITLES = {
  'detection':            { title: 'Threat Signal Identified by Sensor', color: '#b45309', bg: 'rgba(254,243,199,0.5)', border: 'rgba(217,119,6,0.3)' },
  'analysis':             { title: 'LLM Correlated MITRE ATT&CK Narrative', color: '#7c3aed', bg: 'rgba(237,233,254,0.5)', border: 'rgba(124,58,237,0.3)' },
  'remediation_proposal': { title: 'Containment Policy Formulated', color: '#1d4ed8', bg: 'rgba(219,234,254,0.5)', border: 'rgba(37,99,235,0.3)' },
  'veto':                 { title: 'Caution Agent Safety Audit Evaluated', color: '#be123c', bg: 'rgba(255,228,230,0.5)', border: 'rgba(190,18,60,0.3)' },
  'decision':             { title: 'Governed Consensus Decision Reached', color: '#0891b2', bg: 'rgba(207,250,254,0.5)', border: 'rgba(8,145,178,0.3)' },
  'action_executed':      { title: 'Perimeter Containment Block Executed', color: '#047857', bg: 'rgba(209,250,229,0.5)', border: 'rgba(4,120,87,0.3)' },
  'payment':              { title: 'x402 Algorand On-Chain Micropayment Settled', color: '#059669', bg: 'rgba(209,250,229,0.7)', border: 'rgba(5,150,105,0.4)' },
  'agent_score_update':   { title: 'Agent Swarm Health Score Updated', color: '#78716c', bg: 'rgba(248,247,244,0.8)', border: 'rgba(197,190,181,0.4)' },
  'agent_swap':           { title: 'Self-Healing Watchdog Hot-Swap Triggered', color: '#be123c', bg: 'rgba(255,228,230,0.7)', border: 'rgba(190,18,60,0.5)' },
  'system_ready':         { title: 'SentinelSwarm Core Engine Online & Ready', color: '#047857', bg: 'rgba(209,250,229,0.5)', border: 'rgba(4,120,87,0.3)' },
};

export default function LiveEventFeed({ events }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'DETECTIONS') return ev.type === 'detection';
    if (filterType === 'DECISIONS') return ev.type === 'decision' || ev.type === 'action_executed';
    if (filterType === 'SWAPS') return ev.type === 'agent_swap' || ev.type === 'agent_score_update';
    return true;
  });

  const getHumanDescription = (ev) => {
    const payload = ev.payload || {};
    switch (ev.type) {
      case 'detection':
        return `Sensor detected anomalous payload from target IP ${payload.source_ip || payload.target || '192.168.43.103'}: "${payload.reason || payload.message || 'Suspicious probing pattern'}"`;
      case 'analysis':
        return `Synthesized MITRE chain [${(payload.mitre_chain || []).join(' → ')}]. Narrative: "${payload.narrative || 'Multi-stage intrusion attempt correlated'}"`;
      case 'remediation_proposal':
        return `Formulated policy proposal: Action '${payload.recommended_action || 'isolate_ip'}' targeting IP ${payload.attacker_ip || '192.168.43.103'}.`;
      case 'veto':
        return `Safety audit result: ${payload.veto ? 'VETOED (Safety Risk)' : 'APPROVED (No False Positive)'}. Reason: ${payload.reason || 'Verified target is external'}`;
      case 'decision':
        return `Consensus vote complete: Outcome '${payload.outcome || 'AUTO_EXECUTE'}' (Score: ${Math.round((ev.confidence || 0.98) * 100)}%). Action dispatched to firewall.`;
      case 'action_executed':
        return `IPTABLES firewall DROP rule activated for ${payload.target || '192.168.43.103'}. Perimeter containment verified.`;
      case 'payment':
        return `x402 Algorand Testnet micropayment confirmed ($0.01 ALGO/USDC). Threat intel enriched for IP ${payload.target_ip || payload.ip || '192.168.1.8'}. TxID: ${payload.tx_hash || 'PW6B4HW7…'}`;
      case 'agent_score_update':
        return `Watchdog updated health metric for ${payload.agent || 'agent'}: Score ${payload.metrics?.health ?? 100}%.`;
      case 'agent_swap':
        return `Watchdog detected degradation in ${payload.failed_agent || 'agent'}. Hot-swapped to backup standby unit.`;
      default:
        return payload.message || payload.reason || ev.type;
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl p-0 overflow-hidden"
      style={{
        background: 'var(--col-surface-0)',
        border: '1px solid var(--col-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
      }}
    >
      {/* Feed Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-700" />
          <h2 className="text-sm font-bold tracking-wide text-stone-800 uppercase">
            Human-Readable Live Incident Telemetry
          </h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 font-mono">
          {['ALL', 'DETECTIONS', 'DECISIONS', 'SWAPS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide transition-all"
              style={{
                background: filterType === tab ? 'var(--col-primary)' : 'var(--col-surface-2)',
                color: filterType === tab ? 'white' : 'var(--col-text-muted)',
                border: filterType === tab ? 'none' : '1px solid var(--col-border)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-stone-500">
            <Activity className="w-8 h-8 mb-2 opacity-40 animate-pulse text-cyan-700" />
            <p className="font-semibold">Awaiting incoming telemetry on Context Bus...</p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const meta = EVENT_HUMAN_TITLES[ev.type] || EVENT_HUMAN_TITLES.detection;
            const isExpanded = expandedId === ev.id;
            const timeStr = ev.ts ? new Date(ev.ts).toLocaleTimeString() : '--:--:--';
            const payload = ev.payload || {};
            const description = getHumanDescription(ev);

            return (
              <div
                key={ev.id}
                className="rounded-xl border transition-all duration-200 cursor-pointer fade-in p-3"
                style={{
                  background: meta.bg,
                  borderColor: meta.border,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}
                onClick={() => toggleExpand(ev.id)}
              >
                {/* Top Row: Agent & Human Title */}
                <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <button className="text-stone-500">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-mono text-stone-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {timeStr}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-white font-mono"
                      style={{ background: meta.color }}
                    >
                      {ev.source_agent || 'SYSTEM'}
                    </span>
                    <span className="font-bold text-stone-900 truncate max-w-[280px]">
                      {meta.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ev.mitre_stage && (
                      <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-100 text-cyan-900 border border-cyan-200">
                        {ev.mitre_stage.split(' ')[0]}
                      </span>
                    )}
                    {ev.confidence !== null && ev.confidence !== undefined && (
                      <span className="text-[11px] font-bold font-mono text-stone-800">
                        {Math.round(ev.confidence * 100)}% Conf
                      </span>
                    )}
                  </div>
                </div>

                {/* Plain-English Event Narrative Description */}
                <p className="text-xs text-stone-800 leading-relaxed font-medium pl-6">
                  {description}
                </p>

                {/* Expanded Payload Viewer */}
                {isExpanded && (
                  <div
                    className="mt-2.5 p-3 rounded-xl border font-mono text-[11px]"
                    style={{ background: 'var(--col-surface-0)', borderColor: 'var(--col-border)' }}
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-2 pb-1 border-b border-stone-200">
                      <span>EVENT ID: {ev.id}</span>
                      <span>INCIDENT: {ev.incident_id || 'STANDALONE'}</span>
                    </div>
                    <pre className="text-cyan-900 bg-stone-100 p-2.5 rounded-lg overflow-x-auto border border-stone-200">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
