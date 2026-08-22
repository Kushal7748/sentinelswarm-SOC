import time
import json
from typing import Dict, Any, List, Optional
from backend.context_bus import emit
from backend.llm import call_llm
from backend.agents.main_agent import update_agent_metrics

from backend.config import LAPTOP_C_IP

def correlate_and_analyze(
    events: List[Dict[str, Any]],
    incident_id: str,
    attacker_ip: Optional[str] = None
) -> Dict[str, Any]:
    if not attacker_ip:
        attacker_ip = LAPTOP_C_IP
    start_time = time.time()
    
    # Extract unique MITRE stages in observed order
    mitre_stages = []
    for ev in events:
        stage = ev.get("mitre_stage")
        if stage and stage not in mitre_stages:
            mitre_stages.append(stage)

    # Prepare summary prompt for LLM
    event_summaries = []
    for ev in events:
        src = ev.get("source_agent", "sensor")
        stage = ev.get("mitre_stage", "Unknown")
        payload = ev.get("payload", {})
        title = payload.get("title", "Event") if isinstance(payload, dict) else str(payload)
        event_summaries.append(f"- [{src}] {stage}: {title}")

    events_text = "\n".join(event_summaries)
    system_prompt = (
        "You are a Senior SOC Analyst for SentinelSwarm. "
        "Given the flagged security detections, write a clear, factual 3-sentence attack-chain narrative "
        "explaining how the attacker progressed. Do not invent facts not in the events."
    )
    user_prompt = f"Attacker IP: {attacker_ip}\nDetected Timeline:\n{events_text}\n\nProvide the 3-sentence narrative."

    narrative = call_llm(user_prompt, system=system_prompt)
    latency_ms = (time.time() - start_time) * 1000

    # Wire x402 Algorand Commerce Request for IP Reputation lookup
    intel_summary = ""
    try:
        from backend.agents.commerce import process_commerce_request
        commerce_res = process_commerce_request(
            resource="ip-reputation",
            reason=f"IP reputation threat intel enrichment for origin {attacker_ip}",
            estimated_cost_usdc=0.01,
            source_agent="analyst",
            incident_id=incident_id,
            ip=attacker_ip
        )
        if commerce_res.get("status") == "success":
            intel_summary = commerce_res.get("summary", "")
    except Exception as e:
        intel_summary = f"IP Reputation lookup attempted ({e})"

    full_narrative = narrative.strip()
    if intel_summary:
        full_narrative += f"\n\n🛡️ [x402 Algorand Threat Intel]: {intel_summary}"

    analysis_event = emit(
        source_agent="analyst",
        type_="analysis",
        payload={
            "incident_id": incident_id,
            "attacker_ip": attacker_ip,
            "narrative": full_narrative,
            "mitre_chain": mitre_stages,
            "correlated_events_count": len(events),
            "severity": "CRITICAL" if len(events) >= 2 else "HIGH",
            "x402_intel_enriched": bool(intel_summary)
        },
        incident_id=incident_id,
        mitre_stage=mitre_stages[-1] if mitre_stages else "TA0001 Initial Access",
        confidence=0.94,
        risk="high"
    )

    update_agent_metrics("analyst", latency_ms=latency_ms, is_true_positive=True)
    return analysis_event
