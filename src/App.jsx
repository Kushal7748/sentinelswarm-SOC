import React, { useState, useEffect } from 'react';

import Header           from './components/Header.jsx';
import SidebarNav       from './components/SidebarNav.jsx';
import AgentHealthCards from './components/AgentHealthCards.jsx';
import LiveEventFeed    from './components/LiveEventFeed.jsx';
import ActiveIncident   from './components/ActiveIncident.jsx';
import ContextBusTable  from './components/ContextBusTable.jsx';
import ControlModal     from './components/ControlModal.jsx';
import VoiceAssistantModal from './components/VoiceAssistantModal.jsx';
import AttackDetailModal   from './components/AttackDetailModal.jsx';
import X402PaymentsTable   from './components/X402PaymentsTable.jsx';
import DecisionPipeline    from './components/DecisionPipeline.jsx';
import SwarmLiveMeshView   from './components/SwarmLiveMeshView.jsx';
import IncidentSummariesView from './components/IncidentSummariesView.jsx';
import DemoControlView     from './components/DemoControlView.jsx';
import JudgeDemoModal      from './components/JudgeDemoModal.jsx';

import { useSentinelWS }    from './hooks/useSentinelWS.js';
import { useAlwaysOnVoice } from './hooks/useAlwaysOnVoice.js';
import { API_URL } from './config/api.js';

import {
  ShieldAlert, Database, CreditCard, Network, Sliders,
  Shield, Activity, Layers
} from 'lucide-react';

/* ────────────────────────────────────────────────────────── */
/* Swarm Topology Placeholder View                           */
/* ────────────────────────────────────────────────────────── */
function SwarmTopologyView({ agentScores }) {
  const agents = [
    { key: 'detector.phishing',  label: 'Phishing\nDetector',  col: 0, row: 0 },
    { key: 'detector.intrusion', label: 'Intrusion\nDetector', col: 1, row: 0 },
    { key: 'detector.exfil',     label: 'Exfil\nDetector',    col: 2, row: 0 },
    { key: 'analyst',            label: 'Analyst',             col: 1, row: 1 },
    { key: 'remediation',        label: 'Remediation',         col: 0, row: 2 },
    { key: 'caution',            label: 'Caution',             col: 1, row: 2 },
    { key: 'decision',           label: 'Decision',            col: 2, row: 2 },
    { key: 'main_agent',         label: 'Main Agent\n(Watchman)', col: 1, row: 3 },
  ];
  const flow = [
    ['detector.phishing', 'analyst'], ['detector.intrusion', 'analyst'], ['detector.exfil', 'analyst'],
    ['analyst', 'remediation'], ['analyst', 'caution'], ['analyst', 'decision'],
    ['remediation', 'main_agent'], ['caution', 'main_agent'], ['decision', 'main_agent'],
  ];

  const getColor = (key) => {
    const h = agentScores[key]?.health ?? 100;
    if (h >= 80) return 'var(--col-success)';
    if (h >= 50) return 'var(--col-accent-mid)';
    return 'var(--col-danger)';
  };

  return (
    <div
      className="h-full flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--col-surface-0)', border: '1px solid var(--col-border)' }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
      >
        <Network className="w-4 h-4" style={{ color: 'var(--col-primary)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--col-text-primary)' }}>
          Swarm Agent Topology
        </h2>
        <span className="badge badge-primary ml-auto">Live Mesh</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,140px)', gridTemplateRows: 'repeat(4,80px)', gap: '28px 20px' }}>
          {agents.map(({ key, label, col, row }) => {
            const h = agentScores[key]?.health ?? 100;
            const color = getColor(key);
            return (
              <div
                key={key}
                className="flex flex-col items-center justify-center rounded-2xl p-2 text-center transition-all hover:scale-105"
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                  background: `${color}18`,
                  border: `1.5px solid ${color}55`,
                  boxShadow: `0 2px 10px ${color}22`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-1.5"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <div
                  className="text-[10px] font-bold leading-tight whitespace-pre-line"
                  style={{ color: 'var(--col-text-primary)' }}
                >
                  {label}
                </div>
                <div
                  className="text-[10px] font-extrabold mt-0.5 code-font"
                  style={{ color }}
                >
                  {h}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Main App                                                  */
/* ────────────────────────────────────────────────────────── */
export default function App() {
  /* Data */
  const {
    events,
    agentScores,
    activeIncident,
    recentSwaps,
    isConnected,
    connectionStatus,
    triggerDemoAttack,
    triggerProgressiveDemoStep,
    triggerAgentDegradation,
    triggerHumanAction,
    resetDemoState,
    refetchScores
  } = useSentinelWS();

  /* Always-on voice */
  const {
    voiceState,
    liveTranscript,
    lastAnswer,
    isSupported,
    processQuery,
    startListeningManually,
    speakBriefing,
  } = useAlwaysOnVoice({ enabled: true });

  /* UI state */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isControlOpen, setIsControlOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [defenseActive, setDefenseActive] = useState(true);
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Auto-dismiss welcome after 60 seconds
  useEffect(() => {
    if (showWelcome) {
      const t = setTimeout(() => setShowWelcome(false), 60000);
      return () => clearTimeout(t);
    }
  }, [showWelcome]);

  // Fetch initial defense status
  React.useEffect(() => {
    fetch(`${API_URL}/api/demo/defense-status`)
      .then(r => r.json())
      .then(d => setDefenseActive(Boolean(d.defense_active)))
      .catch(() => {});
  }, []);

  const handleToggleDefense = async (newState) => {
    try {
      const res = await fetch(`${API_URL}/api/demo/toggle-defense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });
      const data = await res.json();
      setDefenseActive(Boolean(data.defense_active));
    } catch (err) {
      setDefenseActive(newState);
    }
  };

  const voiceActive = voiceState !== 'IDLE';

  const handleHumanAction = async (incidentId, action, targetIp) => {
    try {
      const res = await fetch(`${API_URL}/api/demo/human-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId, action, target_ip: targetIp }),
      });
      if (refetchScores) refetchScores();
    } catch (err) {
      triggerHumanAction(incidentId, action, targetIp);
    }
  };

  const demoIntervalRef = React.useRef(null);
  const handleRunSwarmDemo = React.useCallback(() => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    let step = 0;
    triggerProgressiveDemoStep(0);
    demoIntervalRef.current = setInterval(() => {
      step += 1;
      if (step > 6) {
        clearInterval(demoIntervalRef.current);
      } else {
        triggerProgressiveDemoStep(step);
      }
    }, 1800);
  }, [triggerProgressiveDemoStep]);

  /* ── Render active view panel ── */
  const renderContent = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
            {/* Agent Health Row */}
            <section className="h-44 shrink-0">
              <AgentHealthCards agentScores={agentScores} recentSwaps={recentSwaps} />
            </section>
            {/* Main Split */}
            <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
              <div className="lg:col-span-8 min-h-0 overflow-hidden">
                <LiveEventFeed events={events} />
              </div>
              <div className="lg:col-span-4 min-h-0 overflow-hidden">
                <ActiveIncident
                  incident={activeIncident}
                  onHumanAction={handleHumanAction}
                  onOpenDetail={(id) => setSelectedIncidentId(id)}
                />
              </div>
            </section>
          </div>
        );

      case 'FEED':
        return (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
            <div className="lg:col-span-8 min-h-0 overflow-hidden">
              <LiveEventFeed events={events} />
            </div>
            <div className="lg:col-span-4 min-h-0 overflow-hidden">
              <ActiveIncident
                incident={activeIncident}
                onHumanAction={handleHumanAction}
                onOpenDetail={(id) => setSelectedIncidentId(id)}
              />
            </div>
          </div>
        );

      case 'SUMMARIES':
        return (
          <IncidentSummariesView
            events={events}
            onHumanAction={handleHumanAction}
          />
        );

      case 'TOPOLOGY':
        return (
          <div className="flex-1 min-h-0 overflow-hidden">
            <SwarmLiveMeshView events={events} agentScores={agentScores} />
          </div>
        );

      case 'CONTEXT_BUS':
        return (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ContextBusTable events={events} />
          </div>
        );

      case 'X402':
        return (
          <div className="flex-1 min-h-0 overflow-hidden">
            <X402PaymentsTable events={events} />
          </div>
        );

      case 'CONTROL':
        return <DemoControlView events={events} />;

      case 'VOICE':
        // Show inline voice panel instead of separate modal
        return (
          <div className="flex-1 flex items-center justify-center">
            <VoiceAssistantModal
              isOpen={true}
              onClose={() => setActiveTab('OVERVIEW')}
              voiceState={voiceState}
              liveTranscript={liveTranscript}
              lastAnswer={lastAnswer}
              isSupported={isSupported}
              onProcessQuery={processQuery}
              onStartListening={startListeningManually}
              onStartBriefing={speakBriefing}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="h-screen w-screen flex overflow-hidden select-none"
      style={{ background: 'var(--col-bg)' }}
    >
      {/* Sidebar */}
      <SidebarNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        eventsCount={events.length}
        voiceActive={voiceActive}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header
          isConnected={isConnected}
          onOpenControl={() => setIsControlOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
          onRunLiveDemo={handleRunSwarmDemo}
          onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
          onSelectIncident={(id) => setSelectedIncidentId(id)}
          events={events}
          eventsCount={events.length}
          activeTab={activeTab}
          voiceActive={voiceActive}
          defenseActive={defenseActive}
          onToggleDefense={handleToggleDefense}
        />

        {/* Active voice indicator bar */}
        {(voiceState === 'WAKE' || voiceState === 'LISTENING') && (
          <div
            className="flex items-center gap-2 px-6 py-2 text-xs font-bold shrink-0 fade-in"
            style={{
              background: 'var(--col-primary-pale)',
              borderBottom: '1px solid rgba(14,116,144,0.15)',
              color: 'var(--col-primary)',
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--col-primary)' }} />
            {voiceState === 'WAKE' ? 'Wake word detected — listening for your question…' : `Listening: "${liveTranscript}"`}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 flex flex-col gap-0 overflow-hidden min-h-0">
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      <ControlModal
        isOpen={isControlOpen}
        onClose={() => setIsControlOpen(false)}
        onRefresh={refetchScores}
        defenseActive={defenseActive}
        onToggleDefense={handleToggleDefense}
        onTriggerDemoAttack={triggerDemoAttack}
        onTriggerAgentDegradation={triggerAgentDegradation}
        onResetDemo={resetDemoState}
      />

      {/* Voice Modal (via Header button / sidebar button) */}
      {isVoiceOpen && (
        <VoiceAssistantModal
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          voiceState={voiceState}
          liveTranscript={liveTranscript}
          lastAnswer={lastAnswer}
          isSupported={isSupported}
          onProcessQuery={processQuery}
          onStartListening={startListeningManually}
          onStartBriefing={speakBriefing}
        />
      )}

      <AttackDetailModal
        incidentId={selectedIncidentId}
        isOpen={!!selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
      />

      {/* Judge Demo Modal */}
      <JudgeDemoModal
        isOpen={isJudgeDemoOpen}
        onClose={() => setIsJudgeDemoOpen(false)}
        events={events}
        onTriggerDemoAttack={triggerDemoAttack}
        onTriggerProgressiveDemoStep={triggerProgressiveDemoStep}
      />

      {/* Welcome Overlay for Judges - shows on first visit */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowWelcome(false)}
        >
          <div
            className="max-w-lg mx-6 rounded-3xl overflow-hidden text-center"
            style={{
              background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
              border: '1px solid rgba(99,102,241,0.4)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15), 0 0 80px rgba(99,102,241,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
                  boxShadow: '0 8px 30px rgba(99,102,241,0.5)',
                }}
              >
                <span className="text-4xl">🛡️</span>
              </div>
              <h1 className="text-2xl font-black text-white mb-3">
                Welcome to SentinelSwarm
              </h1>
              <p className="text-sm mb-1" style={{ color: '#c7d2fe', lineHeight: 1.7 }}>
                <strong>Autonomous Self-Healing AI SOC</strong> — An 8-agent AI swarm that
                detects, analyses, and neutralises cyber attacks in under 15 seconds.
              </p>
              <p className="text-xs mb-6" style={{ color: '#6b7280' }}>
                No backend needed for this demo. Everything runs in-browser.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowWelcome(false); setIsJudgeDemoOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-black transition-all hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 100%)',
                    color: 'white',
                    boxShadow: '0 6px 30px rgba(99,102,241,0.5)',
                    border: 'none',
                    fontSize: '16px',
                  }}
                >
                  ⚡ Start Judge Demo (Recommended)
                </button>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/5"
                  style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Explore Dashboard Freely
                </button>
              </div>
            </div>

            <div
              className="px-8 py-4 text-xs flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}
            >
              <span>Built with Gemini AI · Multi-Agent Architecture</span>
              <span className="font-mono">v2.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
