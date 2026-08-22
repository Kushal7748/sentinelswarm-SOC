import React from 'react';
import { ShieldCheck, Mail, Network, HardDriveDownload, Brain, Zap, AlertTriangle, Scale, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

const AGENT_META = {
  'detector.phishing':  { title: 'Phishing Detector',    icon: Mail,           tag: 'MAIL SENSOR' },
  'detector.intrusion': { title: 'Intrusion Detector',   icon: Network,        tag: 'LOG SENSOR' },
  'detector.exfil':     { title: 'Exfil Detector',       icon: HardDriveDownload, tag: 'PII SENSOR' },
  'analyst':            { title: 'Analyst Agent',         icon: Brain,          tag: 'LLM REASONING' },
  'remediation':        { title: 'Remediation Agent',     icon: Zap,            tag: 'POLICY GEN' },
  'caution':            { title: 'Caution Agent',         icon: AlertTriangle,  tag: 'SAFETY VETO' },
  'decision':           { title: 'Decision Agent',        icon: Scale,          tag: 'VOTING ENGINE' },
  'main_agent':         { title: 'Main Agent (Watchman)', icon: ShieldCheck,    tag: 'SELF-HEALER' },
};

export default function AgentHealthCards({ agentScores, recentSwaps }) {
  const getHealthStyle = (score, isSwapping) => {
    if (isSwapping) return {
      dot:    '#be123c',
      text:   'var(--col-danger)',
      border: 'rgba(190,18,60,0.3)',
      bg:     'rgba(255,228,230,0.6)',
      stroke: '#be123c',
      badge:  { bg: 'var(--col-danger-pale)', color: 'var(--col-danger)' },
    };
    if (score >= 80) return {
      dot:    'var(--col-success)',
      text:   'var(--col-success)',
      border: 'rgba(4,120,87,0.2)',
      bg:     'rgba(209,250,229,0.4)',
      stroke: '#059669',
      badge:  { bg: 'var(--col-success-pale)', color: 'var(--col-success)' },
    };
    if (score >= 50) return {
      dot:    'var(--col-accent-mid)',
      text:   'var(--col-accent)',
      border: 'rgba(217,119,6,0.25)',
      bg:     'rgba(254,243,199,0.5)',
      stroke: '#d97706',
      badge:  { bg: 'var(--col-accent-pale)', color: 'var(--col-accent)' },
    };
    return {
      dot:    'var(--col-danger)',
      text:   'var(--col-danger)',
      border: 'rgba(190,18,60,0.3)',
      bg:     'rgba(255,228,230,0.5)',
      stroke: '#be123c',
      badge:  { bg: 'var(--col-danger-pale)', color: 'var(--col-danger)' },
    };
  };

  const totalAgents = Object.keys(AGENT_META).length;
  const healthyCount = Object.values(agentScores).filter(s => (s?.health ?? 100) >= 80).length;

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: 'var(--col-surface-0)',
        border: '1px solid var(--col-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--col-primary)' }} />
          <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--col-text-primary)' }}>
            Agent Swarm Health
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="badge"
            style={{
              background: 'var(--col-success-pale)',
              color: 'var(--col-success)',
            }}
          >
            {healthyCount}/{totalAgents} Healthy
          </span>
          <span
            className="badge"
            style={{ background: 'var(--col-surface-2)', color: 'var(--col-text-muted)' }}
          >
            8 Active Units
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 overflow-y-auto">
        {Object.entries(AGENT_META).map(([agentKey, meta]) => {
          const scoreData = agentScores[agentKey] || {
            health: 100, avg_latency_ms: 240, status: 'active', history: [100, 100, 100, 100, 100],
          };
          const health = scoreData.health ?? 100;
          const isSwapping = recentSwaps.includes(agentKey);
          const s = getHealthStyle(health, isSwapping);
          const Icon = meta.icon;
          const chartData = (scoreData.history || [health]).map((val, idx) => ({ idx, val }));
          const trend = chartData.length > 1
            ? chartData[chartData.length - 1].val - chartData[0].val
            : 0;

          return (
            <div
              key={agentKey}
              className={`relative rounded-xl p-3 flex flex-col gap-1.5 transition-all duration-300 ${isSwapping ? 'animate-swap-glow' : ''}`}
              style={{
                background: s.bg,
                border: `1.5px solid ${s.border}`,
                boxShadow: isSwapping
                  ? `0 0 16px rgba(190,18,60,0.15)`
                  : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {/* Icon + Title */}
              <div className="flex items-start justify-between">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.8)', border: `1px solid ${s.border}` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: s.text }} />
                </div>
                <div className="flex items-center gap-1">
                  {trend > 0 ? (
                    <TrendingUp className="w-3 h-3" style={{ color: 'var(--col-success)' }} />
                  ) : trend < 0 ? (
                    <TrendingDown className="w-3 h-3" style={{ color: 'var(--col-danger)' }} />
                  ) : null}
                  <span
                    className="font-extrabold text-base code-font"
                    style={{ color: s.text }}
                  >
                    {health}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <div
                  className="text-[11px] font-bold leading-tight truncate"
                  style={{ color: 'var(--col-text-primary)' }}
                  title={meta.title}
                >
                  {meta.title}
                </div>
                <div
                  className="text-[9px] font-bold tracking-widest uppercase"
                  style={{ color: 'var(--col-text-faint)' }}
                >
                  {meta.tag}
                </div>
              </div>

              {/* Sparkline */}
              <div className="h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke={s.stroke}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between text-[9px] font-bold"
                style={{ color: 'var(--col-text-faint)' }}
              >
                <span className="code-font">{scoreData.avg_latency_ms || 220}ms</span>
                {isSwapping ? (
                  <span
                    className="flex items-center gap-0.5 font-bold"
                    style={{ color: 'var(--col-danger)' }}
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    SWAPPING
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{ ...s.badge, padding: '1px 5px', fontSize: 9 }}
                  >
                    {scoreData.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
