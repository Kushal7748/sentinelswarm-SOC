import React, { useState } from 'react';
import { AlertOctagon, CheckCircle, XCircle, ArrowRight, Shield, ShieldCheck, UserCheck, Sparkles, ExternalLink } from 'lucide-react';
import DecisionPipeline from './DecisionPipeline.jsx';

export default function ActiveIncident({ incident, onHumanAction, onOpenDetail }) {
  const [actionPending, setActionPending] = useState(false);

  if (!incident || !incident.incident_id) {
    return (
      <div className="flex flex-col h-full glass-panel rounded-2xl p-5 items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Perimeter Secure</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          No critical active multi-stage incident currently under investigation. SentinelSwarm is continuously monitoring.
        </p>
      </div>
    );
  }

  const isResolved = incident.status === 'RESOLVED' || incident.status === 'ACTION_EXECUTED' || incident.status === 'RESOLVED_BY_HUMAN_DIRECTIVE' || (incident.status && incident.status.startsWith('RESOLVED')) || incident.outcome === 'AUTO_EXECUTE' || (incident.outcome && incident.outcome.includes('EXECUTE')) || (incident.outcome && incident.outcome.includes('DIRECTIVE'));
  const isHeld = incident.status === 'HELD_BY_HUMAN' || incident.status === 'HELD' || (incident.outcome && incident.outcome.includes('HOLD'));
  const isInvestigating = incident.status === 'UNDER_INVESTIGATION' || (incident.outcome && incident.outcome.includes('QUARANTINE')) || (incident.outcome && incident.outcome.includes('INVESTIGATE'));

  const isAwaitingHuman = !isResolved && !isHeld && !isInvestigating && (incident.status === 'AWAITING_HUMAN' || incident.outcome === 'ESCALATE_TO_HUMAN');

  const handleAction = async (action) => {
    setActionPending(true);
    try {
      await onHumanAction(incident.incident_id, action, incident.attacker_ip);
    } finally {
      setActionPending(false);
    }
  };

  const mitreChain = incident.mitre_chain?.length ? incident.mitre_chain : ['TA0043 Reconnaissance', 'TA0001 Initial Access'];

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl p-4 overflow-y-auto">
      {/* Incident Header */}
      <div className="flex items-start justify-between pb-3 mb-2 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold font-mono">
              {incident.incident_id}
            </span>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Active Incident</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Attacker Origin: <strong className="text-rose-400 font-mono">{incident.attacker_ip || '192.168.1.8'}</strong>
          </p>
        </div>

        {/* Status Badge & Full Modal Trigger */}
        <div className="flex items-center gap-2">
          {isResolved ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
              <CheckCircle className="w-3.5 h-3.5" /> CONTAINED
            </span>
          ) : isAwaitingHuman ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold animate-pulse">
              <UserCheck className="w-3.5 h-3.5" /> AWAITING HUMAN
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold">
              <Shield className="w-3.5 h-3.5" /> ANALYZING
            </span>
          )}

          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(incident.incident_id)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 transition-colors"
              title="View Full Attack Telemetry"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MITRE ATT&CK Chain Stepper */}
      <div className="mb-3">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
          MITRE ATT&CK Chain
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {mitreChain.map((stage, idx) => (
            <React.Fragment key={idx}>
              <div className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-semibold flex items-center gap-1 shadow-sm">
                <span className="w-1 h-1 rounded-full bg-sky-400"></span>
                <span>{stage}</span>
              </div>
              {idx < mitreChain.length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Decision Pipeline 3-Box Flow */}
      <DecisionPipeline
        remediationData={incident.remediation}
        cautionData={incident.caution}
        decisionData={{ outcome: incident.outcome, score: incident.score }}
      />

      {/* Analyst LLM Narrative */}
      <div className="mb-3 flex-1">
        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400 uppercase font-mono">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Analyst AI Narrative</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
          {incident.narrative || 'Analyst agent is synthesizing telemetry and correlating indicators into multi-stage attack narrative...'}
        </div>
      </div>

      {/* Governance & Containment Actions */}
      <div className="pt-2 border-t border-slate-800 shrink-0">
        {isAwaitingHuman ? (
          <div className="space-y-2">
            <div className="text-xs text-amber-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                <span>Human Decision Required</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">WhatsApp / Dashboard</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={actionPending}
                onClick={() => handleAction('EXECUTE')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                title="Execute containment automatically (isolate attacker IP)"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Execute Automatically</span>
              </button>
              <button
                disabled={actionPending}
                onClick={() => handleAction('DONT_EXECUTE')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                title="Do NOT execute automatically - maintain monitoring only"
              >
                <XCircle className="w-4 h-4" />
                <span>Don't Execute (Hold)</span>
              </button>
            </div>
            <button
              disabled={actionPending}
              onClick={() => handleAction('INVESTIGATE')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700 disabled:opacity-50"
              title="Quarantine sessions & request deep forensic dump"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Option 3: Quarantine & Deep Forensics</span>
            </button>
          </div>
        ) : incident.status === 'HELD_BY_HUMAN' ? (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
            <span>Decision: <strong>Don't Execute</strong> (Active Observation Mode)</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold">HELD</span>
          </div>
        ) : incident.status === 'UNDER_INVESTIGATION' ? (
          <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300 flex items-center justify-between">
            <span>Decision: <strong>Quarantine & Deep Forensics</strong></span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[10px] font-bold">INSPECTING</span>
          </div>
        ) : isResolved ? (
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
            <span>Defense Executed: IP <strong>{incident.attacker_ip}</strong> Isolated</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
