import time
from typing import Dict, Any
from backend.context_bus import emit
from backend.llm import call_llm
from backend.agents.main_agent import update_agent_metrics

from backend.config import LAPTOP_C_IP

reports_cache: Dict[str, Dict[str, Any]] = {}

def generate_incident_report(
    incident_id: str,
    narrative: str,
    mitre_chain: list,
    outcome: str,
    target: str = LAPTOP_C_IP
) -> Dict[str, Any]:
    if incident_id in reports_cache:
        return reports_cache[incident_id]

    start_time = time.time()
    
    chain_str = " -> ".join(mitre_chain) if mitre_chain else "Initial Access -> Execution"
    system_prompt = "You are a Cyber Security Communications Officer. Write a concise executive incident summary report for non-technical leadership."
    user_prompt = (
        f"Incident ID: {incident_id}\n"
        f"Attacker Target/Origin: {target}\n"
        f"MITRE ATT&CK Stages: {chain_str}\n"
        f"Technical Narrative: {narrative}\n"
        f"Final Decision Outcome: {outcome}\n\n"
        f"Format as:\n"
        f"- Executive Summary: (2 lines)\n"
        f"- Impact Assessment: (1 line)\n"
        f"- Defense Action Taken: (1 line)"
    )

    report_text = call_llm(user_prompt, system=system_prompt)
    latency_ms = (time.time() - start_time) * 1000 + 45

    report_data = {
        "incident_id": incident_id,
        "target": target,
        "chain": mitre_chain,
        "outcome": outcome,
        "report_text": report_text.strip(),
        "created_at": time.time()
    }
    reports_cache[incident_id] = report_data

    emit(
        source_agent="comms",
        type_="report_generated",
        payload=report_data,
        incident_id=incident_id,
        confidence=1.0,
        risk="low"
    )

    update_agent_metrics("decision", latency_ms=latency_ms, is_true_positive=True)
    return report_data

def get_all_reports():
    return list(reports_cache.values())
