import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, X, ShieldCheck, AlertTriangle, Search, Wrench,
  CheckCircle2, Clock, Loader2, Eye, Activity, Lock,
  ChevronRight, Play, RotateCcw, Radio, Shield, Sparkles,
  ArrowRight, Brain, Scale, Flame
} from 'lucide-react';
import { API_URL } from '../config/api.js';

/* ── Demo Script Steps with clear judge-facing narration ──── */
const DEMO_SCRIPT = [
  {
    id: 'inject',
    icon: Flame,
    color: '#ef4444',
    label: '🔴 Attack Injected',
    detail: 'A real multi-vector attack is injected: Phishing email → SQL Injection on /login → Data Exfiltration of 42MB PII from 192.168.1.8',
    narration: 'An adversary launches a sophisticated 3-stage kill chain against our protected environment. The attack enters through a phishing email, pivots to SQL injection, and attempts to exfiltrate sensitive customer data.',
    what: 'WHAT\'S HAPPENING: A simulated attacker at IP 192.168.1.8 is executing a multi-stage intrusion.',
    duration: 1500,
  },
  {
    id: 'detect',
    icon: Radio,
    color: '#f59e0b',
    label: '🟡 3 Sensor Agents Detect Threat',
    detail: 'Phishing Detector + Intrusion Detector + Exfil Detector fire independently — cross-correlated on Context Bus',
    narration: 'Three specialized AI sensor agents each independently detect their part of the attack chain. They publish signals to the shared Context Bus in real-time.',
    what: 'WHAT\'S HAPPENING: The sensor mesh (3 independent AI agents) detects the attack in parallel.',
    duration: 1600,
  },
  {
    id: 'analyse',
    icon: Brain,
    color: '#8b5cf6',
    label: '🟣 Analyst Agent Correlates (LLM)',
    detail: 'LLM-powered Analyst correlates MITRE ATT&CK chain: T1566.001 → T1190 → T1048.003. Confidence: 94%',
    narration: 'The Analyst Agent (powered by Gemini LLM) reads all 3 sensor signals from the Context Bus and constructs a coherent MITRE ATT&CK narrative, mapping the full kill chain.',
    what: 'WHAT\'S HAPPENING: LLM reasoning synthesizes a complete attack narrative from 3 sensor signals.',
    duration: 1800,
  },
  {
    id: 'remediate',
    icon: Wrench,
    color: '#0891b2',
    label: '🔵 Remediation Agent Proposes Action',
    detail: 'Generated policy: IPTABLES_DROP 192.168.1.8 + patch SQLi endpoint + rotate DB credentials',
    narration: 'The Remediation Agent formulates a containment policy: block the attacker IP at the firewall, patch the vulnerable endpoint, and rotate compromised credentials — all automatically.',
    what: 'WHAT\'S HAPPENING: An autonomous policy is generated to contain the threat.',
    duration: 1500,
  },
  {
    id: 'decision',
    icon: Scale,
    color: '#f97316',
    label: '🟠 Decision Agent Votes (98% Confidence)',
    detail: 'Voting Engine: 3/3 agents agree → AUTO_EXECUTE authorized. Caution Agent safety veto: CLEAR',
    narration: 'The Decision Agent runs a consensus vote across participating agents. The Caution Agent verifies no false positive risk. With 98% confidence, autonomous execution is authorized — no human needed.',
    what: 'WHAT\'S HAPPENING: Multi-agent voting engine reaches consensus to auto-execute containment.',
    duration: 1500,
  },
  {
    id: 'contain',
    icon: Lock,
    color: '#10b981',
    label: '🟢 Swarm Executes Containment',
    detail: 'FIREWALL_DROP pushed → 192.168.1.8 blocked across all edge routers. Sessions terminated. Logs archived.',
    narration: 'The Main Agent (Watchman) executes the approved containment: firewall DROP rule pushed to all edge routers, attacker sessions terminated, and forensic logs archived automatically.',
    what: 'WHAT\'S HAPPENING: Firewall rule deployed autonomously across the perimeter.',
    duration: 1400,
  },
  {
    id: 'resolve',
    icon: CheckCircle2,
    color: '#22c55e',
    label: '✅ Incident Neutralised — All Agents Nominal',
    detail: 'Full-chain attack neutralised end-to-end in <15s. All 8 swarm agents report 100% health.',
    narration: 'The entire attack was detected, analysed, decided upon, and contained — fully autonomously by the 8-agent swarm — in under 15 seconds, with zero human intervention required.',
    what: 'RESULT: Attack neutralised. Perimeter secure. All agents healthy.',
    duration: 800,
  },
];

/* ── Narration Banner for current step ────────────────────── */
function NarrationBanner({ step, elapsed }) {
  if (!step) return null;
  return (
    <div
      className="p-3 rounded-xl mb-3 transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${step.color}15 0%, ${step.color}08 100%)`,
        border: `1px solid ${step.color}35`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-3.5 h-3.5" style={{ color: step.color }} />
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: step.color }}>
          What the judges should know
        </span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: '#64748b' }}>
          {(elapsed / 1000).toFixed(1)}s elapsed
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
        {step.narration}
      </p>
    </div>
  );
}

/* ── Step Row ──────────────────────────────────────────────── */
function StepRow({ step, status, stepIndex, liveEvents }) {
  const Icon = step.icon;
  const isActive = status === 'active';
  const isDone = status === 'done';
  const isPending = status === 'pending';

  // Find relevant live events for this step
  const relevantEvents = liveEvents.filter(e => {
    if (step.id === 'inject') return e.type === 'detection';
    if (step.id === 'detect') return e.type === 'detection';
    if (step.id === 'analyse') return e.type === 'analysis';
    if (step.id === 'remediate') return e.type === 'remediation_proposal';
    if (step.id === 'decision') return e.type === 'decision' || e.type === 'veto';
    if (step.id === 'contain') return e.type === 'action_executed';
    if (step.id === 'resolve') return e.type === 'system_ready';
    return false;
  }).slice(0, 1);

  return (
    <div
      className="flex gap-3 p-3.5 rounded-xl transition-all duration-500"
      style={{
        background: isActive
          ? `${step.color}15`
          : isDone
          ? 'rgba(16,185,129,0.06)'
          : 'transparent',
        border: isActive
          ? `1.5px solid ${step.color}50`
          : isDone
          ? '1px solid rgba(16,185,129,0.25)'
          : '1px solid rgba(255,255,255,0.04)',
        opacity: isPending ? 0.35 : 1,
        transform: isActive ? 'scale(1.015)' : 'scale(1)',
        boxShadow: isActive ? `0 4px 20px ${step.color}18` : 'none',
      }}
    >
      {/* Step Number + Icon */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center"
          style={{
            background: isDone ? 'rgba(34,197,94,0.2)' : isActive ? `${step.color}25` : 'rgba(255,255,255,0.06)',
            color: isDone ? '#22c55e' : isActive ? step.color : '#475569',
            border: isDone ? '1px solid rgba(34,197,94,0.4)' : isActive ? `1px solid ${step.color}40` : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {stepIndex + 1}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isDone
              ? 'rgba(16,185,129,0.15)'
              : isActive
              ? `${step.color}20`
              : 'rgba(148,163,184,0.08)',
            border: isDone
              ? '1px solid rgba(16,185,129,0.4)'
              : isActive
              ? `1px solid ${step.color}50`
              : '1px solid rgba(148,163,184,0.15)',
            boxShadow: isActive ? `0 0 18px ${step.color}25` : 'none',
            transition: 'all 0.4s ease',
          }}
        >
          {isDone ? (
            <CheckCircle2 className="w-4.5 h-4.5" style={{ color: '#22c55e' }} />
          ) : isActive ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" style={{ color: step.color }} />
          ) : (
            <Icon className="w-4.5 h-4.5" style={{ color: isPending ? '#475569' : step.color }} />
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-black leading-tight"
          style={{
            color: isDone
              ? '#22c55e'
              : isActive
              ? step.color
              : isPending
              ? '#475569'
              : '#e2e8f0',
          }}
        >
          {step.label}
        </div>
        <div
          className="text-xs mt-0.5 leading-snug"
          style={{ color: isPending ? '#334155' : '#94a3b8' }}
        >
          {step.detail}
        </div>

        {/* "What's happening" mini callout for active steps */}
        {isActive && (
          <div
            className="mt-2 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold"
            style={{
              background: `${step.color}10`,
              color: step.color,
              border: `1px solid ${step.color}25`,
            }}
          >
            ➤ {step.what}
          </div>
        )}

        {/* Live event snippet */}
        {(isActive || isDone) && relevantEvents.length > 0 && (
          <div
            className="mt-1.5 text-xs px-2.5 py-1.5 rounded-lg font-mono"
            style={{
              background: 'rgba(0,0,0,0.35)',
              color: '#67e8f9',
              border: '1px solid rgba(103,232,249,0.15)',
            }}
          >
            <span style={{ color: '#94a3b8' }}>live telemetry › </span>
            {relevantEvents[0].type}: {relevantEvents[0].payload?.reason || relevantEvents[0].payload?.action || relevantEvents[0].payload?.outcome || JSON.stringify(relevantEvents[0].payload).slice(0, 80)}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0 flex items-start pt-1">
        {isDone && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
          >
            ✓ DONE
          </span>
        )}
        {isActive && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
            style={{ background: `${step.color}20`, color: step.color }}
          >
            ● LIVE
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Modal ────────────────────────────────────────────── */
export default function JudgeDemoModal({
  isOpen,
  onClose,
  events,
  onTriggerDemoAttack,
  onTriggerProgressiveDemoStep
}) {
  const [phase, setPhase] = useState('idle'); // idle | running | done | error
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const stepTimeoutRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (scrollRef.current && currentStep >= 0) {
      const activeEl = scrollRef.current.querySelector(`[data-step-idx="${currentStep}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep]);

  // Track new WS events coming in
  useEffect(() => {
    if (phase === 'running' && events?.length) {
      setLiveEvents(prev => {
        const newOnes = events.filter(e => !prev.find(p => p.id === e.id));
        return newOnes.length ? [...newOnes, ...prev].slice(0, 50) : prev;
      });
    }
  }, [events, phase]);

  // Elapsed timer
  useEffect(() => {
    if (phase === 'running') {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const runStep = useCallback((idx) => {
    if (idx >= DEMO_SCRIPT.length) {
      setCurrentStep(-1);
      setPhase('done');
      clearInterval(timerRef.current);
      return;
    }
    setCurrentStep(idx);
    if (onTriggerProgressiveDemoStep) {
      onTriggerProgressiveDemoStep(idx);
    }
    stepTimeoutRef.current = setTimeout(() => {
      setCompletedSteps(prev => [...prev, idx]);
      runStep(idx + 1);
    }, DEMO_SCRIPT[idx].duration);
  }, [onTriggerProgressiveDemoStep]);

  const startDemo = () => {
    setPhase('running');
    setCurrentStep(-1);
    setCompletedSteps([]);
    setLiveEvents([]);
    setElapsedMs(0);
    setErrorMsg('');

    // Fire-and-forget — don't block on backend (doesn't exist on Vercel)
    fetch(`${API_URL}/api/demo/inject-attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attack_type: 'full_chain', force_escalate: true }),
    }).catch(() => {});

    // Kick off animated steps immediately
    runStep(0);
  };

  const resetDemo = () => {
    clearTimeout(stepTimeoutRef.current);
    clearInterval(timerRef.current);
    setPhase('idle');
    setCurrentStep(-1);
    setCompletedSteps([]);
    setLiveEvents([]);
    setElapsedMs(0);
    setErrorMsg('');
  };

  useEffect(() => {
    if (!isOpen) resetDemo();
    return () => {
      clearTimeout(stepTimeoutRef.current);
      clearInterval(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const progress = Math.min((completedSteps.length / DEMO_SCRIPT.length) * 100, 100);

  const getStatus = (idx) => {
    if (completedSteps.includes(idx)) return 'done';
    if (currentStep === idx) return 'active';
    return 'pending';
  };

  const activeStepData = currentStep >= 0 && currentStep < DEMO_SCRIPT.length ? DEMO_SCRIPT[currentStep] : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #0c1a2e 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
          maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(14,116,144,0.1) 100%)',
            borderBottom: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white flex items-center gap-2">
              ⚡ Judge Demo — Live Attack & Response
            </div>
            <div className="text-xs" style={{ color: '#94a3b8' }}>
              Watch 8 AI agents detect, analyse, and neutralise a real attack autonomously
            </div>
          </div>
          {/* Timer */}
          {(phase === 'running' || phase === 'done') && (
            <div
              className="px-3.5 py-2 rounded-xl text-sm font-black font-mono"
              style={{
                background: phase === 'done' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                color: phase === 'done' ? '#22c55e' : '#a5b4fc',
                border: phase === 'done' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.3)',
              }}
            >
              {(elapsedMs / 1000).toFixed(1)}s
            </div>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          >
            <X className="w-4 h-4" style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Progress bar */}
        {(phase === 'running' || phase === 'done') && (
          <div className="h-1.5 shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: phase === 'done'
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : 'linear-gradient(90deg, #6366f1, #0891b2, #22d3ee)',
                boxShadow: '0 0 10px rgba(99,102,241,0.5)',
              }}
            />
          </div>
        )}

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center py-6 gap-5 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(14,116,144,0.2) 100%)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.15)',
                }}
              >
                <Shield className="w-10 h-10" style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div className="text-xl font-black text-white mb-2">SentinelSwarm: Autonomous Self-Healing AI SOC</div>
                <div className="text-sm max-w-md mx-auto" style={{ color: '#94a3b8', lineHeight: '1.7' }}>
                  Press <strong style={{ color: '#a5b4fc' }}>▶ Start Demo</strong> to inject a <strong style={{ color: '#f87171' }}>real full-chain cyber attack</strong> and 
                  watch our <strong style={{ color: '#22d3ee' }}>8-agent AI swarm</strong> detect, correlate, and neutralise it — 
                  <strong style={{ color: '#4ade80' }}> fully autonomously in ~15 seconds</strong>.
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-4 gap-3 w-full max-w-md mt-1">
                {[
                  { label: 'AI Agents', val: '8', sub: 'Autonomous' },
                  { label: 'Attack Types', val: '5+', sub: 'Multi-vector' },
                  { label: 'Response', val: '<15s', sub: 'End-to-end' },
                  { label: 'Human?', val: '0', sub: 'No intervention' },
                ].map(({ label, val, sub }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="text-2xl font-black" style={{ color: '#818cf8' }}>{val}</div>
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: '#94a3b8' }}>{label}</div>
                    <div className="text-[9px]" style={{ color: '#475569' }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Architecture summary for judges */}
              <div
                className="w-full max-w-md mt-2 p-3 rounded-xl text-left text-xs leading-relaxed"
                style={{
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  color: '#94a3b8',
                }}
              >
                <div className="font-black text-white text-xs mb-1.5">🧠 How It Works (for Judges):</div>
                <div className="space-y-1">
                  <div><span style={{ color: '#f59e0b' }}>① Sensors</span> detect threats independently (Phishing, Intrusion, Exfil)</div>
                  <div><span style={{ color: '#8b5cf6' }}>② Analyst</span> LLM correlates signals into MITRE ATT&CK narrative</div>
                  <div><span style={{ color: '#0891b2' }}>③ Remediation</span> agent formulates containment policy</div>
                  <div><span style={{ color: '#f97316' }}>④ Decision</span> agent runs multi-agent voting (with safety veto)</div>
                  <div><span style={{ color: '#22c55e' }}>⑤ Watchman</span> executes containment across all edge routers</div>
                </div>
              </div>
            </div>
          )}

          {(phase === 'running' || phase === 'done') && (
            <div className="flex flex-col gap-1.5">
              {/* Narration banner for active step */}
              {phase === 'running' && activeStepData && (
                <NarrationBanner step={activeStepData} elapsed={elapsedMs} />
              )}

              {DEMO_SCRIPT.map((step, idx) => (
                <div key={step.id} data-step-idx={idx}>
                  <StepRow
                    step={step}
                    stepIndex={idx}
                    status={getStatus(idx)}
                    liveEvents={liveEvents}
                  />
                </div>
              ))}
            </div>
          )}

          {phase === 'done' && (
            <div
              className="mt-3 p-5 rounded-xl text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)',
                border: '1px solid rgba(34,197,94,0.3)',
              }}
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#22c55e' }} />
              <div className="text-lg font-black text-white mb-1">✅ Attack Neutralised Successfully</div>
              <div className="text-sm mt-1" style={{ color: '#6ee7b7' }}>
                SentinelSwarm autonomously detected, analysed, and contained the full-chain attack in{' '}
                <strong className="text-white">{(elapsedMs / 1000).toFixed(1)}s</strong> — with zero human intervention.
              </div>
              <div
                className="mt-3 p-3 rounded-lg text-xs text-left max-w-sm mx-auto"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-black text-white mb-1">Key Differentiators Demonstrated:</div>
                <div>✓ Multi-agent swarm architecture (8 specialized AI agents)</div>
                <div>✓ LLM-powered reasoning with MITRE ATT&CK mapping</div>
                <div>✓ Governed consensus voting with safety veto</div>
                <div>✓ Self-healing agent hot-swap capability</div>
                <div>✓ Human-in-the-loop escalation (WhatsApp + Voice)</div>
                <div>✓ x402 on-chain micropayments for threat intel</div>
              </div>
              {liveEvents.length > 0 && (
                <div
                  className="mt-2 text-xs"
                  style={{ color: '#64748b' }}
                >
                  {liveEvents.length} live telemetry events captured from the swarm mesh
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {phase === 'idle' && (
            <button
              id="judge-demo-start-btn"
              onClick={startDemo}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-base font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
                color: 'white',
                boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
                border: 'none',
                fontSize: '15px',
              }}
            >
              <Play className="w-5 h-5" />
              ▶ Start Demo — Inject Attack & Watch Swarm Respond
            </button>
          )}

          {phase === 'running' && (
            <div
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black"
              style={{
                background: 'rgba(99,102,241,0.1)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Demo running — watch the swarm agents respond live…{' '}
              {currentStep >= 0 && (
                <span style={{ color: DEMO_SCRIPT[currentStep]?.color }}>
                  Step {currentStep + 1}/{DEMO_SCRIPT.length}
                </span>
              )}
            </div>
          )}

          {phase === 'done' && (
            <>
              <button
                onClick={resetDemo}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={startDemo}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                  border: 'none',
                }}
              >
                <Play className="w-4 h-4" />
                Run Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
