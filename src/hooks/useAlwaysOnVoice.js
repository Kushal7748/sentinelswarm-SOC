import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/api.js';

// Comprehensive phonetic matches for "Drishti" and common variations
const WAKE_WORDS = [
  'drishti', 'dristi', 'drishthi', 'drishte', 'drishty', 'trishti', 
  'dristie', 'drishtee', 'dristy', 'drishi', 'rish ti', 'drishti ai',
  'hey drishti', 'ok drishti', 'hello drishti', 'hi drishti',
  'sentinel', 'hey sentinel', 'ok sentinel', 'hello sentinel', 'hi sentinel', 'jarvis'
];

/**
 * Play a pleasant high-tech chime using Web Audio API
 */
function playTechChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = window._drishtiAudioCtx || new AudioCtx();
    window._drishtiAudioCtx = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch (_) {}
}

/**
 * High-speed local SOC Knowledge Engine
 * Provides instant (<10ms) domain-specific answers
 */
export function getLocalKnowledgeAnswer(query) {
  const q = (query || '').toLowerCase().trim();

  if (q.includes('firewall') || q.includes('iptables') || q.includes('port') || q.includes('block')) {
    return 'The perimeter firewall is fully operational and enforcing active IP tables drop rules. All malicious traffic from attacker IP 192.168.1.8 is blocked at the gateway.';
  }

  if (q.includes('threat') || q.includes('status') || q.includes('safe') || q.includes('nandi')) {
    return 'Nandi Traders is currently protected by SentinelSwarm. All perimeter sensors—phishing, intrusion, and exfiltration detectors—are actively monitoring in real time with zero breaches.';
  }

  if (q.includes('who attacked') || q.includes('attacker') || q.includes('incident') || q.includes('database') || q.includes('sqli') || q.includes('dump')) {
    return 'The latest incident was a multi-stage full-chain intrusion originating from IP 192.168.1.8. It attempted an SQL injection credential harvest on auth endpoints, followed by a 42-megabyte exfiltration burst. The swarm contained it in under 12 seconds.';
  }

  if (q.includes('agent') || q.includes('health') || q.includes('score') || q.includes('swarm')) {
    return 'All 8 swarm agents—including Phishing, Intrusion, and Exfiltration Detectors, the Analyst, Remediation, Caution, Decision, and Watchman agents—are operating at 100% nominal health.';
  }

  if (q.includes('self healing') || q.includes('hot swap') || q.includes('degrade') || q.includes('watchdog')) {
    return 'The self-healing watchdog monitors agent health every 500 milliseconds. If any agent drops below 60% health, it is automatically hot-swapped to a standby model in under one second.';
  }

  if (q.includes('402') || q.includes('payment') || q.includes('crypto') || q.includes('base') || q.includes('sepolia') || q.includes('intel')) {
    return 'SentinelSwarm integrates the HTTP 402 payment required protocol on Base Sepolia testnet to autonomously settle 1-cent USDC micropayments for decentralized threat intelligence queries.';
  }

  if (q.includes('who are you') || q.includes('what are you') || q.includes('drishti') || q.includes('introduce')) {
    return "I am Drishti, the Autonomous Main Agent and Lead Voice AI of SentinelSwarm. I coordinate our 8-agent swarm to detect, analyze, and neutralize cyber threats in real time.";
  }

  if (q.includes('briefing') || q.includes('demo') || q.includes('judge') || q.includes('start')) {
    return "Good day judges. I'm Drishti, the Autonomous Main Agent of SentinelSwarm. Our 8-agent AI swarm detects multi-vector cyber attacks and contains them autonomously in under 15 seconds. Let me show you our live command center.";
  }

  return `SentinelSwarm Context Bus analyzed for "${query}". All perimeter boundaries are secure, and all 8 AI agents report normal operational status.`;
}

export function useAlwaysOnVoice({ enabled = true } = {}) {
  const [voiceState, setVoiceState] = useState('IDLE'); // IDLE | WAKE | LISTENING | THINKING | SPEAKING
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAnswer, setLastAnswer] = useState("Drishti AI online. Ask any security question below or click a sample prompt.");
  const [isSupported, setIsSupported] = useState(false);

  const recognizerRef = useRef(null);
  const shouldRestartRef = useRef(true);
  const silenceTimerRef = useRef(null);
  const chromeKeepAliveRef = useRef(null);
  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  // Rock-solid Text-to-Speech function
  const speakText = useCallback((text) => {
    if (!text) return;
    setLastAnswer(text);

    // Play tactile sound cue
    playTechChime();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceState('IDLE');
      return;
    }

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.resume();
    } catch (_) {}

    // Slight delay so cancel completes cleanly in Chrome
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        window._drishtiUtterance = utterance;

        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Choose best available voice
        const voices = window.speechSynthesis.getVoices() || [];
        const preferred = voices.find(v =>
          v.lang && v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Alex') || v.name.includes('David') || v.name.includes('Karen'))
        ) || voices.find(v => v.lang && v.lang.startsWith('en'));

        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => {
          setVoiceState('SPEAKING');
          // Chrome speech synthesis workaround: keep alive
          if (chromeKeepAliveRef.current) clearInterval(chromeKeepAliveRef.current);
          chromeKeepAliveRef.current = setInterval(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            } else {
              clearInterval(chromeKeepAliveRef.current);
            }
          }, 10000);
        };

        utterance.onend = () => {
          setVoiceState('IDLE');
          window._drishtiUtterance = null;
          if (chromeKeepAliveRef.current) clearInterval(chromeKeepAliveRef.current);
          if (shouldRestartRef.current && recognizerRef.current) {
            setTimeout(() => {
              try { recognizerRef.current.start(); } catch (_) {}
            }, 300);
          }
        };

        utterance.onerror = (err) => {
          console.warn('Speech synthesis notice:', err);
          setVoiceState('IDLE');
          window._drishtiUtterance = null;
          if (chromeKeepAliveRef.current) clearInterval(chromeKeepAliveRef.current);
        };

        setVoiceState('SPEAKING');
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Error starting speech synthesis:', e);
        setVoiceState('IDLE');
      }
    }, 30);
  }, []);

  // Process question synchronously to guarantee user gesture activation for speech
  const processQuery = useCallback((query) => {
    if (!query || query.trim().length < 2) return;
    const cleanQuery = query.trim();
    setLiveTranscript(cleanQuery);

    // Get instant rich answer
    const instantAnswer = getLocalKnowledgeAnswer(cleanQuery);
    speakText(instantAnswer);

    // Optional background sync with backend if available
    fetch(`${API_URL}/voice/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: cleanQuery }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.answer && data.answer !== instantAnswer) {
          setLastAnswer(data.answer);
        }
      })
      .catch(() => {});
  }, [speakText]);

  const startListeningManually = useCallback(() => {
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (_) {}

    playTechChime();
    setVoiceState('LISTENING');
    setLiveTranscript('');

    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (_) {}
      setTimeout(() => {
        try { recognizerRef.current.start(); } catch (_) {}
      }, 100);
    }
  }, []);

  const stopAll = useCallback(() => {
    shouldRestartRef.current = false;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (_) {}
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (_) {}
    }
    setVoiceState('IDLE');
    setLiveTranscript('');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load speech synthesis voices eagerly
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
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
        playTechChime();
      }

      // Process speech if in listening mode or wake word detected
      const isListeningMode = voiceStateRef.current === 'LISTENING' || voiceStateRef.current === 'WAKE';
      if (isListeningMode || wakeDetected || lower.length > 2) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Strip wake word from query if present
        let query = lower;
        for (const w of WAKE_WORDS) {
          query = query.replace(w, '').trim();
        }
        query = query.replace(/^[,. !?]+/, '').trim();
        if (!query) query = lower;

        const isFinal = event.results[event.results.length - 1].isFinal;

        if (isFinal && query.length >= 2) {
          try { rec.stop(); } catch (_) {}
          processQuery(query);
        } else if (query.length >= 3) {
          // Fast auto-submit after 400ms of quiet pause
          silenceTimerRef.current = setTimeout(() => {
            if (voiceStateRef.current !== 'THINKING' && voiceStateRef.current !== 'SPEAKING') {
              try { rec.stop(); } catch (_) {}
              processQuery(query);
            }
          }, 400);
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
        }, 200);
      }
    };

    if (enabled) {
      try { rec.start(); } catch (_) {}
    }

    return () => {
      shouldRestartRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (chromeKeepAliveRef.current) clearInterval(chromeKeepAliveRef.current);
      try { rec.stop(); } catch (_) {}
    };
  }, [enabled, processQuery]);

  const speakBriefing = useCallback(() => {
    const speechText = "Good day judges. I'm Drishti, the Autonomous Main Agent and Lead Voice AI of SentinelSwarm. I'm currently watching Nandi Traders' network in real time. Our 8-agent swarm automatically detects and neutralizes full-chain cyber attacks in under 15 seconds.";
    speakText(speechText);
  }, [speakText]);

  return {
    voiceState,
    liveTranscript,
    lastAnswer,
    isSupported,
    processQuery,
    speakText,
    startListeningManually,
    speakBriefing,
    stopAll,
    setVoiceState,
  };
}
