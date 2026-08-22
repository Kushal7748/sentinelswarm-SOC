import React from 'react';
import {
  Shield, ShieldAlert, Network, Activity, CreditCard, Database,
  Mic, ChevronLeft, ChevronRight, Radio, Layers, Bell, FileText
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'OVERVIEW',     label: 'Command Center',    icon: Shield },
  { id: 'FEED',         label: 'Incident Feed',     icon: ShieldAlert },
  { id: 'SUMMARIES',    label: 'Incident Summaries', icon: FileText },
  { id: 'TOPOLOGY',     label: 'Swarm Topology',    icon: Network },
  { id: 'CONTEXT_BUS',  label: 'Context Bus',       icon: Database },
  { id: 'X402',         label: 'x402 Payments',     icon: CreditCard },
  { id: 'VOICE',        label: 'Drishti AI',        icon: Mic },
];

export default function SidebarNav({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  isConnected,
  eventsCount,
  voiceActive,
}) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''} flex flex-col h-full z-40`}>
      {/* Brand Logo Area */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: 'var(--header-h)', borderBottom: '1px solid var(--col-border)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--col-primary) 0%, var(--col-primary-light) 100%)',
            boxShadow: '0 2px 10px rgba(14,116,144,0.3)',
          }}
        >
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="gradient-text font-bold text-base tracking-tight leading-tight code-font">
              SentinelSwarm
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--col-text-faint)' }}>
              SOC · Self-Healing AI
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full flex items-center justify-center shadow-md z-50 transition-all hover:scale-105"
        style={{
          background: 'var(--col-surface-0)',
          border: '1.5px solid var(--col-border)',
          color: 'var(--col-text-muted)',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Section: Main */}
        {!collapsed && (
          <div
            className="px-2 pb-1 pt-2 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--col-text-faint)' }}
          >
            Operations
          </div>
        )}
        {NAV_ITEMS.slice(0, 4).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`nav-item w-full text-left${activeTab === id ? ' active' : ''}`}
            data-tooltip={collapsed ? label : undefined}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" style={{ minWidth: 18 }} />
            <span className="sidebar-label">{label}</span>
            {id === 'FEED' && eventsCount > 0 && (
              <span
                className="sidebar-label ml-auto badge badge-danger text-[10px]"
                style={{ minWidth: 20, justifyContent: 'center' }}
              >
                {eventsCount > 99 ? '99+' : eventsCount}
              </span>
            )}
          </button>
        ))}

        {!collapsed && (
          <div
            className="px-2 pb-1 pt-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--col-text-faint)' }}
          >
            Tools
          </div>
        )}
        {NAV_ITEMS.slice(4).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`nav-item w-full text-left${activeTab === id ? ' active' : ''}${id === 'VOICE' ? ' relative' : ''}`}
            data-tooltip={collapsed ? label : undefined}
          >
            <Icon
              className="w-4.5 h-4.5 shrink-0"
              style={{ minWidth: 18, color: id === 'VOICE' ? (voiceActive ? 'var(--col-primary)' : undefined) : undefined }}
            />
            <span className="sidebar-label">{label}</span>
            {id === 'VOICE' && voiceActive && (
              <span className="sidebar-label ml-auto">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-ping"
                  style={{ background: 'var(--col-primary)' }}
                />
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Status */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: '1px solid var(--col-border)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: isConnected ? 'var(--col-success-pale)' : 'var(--col-danger-pale)',
            color: isConnected ? 'var(--col-success)' : 'var(--col-danger)',
          }}
        >
          <span
            className="relative flex w-2 h-2 shrink-0"
          >
            {isConnected && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--col-success)' }}
              />
            )}
            <span
              className="relative inline-flex rounded-full w-2 h-2"
              style={{ background: isConnected ? 'var(--col-success)' : 'var(--col-danger)' }}
            />
          </span>
          {!collapsed && (
            <span className="text-xs font-bold tracking-wide">
              {isConnected ? 'Context Bus LIVE' : 'Reconnecting…'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
