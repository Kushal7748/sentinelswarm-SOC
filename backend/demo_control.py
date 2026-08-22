from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.collectors import run_full_incident_pipeline, active_incidents
from backend.agents.main_agent import degrade_agent, get_all_scores, update_agent_metrics
from backend.agents.comms import get_all_reports
from backend.agents.decision import execute_action
from backend.context_bus import emit

router = APIRouter(prefix="/api/demo", tags=["demo_control"])

# Master Swarm Protection State
defense_active: bool = True

class ToggleDefenseRequest(BaseModel):
    active: bool

class InjectAttackRequest(BaseModel):
    attack_type: str  # phishing, sqli, brute_force, exfil, full_chain
    custom_data: Optional[Dict[str, Any]] = None
    force_escalate: Optional[bool] = False

class DegradeAgentRequest(BaseModel):
    agent_name: str
    penalty: Optional[int] = 30

class HumanActionRequest(BaseModel):
    incident_id: str
    action: str  # APPROVE or DENY
    target_ip: Optional[str] = "192.168.1.8"

@router.get("/defense-status")
async def get_defense_status():
    return {
        "defense_active": defense_active,
        "status": "ACTIVE" if defense_active else "DEACTIVATED",
        "description": "Autonomous containment & self-healing enabled" if defense_active else "Swarm containment bypassed (demonstrating unprotected target)"
    }

@router.post("/toggle-defense")
async def toggle_defense(req: ToggleDefenseRequest):
    global defense_active
    defense_active = bool(req.active)
    
    emit(
        source_agent="main_agent",
        type_="defense_mode_changed",
        payload={
            "defense_active": defense_active,
            "status": "ACTIVE" if defense_active else "DEACTIVATED",
            "message": "SentinelSwarm Defense ARMED (Protecting Nandi Traders)" if defense_active else "SentinelSwarm Defense DEACTIVATED (Simulating Unprotected Nandi Traders)"
        },
        confidence=1.0,
        risk="low" if defense_active else "high"
    )
    return {
        "defense_active": defense_active,
        "status": "ACTIVE" if defense_active else "DEACTIVATED",
        "message": f"Swarm defense is now {'ACTIVE (Protecting Nandi Traders)' if defense_active else 'DEACTIVATED (Simulating Unprotected Nandi Traders)'}"
    }

@router.post("/inject-attack")
async def inject_attack(req: InjectAttackRequest, background_tasks: BackgroundTasks):
    """Triggers end-to-end incident detection and response pipeline."""
    # Run in background so WebSocket events stream live to frontend
    background_tasks.add_task(
        run_full_incident_pipeline,
        attack_type=req.attack_type,
        custom_data=req.custom_data,
        force_escalate=bool(req.force_escalate)
    )
    return {"status": "INJECTED", "attack_type": req.attack_type, "message": "Incident pipeline activated across sensors"}

@router.post("/degrade-agent")
async def trigger_agent_degradation(req: DegradeAgentRequest):
    """Simulates performance degradation to trigger self-healing hot-swap."""
    res = degrade_agent(req.agent_name, penalty_amount=req.penalty or 30)
    if not res:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "DEGRADED", "agent": req.agent_name, "metrics": res}

@router.post("/human-action")
async def human_action(req: HumanActionRequest):
    """Allows human reviewer to execute, hold, or investigate containment from Dashboard / WhatsApp."""
    incident = active_incidents.get(req.incident_id, {})
    target = req.target_ip or incident.get("attacker_ip", "192.168.1.8")
    action_upper = req.action.upper()
    
    emit(
        source_agent="human_reviewer",
        type_="human_response",
        payload={
            "incident_id": req.incident_id,
            "decision": req.action,
            "channel": "DASHBOARD_UI",
            "target": target
        },
        incident_id=req.incident_id,
        confidence=1.0,
        risk="low"
    )

    from backend.incident_storage import record_incident_dossier

    if action_upper in ["APPROVE", "EXECUTE", "1", "EXECUTE_AUTOMATICALLY"]:
        action_res = execute_action("isolate_ip", target, req.incident_id)
        if req.incident_id in active_incidents:
            active_incidents[req.incident_id]["status"] = "RESOLVED"
            active_incidents[req.incident_id]["decision_source"] = "HUMAN_OPERATOR"
            
        record_incident_dossier(
            incident_id=req.incident_id,
            attack_type=incident.get("attack_type", "Security Incident"),
            attacker_ip=target,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_DASHBOARD_EXECUTE",
            status="RESOLVED",
            custom_notes="Operator approved containment via Dashboard UI"
        )
        return {"status": "ACTION_EXECUTED", "action": action_res, "message": f"IP {target} isolated successfully."}
        
    elif action_upper in ["INVESTIGATE", "3", "QUARANTINE"]:
        if req.incident_id in active_incidents:
            active_incidents[req.incident_id]["status"] = "UNDER_INVESTIGATION"
            active_incidents[req.incident_id]["decision_source"] = "HUMAN_OPERATOR"
            
        record_incident_dossier(
            incident_id=req.incident_id,
            attack_type=incident.get("attack_type", "Security Incident"),
            attacker_ip=target,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_DASHBOARD_QUARANTINE",
            status="UNDER_INVESTIGATION",
            custom_notes="Operator selected Option 3 (Quarantine & Forensics) via Dashboard UI"
        )
        return {"status": "UNDER_INVESTIGATION", "incident_id": req.incident_id, "message": "Sessions quarantined for deep forensics."}
        
    else:  # DENY, HOLD, DONT_EXECUTE, 2
        if req.incident_id in active_incidents:
            active_incidents[req.incident_id]["status"] = "HELD_BY_HUMAN"
            active_incidents[req.incident_id]["decision_source"] = "HUMAN_OPERATOR"
            
        record_incident_dossier(
            incident_id=req.incident_id,
            attack_type=incident.get("attack_type", "Security Incident"),
            attacker_ip=target,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_DASHBOARD_HOLD",
            status="HELD_BY_HUMAN",
            custom_notes="Operator selected Option 2 (Hold & Monitor) via Dashboard UI"
        )
        return {"status": "HELD_BY_HUMAN", "incident_id": req.incident_id, "message": "Automatic execution halted. Perimeter in monitoring mode."}

@router.get("/health-scores")
async def health_scores():
    return get_all_scores()

@router.get("/reports")
async def reports():
    return get_all_reports()

@router.get("/active-incident")
async def get_active_incident():
    if not active_incidents:
        return {}
    # Return latest incident
    latest_id = list(active_incidents.keys())[-1]
    return active_incidents[latest_id]

class WhatsAppQARequest(BaseModel):
    question: Optional[str] = "check the status of firewall"

@router.post("/simulate-whatsapp-qa")
async def simulate_whatsapp_qa(req: WhatsAppQARequest):
    from backend.escalation import handle_human_reply
    reply = await handle_human_reply(body=req.question or "check the status of firewall", from_number="WHATSAPP_TEST")
    return {"question": req.question, "answer": reply, "status": "SUCCESS"}

@router.post("/reset")
async def reset_demo_endpoint():
    from backend.reset_demo import reset_entire_demo
    reset_entire_demo()
    return {"status": "RESET_COMPLETE", "message": "SentinelSwarm has been reset to baseline state."}
