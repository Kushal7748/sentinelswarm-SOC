import logging
import requests
from typing import Dict, Any, Optional
from backend.config import SARVAM_API_KEY
from backend.context_bus import get_recent_events, emit
from backend.llm import call_llm

logger = logging.getLogger(__name__)

def generate_sarvam_tts(text: str) -> Optional[str]:
    """Generates audio for text using Sarvam AI Text-to-Speech API."""
    if not SARVAM_API_KEY:
        return None
    try:
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [text[:500]],
            "target_language_code": "en-IN",
            "speaker": "anushka",
            "pitch": 0,
            "pace": 1.0,
            "loudness": 1.5,
            "speech_sample_rate": 8000,
            "enable_preprocessing": True,
            "model": "bulbul:v2"
        }
        res = requests.post(url, json=payload, headers=headers, verify=False, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if "audios" in data and len(data["audios"]) > 0:
                return data["audios"][0]
        else:
            logger.warning(f"Sarvam AI TTS returned status {res.status_code}: {res.text}")
    except Exception as e:
        logger.warning(f"Sarvam AI TTS request failed: {e}")
    return None

def answer_question(question: str) -> Dict[str, Any]:
    """Answers live security questions grounded directly in Context Bus real-time telemetry."""
    recent_events = get_recent_events(limit=25)
    
    # Format recent context bus events into clean summary lines
    context_lines = []
    for ev in recent_events[-15:]:
        src = ev.get("source_agent", "sensor")
        ev_type = ev.get("type", "event")
        payload = ev.get("payload", {})
        summary = payload.get("title") or payload.get("reason") or payload.get("narrative") or payload.get("message") or ev_type
        if isinstance(summary, str):
            summary = summary[:140]
        context_lines.append(f"[{src}] {ev_type}: {summary}")

    context_str = "\n".join(context_lines) if context_lines else "Context Bus Initialized. No critical active breaches detected yet."

    system_prompt = (
        "You are Drishti, the Autonomous Main Agent and Lead Voice AI of the SentinelSwarm Self-Healing SOC. "
        "Answer the user's question concisely (2-3 sentences maximum). Speak with authority like a high-level cyber security operations commander. "
        "Base your answer directly on the Context Bus telemetry provided below. If asked about status, summarize active threats or confirm perimeter safety."
    )

    user_prompt = f"""Context Bus Telemetry:\n{context_str}\n\nQuestion: {question}\n\nProvide your concise spoken response:"""

    answer = call_llm(user_prompt, system=system_prompt)
    answer = answer.strip().replace('"', '').replace('*', '')

    # Synthesize Sarvam AI voice audio if API key is present
    audio_b64 = generate_sarvam_tts(answer)

    emit(
        source_agent="main_agent",
        type_="voice_query",
        payload={
            "question": question,
            "answer": answer,
            "tts_engine": "Sarvam AI" if audio_b64 else "Web Speech API"
        },
        confidence=1.0,
        risk="low"
    )

    return {
        "question": question,
        "answer": answer,
        "audio_base64": audio_b64,
        "engine": "Sarvam AI" if audio_b64 else "Web Speech"
    }
