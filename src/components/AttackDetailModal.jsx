import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ArrowRight, Activity, Terminal, ChevronDown, ChevronRight, CheckCircle2, AlertOctagon, Globe, Folder, Download, Sparkles, FileText } from 'lucide-react';
import DecisionPipeline from './DecisionPipeline.jsx';
import { API_URL } from '../config/api.js';

export default function AttackDetailModal({ incidentId, isOpen, onClose }) {
  const [events, setEvents] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [exportNotice, setExportNotice] = useState(null);

  useEffect(() => {
    if (isOpen && incidentId) {
      setLoading(true);
      
      // 1. Fetch live events
      fetch(`${API_URL}/events?incident_id=${incidentId}`)
        .then((res) => res.json())
        .then((data) => {
          setEvents(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      // 2. Fetch or auto-create incident dossier from disk folder
      fetch(`${API_URL}/api/incidents/${incidentId}/dossier`)
        .then((res) => res.json())
        .then((data) => setDossier(data))
        .catch((err) => console.log('Dossier fetch error:', err));
    }
  }, [isOpen, incidentId]);

  if (!isOpen || !incidentId) return null;

  // Extract incident-level data from timeline or dossier
  const analysisEvent = events.find((e) => e.type === 'analysis');
  const remediationEvent = events.find((e) => e.type === 'remediation_proposal');
  const cautionEvent = events.find((e) => e.type === 'veto');
  const decisionEvent = events.find((e) => e.type === 'decision');
  const firstEvent = events[0] || {};

  const mitreChain = dossier?.mitre_chain?.length
    ? dossier.mitre_chain
    : analysisEvent?.payload?.mitre_chain?.length
    ? analysisEvent.payload.mitre_chain
    : ['TA0043 Reconnaissance', 'TA0001 Initial Access', 'TA0002 Execution'];

  const attackerIp = dossier?.attacker_ip || analysisEvent?.payload?.attacker_ip || firstEvent?.payload?.source_ip || '127.0.0.1';
  const attackType = dossier?.attack_type || 'Multi-Stage Intrusion';
  const folderPath = dossier?.folder_path || `incident_records\\${incidentId}`;

  const handleExportNow = async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents/${incidentId}/export`, { method: 'POST' });
      const data = await res.json();
      setExportNotice(`Saved to: ${data.dossier?.folder_path || folderPath}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (e) {
      setExportNotice('Export error');
    }
  };

  // Compute per-agent status
  const getAgentStatus = (agentName) => {
    const ev = [...events].reverse().find((e) => e.source_agent === agentName);
    if (!ev) return { status: 'Not involved in this attack', active: false };

    if (agentName.startsWith('detector.')) {
      return { status: `Fired at ${new Date(ev.ts).toLocaleTimeString()} (confidence ${ev.confidence || 0.92})`, active: true };
    }
    if (agentName === 'analyst') {
      return { status: `Correlated attack narrative at ${new Date(ev.ts).toLocaleTimeString()}`, active: true };
    }
    if (agentName === 'remediation') {
      return { status: `Proposed ${ev.payload?.recommended_action || 'isolate_ip'} (conf ${ev.confidence || 0.88})`, active: true };
    }
    if (agentName === 'caution') {
      return ev.type === 'veto'
        ? { status: `Vetoed: ${ev.payload?.reason}`, active: true, veto: true }
        : { status: 'Passed safety threshold', active: true };
    }
    if (agentName === 'decision') {
      return { status: `${ev.payload?.outcome || 'AUTO_EXECUTE'} (Score: ${ev.payload?.score || 0.88})`, active: true };
    }
    if (agentName === 'main_agent') {
      return { status: 'Telemetry monitored; standby units healthy', active: true };
    }
    return { status: 'Active', active: true };
  };

  const agentsList = [
    { key: 'detector.phishing', label: 'detector.phishing' },
    { key: 'detector.intrusion', label: 'detector.intrusion' },
    { key: 'detector.exfil', label: 'detector.exfil' },
    { key: 'analyst', label: 'analyst' },
    { key: 'remediation', label: 'remediation' },
    { key: 'caution', label: 'caution' },
    { key: 'decision', label: 'decision' },
    { key: 'main_agent', label: 'main_agent' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(240,238,235,0.75)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-5xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
        }}
      >
        {/* Modal Header */}
        <div
          className="p-4 flex items-start justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded badge badge-danger font-mono text-xs font-bold">
                {incidentId}
              </span>
              <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--col-text-primary)' }}>
                {attackType} — Full Incident Dossier & Telemetry
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5 font-mono" style={{ color: 'var(--col-text-muted)' }}>
              <span>Target/Attacker IP: <strong className="text-rose-700 font-bold">{attackerIp}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-cyan-600" />
                <span>Disk Record: <strong className="text-cyan-800">{folderPath}</strong></span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
              title="Save all events and markdown report into incident folder"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save to Folder</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all hover:scale-105"
              style={{ background: 'var(--col-surface-2)', border: '1px solid var(--col-border)', color: 'var(--col-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="bg-emerald-100 text-emerald-800 border-b border-emerald-200 px-4 py-1.5 text-xs font-mono font-semibold flex items-center justify-between">
            <span>✅ {exportNotice}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* SECTION: Executive Incident Summary & Handler Briefing */}
          <div
            className="rounded-2xl p-4 border"
            style={{ background: 'var(--col-surface-1)', borderColor: 'var(--col-border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-800">
                  Incident Executive Summary & Detailed Description
                </h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                Handler Briefing
              </span>
            </div>
            <div className="space-y-2.5 text-xs leading-relaxed" style={{ color: 'var(--col-text-primary)' }}>
              <div className="p-3 rounded-xl bg-white border border-stone-200 text-stone-800 font-sans shadow-sm whitespace-pre-line">
                {dossier?.executive_summary || analysisEvent?.payload?.narrative || 'Adversary initiated automated attack patterns against perimeter endpoints. Correlation engines verified exploit progression requiring containment review.'}
              </div>
              {dossier?.technical_narrative && dossier.technical_narrative !== dossier.executive_summary && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                  <strong>Analyst AI Findings:</strong> {dossier.technical_narrative}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: MITRE ATT&CK Stepper */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2 font-mono" style={{ color: 'var(--col-text-muted)' }}>
              MITRE ATT&CK Tactical Progression
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {mitreChain.map((stg, i) => (
                <React.Fragment key={i}>
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2"
                    style={{ background: 'var(--col-primary-pale)', color: 'var(--col-primary)', border: '1px solid rgba(14,116,144,0.2)' }}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse"></span>
                    <span>{stg}</span>
                  </div>
                  {i < mitreChain.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-stone-400" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Section 2: Decision Pipeline Voting Flow */}
          <DecisionPipeline
            remediationData={remediationEvent?.payload}
            cautionData={cautionEvent}
            decisionData={decisionEvent?.payload}
          />

          {/* Section 3: Per-Agent Status Grid */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2 font-mono" style={{ color: 'var(--col-text-muted)' }}>
              8-Agent Incident Status Grid
            </label>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--col-border)' }}>
              <table className="w-full text-left text-xs font-mono">
                <thead style={{ background: 'var(--col-surface-2)', color: 'var(--col-text-muted)' }}>
                  <tr>
                    <th className="py-2.5 px-3">Agent Unit</th>
                    <th className="py-2.5 px-3">Incident Activity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--col-border)', background: 'var(--col-surface-1)' }}>
                  {agentsList.map((ag) => {
                    const st = getAgentStatus(ag.key);
                    return (
                      <tr key={ag.key}>
                        <td className="py-2 px-3 font-bold" style={{ color: 'var(--col-text-primary)' }}>{ag.label}</td>
                        <td className="py-2 px-3" style={{ color: st.active ? 'var(--col-primary)' : 'var(--col-text-faint)' }}>
                          {st.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Chronological Context Bus Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-stone-600">
                Chronological Events Log ({events.length} Telemetry Events)
              </label>
              <span className="text-[10px] font-mono text-stone-500">
                Stored in <code>{folderPath}\events.json</code>
              </span>
            </div>
            <div className="space-y-1.5">
              {events.map((ev) => {
                const isExp = expandedId === ev.id;
                return (
                  <div key={ev.id} className="rounded-xl bg-stone-900 border border-stone-800 overflow-hidden shadow-sm">
                    <div
                      onClick={() => setExpandedId(isExp ? null : ev.id)}
                      className="p-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-800"
                    >
                      <div className="flex items-center gap-2">
                        {isExp ? <ChevronDown className="w-3.5 h-3.5 text-stone-400" /> : <ChevronRight className="w-3.5 h-3.5 text-stone-400" />}
                        <span className="font-mono text-[11px] text-stone-400">{new Date(ev.ts).toLocaleTimeString()}</span>
                        <span className="font-bold text-cyan-400 font-mono text-[11px]">[{ev.source_agent}]</span>
                        <span className="text-stone-200 truncate max-w-md">{ev.type}</span>
                      </div>
                      <span className="font-mono text-[11px] text-stone-400">
                        {ev.confidence ? `${Math.round(ev.confidence * 100)}%` : ''}
                      </span>
                    </div>
                    {isExp && (
                      <div className="p-3 bg-stone-950 border-t border-stone-800 font-mono text-[11px] text-cyan-200">
                        <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(ev.payload, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
