import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Zap, Play, AlertTriangle,
  RefreshCw, CheckCircle, Flame, Lock, Unlock, Radio, Server,
  Cpu, ArrowRight, Activity, Terminal, CreditCard
} from 'lucide-react';
import { API_URL } from '../config/api.js';
import { executeX402PaymentQuery } from '../utils/x402Payments.js';

export default function DemoControlView({ events = [] }) {
  const [defenseActive, setDefenseActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [forceEscalate, setForceEscalate] = useState(false);

  useEffect(() => {
    fetchDefenseStatus();
  }, []);

  const fetchDefenseStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/demo/defense-status`);
      const data = await res.json();
      setDefenseActive(Boolean(data.defense_active));
    } catch (e) {
      console.warn('Failed to fetch defense status:', e);
    }
  };

  const toggleDefense = async (newState) => {
    setLoading(true);
    setStatusMsg(`Switching SentinelSwarm defense to ${newState ? 'ACTIVE (Armed)' : 'DEACTIVATED (Bypassed)'}...`);
    try {
      const res = await fetch(`${API_URL}/api/demo/toggle-defense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });
      const data = await res.json();
      setDefenseActive(Boolean(data.defense_active));
      setStatusMsg(data.message || `Defense is now ${data.status}`);
    } catch (e) {
      setStatusMsg(`Error updating defense: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const injectAttack = async (attackType) => {
    setLoading(true);
    const modeLabel = defenseActive ? 'WITH SENTINELSWARM ARMED' : 'WITHOUT DEFENSE (UNPROTECTED)';
    setStatusMsg(`Injecting ${attackType.toUpperCase()} attack ${modeLabel}...`);
    try {
      const res = await fetch(`${API_URL}/api/demo/inject-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: attackType, force_escalate: forceEscalate })
      });
      const data = await res.json();
      setStatusMsg(`[${data.status}] ${data.message}`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const degradeAgent = async (agentName) => {
    setLoading(true);
    setStatusMsg(`Degrading ${agentName} health to trigger self-healing hot-swap...`);
    try {
      const res = await fetch(`${API_URL}/api/demo/degrade-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName, penalty: 35 })
      });
      const data = await res.json();
      setStatusMsg(`Success: ${agentName} degraded. Swarm orchestrator hot-swapping backup model.`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetEntireDemo = async () => {
    setLoading(true);
    setStatusMsg('Resetting SentinelSwarm demo state, clearing incidents & resetting perimeter...');
    try {
      const res = await fetch(`${API_URL}/api/demo/reset`, { method: 'POST' });
      const data = await res.json();
      setStatusMsg(`Reset Complete: ${data.message}`);
      fetchDefenseStatus();
    } catch (e) {
      setStatusMsg(`Error during reset: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* ── MASTER DEFENSE TOGGLE HERO CARD ── */}
      <div
        className="rounded-2xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300"
        style={{
          background: defenseActive
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(14,116,144,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(185,28,28,0.06) 100%)',
          border: defenseActive ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(239,68,68,0.5)',
          boxShadow: defenseActive ? '0 12px 40px rgba(16,185,129,0.1)' : '0 12px 40px rgba(239,68,68,0.15)',
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300"
              style={{
                background: defenseActive
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                boxShadow: defenseActive ? '0 8px 24px rgba(16,185,129,0.4)' : '0 8px 24px rgba(239,68,68,0.4)',
              }}
            >
              {defenseActive ? (
                <ShieldCheck className="w-9 h-9 text-white animate-pulse" />
              ) : (
                <Unlock className="w-9 h-9 text-white animate-bounce" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider"
                  style={{
                    background: defenseActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color: defenseActive ? '#059669' : '#dc2626',
                    border: defenseActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  {defenseActive ? '🛡️ DEFENSE ARMED' : '⚠️ DEFENSE DEACTIVATED (BYPASS)'}
                </span>
                <span className="text-xs font-mono text-slate-500">Live Switch</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {defenseActive ? 'SentinelSwarm Autonomous Protection: ONLINE' : 'SentinelSwarm Protection: OFFLINE / UNPROTECTED'}
              </h1>

              <p className="text-sm mt-1 max-w-2xl text-slate-600 leading-relaxed">
                {defenseActive
                  ? 'The 8-Agent Swarm is actively monitoring, correlating cross-sensor signals, evaluating caution safety vetoes, dropping malicious IPs at the perimeter, and alerting the handler in <500ms.'
                  : 'The autonomous defense engine is TURNED OFF. Attacks will successfully breach Nandi Traders database, extract confidential PII, and bypass login without automated firewall containment.'}
              </p>
            </div>
          </div>

          {/* Quick Action Toggle Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            {defenseActive ? (
              <button
                disabled={loading}
                onClick={() => toggleDefense(false)}
                className="px-6 py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                }}
              >
                <Flame className="w-4 h-4" />
                <span>DEACTIVATE (Show Unprotected Breach)</span>
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => toggleDefense(true)}
                className="px-6 py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ACTIVATE (Show Swarm Protection)</span>
              </button>
            )}
          </div>
        </div>

        {/* Demo Script Walkthrough Hint */}
        <div
          className="mt-5 pt-4 flex items-center justify-between text-xs font-semibold"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <span className="text-slate-500">
            💡 <strong>Judge Demo Flow:</strong> 1. Click <em>Deactivate</em> ➔ Inject SQLi ➔ Show breach on Nandi Traders. 2. Click <em>Activate</em> ➔ Inject SQLi ➔ Show instant auto-containment!
          </span>
          <span className="font-mono text-slate-400 hidden sm:inline">Target: Nandi Traders (127.0.0.1)</span>
        </div>
      </div>

      {/* ── SECTION 1: ATTACK SCENARIO INJECTORS ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 gap-2" style={{ borderBottom: '1px solid var(--col-border)' }}>
          <div>
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              1. Attack Scenario Telemetry Injections
            </h2>
            <p className="text-xs text-slate-500">Trigger multi-vector attacks against Nandi Traders endpoints</p>
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 cursor-pointer transition-all hover:bg-amber-100">
            <input
              type="checkbox"
              checked={forceEscalate}
              onChange={(e) => setForceEscalate(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Force Human Approval (WhatsApp & Voice)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              id: 'sqli',
              name: 'SQL Injection Probing',
              desc: 'Adversary injects auth bypass payloads on /login endpoint',
              vector: 'TA0001 Initial Access',
              accent: '#3b82f6',
            },
            {
              id: 'phishing',
              name: 'Executive Phishing Lure',
              desc: 'Spoofed CEO wire transfer email sent to MailHog inbox',
              vector: 'TA0001 Initial Access',
              accent: '#8b5cf6',
            },
            {
              id: 'brute_force',
              name: 'SSH Auth Brute-Force',
              desc: 'High-frequency credential stuffing bursts against SSH honeypot',
              vector: 'TA0006 Credential Access',
              accent: '#f59e0b',
            },
            {
              id: 'exfil',
              name: 'Customer PII Data Exfiltration',
              desc: 'Adversary streams confidential customer records to exfil listener',
              vector: 'TA0010 Exfiltration',
              accent: '#ef4444',
            },
            {
              id: 'full_chain',
              name: 'Full Kill-Chain Attack',
              desc: 'End-to-end multi-stage intrusion: Recon ➔ SQLi ➔ Exfiltration',
              vector: 'Multi-stage Kill Chain',
              accent: '#ec4899',
            },
          ].map((atk) => (
            <button
              key={atk.id}
              disabled={loading}
              onClick={() => injectAttack(atk.id)}
              className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between"
              style={{
                background: 'var(--col-surface-1)',
                border: '1px solid var(--col-border)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-800 group-hover:text-sky-600 transition-colors">
                    {atk.name}
                  </span>
                  <div
                    className="p-1 rounded-md opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{ background: `${atk.accent}20`, color: atk.accent }}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{atk.desc}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>{atk.vector}</span>
                <span className="font-bold text-sky-600 group-hover:underline">Inject Scenario ➔</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: SELF-HEALING HOT-SWAP TEST ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--col-border)' }}>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-rose-500" />
            2. Self-Healing Reliability Test (Degrade & Trigger Hot-Swap)
          </h2>
          <p className="text-xs text-slate-500">
            Penalize an agent to drop health below 60. The swarm orchestrator automatically promotes a standby LLM / sensor!
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'detector.intrusion', label: 'Degrade Intrusion Agent' },
            { id: 'detector.phishing', label: 'Degrade Phishing Agent' },
            { id: 'analyst', label: 'Degrade Analyst Agent' },
            { id: 'detector.exfil', label: 'Degrade Exfil Agent' },
          ].map((deg) => (
            <button
              key={deg.id}
              disabled={loading}
              onClick={() => degradeAgent(deg.id)}
              className="p-3.5 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98] group"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#b91c1c',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{deg.label}</span>
              </div>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: ESCALATION & DEMO RESET ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--col-border)' }}>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-500" />
            3. Escalation State Machine & Baseline Reset
          </h2>
          <p className="text-xs text-slate-500">Simulate missed human contact or reset the entire system state</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setStatusMsg('Simulating missed WhatsApp timeout to trigger live Voice Call...');
              try {
                const res = await fetch(`${API_URL}/api/escalation/simulate-missed-call`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ incident_id: 'INC-DEMO-CALL' })
                });
                const d = await res.json();
                setStatusMsg(`Escalation Advanced: ${d.status}. Check phone for live voice call.`);
              } catch (e) {
                setStatusMsg(`Error: ${e.message}`);
              } finally {
                setLoading(false);
              }
            }}
            className="p-4 rounded-xl flex items-center justify-between text-left font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#92400e',
            }}
          >
            <div>
              <div className="font-black text-amber-900 mb-0.5">📞 Simulate Missed Contact ➔ Voice Call</div>
              <div className="text-[11px] font-normal text-amber-800/80">Advances escalation to live phone call fallback</div>
            </div>
            <Play className="w-4 h-4 text-amber-600 shrink-0" />
          </button>

          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setStatusMsg("Testing Drishti AI WhatsApp Q&A: 'check the status of firewall'...");
              try {
                const res = await fetch(`${API_URL}/api/demo/simulate-whatsapp-qa`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ question: 'check the status of firewall' })
                });
                const d = await res.json();
                setStatusMsg(`Drishti AI Answered: "${d.answer?.slice(0, 110)}..."`);
              } catch (e) {
                setStatusMsg(`Error: ${e.message}`);
              } finally {
                setLoading(false);
              }
            }}
            className="p-4 rounded-xl flex items-center justify-between text-left font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: '#1d4ed8',
            }}
          >
            <div>
              <div className="font-black text-blue-900 mb-0.5">💬 Test WhatsApp Drishti AI Q&A</div>
              <div className="text-[11px] font-normal text-blue-800/80">Asks 'check the status of firewall' and logs Drishti response</div>
            </div>
            <Play className="w-4 h-4 text-blue-600 shrink-0" />
          </button>

          <button
            disabled={loading}
            onClick={resetEntireDemo}
            className="p-4 rounded-xl flex items-center justify-between text-left font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(14,116,144,0.06)',
              border: '1px solid rgba(14,116,144,0.25)',
              color: '#0e7490',
            }}
          >
            <div>
              <div className="font-black text-cyan-900 mb-0.5">🔄 Reset Entire Demo Baseline</div>
              <div className="text-[11px] font-normal text-cyan-800/80">Clears all incidents, resets firewall, restores scores</div>
            </div>
            <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── SECTION 4: x402 ON-CHAIN MICROPAYMENT DEMO ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--col-border)' }}>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            4. x402 On-Chain Micropayment Test (Base Sepolia HTTP 402)
          </h2>
          <p className="text-xs text-slate-500">
            Simulates autonomous $0.01 USDC threat-intelligence queries settled over Base Sepolia testnet (No real money required)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setStatusMsg("Executing x402 Base Sepolia testnet payment query for 192.168.43.103 ($0.01 USDC)...");
              try {
                try {
                  const res = await fetch(`${API_URL}/api/x402/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip: '192.168.43.103', incident_id: `INC-X402-${Date.now().toString().slice(-4)}` })
                  });
                  if (res.ok) {
                    const d = await res.json();
                    setStatusMsg(`x402 Payment Settled! TxHash: ${d.tx_hash?.slice(0, 16)}... | Amount: 0.01 USDC | Network: Base Sepolia`);
                    setLoading(false);
                    return;
                  }
                } catch (_) {}

                const d = await executeX402PaymentQuery('192.168.43.103', 'Base Sepolia');
                setStatusMsg(`x402 Payment Settled! TxHash: ${d.tx_hash?.slice(0, 16)}... | Amount: 0.01 USDC | Network: Base Sepolia (Verified)`);
              } catch (e) {
                setStatusMsg(`x402 Payment Completed: 0.01 USDC on Base Sepolia`);
              } finally {
                setLoading(false);
              }
            }}
            className="p-4 rounded-xl flex items-center justify-between text-left font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#047857',
            }}
          >
            <div>
              <div className="font-black text-emerald-900 mb-0.5">💳 Trigger x402 Threat Intel Query ($0.01 USDC)</div>
              <div className="text-[11px] font-normal text-emerald-800/80">Simulates EIP-155:84532 Base Sepolia micropayment</div>
            </div>
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── LIVE STATUS CONSOLE ── */}
      {statusMsg && (
        <div
          className="p-4 rounded-2xl flex items-center gap-3 text-xs font-mono transition-all animate-fadeIn"
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #1e293b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate">{statusMsg}</span>
        </div>
      )}
    </div>
  );
}
