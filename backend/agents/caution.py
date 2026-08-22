import time
from typing import Dict, Any, Optional
from backend.context_bus import emit
from backend.agents.main_agent import update_agent_metrics

def evaluate_proposal(proposal_data: Dict[str, Any], incident_id: str) -> Dict[str, Any]:
    start_time = time.time()
    
    options = proposal_data.get("options", [])
    if not options:
        veto_event = emit(
            source_agent="caution",
            type_="veto",
            payload={"incident_id": incident_id, "reason": "No valid remediation options proposed"},
            incident_id=incident_id,
            confidence=1.0,
            risk="high"
        )
        update_agent_metrics("caution", latency_ms=10, is_true_positive=True)
        return {"veto": True, "reason": "No valid remediation options proposed", "event": veto_event}

    top_option = max(options, key=lambda o: o.get("confidence", 0))
    top_confidence = top_option.get("confidence", 0)
    top_risk = top_option.get("risk", "high")

    # Safety check rules
    if top_confidence < 0.70:
        reason = f"Top action confidence {top_confidence:.2f} is below minimum safety threshold (0.70)"
        veto_event = emit(
            source_agent="caution",
            type_="veto",
            payload={"incident_id": incident_id, "reason": reason, "top_action": top_option["action"]},
            incident_id=incident_id,
            confidence=0.95,
            risk="medium"
        )
        update_agent_metrics("caution", latency_ms=15, is_true_positive=True)
        return {"veto": True, "reason": reason, "event": veto_event}
    
    if top_risk == "high":
        reason = f"Top action '{top_option['action']}' carries HIGH risk of service disruption"
        veto_event = emit(
            source_agent="caution",
            type_="veto",
            payload={"incident_id": incident_id, "reason": reason, "top_action": top_option["action"]},
            incident_id=incident_id,
            confidence=0.95,
            risk="high"
        )
        update_agent_metrics("caution", latency_ms=15, is_true_positive=True)
        return {"veto": True, "reason": reason, "event": veto_event}

    latency_ms = (time.time() - start_time) * 1000 + 15
    update_agent_metrics("caution", latency_ms=latency_ms, is_true_positive=True)
    return {"veto": False, "selected_action": top_option}

def check_commerce_veto(estimated_cost_usdc: float, current_incident_spend: float = 0.0, max_per_incident: float = 5.00) -> Dict[str, Any]:
    """
    Caution Agent Veto check branch for commerce_request events exceeding per-incident budget ($5.00).
    """
    if (current_incident_spend + estimated_cost_usdc) > max_per_incident:
        reason = f"Per-incident spending budget exceeded: ${current_incident_spend + estimated_cost_usdc:.2f} > ${max_per_incident:.2f}"
        emit(
            source_agent="caution",
            type_="veto",
            payload={"reason": reason, "estimated_cost_usdc": estimated_cost_usdc, "current_incident_spend": current_incident_spend},
            confidence=1.0,
            risk="high"
        )
        return {"vetoed": True, "reason": reason}
    return {"vetoed": False, "reason": ""}
