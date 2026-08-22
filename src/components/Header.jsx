import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, Activity, Bell, Volume2, Flame, Zap } from 'lucide-react';
import NotificationBell from './NotificationBell.jsx';

const TAB_LABELS = {
  OVERVIEW:     'Command Center',
  FEED:         'Incident Feed',
  SUMMARIES:    'Incident Summaries',
  TOPOLOGY:     'Swarm Topology',
  CONTEXT_BUS:  'Context Bus',
  X402:         'x402 Payments',
  CONTROL:      'Demo Control',
  VOICE:        'Drishti Voice AI',
};

export default function Header({
  isConnected,
  onOpenVoice,
  onOpenJudgeDemo,
  onSelectIncident,
  events,
  eventsCount,
  activeTab,
  voiceActive,
  defenseActive = true,
  onToggleDefense,
}) {
  return (
    <header
      className="flex items-center justify-between px-6 shrink-0 z-30"
      style={{
        height: 'var(--header-h)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--col-border)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      {/* Left: Breadcrumb & Master Defense Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--col-primary-pale)' }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--col-primary)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--col-text-muted)' }}>
            SentinelSwarm
          </span>
          <span style={{ color: 'var(--col-text-faint)' }}>/</span>
          <span className="text-sm font-bold" style={{ color: 'var(--col-text-primary)' }}>
            {TAB_LABELS[activeTab] || 'Dashboard'}
          </span>
        </div>

        {/* Master Defense Toggle Quick-Badge */}
        {onToggleDefense && (
          <button
            onClick={() => onToggleDefense(!defenseActive)}
            title={defenseActive ? "SentinelSwarm Defense is ACTIVE. Click to Deactivate." : "SentinelSwarm Defense is DEACTIVATED. Click to Activate."}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: defenseActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.15)',
              border: defenseActive ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(239,68,68,0.4)',
              color: defenseActive ? '#059669' : '#dc2626',
            }}
          >
            {defenseActive ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>DEFENSE: ACTIVE</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>DEFENSE: DEACTIVATED</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Event count */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            background: 'var(--col-surface-1)',
            border: '1px solid var(--col-border)',
            color: 'var(--col-text-muted)',
          }}
        >
          <Activity className="w-3.5 h-3.5" style={{ color: 'var(--col-primary-mid)' }} />
          <span>
            <span style={{ color: 'var(--col-primary)' }} className="font-bold code-font">
              {eventsCount}
            </span>{' '}
            Events
          </span>
        </div>

        {/* Notifications */}
        <NotificationBell events={events} onSelectIncident={onSelectIncident} />

        {/* Voice Button */}
        <button
          onClick={onOpenVoice}
          title="Open Drishti Voice Intercom"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: voiceActive
              ? 'linear-gradient(135deg, var(--col-primary) 0%, var(--col-primary-mid) 100%)'
              : 'var(--col-primary-pale)',
            color: voiceActive ? 'white' : 'var(--col-primary)',
            border: '1px solid rgba(14,116,144,0.2)',
            boxShadow: voiceActive ? '0 2px 10px rgba(14,116,144,0.3)' : 'none',
          }}
        >
          <Volume2 className="w-3.5 h-3.5" style={{ animation: voiceActive ? 'pulse 1s infinite' : 'none' }} />
          <span className="hidden sm:inline">
            {voiceActive ? 'Drishti Listening…' : 'Talk to Drishti'}
          </span>
        </button>

        {/* Judge Demo */}
        <button
          id="judge-demo-header-btn"
          onClick={onOpenJudgeDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
            color: 'white',
            boxShadow: '0 2px 14px rgba(99,102,241,0.45)',
            border: '1px solid rgba(99,102,241,0.4)',
            animationDuration: '2s',
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Judge Demo</span>
        </button>


      </div>
    </header>
  );
}
