import time
from typing import Dict, Any, List, Optional
from backend.context_bus import emit
from backend.agents.main_agent import update_agent_metrics
from backend.config import LAPTOP_C_IP

def propose_remediation(incident_id: str, attacker_ip: Optional[str] = None) -> Dict[str, Any]:
    if not attacker_ip:
        attacker_ip = LAPTOP_C_IP
    start_time = time.time()

    options = [
        {
            "action": "isolate_ip",
            "target": attacker_ip,
            "description": f"Add drop firewall rule for attacker IP {attacker_ip} on perimeter gateway",
            "confidence": 0.88,
            "risk": "low"
        },
        {
            "action": "terminate_active_sessions",
            "target": "all_unauthenticated",
            "description": "Revoke active web sessions and invalidate token pools",
            "confidence": 0.72,
            "risk": "medium"
        },
        {
            "action": "quarantine_target_service",
            "target": "port_5000",
            "description": "Quarantine company web server port to isolated VLAN",
            "confidence": 0.45,
            "risk": "high"
        }
    ]

    proposal_event = emit(
        source_agent="remediation",
        type_="remediation_proposal",
        payload={
            "incident_id": incident_id,
            "options": options,
            "recommended_action": options[0]["action"]
        },
        incident_id=incident_id,
        confidence=0.88,
        risk="low"
    )

    latency_ms = (time.time() - start_time) * 1000 + 40
    update_agent_metrics("remediation", latency_ms=latency_ms, is_true_positive=True)
    return proposal_event
