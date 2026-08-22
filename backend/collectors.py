import asyncio
import uuid
import logging
from typing import Dict, Any, Optional

from backend.agents.detector_phishing import analyze_email
from backend.agents.detector_intrusion import analyze_log_entry
from backend.agents.detector_exfil import analyze_outbound_payload
from backend.agents.analyst import correlate_and_analyze
from backend.agents.remediation import propose_remediation
from backend.agents.caution import evaluate_proposal
from backend.agents.decision import decide_and_act
from backend.agents.comms import generate_incident_report

logger = logging.getLogger(__name__)

# In-memory incident tracking
active_incidents: Dict[str, Dict[str, Any]] = {}

async def run_full_incident_pipeline(
    attack_type: str,
    custom_data: Optional[Dict[str, Any]] = None,
    force_escalate: bool = False
) -> Dict[str, Any]:
    """
    Executes the complete SentinelSwarm SOC agent pipeline:
    Collector/Sensor -> Detector -> Analyst -> Remediation -> Caution -> Decision -> Comms
    """
    incident_id = f"INC-{str(uuid.uuid4())[:8].upper()}"
    attacker_ip = "192.168.43.103"
    detected_events = []

    # 1. Trigger appropriate detector based on attack_type
    if attack_type == "phishing":
        email_data = custom_data or {
            "subject": "URGENT: Executive Wire Transfer Authorization Required",
            "body": "Please verify your account and approve the pending wire transfer immediately. Click here: http://secure-nanditraders-auth.cc/verify",
            "sender": "accounts-spoof@external-relay.net",
            "display_name": "CEO - Nandi Traders"
        }
        ev = analyze_email(email_data, incident_id=incident_id)
        if ev:
            detected_events.append(ev)

    elif attack_type == "sqli":
        log_line = custom_data.get("log") if custom_data else "POST /login HTTP/1.1 200 - user='admin' OR '1'='1' -- pass=xxx"
        ev = analyze_log_entry(log_line, source_ip=attacker_ip, incident_id=incident_id)
        if ev:
            detected_events.append(ev)

    elif attack_type == "brute_force":
        # Simulate burst of failed attempts
        for _ in range(4):
            ev = analyze_log_entry("Failed password for root from 192.168.43.103 port 2222 ssh2", source_ip=attacker_ip, incident_id=incident_id)
            if ev and ev not in detected_events:
                detected_events.append(ev)

    elif attack_type == "exfil":
        exfil_data = custom_data.get("data") if custom_data else (
            "EXFIL_STREAM: customer_records.csv\n"
            "john.doe@example.com,4111-2221-3334-9999,987-65-4321\n"
            "sarah.c@company.org,5500-0001-2233-4455,123-45-6789\n"
            "rajesh.k@nanditraders.in,4000-1234-5678-9010,555-44-3322\n"
        )
        ev = analyze_outbound_payload(exfil_data, destination="9000", incident_id=incident_id)
        if ev:
            detected_events.append(ev)

    elif attack_type == "full_chain":
        # Recon -> SQLi -> Exfil combined
        analyze_log_entry("GET /admin/setup.php HTTP/1.1 404 - PROBE", source_ip=attacker_ip, incident_id=incident_id)
        ev1 = analyze_log_entry("POST /login HTTP/1.1 200 - user=' UNION SELECT * FROM users --", source_ip=attacker_ip, incident_id=incident_id)
        ev2 = analyze_outbound_payload("customer_emails: alice@example.com, bob@example.com, dev@nanditraders.in | CC: 4111-2222-3333-4444", destination="9000", incident_id=incident_id)
        if ev1: detected_events.append(ev1)
        if ev2: detected_events.append(ev2)

    if not detected_events:
        # Guarantee baseline event for pipeline continuity
        ev = analyze_log_entry("POST /login HTTP/1.1 200 - user=' OR '1'='1' --", source_ip=attacker_ip, incident_id=incident_id)
        if ev: detected_events.append(ev)

    # 2. Analyst Agent correlation & narrative synthesis
    await asyncio.sleep(1.2)
    analysis_event = correlate_and_analyze(detected_events, incident_id=incident_id, attacker_ip=attacker_ip)
    narrative = analysis_event["payload"].get("narrative", "")
    mitre_chain = analysis_event["payload"].get("mitre_chain", [])

    # 3. Remediation Agent proposal formulation
    await asyncio.sleep(1.4)
    remediation_event = propose_remediation(incident_id=incident_id, attacker_ip=attacker_ip)

    # 4. Caution Agent safety veto evaluation
    await asyncio.sleep(1.2)
    caution_result = evaluate_proposal(remediation_event["payload"], incident_id=incident_id)

    # Check master defense toggle (Active vs Deactivated)
    import backend.demo_control as dc
    is_defense_active = getattr(dc, "defense_active", True)

    if not is_defense_active:
        # Defense is Deactivated: simulate unprotected baseline breach
        await asyncio.sleep(1.0)
        from backend.context_bus import emit
        decision_result = {
            "outcome": "DEFENSE_DEACTIVATED",
            "action": "none",
            "reason": "SentinelSwarm autonomous defense was switched OFF / DEACTIVATED. Adversary breached Nandi Traders perimeter without automated containment."
        }
        emit(
            source_agent="decision",
            type_="breach_uncontained",
            payload={
                "incident_id": incident_id,
                "target": attacker_ip,
                "status": "BREACH_UNCONTAINED",
                "warning": "⚠️ SENTINELSWARM DEFENSE IS DEACTIVATED: Attack breached Nandi Traders without automated firewall containment!",
                "outcome": "DEFENSE_DEACTIVATED"
            },
            incident_id=incident_id,
            confidence=1.0,
            risk="critical"
        )
        report = {
            "report_text": f"⚠️ PERIMETER BREACH (DEFENSE DEACTIVATED): Adversary launched {attack_type} against Nandi Traders. Because SentinelSwarm autonomous defense was DEACTIVATED, no firewall containment or automated remediation was applied, leaving systems exposed.",
            "status": "UNPROTECTED_BREACH"
        }
        active_status = "BREACH_UNCONTAINED"
    else:
        # 5. Governed Decision Agent voting & execution
        await asyncio.sleep(1.3)
        decision_result = decide_and_act(
            incident_id=incident_id,
            analysis_conf=analysis_event.get("confidence", 0.9),
            remediation_proposal=remediation_event["payload"],
            caution_result=caution_result,
            force_escalate=force_escalate
        )

        # 6. Comms Agent Executive Report
        await asyncio.sleep(1.0)
        report = generate_incident_report(
            incident_id=incident_id,
            narrative=narrative,
            mitre_chain=mitre_chain,
            outcome=decision_result["outcome"],
            target=attacker_ip
        )
        active_status = "RESOLVED" if decision_result["outcome"] == "AUTO_EXECUTE" else "AWAITING_HUMAN"

    active_incidents[incident_id] = {
        "incident_id": incident_id,
        "attacker_ip": attacker_ip,
        "attack_type": attack_type,
        "narrative": narrative,
        "mitre_chain": mitre_chain,
        "outcome": decision_result["outcome"],
        "status": active_status
    }

    # Automatically persist all events and detailed executive brief to incident_records/<incident_id>/
    from backend.incident_storage import record_incident_dossier
    dossier = record_incident_dossier(
        incident_id=incident_id,
        attack_type=attack_type,
        attacker_ip=attacker_ip,
        narrative=narrative,
        mitre_chain=mitre_chain,
        outcome=decision_result["outcome"],
        status=active_incidents[incident_id]["status"],
        report_text=report.get("report_text", "")
    )

    # Automatically trigger human WhatsApp / Voice escalation chain if human approval required
    if is_defense_active and decision_result["outcome"] == "ESCALATE_TO_HUMAN":
        from backend.escalation import start_human_escalation_chain
        asyncio.create_task(
            start_human_escalation_chain(
                incident_id=incident_id,
                summary=narrative,
                target_ip=attacker_ip
            )
        )

    return {
        "incident_id": incident_id,
        "analysis": analysis_event,
        "decision": decision_result,
        "report": report,
        "dossier": dossier
    }
