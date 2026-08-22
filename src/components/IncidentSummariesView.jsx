import React, { useState, useEffect } from 'react';
import {
  FileText, Folder, Download, ShieldAlert, ArrowRight, Activity,
  CheckCircle, XCircle, UserCheck, AlertOctagon, Search, RefreshCw,
  Terminal, ChevronRight, ChevronDown, ExternalLink, Sparkles
} from 'lucide-react';
import DecisionPipeline from './DecisionPipeline.jsx';
import { API_URL } from '../config/api.js';

export default function IncidentSummariesView({ events = [], onHumanAction }) {
  const [folders, setFolders] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [incidentEvents, setIncidentEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportNotice, setExportNotice] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [actionPending, setActionPending] = useState(false);

  // 1. Fetch all incident folders from disk & Context Bus on mount / events change
  const fetchFolders = () => {
    fetch(`${API_URL}/api/incidents/folders`)
      .then((res) => res.json())
      .then((data) => {
        setFolders(data || []);
        if (data && data.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(data[0].incident_id);
        }
      })
      .catch((err) => console.log('Error loading folders:', err));
  };

  useEffect(() => {
    fetchFolders();
  }, [events]);

  // 2. Fetch selected incident dossier and events
  useEffect(() => {
    if (selectedIncidentId) {
      setLoading(true);
      
      // Fetch dossier
      fetch(`${API_URL}/api/incidents/${selectedIncidentId}/dossier`)
        .then((res) => res.json())
        .then((data) => {
          setDossier(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      // Fetch telemetry events
      fetch(`${API_URL}/events?incident_id=${selectedIncidentId}`)
        .then((res) => res.json())
        .then((data) => setIncidentEvents(data || []))
        .catch(() => {});
    }
  }, [selectedIncidentId, events]);

  // 3. Export to Disk
  const handleExportNow = async () => {
    if (!selectedIncidentId) return;
    try {
      const res = await fetch(`${API_URL}/api/incidents/${selectedIncidentId}/export`, { method: 'POST' });
      const data = await res.json();
      setExportNotice(`Saved to: ${data.dossier?.folder_path || 'incident_records/'}`);
      setTimeout(() => setExportNotice(null), 4000);
      fetchFolders();
    } catch (e) {
      setExportNotice('Export error');
    }
  };

  // 4. Handle human decision button click
  const handleAction = async (action) => {
    if (!selectedIncidentId || !onHumanAction) return;
    setActionPending(true);
    try {
      await onHumanAction(selectedIncidentId, action, dossier?.attacker_ip || '127.0.0.1');
      setTimeout(() => {
        fetch(`${API_URL}/api/incidents/${selectedIncidentId}/dossier`)
          .then((res) => res.json())
          .then((data) => setDossier(data));
      }, 800);
    } finally {
      setActionPending(false);
    }
  };

  // Filter incidents list
  const filteredFolders = folders.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.incident_id?.toLowerCase().includes(q) ||
      f.attack_type?.toLowerCase().includes(q) ||
      f.attacker_ip?.toLowerCase().includes(q) ||
      f.status?.toLowerCase().includes(q)
    );
  });

  const mitreChain = dossier?.mitre_chain?.length
    ? dossier.mitre_chain
    : ['TA0043 Reconnaissance', 'TA0001 Initial Access', 'TA0002 Execution'];

  const remediationEv = incidentEvents.find((e) => e.type === 'remediation_proposal');
  const cautionEv = incidentEvents.find((e) => e.type === 'veto');
  const decisionEv = incidentEvents.find((e) => e.type === 'decision');

  const humanResponseEv = incidentEvents.find((e) => e.type === 'human_response');
  const isAwaitingHumanDossier =
    dossier?.status === 'AWAITING_HUMAN' &&
    !humanResponseEv &&
    !dossier?.decision_outcome?.startsWith('HUMAN_') &&
    dossier?.decision_outcome !== 'RESOLVED' &&
    dossier?.decision_outcome !== 'AUTO_EXECUTE';

  const isHeldDossier =
    dossier?.status === 'HELD_BY_HUMAN' ||
    dossier?.status === 'HELD' ||
    dossier?.decision_outcome === 'HUMAN_WHATSAPP_HOLD' ||
    dossier?.decision_outcome === 'HUMAN_DASHBOARD_HOLD' ||
    humanResponseEv?.payload?.decision === 'DONT_EXECUTE_AUTOMATICALLY';

  const isInvestigatingDossier =
    dossier?.status === 'UNDER_INVESTIGATION' ||
    dossier?.decision_outcome === 'HUMAN_WHATSAPP_QUARANTINE' ||
    dossier?.decision_outcome === 'HUMAN_DASHBOARD_QUARANTINE' ||
    humanResponseEv?.payload?.decision === 'INVESTIGATE';

  return (
    <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
      {/* ── Left Column: Incidents Directory ── */}
      <div
        className="w-80 shrink-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--col-surface-0)', border: '1px solid var(--col-border)' }}
      >
        {/* Directory Header */}
        <div
          className="p-3.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-cyan-600" />
            <h2 className="text-sm font-bold" style={{ color: 'var(--col-text-primary)' }}>
              Incident Dossiers
            </h2>
          </div>
          <button
            onClick={fetchFolders}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-all"
            title="Refresh incident list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 border-b" style={{ borderColor: 'var(--col-border)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search incidents, IPs, types…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border font-mono outline-none"
              style={{
                background: 'var(--col-surface-1)',
                borderColor: 'var(--col-border)',
                color: 'var(--col-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredFolders.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="font-bold">No incident records found</p>
              <p className="text-[11px] mt-1 text-stone-400">
                Trigger an attack from Demo Control to generate telemetry.
              </p>
            </div>
          ) : (
            filteredFolders.map((item) => {
              const isSelected = selectedIncidentId === item.incident_id;
              const isResolved = item.status === 'RESOLVED' || item.status === 'RESOLVED_BY_HUMAN_DIRECTIVE';
              return (
                <div
                  key={item.incident_id}
                  onClick={() => setSelectedIncidentId(item.incident_id)}
                  className="p-3 rounded-xl cursor-pointer transition-all border text-left"
                  style={{
                    background: isSelected ? 'var(--col-primary-pale)' : 'var(--col-surface-1)',
                    borderColor: isSelected ? 'var(--col-primary)' : 'var(--col-border)',
                    boxShadow: isSelected ? '0 2px 8px rgba(14,116,144,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-cyan-800">
                      {item.incident_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      {item.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate text-stone-800 mb-1">
                    {item.attack_type}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                    <span>IP: {item.attacker_ip}</span>
                    <span>{item.events_count} events</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Selected Incident Detailed Dossier ── */}
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0"
        style={{ background: 'var(--col-surface-0)', border: '1px solid var(--col-border)' }}
      >
        {selectedIncidentId && dossier ? (
          <>
            {/* Dossier Header */}
            <div
              className="p-4 flex items-start justify-between shrink-0"
              style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-800 font-mono text-xs font-bold">
                    {dossier.incident_id}
                  </span>
                  <h2 className="text-base font-bold uppercase tracking-wider text-stone-900">
                    {dossier.attack_type} — Executive Incident Summary & Dossier
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5 font-mono text-stone-600">
                  <span>Attacker Origin: <strong className="text-rose-700">{dossier.attacker_ip}</strong></span>
                  <span>•</span>
                  <span>Recorded: <strong>{dossier.recorded_at}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Folder: <code className="text-cyan-800 font-bold">{dossier.folder_path}</code></span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportNow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white transition-all shadow-sm"
                  title="Save all events, JSON dossier, and markdown summary to disk"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save to Disk Folder</span>
                </button>
              </div>
            </div>

            {exportNotice && (
              <div className="bg-emerald-100 text-emerald-800 border-b border-emerald-200 px-4 py-1.5 text-xs font-mono font-semibold flex items-center justify-between">
                <span>✅ {exportNotice}</span>
              </div>
            )}

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Card 1: Executive Summary & Description */}
              <div
                className="rounded-2xl p-4 border"
                style={{ background: 'var(--col-surface-1)', borderColor: 'var(--col-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-800">
                      Executive Summary (Human Handler Briefing)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                    Plain-English Incident Breakdown
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-200 text-stone-800 font-sans text-xs leading-relaxed shadow-sm whitespace-pre-line">
                  {dossier.executive_summary || 'Adversary initiated automated attack patterns against perimeter endpoints. Correlation engines verified exploit progression requiring containment review.'}
                </div>
                {dossier.technical_narrative && (
                  <div className="mt-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                    <strong>Analyst AI Findings:</strong> {dossier.technical_narrative}
                  </div>
                )}
                {dossier.custom_notes && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]">
                    <strong>Operator Notes:</strong> {dossier.custom_notes}
                  </div>
                )}
              </div>

              {/* Card 2: MITRE ATT&CK Chain */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2 font-mono text-stone-600">
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

              {/* Card 3: Decision Pipeline Flow */}
              <DecisionPipeline
                remediationData={remediationEv?.payload}
                cautionData={cautionEv}
                decisionData={decisionEv?.payload || { outcome: dossier.decision_outcome }}
              />

              {/* Card 4: Human Governance Controls & Decision Status */}
              {isAwaitingHumanDossier ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-900 font-mono">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <span>Handler Action Required (Also available via WhatsApp)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      disabled={actionPending}
                      onClick={() => handleAction('EXECUTE')}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>1. Execute (Isolate IP)</span>
                    </button>
                    <button
                      disabled={actionPending}
                      onClick={() => handleAction('DONT_EXECUTE')}
                      className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>2. Hold (Do Not Block)</span>
                    </button>
                    <button
                      disabled={actionPending}
                      onClick={() => handleAction('INVESTIGATE')}
                      className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>3. Quarantine & Forensics</span>
                    </button>
                  </div>
                </div>
              ) : isHeldDossier ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-amber-900 mb-0.5">
                      <XCircle className="w-4 h-4 text-amber-600" />
                      <span>Human Review Completed: Option 2 Selected (Hold & Monitor)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-sans">
                      Automatic firewall execution halted by human operator. Perimeter remains in active observation mode without blocking IP <strong>{dossier.attacker_ip}</strong>.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold font-mono shrink-0 ml-3">
                    HELD BY HUMAN
                  </span>
                </div>
              ) : isInvestigatingDossier ? (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-900 mb-0.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Human Review Completed: Option 3 Activated (Quarantine & Forensics)</span>
                    </div>
                    <p className="text-[11px] text-purple-800 font-sans">
                      Attacker sessions for IP <strong>{dossier.attacker_ip}</strong> quarantined for deep packet inspection and forensic memory capture.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-purple-200 text-purple-900 text-xs font-bold font-mono shrink-0 ml-3">
                    UNDER INVESTIGATION
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-emerald-900 mb-0.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Human Review Completed: Containment Executed</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-sans">
                      Perimeter firewall DROP rule applied for attacker IP <strong>{dossier.attacker_ip}</strong>. Incident <strong>{dossier.incident_id}</strong> is fully contained.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-200 text-emerald-900 text-xs font-bold font-mono shrink-0 ml-3">
                    CONTAINED ({dossier.status || 'RESOLVED'})
                  </span>
                </div>
              )}

              {/* Card 5: Full Events Telemetry Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider font-mono text-stone-600">
                    Chronological Sensor & Agent Events ({incidentEvents.length} Events)
                  </label>
                  <span className="text-[10px] font-mono text-stone-500">
                    Saved in <code>{dossier.folder_path}\events.json</code>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {incidentEvents.map((ev) => {
                    const isExp = expandedEventId === ev.id;
                    return (
                      <div key={ev.id} className="rounded-xl bg-stone-900 border border-stone-800 overflow-hidden shadow-sm">
                        <div
                          onClick={() => setExpandedEventId(isExp ? null : ev.id)}
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <FileText className="w-12 h-12 mb-3 text-stone-300" />
            <h3 className="text-sm font-bold text-stone-700">Select an Incident to View Full Dossier</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm">
              All incident events and human-readable executive descriptions are permanently recorded to disk under <code>incident_records/</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
