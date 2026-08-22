import React, { useState } from 'react';
import { Database, ArrowRight, ArrowLeft, Filter, Layers, Brain, Search, Clock, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';

const AGENT_LABELS = {
  'detector.phishing':  'Phishing Detector Sensor',
  'detector.intrusion': 'Intrusion Log Sensor',
  'detector.exfil':     'Exfil PII Sensor',
  'analyst':            'Analyst Agent (LLM)',
  'remediation':        'Remediation Agent',
  'caution':            'Caution Agent (Veto)',
  'decision':           'Decision Voting Agent',
  'main_agent':         'Main Agent (Watchman)',
  'comms':              'Comms & Escalation Agent',
  'human_reviewer':     'Human SOC Reviewer'
};

const AGENT_CONSUMERS = {
  'detection':            { consumer: 'Analyst Agent', reason: 'Queried by Analyst to correlate MITRE ATT&CK chain' },
  'analysis':             { consumer: 'Remediation & Caution', reason: 'Read by Remediation & Caution to evaluate policy & safety' },
  'remediation_proposal': { consumer: 'Caution & Decision', reason: 'Read by Caution to audit safety veto & Decision to cast votes' },
  'veto':                 { consumer: 'Decision Agent', reason: 'Read by Decision Agent during consensus voting' },
  'decision':             { consumer: 'Main Agent & Comms', reason: 'Read by Main Agent to dispatch action & Comms for WhatsApp report' },
  'action_executed':      { consumer: 'All Agents', reason: 'Stored as permanent containment audit record in Context Bus' },
  'agent_score_update':   { consumer: 'Main Agent Watchdog', reason: 'Read by Watchdog to monitor agent health & trigger hot-swaps' },
  'agent_swap':           { consumer: 'System Bus', reason: 'Logged to record agent failover event' },
  'system_ready':         { consumer: 'All Agents', reason: 'Context Bus initial readiness broadcast' }
};

export default function ContextBusTable({ events }) {
  const [selectedIncidentId, setSelectedIncidentId] = useState('ALL');
  const [viewMode, setViewMode] = useState('NARRATIVE'); // 'NARRATIVE' or 'TABLE'
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique incident IDs for historical attack grouping
  const incidentIds = Array.from(
    new Set(events.map(e => e.incident_id).filter(Boolean))
  );

  // Filter events based on selected incident & search term
  const filteredEvents = events.filter(e => {
    const matchesIncident = selectedIncidentId === 'ALL' || e.incident_id === selectedIncidentId;
    const jsonStr = typeof e.payload_json === 'string' ? e.payload_json : JSON.stringify(e.payload || {});
    const matchesSearch = !searchTerm.trim() || 
      (e.source_agent && e.source_agent.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.type && e.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      jsonStr.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesIncident && matchesSearch;
  });

  // Function to build human-readable narrative explanation
  const getHumanNarrative = (ev) => {
    const payload = ev.payload || {};
    const agentName = AGENT_LABELS[ev.source_agent] || ev.source_agent || 'Unknown Agent';

    switch (ev.type) {
      case 'detection':
        return `${agentName} identified threat signals and deposited sensor indicators into Context Bus memory. (Confidence: ${Math.round((ev.confidence || 0.9) * 100)}%)`;
      case 'analysis':
        return `${agentName} retrieved sensor indicators from Context Bus and synthesized multi-stage incident narrative: "${payload.narrative || 'Correlated attack sequence'}".`;
      case 'remediation_proposal':
        return `${agentName} evaluated incident narrative from Context Bus and formulated policy proposal: ${payload.recommended_action || 'isolate_ip'} targeting ${payload.attacker_ip || '192.168.43.103'}.`;
      case 'veto':
        return `${agentName} audited remediation proposal from Context Bus against safety rules. Audit result: ${payload.veto ? 'VETOED (Safety Risk)' : 'APPROVED (No False Positive)'}.`;
      case 'decision':
        return `${agentName} collected proposal & veto status from Context Bus, conducted consensus voting, and issued final outcome: ${payload.outcome || 'AUTO_EXECUTE'}.`;
      case 'action_executed':
        return `${agentName} executed containment action (${payload.action || 'isolate_ip'} on ${payload.target || '192.168.43.103'}) and recorded permanent audit trail in Context Bus.`;
      case 'agent_score_update':
        return `${agentName} logged updated agent health metrics (${payload.agent}: health ${payload.metrics?.health ?? 100}%) to Context Bus for self-healing monitoring.`;
      case 'agent_swap':
        return `${agentName} logged hot-swap failover event for ${payload.failed_agent || 'degraded_agent'} to maintain zero downtime.`;
      default:
        return `${agentName} posted ${ev.type} event to shared Context Bus memory.`;
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: 'var(--col-surface-0)',
        border: '1px solid var(--col-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
      }}
    >
      {/* Header & Controls */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between p-4 shrink-0 gap-3"
        style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--col-primary-pale)', border: '1px solid rgba(14,116,144,0.2)' }}
          >
            <Database className="w-5 h-5 text-cyan-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: 'var(--col-text-primary)' }}>
                Context Bus — Human-Readable Knowledge Exchange
              </h2>
              <span className="badge badge-primary text-[10px] uppercase font-mono">
                {filteredEvents.length} Events Logged
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--col-text-muted)' }}>
              Shared agent memory bus — observe how agents deposit telemetry & read knowledge from other agents
            </p>
          </div>
        </div>

        {/* Incident History Selector & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Incident Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-300 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Recorded Attacks ({events.length})</option>
              {incidentIds.map(incId => (
                <option key={incId} value={incId}>
                  Incident {incId}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-300 text-xs font-mono">
            <Search className="w-3.5 h-3.5 text-stone-500" />
            <input
              type="text"
              placeholder="Search agent / event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-stone-800 focus:outline-none w-28"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-stone-200/80 border border-stone-300 text-xs font-bold">
            <button
              onClick={() => setViewMode('NARRATIVE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'NARRATIVE'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Readable Exchange
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Structured Audit
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-stone-500">
            <Database className="w-10 h-10 mb-2 opacity-40 text-cyan-700 animate-pulse" />
            <p className="font-semibold">Context Bus is clean / awaiting attack telemetry.</p>
            <p className="text-[11px] text-stone-400 mt-1">When an attack strikes, multi-agent knowledge deposits will appear here.</p>
          </div>
        ) : viewMode === 'NARRATIVE' ? (
          /* Human-Readable Multi-Agent Knowledge Exchange Cards */
          filteredEvents.map((ev) => {
            const timeStr = ev.ts ? new Date(ev.ts).toLocaleTimeString() : '--:--:--';
            const consumerInfo = AGENT_CONSUMERS[ev.type] || { consumer: 'Swarm Memory', reason: 'Recorded on Context Bus' };
            const payload = ev.payload || {};
            const narrativeText = getHumanNarrative(ev);

            return (
              <div
                key={ev.id}
                className="p-4 rounded-2xl border transition-all fade-in"
                style={{
                  background: 'var(--col-surface-1)',
                  borderColor: 'var(--col-border)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}
              >
                {/* Header Row: Depositor Agent -> Context Bus -> Consumer Agent */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200/80 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {/* Depositor Agent */}
                    <span className="badge badge-primary px-2.5 py-1 text-[11px]">
                      DEPOSITOR: {AGENT_LABELS[ev.source_agent] || ev.source_agent}
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />

                    {/* Context Bus Tag */}
                    <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]">
                      CONTEXT BUS DB
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />

                    {/* Consumer Agent */}
                    <span className="badge badge-accent px-2.5 py-1 text-[11px]">
                      CONSUMER: {consumerInfo.consumer}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{timeStr}</span>
                    {ev.incident_id && (
                      <span className="badge badge-danger text-[10px] font-mono">
                        {ev.incident_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Plain-English Knowledge Exchange Description */}
                <p className="text-xs text-stone-800 font-medium leading-relaxed my-2">
                  {narrativeText}
                </p>

                {/* Technical Payload Highlights & Reason */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60 text-[11px] font-mono text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-600">PURPOSE:</span>
                    <span>{consumerInfo.reason}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.mitre_stage && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                        {ev.mitre_stage}
                      </span>
                    )}
                    {ev.confidence !== null && ev.confidence !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Confidence: {Math.round(ev.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Structured Audit Table */
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--col-border)' }}>
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-stone-200 border-b text-stone-700" style={{ borderColor: 'var(--col-border)' }}>
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Depositor Agent</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Consumer Agent</th>
                  <th className="py-2.5 px-3">Human Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y text-stone-800 bg-stone-50" style={{ borderColor: 'var(--col-border)' }}>
                {filteredEvents.map((ev) => {
                  const consumerInfo = AGENT_CONSUMERS[ev.type] || { consumer: 'Swarm Memory' };
                  const timeStr = ev.ts ? new Date(ev.ts).toLocaleTimeString() : '--:--:--';
                  return (
                    <tr key={ev.id} className="hover:bg-stone-100">
                      <td className="py-2 px-3 text-stone-500">{timeStr}</td>
                      <td className="py-2 px-3 font-bold text-rose-700">{ev.incident_id || 'SYSTEM'}</td>
                      <td className="py-2 px-3 font-bold text-cyan-800">{ev.source_agent}</td>
                      <td className="py-2 px-3 text-amber-700 font-semibold">{ev.type}</td>
                      <td className="py-2 px-3 text-purple-700">{consumerInfo.consumer}</td>
                      <td className="py-2 px-3 text-stone-700 truncate max-w-[320px]" title={getHumanNarrative(ev)}>
                        {getHumanNarrative(ev)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
