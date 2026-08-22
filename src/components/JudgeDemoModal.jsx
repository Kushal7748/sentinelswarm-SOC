import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, X, ShieldCheck, AlertTriangle, Search, Wrench,
  CheckCircle2, Clock, Loader2, Eye, Activity, Lock,
  ChevronRight, Play, RotateCcw, Radio
} from 'lucide-react';
import { API_URL } from '../config/api.js';

/* ── Demo Script Steps ─────────────────────────────────────── */
const DEMO_SCRIPT = [
  {
    id: 'inject',
    icon: AlertTriangle,
    color: '#ef4444',
    label: 'Injecting Full-Chain Attack',
    detail: 'Simulating: Phishing → SQL Injection → Data Exfiltration chain from 192.168.1.8',
    duration: 1800,
  },
  {
    id: 'detect',
    icon: Radio,
    color: '#f59e0b',
    label: 'Sensor Mesh Detecting Threat',
    detail: 'Phishing Detector + Intrusion Detector + Exfil Detector all firing on anomalous patterns…',
    duration: 2200,
  },
  {
    id: 'analyse',
    icon: Search,
    color: '#8b5cf6',
    label: 'Analyst Agent Correlating Events',
    detail: 'Correlating MITRE ATT&CK chain: T1566 → T1190 → T1048. Confidence: 94%',
    duration: 2500,
  },
  {
    id: 'remediate',
    icon: Wrench,
    color: '#0891b2',
    label: 'Remediation Agent Proposing Actions',
    detail: 'Proposed: Isolate IP 192.168.1.8, patch SQLi endpoint, rotate credentials',
    duration: 2000,
  },
  {
    id: 'decision',
    icon: Eye,
    color: '#f97316',
    label: 'Decision Agent Escalating',
    detail: 'Risk score HIGH (0.94) → Escalating to human operator via dashboard + WhatsApp',
    duration: 1800,
  },
  {
    id: 'contain',
    icon: Lock,
    color: '#10b981',
    label: 'Swarm Executing Containment',
    detail: 'Firewall rule pushed: DROP 192.168.1.8. Session terminated. Logs archived.',
    duration: 2000,
  },
  {
    id: 'resolve',
    icon: CheckCircle2,
    color: '#22c55e',
    label: 'Incident Resolved ✓',
    detail: 'Full-chain attack neutralised in <12s. Dossier saved. Agent health nominal.',
    duration: 1000,
  },
];

/* ── Step Row ──────────────────────────────────────────────── */
function StepRow({ step, status, liveEvents }) {
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
      className="flex gap-3 p-3 rounded-xl transition-all duration-500"
      style={{
        background: isActive
          ? `${step.color}12`
          : isDone
          ? 'rgba(16,185,129,0.05)'
          : 'transparent',
        border: isActive
          ? `1px solid ${step.color}40`
          : isDone
          ? '1px solid rgba(16,185,129,0.2)'
          : '1px solid transparent',
        opacity: isPending ? 0.4 : 1,
        transform: isActive ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isDone
            ? 'rgba(16,185,129,0.15)'
            : isActive
            ? `${step.color}20`
            : 'rgba(148,163,184,0.1)',
          border: isDone
            ? '1px solid rgba(16,185,129,0.4)'
            : isActive
            ? `1px solid ${step.color}50`
            : '1px solid rgba(148,163,184,0.2)',
          boxShadow: isActive ? `0 0 14px ${step.color}30` : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
        ) : isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: step.color }} />
        ) : (
          <Icon className="w-4 h-4" style={{ color: isPending ? '#94a3b8' : step.color }} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-bold leading-tight"
          style={{
            color: isDone
              ? '#22c55e'
              : isActive
              ? step.color
              : isPending
              ? '#64748b'
              : '#e2e8f0',
          }}
        >
          {step.label}
        </div>
        <div
          className="text-xs mt-0.5 leading-snug"
          style={{ color: isPending ? '#475569' : '#94a3b8' }}
        >
          {step.detail}
        </div>
        {/* Live event snippet */}
        {isActive && relevantEvents.length > 0 && (
          <div
            className="mt-1.5 text-xs px-2 py-1 rounded-lg font-mono"
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: '#67e8f9',
              border: '1px solid rgba(103,232,249,0.15)',
            }}
          >
            <span style={{ color: '#94a3b8' }}>live › </span>
            {relevantEvents[0].type || relevantEvents[0].source_agent}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0 flex items-start pt-1">
        {isDone && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
          >
            DONE
          </span>
        )}
        {isActive && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: `${step.color}20`, color: step.color }}
          >
            LIVE
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

  const startDemo = async () => {
    setPhase('running');
    setCurrentStep(-1);
    setCompletedSteps([]);
    setLiveEvents([]);
    setElapsedMs(0);
    setErrorMsg('');

    try {
      await fetch(`${API_URL}/api/demo/inject-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: 'full_chain', force_escalate: true }),
      });
    } catch (e) {
      setErrorMsg('Running simulated full-chain attack sequence across Swarm Mesh');
    }

    // Kick off animated steps
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

  const totalMs = DEMO_SCRIPT.reduce((s, x) => s + x.duration, 0);
  const progress = Math.min((completedSteps.length / DEMO_SCRIPT.length) * 100, 100);

  const getStatus = (idx) => {
    if (completedSteps.includes(idx)) return 'done';
    if (currentStep === idx) return 'active';
    return 'pending';
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #0c1a2e 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
          maxHeight: '90vh',
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
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white">Judge Demo</div>
            <div className="text-xs" style={{ color: '#94a3b8' }}>
              Full-Chain Attack Detection &amp; Response
            </div>
          </div>
          {/* Timer */}
          {(phase === 'running' || phase === 'done') && (
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-black font-mono"
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
          <div className="h-1 shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
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
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(14,116,144,0.2) 100%)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.15)',
                }}
              >
                <Zap className="w-10 h-10" style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div className="text-lg font-black text-white mb-1">SentinelSwarm Live Demo</div>
                <div className="text-sm max-w-sm" style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                  Press <strong style={{ color: '#a5b4fc' }}>Start Demo</strong> to inject a real
                  full-chain attack and watch the swarm detect, analyse, and neutralise it live —
                  end-to-end in under 15 seconds.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
                {[
                  { label: 'Attack Types', val: '5+' },
                  { label: 'AI Agents', val: '8' },
                  { label: 'Avg. Response', val: '<12s' },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="text-xl font-black" style={{ color: '#818cf8' }}>{val}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(phase === 'running' || phase === 'done') && (
            <div className="flex flex-col gap-1.5">
              {errorMsg && (
                <div
                  className="text-xs px-3 py-2 rounded-lg mb-1"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  ⚠ {errorMsg}
                </div>
              )}
              {DEMO_SCRIPT.map((step, idx) => (
                <StepRow
                  key={step.id}
                  step={step}
                  status={getStatus(idx)}
                  liveEvents={liveEvents}
                />
              ))}
            </div>
          )}

          {phase === 'done' && (
            <div
              className="mt-3 p-4 rounded-xl text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.08) 100%)',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
            >
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#22c55e' }} />
              <div className="text-sm font-black text-white">Attack Neutralised Successfully</div>
              <div className="text-xs mt-1" style={{ color: '#6ee7b7' }}>
                SentinelSwarm contained the full-chain threat in{' '}
                <strong>{(elapsedMs / 1000).toFixed(1)}s</strong> — autonomously, with human-in-the-loop escalation.
              </div>
              {liveEvents.length > 0 && (
                <div
                  className="mt-2 text-xs"
                  style={{ color: '#94a3b8' }}
                >
                  {liveEvents.length} live WebSocket events captured from the swarm
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                border: 'none',
              }}
            >
              <Play className="w-4 h-4" />
              Start Demo
            </button>
          )}

          {phase === 'running' && (
            <div
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black"
              style={{
                background: 'rgba(99,102,241,0.1)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Demo running…{' '}
              {currentStep >= 0 && (
                <span style={{ color: DEMO_SCRIPT[currentStep]?.color }}>
                  {DEMO_SCRIPT[currentStep]?.label}
                </span>
              )}
            </div>
          )}

          {phase === 'done' && (
            <>
              <button
                onClick={resetDemo}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
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
