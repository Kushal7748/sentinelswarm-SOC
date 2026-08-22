import time
import re
from typing import Dict, Any, Optional, List
from backend.context_bus import emit
from backend.agents.main_agent import update_agent_metrics

SQLI_PATTERNS = [
    r"'\s*OR\s*'1'\s*=\s*'1",
    r"'\s*OR\s*1\s*=\s*1",
    r"UNION\s+SELECT",
    r";\s*DROP\s+TABLE",
    r"admin'\s*--",
    r"'\s*OR\s*''='",
    r"SLEEP\(\d+\)",
    r"BENCHMARK\(",
    r"--\s*$"
]

failed_attempts_tracker: Dict[str, List[float]] = {}
recon_tracker: Dict[str, List[str]] = {}

def analyze_log_entry(log_line: str, source_ip: str = "127.0.0.1", incident_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    start_time = time.time()
    now = time.time()
    
    # 1. Check SQL Injection Signatures
    for pattern in SQLI_PATTERNS:
        if re.search(pattern, log_line, re.IGNORECASE):
            latency_ms = (time.time() - start_time) * 1000 + 80
            event = emit(
                source_agent="detector.intrusion",
                type_="detection",
                payload={
                    "title": "SQL Injection Signature Identified",
                    "source_ip": source_ip,
                    "matched_pattern": pattern,
                    "log_entry": log_line,
                    "target_endpoint": "/login"
                },
                incident_id=incident_id,
                mitre_stage="TA0001 Initial Access",
                confidence=0.96,
                risk="high"
            )
            update_agent_metrics("detector.intrusion", latency_ms=latency_ms, is_true_positive=True)
            return event

    # 2. Check Brute-Force Patterns
    if "Failed login" in log_line or "AUTH_FAILURE" in log_line or "Failed password" in log_line:
        timestamps = failed_attempts_tracker.get(source_ip, [])
        timestamps = [t for t in timestamps if now - t < 60]  # Rolling 60s window
        timestamps.append(now)
        failed_attempts_tracker[source_ip] = timestamps

        if len(timestamps) >= 3:
            latency_ms = (time.time() - start_time) * 1000 + 90
            event = emit(
                source_agent="detector.intrusion",
                type_="detection",
                payload={
                    "title": f"High-Rate Credential Brute-Force ({len(timestamps)} failures)",
                    "source_ip": source_ip,
                    "failure_count": len(timestamps),
                    "log_entry": log_line,
                    "protocol": "SSH/HTTP"
                },
                incident_id=incident_id,
                mitre_stage="TA0006 Credential Access",
                confidence=0.92,
                risk="high"
            )
            update_agent_metrics("detector.intrusion", latency_ms=latency_ms, is_true_positive=True)
            return event

    # 3. Check Reconnaissance / Port Scan Patterns
    if "404" in log_line or "SCAN" in log_line or "PROBE" in log_line:
        paths = recon_tracker.get(source_ip, [])
        paths.append(log_line)
        recon_tracker[source_ip] = paths[-20:]

        if len(paths) >= 4:
            latency_ms = (time.time() - start_time) * 1000 + 75
            event = emit(
                source_agent="detector.intrusion",
                type_="detection",
                payload={
                    "title": "Endpoint Reconnaissance Probing Detected",
                    "source_ip": source_ip,
                    "probed_endpoints_count": len(paths),
                    "log_entry": log_line
                },
                incident_id=incident_id,
                mitre_stage="TA0043 Reconnaissance",
                confidence=0.88,
                risk="medium"
            )
            update_agent_metrics("detector.intrusion", latency_ms=latency_ms, is_true_positive=True)
            return event

    latency_ms = (time.time() - start_time) * 1000 + 60
    update_agent_metrics("detector.intrusion", latency_ms=latency_ms, is_true_positive=False)
    return None
