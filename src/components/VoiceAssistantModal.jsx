import React, { useState, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Radio, AlertCircle, Send } from 'lucide-react';

const QUICK_PROMPTS = [
  "Check the status of firewall",
  "What is the current threat status?",
  "Is Nandi Traders safe?",
  "Who attacked our database?",
  "Explain the latest incident",
  "Show agent health scores",
];

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  voiceState,      // 'IDLE' | 'WAKE' | 'LISTENING' | 'THINKING' | 'SPEAKING'
  liveTranscript,
  lastAnswer,
  isSupported,
  onProcessQuery,
  onStartListening,
  onStartBriefing,
}) {
  const [textInput, setTextInput] = useState('');

  const handleOrbClick = useCallback(() => {
    if (voiceState === 'SPEAKING') {
      window.speechSynthesis?.cancel();
      return;
    }
    onStartListening();
  }, [voiceState, onStartListening]);

  const handleSubmitTypedQuestion = (e) => {
    e.preventDefault();
    if (!textInput || !textInput.trim()) return;
    const q = textInput.trim();
    setTextInput('');
    onProcessQuery(q);
  };

  if (!isOpen) return null;

  const stateColor = {
    IDLE:      { orb: 'var(--col-primary)', glow: 'rgba(14,116,144,0.25)' },
    WAKE:      { orb: 'var(--col-accent-mid)', glow: 'rgba(217,119,6,0.25)' },
    LISTENING: { orb: '#be123c', glow: 'rgba(190,18,60,0.25)' },
    THINKING:  { orb: 'var(--col-primary-mid)', glow: 'rgba(8,145,178,0.30)' },
    SPEAKING:  { orb: 'var(--col-success)', glow: 'rgba(4,120,87,0.25)' },
  }[voiceState] || { orb: 'var(--col-primary)', glow: 'rgba(14,116,144,0.25)' };

  const statusLabels = {
    IDLE:      'Say "Drishti" to begin, speak, or type your question below',
    WAKE:      'Wake word detected! Ask Drishti your question…',
    LISTENING: '● Drishti is listening to your query…',
    THINKING:  'Drishti is correlating SOC telemetry…',
    SPEAKING:  '● Drishti AI is speaking…',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(240,238,235,0.75)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl relative overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: 'var(--col-surface-0)',
          border: '1px solid rgba(14,116,144,0.18)',
          boxShadow: '0 20px 60px rgba(14,116,144,0.15), 0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Subtle gradient header tint */}
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(207,250,254,0.6) 0%, transparent 100%)',
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 z-10"
          style={{
            background: 'var(--col-surface-2)',
            border: '1px solid var(--col-border)',
            color: 'var(--col-text-muted)',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6 sm:p-8 flex flex-col items-center overflow-y-auto">
          {/* Header Badge */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-4"
            style={{
              background: 'var(--col-primary-pale)',
              border: '1px solid rgba(14,116,144,0.2)',
              color: 'var(--col-primary)',
            }}
          >
            <Radio className="w-3 h-3" style={{ animation: 'pulse 1.5s infinite' }} />
            <span>DRISHTI VOICE & Q&A AI INTERCOM</span>
          </div>

          {!isSupported && (
            <div
              className="flex items-center gap-2 mb-3 px-3.5 py-2.5 rounded-xl text-xs"
              style={{ background: 'var(--col-danger-pale)', color: 'var(--col-danger)', border: '1px solid rgba(190,18,60,0.2)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Voice listening works in Chrome/Edge. You can also type questions below!</span>
            </div>
          )}

          {/* Central Orb */}
          <div className="relative flex items-center justify-center my-2" style={{ width: 140, height: 140 }}>
            {/* Pulse rings */}
            {(voiceState === 'LISTENING' || voiceState === 'SPEAKING' || voiceState === 'WAKE') && (
              <>
                <div
                  className="absolute rounded-full voice-ring"
                  style={{ width: 120, height: 120, background: stateColor.glow }}
                />
                <div
                  className="absolute rounded-full voice-ring-2"
                  style={{ width: 120, height: 120, background: stateColor.glow }}
                />
              </>
            )}
            {/* Orb background ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 110, height: 110,
                background: `${stateColor.glow}`,
                border: `1.5px solid ${stateColor.orb}44`,
              }}
            />
            {/* Clickable orb */}
            <button
              onClick={handleOrbClick}
              className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(145deg, ${stateColor.orb}ee, ${stateColor.orb}cc)`,
                boxShadow: `0 8px 28px ${stateColor.glow}, 0 2px 8px rgba(0,0,0,0.1)`,
                color: 'white',
              }}
              title={voiceState === 'SPEAKING' ? 'Click to stop' : 'Click to speak'}
            >
              {voiceState === 'LISTENING' && <MicOff className="w-7 h-7" />}
              {voiceState === 'SPEAKING'  && <Volume2 className="w-7 h-7" style={{ animation: 'bounce 0.6s infinite' }} />}
              {voiceState === 'THINKING'  && <Sparkles className="w-7 h-7" style={{ animation: 'spin 1.2s linear infinite' }} />}
              {(voiceState === 'IDLE' || voiceState === 'WAKE') && <Mic className="w-7 h-7" />}
            </button>
          </div>

          {/* State label */}
          <p
            className="text-xs font-bold tracking-widest uppercase mb-3 text-center"
            style={{
              color: voiceState === 'LISTENING' ? 'var(--col-danger)'
                   : voiceState === 'THINKING'  ? 'var(--col-primary)'
                   : voiceState === 'SPEAKING'  ? 'var(--col-success)'
                   : voiceState === 'WAKE'      ? 'var(--col-accent)'
                   : 'var(--col-text-faint)',
            }}
          >
            {statusLabels[voiceState]}
          </p>

          {/* Transcript / Answer Box */}
          <div
            className="w-full rounded-2xl p-4 min-h-[70px] flex items-center justify-center mb-3 text-left"
            style={{
              background: 'var(--col-surface-1)',
              border: '1px solid var(--col-border)',
            }}
          >
            {voiceState === 'LISTENING' || voiceState === 'WAKE' ? (
              <p className="text-xs text-center code-font font-bold" style={{ color: 'var(--col-primary)' }}>
                {liveTranscript || 'Listening… Speak your question aloud.'}
              </p>
            ) : (
              <p className="text-xs leading-relaxed font-sans" style={{ color: 'var(--col-text-body)' }}>
                {lastAnswer || 'Drishti AI online. Ask any security question below or click sample prompts.'}
              </p>
            )}
          </div>

          {/* Direct Typed Question Form */}
          <form onSubmit={handleSubmitTypedQuestion} className="w-full flex items-center gap-2 mb-3">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask Drishti AI a question (e.g. 'check firewall status')..."
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans"
              style={{
                background: 'var(--col-surface-1)',
                border: '1px solid var(--col-border)',
                color: 'var(--col-text-primary)'
              }}
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-40"
              title="Submit question to Drishti AI"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Start Briefing button */}
          <div className="w-full flex flex-col gap-2 mb-3">
            {onStartBriefing && (
              <button
                onClick={onStartBriefing}
                className="btn-primary w-full justify-center py-2 text-xs shadow-md"
                style={{
                  background: 'linear-gradient(135deg, var(--col-primary) 0%, var(--col-primary-mid) 100%)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>▶ Start Judge Demo Briefing</span>
              </button>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="w-full">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--col-text-faint)' }}>
              1-Click Sample Questions:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onProcessQuery(p)}
                  className="btn-ghost text-xs px-2.5 py-1.5 rounded-xl text-left hover:bg-sky-50 hover:text-sky-700 transition-colors"
                  style={{ fontSize: 11 }}
                >
                  💬 {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
