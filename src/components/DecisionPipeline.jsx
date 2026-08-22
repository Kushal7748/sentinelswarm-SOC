import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Cpu, Scale, ArrowRight, UserCheck, Check, X } from 'lucide-react';

export default function DecisionPipeline({ remediationData, cautionData, decisionData, onHumanAction }) {
  const options = remediationData?.options || [
    { action: 'isolate_ip', confidence: 0.98, risk: 'low', target: '192.168.1.8' },
    { action: 'terminate_sessions', confidence: 0.75, risk: 'medium' },
  ];

  const isVetoed = cautionData?.veto === true || cautionData?.type === 'veto';
  const vetoReason = cautionData?.reason || cautionData?.payload?.reason || 'Verification passed — target is external attacker';

  const outcome = decisionData?.outcome || (isVetoed ? 'ESCALATE_TO_HUMAN' : 'AUTO_EXECUTE');
  const score = decisionData?.score ?? 0.98;
  const incidentId = decisionData?.incident_id || remediationData?.incident_id || 'INC-LIVE';
  const targetIp = remediationData?.attacker_ip || '192.168.1.8';

  return (
    <div
      className="rounded-2xl p-4 my-2 transition-all"
      style={{
        background: 'var(--col-surface-1)',
        border: '1.5px solid var(--col-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200/80">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
            Autonomous Governed Decision & Consensus Voting Matrix
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-stone-500">Weight Formula: Analyst(40%) + Remediation(30%) + Caution(30%)</span>
        </div>
      </div>

      {/* 3-Agent Voting Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        {/* 1. Remediation Agent Vote */}
        <div
          className="p-3 rounded-xl border flex flex-col justify-between"
          style={{ background: 'var(--col-surface-0)', borderColor: 'var(--col-border)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase font-mono">1. Remediation Agent</span>
              <span className="badge badge-primary text-[9px]">VOTE: ACCEPT</span>
            </div>
            <p className="text-xs font-semibold text-stone-800 mb-1">
              Proposal: <code className="text-cyan-800 font-mono">IPTABLES DROP {targetIp}</code>
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mt-2">
              <span>Confidence: <strong>98%</strong></span>
              <span>Weight: <strong>30%</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Caution Safety Veto Audit */}
        <div
          className="p-3 rounded-xl border flex flex-col justify-between"
          style={{ background: 'var(--col-surface-0)', borderColor: 'var(--col-border)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase font-mono">2. Caution Agent</span>
              <span className={`badge ${isVetoed ? 'badge-danger' : 'badge-success'} text-[9px]`}>
                {isVetoed ? 'VOTE: VETO' : 'VOTE: PASS'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 my-1">
              {isVetoed ? (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <p className="text-xs font-semibold text-stone-800 leading-tight">
                {isVetoed ? 'Safety Veto Triggered' : 'Passed Safety Audit'}
              </p>
            </div>
            <div className="text-[10px] font-mono text-stone-500 mt-2 truncate" title={vetoReason}>
              Reason: {vetoReason}
            </div>
          </div>
        </div>

        {/* 3. Final Decision Consensus Outcome */}
        <div
          className="p-3 rounded-xl border flex flex-col justify-between"
          style={{
            background: outcome === 'AUTO_EXECUTE' ? 'rgba(209,250,229,0.4)' : 'rgba(254,243,199,0.5)',
            borderColor: outcome === 'AUTO_EXECUTE' ? 'rgba(4,120,87,0.3)' : 'rgba(217,119,6,0.3)'
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase font-mono">3. Decision Outcome</span>
              <span className="font-extrabold text-xs font-mono text-stone-900">
                SCORE: {(score * 100).toFixed(0)}%
              </span>
            </div>

            {/* Outcome Pill */}
            <div
              className={`p-2 rounded-xl text-center font-bold text-xs font-mono uppercase mb-2 ${
                outcome === 'AUTO_EXECUTE'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-amber-600 text-white shadow-sm'
              }`}
            >
              {outcome === 'AUTO_EXECUTE' ? '⚡ AUTO-EXECUTED' : '👤 AWAITING HUMAN REVIEW'}
            </div>

            {/* Interactive Human Action Buttons if Awaiting Review */}
            {outcome !== 'AUTO_EXECUTE' && onHumanAction && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => onHumanAction(incidentId, 'APPROVE', targetIp)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold font-mono transition-all shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>APPROVE</span>
                </button>
                <button
                  onClick={() => onHumanAction(incidentId, 'DENY', targetIp)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold font-mono transition-all shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>DENY</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
