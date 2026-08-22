import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';

export default function NotificationBell({ events, onSelectIncident }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [pulse, setPulse] = useState(false);

  // Group events by incident_id
  const incidentsMap = {};
  events.forEach((ev) => {
    if (ev.incident_id) {
      if (!incidentsMap[ev.incident_id]) {
        incidentsMap[ev.incident_id] = {
          id: ev.incident_id,
          ts: ev.ts,
          type: ev.payload?.title || ev.type,
          ip: ev.payload?.source_ip || ev.payload?.attacker_ip || '192.168.1.8',
          risk: ev.risk || 'high',
          count: 1
        };
      } else {
        incidentsMap[ev.incident_id].count += 1;
      }
    }
  });

  const incidentList = Object.values(incidentsMap);

  // Trigger toast on new detection
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (latest.type === 'detection' && latest.incident_id) {
        setPulse(true);
        setToast({
          title: latest.payload?.title || 'Security Anomaly Detected',
          ip: latest.payload?.source_ip || '192.168.1.8',
          incident_id: latest.incident_id
        });

        const timer = setTimeout(() => {
          setPulse(false);
          setToast(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [events]);

  return (
    <div className="relative">
      {/* Toast notification popup */}
      {toast && (
        <div
          onClick={() => {
            onSelectIncident(toast.incident_id);
            setToast(null);
          }}
          className="fixed top-20 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 border border-rose-500 shadow-2xl shadow-rose-500/25 flex items-center gap-3 cursor-pointer animate-bounce max-w-sm"
        >
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>⚠️ Critical Anomaly</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-mono">
                {toast.incident_id}
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 truncate">{toast.title}</p>
            <span className="text-[10px] text-slate-400 font-mono">Origin: {toast.ip}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all ${
          pulse
            ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-500/30'
            : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-sky-500/50'
        }`}
        title="Incident Notifications"
      >
        <Bell className="w-4 h-4" />
        {incidentList.length > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[9px] font-extrabold shadow-sm">
            {incidentList.length}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-sky-500/30 shadow-2xl z-50 p-3 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Incidents ({incidentList.length})
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-xs">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {incidentList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No attack incidents recorded yet.</p>
            ) : (
              incidentList.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    onSelectIncident(inc.id);
                    setIsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-rose-400">{inc.id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(inc.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-200 truncate font-medium">{inc.type}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                    <span>IP: {inc.ip}</span>
                    <span className="text-sky-400 flex items-center gap-0.5">
                      Details <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
