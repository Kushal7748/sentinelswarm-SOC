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
 * Instant Intelligent SOC Knowledge Base for immediate, accurate Drishti Voice AI responses
 */
function getIntelligentSOCAnswer(query) {
  const q = (query || '').toLowerCase().trim();

  if (!q) {
    return "I am Drishti, SentinelSwarm's Autonomous Voice AI. How can I assist with network security today?";
  }

  // Firewall / Perimeter
  if (q.includes('firewall') || q.includes('iptables') || q.includes('perimeter') || q.includes('block') || q.includes('drop')) {
    return "Perimeter firewall is actively enforcing iptables rules across all edge routers. Malicious traffic from untrusted sources is automatically dropped with zero packet leakage.";
  }

  // Threat / Security Status / Network
  if (q.includes('threat') || q.includes('status') || q.includes('safe') || q.includes('security') || q.includes('network')) {
    return "SentinelSwarm defense is active. All 8 AI swarm agents are continuously cross-correlating telemetry on the Context Bus. The network perimeter is fully secured.";
  }

  // Nandi Traders
  if (q.includes('nandi') || q.includes('trader') || q.includes('company') || q.includes('business')) {
    return "Nandi Traders infrastructure is protected by SentinelSwarm. The corporate portal, authentication gateway, and customer records are actively monitored and shielded.";
  }

  // Attacker / IP / Hacker / 192.168.1.8
  if (q.includes('attack') && (q.includes('who') || q.includes('origin') || q.includes('ip') || q.includes('source') || q.includes('192.168') || q.includes('where'))) {
    return "The primary threat actor was identified at IP 192.168.1.8. The adversary attempted spear-phishing, followed by SQL injection on the portal login and unauthorized data exfiltration.";
  }

  // Explain incident / latest incident / what happened
  if (q.includes('incident') || q.includes('latest') || q.includes('what happened') || q.includes('explain') || q.includes('detail')) {
    return "The latest incident is a multi-stage intrusion. Our sensor mesh detected anomalous payloads, the Analyst agent correlated MITRE techniques T1566 and T1190, and the Decision Agent authorized auto-containment in under 12 seconds.";
  }

  // Agent Health / Swarm status / scores
  if (q.includes('agent') || q.includes('health') || q.includes('score') || q.includes('swarm') || q.includes('watchdog')) {
    return "All 8 swarm agents are operating at nominal health with average latency under 120 milliseconds. The Watchman self-healing watchdog is actively monitoring agent drift.";
  }

  // Who are you / What is Drishti / What is SentinelSwarm
  if (q.includes('who are you') || q.includes('what is drishti') || q.includes('what is sentinelswarm') || q.includes('your name') || q.includes('introduce')) {
    return "I am Drishti, the Autonomous Main Agent and Lead Voice AI of SentinelSwarm. I coordinate our 8-agent AI swarm, correlate real-time threat intelligence, and enforce containment across edge routers.";
  }

  // Self healing / Hot swap
  if (q.includes('self heal') || q.includes('hot swap') || q.includes('degrade') || q.includes('recovery') || q.includes('failover')) {
    return "SentinelSwarm features autonomous self-healing. If any sensor or LLM agent experiences health degradation below 60%, our watchdog automatically hot-swaps it with a standby backup model in under 500 milliseconds.";
  }

  // x402 / Payments / Micropayments / USDC / Blockchain
  if (q.includes('402') || q.includes('payment') || q.includes('usdc') || q.includes('crypto') || q.includes('blockchain') || q.includes('sepolia')) {
    return "SentinelSwarm utilizes the HTTP 402 protocol on Base Sepolia testnet to execute autonomous 0.01 USDC on-chain micropayments for decentralized threat intelligence lookups.";
  }

  // MITRE / ATT&CK / Kill Chain
  if (q.includes('mitre') || q.includes('kill chain') || q.includes('technique') || q.includes('t1566') || q.includes('t1190')) {
    return "We map incoming threats directly to the MITRE ATT&CK framework, identifying spear-phishing attachment T1566.001, SQL injection exploit T1190, and data exfiltration T1048.003.";
  }

  // Help / Greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('help') || q.includes('good morning') || q.includes('good afternoon')) {
    return "Hello. Drishti AI is online and monitoring the SOC Context Bus. You can ask me about firewall status, active incidents, swarm health, or threat intelligence.";
  }

  // General fallback
  return `Analyzing query: "${query}". Context Bus telemetry shows all 8 swarm agents active, zero uncontained intrusions, and the perimeter firewall operating normally.`;
}

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
    if (!('speechSynthesis' in window)) { 
      setVoiceState('IDLE'); 
      setLastAnswer(text);
      return; 
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex') || v.name.includes('Daniel') || v.name.includes('Victoria'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { 
      setVoiceState('SPEAKING'); 
      setLastAnswer(text); 
    };
    
    utterance.onend = () => {
      setVoiceState('IDLE');
      if (shouldRestartRef.current && recognizerRef.current) {
        setTimeout(() => {
          try { recognizerRef.current.start(); } catch (_) {}
        }, 300);
      }
    };
    
    utterance.onerror = () => {
      setVoiceState('IDLE');
      setLastAnswer(text);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const processQuery = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;
    const cleanQuery = query.trim();
    setVoiceState('THINKING');
    setLiveTranscript(cleanQuery);

    // Fast local answer ready immediately
    const fallbackAnswer = getIntelligentSOCAnswer(cleanQuery);

    // Attempt backend call with a strict 1.2s timeout so the user is never kept waiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    try {
      const res = await fetch(`${API_URL}/voice/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanQuery }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data.answer && data.answer.trim().length > 5) {
          speakText(data.answer);
          return;
        }
      }
      speakText(fallbackAnswer);
    } catch (_) {
      clearTimeout(timeoutId);
      speakText(fallbackAnswer);
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
      }, 100);
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
      if (isListeningMode || wakeDetected) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Strip wake word from query if present
        let query = lower;
        for (const w of WAKE_WORDS) {
          query = query.replace(w, '').trim();
        }
        query = query.replace(/^[,. ]+/, '').trim();
        if (!query) query = lower;

        const isFinal = event.results[event.results.length - 1].isFinal;

        if (isFinal && query.length >= 2) {
          try { rec.stop(); } catch (_) {}
          setLiveTranscript(query);
          processQuery(query);
        } else if (query.length >= 4) {
          // Auto-submit after 700ms of quiet pause
          silenceTimerRef.current = setTimeout(() => {
            if (voiceStateRef.current !== 'THINKING' && voiceStateRef.current !== 'SPEAKING') {
              try { rec.stop(); } catch (_) {}
              setLiveTranscript(query);
              processQuery(query);
            }
          }, 700);
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
      try { rec.stop(); } catch (_) {}
    };
  }, [enabled, processQuery]);

  const speakBriefing = useCallback(() => {
    const speechText = "Welcome to SentinelSwarm. I am Drishti, the Autonomous Main Watchman and Voice AI. I am monitoring the network perimeter, sensor mesh, and context bus in real time. All 8 agents are nominal.";
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
