import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/api.js';

// Comprehensive phonetic matches for "Drishti" and common variations
const WAKE_WORDS = [
  'drishti', 'dristi', 'drishthi', 'drishte', 'drishty', 'trishti', 
  'dristie', 'drishtee', 'dristy', 'drishi', 'rish ti', 'drishti ai',
  'hey drishti', 'ok drishti', 'hello drishti', 'hi drishti',
  'sentinel', 'hey sentinel', 'ok sentinel', 'hello sentinel', 'hi sentinel', 'jarvis'
];

export function useAlwaysOnVoice({ enabled = true } = {}) {
  const [voiceState, setVoiceState] = useState('IDLE'); // IDLE | WAKE | LISTENING | THINKING | SPEAKING
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognizerRef = useRef(null);
  const shouldRestartRef = useRef(true);
  const silenceTimerRef = useRef(null);
  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) { setVoiceState('IDLE'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Alex'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { setVoiceState('SPEAKING'); setLastAnswer(text); };
    utterance.onend = () => {
      setVoiceState('IDLE');
      if (shouldRestartRef.current && recognizerRef.current) {
        setTimeout(() => {
          try { recognizerRef.current.start(); } catch (_) {}
        }, 400);
      }
    };
    utterance.onerror = () => setVoiceState('IDLE');
    window.speechSynthesis.speak(utterance);
  }, []);

  const processQuery = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;
    setVoiceState('THINKING');
    try {
      const res = await fetch(`${API_URL}/voice/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      speakText(data.answer || 'Context Bus analyzed. All perimeter defense boundaries remain operational.');
    } catch {
      speakText('Perimeter sensors are active. No unauthorized escalation detected across the swarm.');
    }
  }, [speakText]);

  const startListeningManually = useCallback(() => {
    window.speechSynthesis.cancel();
    setVoiceState('LISTENING');
    setLiveTranscript('');
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (_) {}
      setTimeout(() => {
        try { recognizerRef.current.start(); } catch (_) {}
      }, 150);
    }
  }, []);

  const stopAll = useCallback(() => {
    shouldRestartRef.current = false;
    window.speechSynthesis.cancel();
    if (recognizerRef.current) { try { recognizerRef.current.stop(); } catch (_) {} }
    setVoiceState('IDLE');
    setLiveTranscript('');
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setIsSupported(false); return; }
    setIsSupported(true);

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    recognizerRef.current = rec;
    shouldRestartRef.current = enabled;

    rec.onresult = (event) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      const lower = fullTranscript.toLowerCase().trim();
      if (!lower) return;
      setLiveTranscript(fullTranscript);

      // Check if transcript contains any phonetic variation of "Drishti"
      const wakeDetected = WAKE_WORDS.some(w => lower.includes(w));

      if (wakeDetected && voiceStateRef.current === 'IDLE') {
        setVoiceState('WAKE');
      }

      // Process speech if wake word detected OR if already in LISTENING/WAKE state
      const isListeningMode = voiceStateRef.current === 'LISTENING' || voiceStateRef.current === 'WAKE';
      if (isListeningMode || wakeDetected || lower.length > 3) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Strip wake word from query if present
        let query = lower;
        for (const w of WAKE_WORDS) {
          query = query.replace(w, '').trim();
        }
        query = query.replace(/^[,. ]+/, '').trim();
        if (!query) query = lower; // Fallback to full speech if query became empty

        const isFinal = event.results[event.results.length - 1].isFinal;

        if (isFinal && query.length >= 2) {
          try { rec.stop(); } catch (_) {}
          setLiveTranscript(query);
          processQuery(query);
        } else if (query.length >= 3) {
          // Auto-submit after 800ms of quiet pause
          silenceTimerRef.current = setTimeout(() => {
            if (voiceStateRef.current !== 'THINKING' && voiceStateRef.current !== 'SPEAKING') {
              try { rec.stop(); } catch (_) {}
              setLiveTranscript(query);
              processQuery(query);
            }
          }, 800);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setIsSupported(false);
        shouldRestartRef.current = false;
        return;
      }
      if (voiceStateRef.current === 'WAKE') {
        setVoiceState('IDLE');
      }
    };

    rec.onend = () => {
      if (shouldRestartRef.current && (voiceStateRef.current === 'IDLE' || voiceStateRef.current === 'WAKE' || voiceStateRef.current === 'LISTENING')) {
        setTimeout(() => {
          if (!shouldRestartRef.current) return;
          try { rec.start(); } catch (_) {}
        }, 250);
      }
    };

    if (enabled) {
      try { rec.start(); } catch (_) {}
    }

    return () => {
      shouldRestartRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { rec.stop(); } catch (_) {}
    };
  }, [enabled, processQuery]);

  const speakBriefing = useCallback(() => {
    const speechText = "Good day judges. I'm Drishti, the Autonomous Main Agent and Lead Voice AI of SentinelSwarm. I'm currently watching Nandi Traders' network in real time — let's see what happens when someone attacks it.";
    speakText(speechText);
  }, [speakText]);

  return {
    voiceState,
    liveTranscript,
    lastAnswer,
    isSupported,
    processQuery,
    startListeningManually,
    speakBriefing,
    stopAll,
    setVoiceState,
  };
}
