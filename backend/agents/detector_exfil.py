import time
import re
from typing import Dict, Any, Optional
from backend.context_bus import emit
from backend.agents.main_agent import update_agent_metrics

EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
CC_REGEX = r'\b(?:\d[ -]*?){13,16}\b'
SSN_REGEX = r'\b\d{3}-\d{2}-\d{4}\b'

def analyze_outbound_payload(data: str, destination: str = "9000", incident_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    start_time = time.time()
    
    emails_found = re.findall(EMAIL_REGEX, data)
    cc_found = re.findall(CC_REGEX, data)
    ssn_found = re.findall(SSN_REGEX, data)
    
    score = 0.0
    indicators = []

    if len(emails_found) >= 3:
        score += 0.45
        indicators.append(f"{len(emails_found)} email addresses staged")
    if cc_found:
        score += 0.50
        indicators.append(f"{len(cc_found)} credit card numeric sequences staged")
    if ssn_found:
        score += 0.40
        indicators.append(f"{len(ssn_found)} SSN/ID identifiers found")
    if len(data) > 2048:
        score += 0.20
        indicators.append(f"High-volume payload ({len(data)} bytes) outbound")

    latency_ms = (time.time() - start_time) * 1000 + 110
    
    if score >= 0.50:
        confidence = min(0.99, round(score, 2))
        event = emit(
            source_agent="detector.exfil",
            type_="detection",
            payload={
                "title": "Confidential PII Data Exfiltration Stream Detected",
                "destination_port": destination,
                "indicators": indicators,
                "payload_size_bytes": len(data),
                "sample_preview": data[:150]
            },
            incident_id=incident_id,
            mitre_stage="TA0010 Exfiltration",
            confidence=confidence,
            risk="high"
        )
        update_agent_metrics("detector.exfil", latency_ms=latency_ms, is_true_positive=True)
        return event
    else:
        update_agent_metrics("detector.exfil", latency_ms=latency_ms, is_true_positive=False)
        return None
