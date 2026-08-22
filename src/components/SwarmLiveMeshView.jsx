import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Brain, Zap, AlertTriangle, Scale, Mail, Network,
  HardDriveDownload, Activity, MessageSquare, Radio, ArrowRight,
  CheckCircle2, Loader2, ShieldAlert
} from 'lucide-react';

const AGENT_NODES = {
  'detector.phishing':  { name: 'Phishing Detector',    category: 'Sensor',     icon: Mail,              color: '#b45309', pos: { x: 12, y: 15 } },
  'detector.intrusion': { name: 'Intrusion Detector',   category: 'Sensor',     icon: Network,           color: '#0891b2', pos: { x: 12, y: 45 } },
  'detector.exfil':     { name: 'Exfil Detector',       category: 'Sensor',     icon: HardDriveDownload, color: '#2563eb', pos: { x: 12, y: 75 } },
  'analyst':            { name: 'Analyst Agent',         category: 'Reasoning',  icon: Brain,             color: '#7c3aed', pos: { x: 42, y: 45 } },
  'remediation':        { name: 'Remediation Agent',     category: 'Policy',     icon: Zap,               color: '#0284c7', pos: { x: 70, y: 20 } },
  'caution':            { name: 'Caution Agent',         category: 'Safety Veto',icon: AlertTriangle,     color: '#be123c', pos: { x: 70, y: 50 } },
  'decision':           { name: 'Decision Agent',        category: 'Voting',     icon: Scale,             color: '#047857', pos: { x: 70, y: 80 } },
  'main_agent':         { name: 'Main Agent (Watchman)', category: 'Self-Healer',icon: ShieldCheck,       color: '#0e7490', pos: { x: 92, y: 50 } },
};

const CONNECTIONS = [
  { from: 'detector.phishing',  to: 'analyst' },
  { from: 'detector.intrusion', to: 'analyst' },
  { from: 'detector.exfil',     to: 'analyst' },
  { from: 'analyst',            to: 'remediation' },
  { from: 'analyst',            to: 'caution' },
  { from: 'analyst',            to: 'decision' },
  { from: 'remediation',        to: 'decision' },
  { from: 'caution',            to: 'decision' },
  { from: 'decision',           to: 'main_agent' },
];

const INITIAL_DIALOGUES = [
  { id: 1, time: '14:20:01', from: 'detector.intrusion', to: 'analyst', text: 'Perimeter Sensor: SQLi payload detected (`\' OR \'1\'=\'1`). Source IP 192.168.43.103.', type: 'detection', confidence: 0.96 },
  { id: 2, time: '14:20:02', from: 'analyst', to: 'remediation', text: 'Analyst Reasoning: Correlated MITRE TA0001 Initial Access. Formulating perimeter isolation policy.', type: 'analysis', confidence: 0.98 },
  { id: 3, time: '14:20:04', from: 'remediation', to: 'caution', text: 'Remediation Policy: Proposing IPTABLES DROP firewall rule for 192.168.43.103.', type: 'proposal', confidence: 1.0 },
  { id: 4, time: '14:20:05', from: 'caution', to: 'decision', text: 'Caution Safety Audit: Verified IP is not internal gateway/DNS. Veto=FALSE. Approved.', type: 'veto', confidence: 1.0 },
  { id: 5, time: '14:20:06', from: 'decision', to: 'main_agent', text: 'Governed Decision: Consensus 2/2 Votes ACCEPT. Executed automated firewall block.', type: 'decision', confidence: 1.0 }
];

export default function SwarmLiveMeshView({ events, agentScores }) {
  const [activePulse, setActivePulse] = useState(null);
  const [activeAgentKey, setActiveAgentKey] = useState(null);
  const [dialogueLogs, setDialogueLogs] = useState(INITIAL_DIALOGUES);
  const [selectedAgentKey, setSelectedAgentKey] = useState('analyst');
  const [activeStageStep, setActiveStageStep] = useState(0); // 0: Idle/Monitoring, 1: Detection, 2: Analyst, 3: Remediation, 4: Caution, 5: Decision Execution

  // Process live incoming WebSocket telemetry from real attacks systematically
  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[0];
    if (!latest || !latest.source_agent) return;

    const source = latest.source_agent;
    const payload = latest.payload || {};
    const text = payload.message || payload.reason || payload.action || payload.report_text || latest.type;
    
    const targetMap = {
      'detector.phishing': 'analyst',
      'detector.intrusion': 'analyst',
      'detector.exfil': 'analyst',
      'analyst': 'remediation',
      'remediation': 'caution',
      'caution': 'decision',
      'decision': 'main_agent',
      'main_agent': 'analyst'
    };

    const stageMap = {
      'detection': 1,
      'analysis': 2,
      'remediation_proposal': 3,
      'veto': 4,
      'decision': 5,
      'action_executed': 5
    };

    const target = targetMap[source] || 'decision';
    const timeStr = new Date(latest.ts || Date.now()).toLocaleTimeString();

    if (stageMap[latest.type]) {
      setActiveStageStep(stageMap[latest.type]);
    }

    const newLog = {
      id: Date.now(),
      time: timeStr,
      from: source,
      to: target,
      text: typeof text === 'string' ? text : JSON.stringify(text),
      type: latest.type,
      confidence: latest.confidence ?? 0.95
    };

    setDialogueLogs(prev => [newLog, ...prev.slice(0, 24)]);
    setActiveAgentKey(source);
    setActivePulse(`${source}->${target}`);

    const timer = setTimeout(() => {
      setActivePulse(null);
      setActiveAgentKey(null);
    }, 1800);

    return () => clearTimeout(timer);
  }, [events]);

  const selectedAgent = AGENT_NODES[selectedAgentKey] || AGENT_NODES['analyst'];
  const selectedScore = agentScores[selectedAgentKey] || { health: 100, avg_latency_ms: 210, status: 'active' };

  const stages = [
    { num: 1, label: '1. Sensor Detection', agent: 'detector.intrusion' },
    { num: 2, label: '2. Analyst LLM Reasoning', agent: 'analyst' },
    { num: 3, label: '3. Remediation Policy', agent: 'remediation' },
    { num: 4, label: '4. Caution Safety Veto', agent: 'caution' },
    { num: 5, label: '5. Consensus Execution', agent: 'decision' }
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden min-h-0">
      {/* Systematic Pipeline Execution Stepper Header */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 rounded-2xl shrink-0 gap-3"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid var(--col-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--col-primary-pale)', border: '1px solid rgba(14,116,144,0.2)' }}
          >
            <Radio className="w-5 h-5 text-cyan-700 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: 'var(--col-text-primary)' }}>
                Live Autonomous SOC Execution Engine
              </h2>
              <span className="badge badge-success text-[10px] uppercase font-mono">Live Sensors Active</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--col-text-muted)' }}>
              Real-time multi-agent progression when company target infrastructure is attacked
            </p>
          </div>
        </div>

        {/* Live Stepper Stage Visualizer */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {stages.map((stg) => {
            const isCurrent = activeStageStep === stg.num;
            const isDone = activeStageStep > stg.num;

            return (
              <div
                key={stg.num}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all"
                style={{
                  background: isCurrent
                    ? 'var(--col-primary-pale)'
                    : isDone
                    ? 'var(--col-success-pale)'
                    : 'var(--col-surface-1)',
                  color: isCurrent
                    ? 'var(--col-primary)'
                    : isDone
                    ? 'var(--col-success)'
                    : 'var(--col-text-muted)',
                  border: isCurrent
                    ? '1.5px solid var(--col-primary)'
                    : '1px solid var(--col-border)'
                }}
              >
                {isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                )}
                <span className="whitespace-nowrap">{stg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left interactive graph canvas (7 cols), Right agent intercom feed & telemetry (5 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Multi-Agent Topology Canvas (7 columns) */}
        <div
          className="lg:col-span-7 flex flex-col rounded-2xl relative overflow-hidden p-4"
          style={{
            background: 'var(--col-surface-0)',
            border: '1px solid var(--col-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/80 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-700" />
              Swarm Communication Graph (Live Nodes)
            </span>
            <span className="text-[11px] text-stone-500 font-mono">Select agent node to inspect state</span>
          </div>

          {/* SVG Canvas for Connections & Animated Pulse Lines */}
          <div className="relative flex-1 w-full h-full min-h-[380px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {CONNECTIONS.map((conn, idx) => {
                const sourceNode = AGENT_NODES[conn.from];
                const targetNode = AGENT_NODES[conn.to];
                if (!sourceNode || !targetNode) return null;

                const keyStr = `${conn.from}->${conn.to}`;
                const isActive = activePulse === keyStr;

                return (
                  <g key={idx}>
                    <line
                      x1={`${sourceNode.pos.x}%`}
                      y1={`${sourceNode.pos.y}%`}
                      x2={`${targetNode.pos.x}%`}
                      y2={`${targetNode.pos.y}%`}
                      stroke={isActive ? '#0891b2' : '#cbd5e1'}
                      strokeWidth={isActive ? 3.5 : 1.5}
                      strokeDasharray={isActive ? '6 4' : 'none'}
                      className={isActive ? 'animate-pulse' : ''}
                    />
                    {isActive && (
                      <circle
                        r="7"
                        fill="#0891b2"
                        className="animate-ping"
                        cx={`${(sourceNode.pos.x + targetNode.pos.x) / 2}%`}
                        cy={`${(sourceNode.pos.y + targetNode.pos.y) / 2}%`}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Agent Nodes Positioning */}
            {Object.entries(AGENT_NODES).map(([key, node]) => {
              const score = agentScores[key] || { health: 100 };
              const Icon = node.icon;
              const isSelected = selectedAgentKey === key;
              const isProcessing = activeAgentKey === key;
              const health = score.health ?? 100;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedAgentKey(key)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-300 ${
                    isSelected ? 'scale-110' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${node.pos.x}%`,
                    top: `${node.pos.y}%`,
                  }}
                >
                  <div
                    className="flex flex-col items-center p-2.5 rounded-2xl transition-all relative"
                    style={{
                      background: isProcessing ? 'var(--col-primary-pale)' : isSelected ? 'var(--col-surface-1)' : '#ffffff',
                      border: `2px solid ${isProcessing ? '#0891b2' : isSelected ? node.color : 'var(--col-border)'}`,
                      boxShadow: isProcessing
                        ? `0 0 20px rgba(8,145,178,0.4)`
                        : isSelected
                        ? `0 4px 18px ${node.color}35`
                        : '0 2px 8px rgba(0,0,0,0.06)',
                      minWidth: 105
                    }}
                  >
                    {isProcessing && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-600"></span>
                      </span>
                    )}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 text-white shadow-md ${
                        isProcessing ? 'animate-bounce' : ''
                      }`}
                      style={{ background: node.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-center leading-tight text-stone-800 truncate max-w-[95px]">
                      {node.name.replace(' Agent', '')}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500">{node.category}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-extrabold font-mono text-emerald-700">{health}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Telemetry & Agent Intercom Feed (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
          {/* Selected Agent Inspector Card */}
          <div
            className="p-3.5 rounded-2xl shrink-0"
            style={{
              background: 'var(--col-surface-0)',
              border: '1px solid var(--col-border)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ background: selectedAgent.color }}
                >
                  <selectedAgent.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">{selectedAgent.name}</h3>
                  <span className="text-[10px] text-stone-500 font-mono">{selectedAgent.category} Node</span>
                </div>
              </div>
              <span className="badge badge-success text-[10px]">{selectedScore.status || 'ACTIVE'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-stone-200/80">
              <div className="p-1.5 rounded-lg bg-stone-100">
                <div className="text-[9px] text-stone-500">HEALTH</div>
                <div className="font-bold text-emerald-700">{selectedScore.health ?? 100}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-stone-100">
                <div className="text-[9px] text-stone-500">LATENCY</div>
                <div className="font-bold text-cyan-800">{selectedScore.avg_latency_ms || 220}ms</div>
              </div>
              <div className="p-1.5 rounded-lg bg-stone-100">
                <div className="text-[9px] text-stone-500">CATCH RATE</div>
                <div className="font-bold text-stone-800">{((selectedScore.catch_rate || 1.0) * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Live Agent Intercom Transcript Stream */}
          <div
            className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0"
            style={{
              background: 'var(--col-surface-0)',
              border: '1px solid var(--col-border)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-stone-200/80"
              style={{ background: 'var(--col-surface-1)' }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-700" />
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  Live Agent Intercom Stream
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">{dialogueLogs.length} Events</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {dialogueLogs.map((log) => {
                const fromNode = AGENT_NODES[log.from] || { name: log.from, color: '#0891b2' };
                const toNode = AGENT_NODES[log.to] || { name: log.to, color: '#7c3aed' };

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border transition-all fade-in"
                    style={{
                      background: 'var(--col-surface-1)',
                      borderColor: 'var(--col-border)'
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold px-1.5 py-0.5 rounded text-white" style={{ background: fromNode.color }}>
                          {fromNode.name.split(' ')[0]}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="font-bold px-1.5 py-0.5 rounded text-white" style={{ background: toNode.color }}>
                          {toNode.name.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-stone-400">{log.time}</span>
                    </div>

                    <p className="text-xs text-stone-800 leading-relaxed font-medium mt-1">
                      "{log.text}"
                    </p>

                    <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 mt-1.5 pt-1 border-t border-stone-200/60">
                      <span>TYPE: {log.type?.toUpperCase()}</span>
                      <span className="text-emerald-700 font-bold">CONFIDENCE: {Math.round((log.confidence || 0.95) * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
