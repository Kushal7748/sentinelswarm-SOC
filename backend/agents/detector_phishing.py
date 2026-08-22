import time
import re
from typing import Dict, Any, Optional
from backend.context_bus import emit
from backend.agents.main_agent import update_agent_metrics

SUSPICIOUS_KEYWORDS = [
    "urgent", "verify your account", "wire transfer", "click here",
    "invoice attached", "bank update", "password reset", "account suspended",
    "immediate action", "kyc update", "confidential"
]

def analyze_email(email_data: Dict[str, Any], incident_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    start_time = time.time()
    subject = str(email_data.get("subject", "")).lower()
    body = str(email_data.get("body", "")).lower()
    sender = str(email_data.get("sender", "")).lower()
    display_name = str(email_data.get("display_name", "")).lower()
    
    score = 0.0
    reasons = []

    # Keyword check
    found_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in subject or kw in body]
    if found_keywords:
        score += min(0.45, len(found_keywords) * 0.15)
        reasons.append(f"Contains urgency/hook keywords: {', '.join(found_keywords)}")

    # Sender vs Display Name mismatch
    if display_name and ("admin" in display_name or "bank" in display_name or "ceo" in display_name):
        if not ("nanditraders" in sender or "internal" in sender):
            score += 0.35
            reasons.append(f"Spoofed authority display name '{display_name}' from external address '{sender}'")

    # Links analysis
    links = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', body)
    if links:
        score += 0.20
        reasons.append(f"Contained {len(links)} external hyperlink(s) in payload")

    latency_ms = (time.time() - start_time) * 1000 + 120
    
    if score >= 0.50:
        confidence = min(0.98, round(score, 2))
        risk = "high" if confidence >= 0.8 else "medium"
        
        event = emit(
            source_agent="detector.phishing",
            type_="detection",
            payload={
                "title": "Phishing Lure Email Detected",
                "sender": sender,
                "display_name": display_name,
                "subject": email_data.get("subject", "No Subject"),
                "reasons": reasons,
                "links": links,
                "raw_snippet": body[:200]
            },
            incident_id=incident_id,
            mitre_stage="TA0001 Initial Access",
            confidence=confidence,
            risk=risk
        )
        
        update_agent_metrics("detector.phishing", latency_ms=latency_ms, is_true_positive=True)
        return event
    else:
        update_agent_metrics("detector.phishing", latency_ms=latency_ms, is_true_positive=False)
        return None
