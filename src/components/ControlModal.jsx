import React, { useState, useEffect } from 'react';
import { X, Play, Zap, RefreshCw, AlertTriangle, ShieldAlert, ShieldCheck, Flame, Cpu, CheckCircle, Unlock } from 'lucide-react';
import { API_URL } from '../config/api.js';

export default function ControlModal({
  isOpen,
  onClose,
  onRefresh,
  defenseActive = true,
  onToggleDefense,
  onTriggerDemoAttack,
  onTriggerAgentDegradation,
  onResetDemo
}) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [forceEscalate, setForceEscalate] = useState(false);
  const [localDefenseActive, setLocalDefenseActive] = useState(defenseActive);

  useEffect(() => {
    setLocalDefenseActive(defenseActive);
  }, [defenseActive]);

  if (!isOpen) return null;

  const handleToggle = async (newState) => {
    setLoading(true);
    setStatusMsg(`Switching SentinelSwarm defense to ${newState ? 'ACTIVE' : 'DEACTIVATED'}...`);
    try {
      if (onToggleDefense) {
        await onToggleDefense(newState);
      } else {
        const res = await fetch(`${API_URL}/api/demo/toggle-defense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: newState })
        });
        const data = await res.json();
        setLocalDefenseActive(Boolean(data.defense_active));
      }
      setStatusMsg(`Defense mode updated: ${newState ? 'ACTIVE (Armed)' : 'DEACTIVATED (Unprotected)'}`);
      if (onRefresh) onRefresh();
    } catch (e) {
      setLocalDefenseActive(newState);
      setStatusMsg(`Defense mode updated: ${newState ? 'ACTIVE (Armed)' : 'DEACTIVATED (Unprotected)'}`);
    } finally {
      setLoading(false);
    }
  };

  const injectAttack = async (attackType) => {
    setLoading(true);
    const modeLabel = localDefenseActive ? 'WITH SENTINELSWARM ARMED' : 'WITHOUT DEFENSE (UNPROTECTED)';
    setStatusMsg(`Injecting ${attackType.toUpperCase()} incident ${modeLabel}...`);
    try {
      const res = await fetch(`${API_URL}/api/demo/inject-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: attackType, force_escalate: forceEscalate })
      });
      const data = await res.json();
      setStatusMsg(`Success: ${data.message}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (onTriggerDemoAttack) {
        onTriggerDemoAttack(attackType, forceEscalate);
        setStatusMsg(`⚡ Injected simulated ${attackType.toUpperCase()} incident across Swarm Mesh!`);
      } else {
        setStatusMsg(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const degradeAgent = async (agentName) => {
    setLoading(true);
    setStatusMsg(`Degrading ${agentName} health...`);
    try {
      const res = await fetch(`${API_URL}/api/demo/degrade-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName, penalty: 35 })
      });
      const data = await res.json();
      setStatusMsg(`Success: ${agentName} degraded to health ${data.metrics?.health}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (onTriggerAgentDegradation) {
        onTriggerAgentDegradation(agentName, 35);
        setStatusMsg(`⚡ Degraded ${agentName} health by 35% in Swarm Mesh!`);
      } else {
        setStatusMsg(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(240,238,235,0.75)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-4 mb-4"
          style={{ borderBottom: '1px solid var(--col-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl"
              style={{ background: 'var(--col-accent-pale)', color: 'var(--col-accent)' }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--col-text-primary)' }}>
                Demo Controller & Fault Injection
              </h2>
              <p className="text-xs" style={{ color: 'var(--col-text-muted)' }}>
                Inject test scenario telemetry & trigger self-healing agent hot-swaps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{ background: 'var(--col-surface-2)', border: '1px solid var(--col-border)', color: 'var(--col-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Defense Toggle Card */}
        <div
          className="p-4 rounded-xl mb-5 flex items-center justify-between transition-all"
          style={{
            background: localDefenseActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.1)',
            border: localDefenseActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: localDefenseActive ? '#10b981' : '#ef4444',
                color: 'white',
              }}
            >
              {localDefenseActive ? <ShieldCheck className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-black text-slate-800">
                {localDefenseActive ? '🛡️ SENTINELSWARM DEFENSE: ACTIVE' : '⚠️ SENTINELSWARM DEFENSE: DEACTIVATED'}
              </div>
              <div className="text-[11px] text-slate-500">
                {localDefenseActive
                  ? 'Autonomous containment and firewall drops are ARMED.'
                  : 'Bypassed. Attacks will breach Nandi Traders without containment.'}
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            onClick={() => handleToggle(!localDefenseActive)}
            className="px-4 py-2 rounded-lg text-xs font-black text-white transition-all hover:scale-105 active:scale-95 shadow"
            style={{
              background: localDefenseActive ? '#ef4444' : '#10b981',
            }}
          >
            {localDefenseActive ? 'DEACTIVATE (Show Breach)' : 'ACTIVATE (Show Protection)'}
          </button>
        </div>

        {/* Attack Simulator Buttons */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--col-text-primary)' }}>
              1. Attack Scenario Telemetry Injections
            </label>
            <label className="flex items-center gap-2 text-xs text-amber-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={forceEscalate}
                onChange={(e) => setForceEscalate(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Force Human Escalation</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'sqli', name: 'SQL Injection Probing', desc: 'Auth bypass against /login' },
              { id: 'phishing', name: 'Phishing Lure Email', desc: 'Wire transfer spoofed hook' },
              { id: 'brute_force', name: 'SSH Auth Brute-Force', desc: 'Rapid credential access bursts' },
              { id: 'exfil', name: 'Data Exfiltration', desc: 'Customer PII and CC stream' },
              { id: 'full_chain', name: 'Full Attack Chain', desc: 'Recon -> SQLi -> Exfiltration' },
            ].map((atk) => (
              <button
                key={atk.id}
                disabled={loading}
                onClick={() => injectAttack(atk.id)}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-sky-500/50 text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">{atk.name}</span>
                  <Play className="w-3 h-3 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-slate-400">{atk.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Self-Healing Hot-Swap Trigger */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono block mb-3">
            2. Self-Healing Reliability Test (Degrade & Trigger Hot-Swap)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'detector.intrusion', label: 'Degrade Intrusion' },
              { id: 'detector.phishing', label: 'Degrade Phishing' },
              { id: 'analyst', label: 'Degrade Analyst' },
              { id: 'detector.exfil', label: 'Degrade Exfil' },
            ].map((deg) => (
              <button
                key={deg.id}
                disabled={loading}
                onClick={() => degradeAgent(deg.id)}
                className="p-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{deg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Escalation Simulation & Reset */}
        <div className="mb-4 pt-3 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono block mb-2">
            3. Escalation State Machine & Demo Reset
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setStatusMsg("Simulating missed contact attempt...");
                try {
                  const res = await fetch(`${API_URL}/api/escalation/simulate-missed-call`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ incident_id: 'INC-DEMO-CALL' })
                  });
                  const d = await res.json();
                  setStatusMsg(`Escalation Advanced: ${d.status}`);
                  if (onRefresh) onRefresh();
                } catch (e) {
                  setStatusMsg(`Error: ${e.message}`);
                } finally {
                  setLoading(false);
                }
              }}
              className="p-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Missed Call</span>
            </button>

            <button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setStatusMsg("Resetting demo to baseline state...");
                try {
                  const res = await fetch(`${API_URL}/api/demo/reset`, { method: 'POST' });
                  const d = await res.json();
                  setStatusMsg(`Reset Success: ${d.message}`);
                  if (onRefresh) onRefresh();
                } catch (e) {
                  if (onResetDemo) {
                    onResetDemo();
                    setStatusMsg("⚡ Reset Swarm Mesh to clean baseline state!");
                  } else {
                    setStatusMsg(`Error: ${e.message}`);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              className="p-2.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 text-xs font-bold text-sky-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Reset Entire Demo</span>
            </button>
          </div>
        </div>

        {/* Status bar */}
        {statusMsg && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
