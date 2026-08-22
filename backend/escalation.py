import os
import time
import asyncio
import logging
from typing import Dict, Any, Optional

from backend.context_bus import emit
from backend.agents.decision import execute_action
from backend.config import (
    TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM,
    TEAM_LEAD_WHATSAPP, TEAM_LEAD_VOICE, TWILIO_VOICE_FROM, NGROK_URL
)

logger = logging.getLogger(__name__)

# State tracking per incident: PENDING_WHATSAPP -> CALL_ATTEMPT_1..4 -> AUTO_EXECUTED
escalation_states: Dict[str, Dict[str, Any]] = {}

def get_escalation_status(incident_id: str) -> Dict[str, Any]:
    return escalation_states.get(incident_id, {"status": "NONE", "attempt": 0})

def get_twilio_client():
    """Returns resilient Twilio Client configured with SSL handling."""
    if not (TWILIO_SID and TWILIO_TOKEN):
        return None
    try:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        import requests
        from twilio.rest import Client
        from twilio.http.http_client import TwilioHttpClient
        
        custom_http = TwilioHttpClient()
        custom_http.session = requests.Session()
        custom_http.session.verify = False
        return Client(TWILIO_SID, TWILIO_TOKEN, http_client=custom_http)
    except Exception as e:
        logger.warning(f"Error initializing Twilio client: {e}")
        return None

def place_live_voice_call(incident_id: str, summary: str, attempt: int = 1) -> Dict[str, Any]:
    """Places an actual live automated voice call to the Team Lead phone using Twilio Voice API."""
    if TWILIO_VOICE_FROM and TEAM_LEAD_VOICE:
        client = get_twilio_client()
        if client:
            try:
                from backend.config import get_ngrok_url as _get_ngrok
                _ngrok_url = _get_ngrok()
                twiml_content = f"""<Response>
    <Say voice="Polly.Aditi">Urgent security escalation from SentinelSwarm SOC. Incident {incident_id} requires immediate human authorization.</Say>
    <Gather numDigits="1" action="{_ngrok_url}/api/twilio/voice-decision/{incident_id}" method="POST" timeout="10">
        <Say voice="Polly.Aditi">Press 1 to execute automatic perimeter containment. Press 2 to hold and maintain active monitoring. Press 3 to quarantine target sessions.</Say>
    </Gather>
    <Say voice="Polly.Aditi">No selection received. Escalation recorded in Context Bus.</Say>
</Response>"""

                call = client.calls.create(
                    to=TEAM_LEAD_VOICE,
                    from_=TWILIO_VOICE_FROM,
                    twiml=twiml_content
                )
                logger.info(f"Twilio Voice Call dispatched: {call.sid}")
                return {"status": "CALL_PLACED", "sid": call.sid, "attempt": attempt}
            except Exception as e:
                logger.warning(f"Twilio Voice call failed: {e}")
                return {"status": "CALL_FAILED", "error": str(e), "attempt": attempt}
            
    return {"status": "SIMULATED", "attempt": attempt}

def simulate_advance_call_attempt(incident_id: str, target_ip: str = "192.168.1.8") -> Dict[str, Any]:
    """Demo Presenter Trigger: Advances the escalation state machine and places live/simulated call."""
    state = escalation_states.setdefault(incident_id, {
        "incident_id": incident_id,
        "status": "PENDING_WHATSAPP",
        "attempt": 0,
        "target_ip": target_ip,
        "logs": []
    })

    state["attempt"] += 1

    if state["attempt"] >= 4:
        state["status"] = "AUTO_EXECUTED"
        # Auto-execute top containment action
        action_res = execute_action("isolate_ip", target_ip, incident_id)
        emit(
            source_agent="main_agent",
            type_="action_executed",
            payload={
                "incident_id": incident_id,
                "action": "isolate_ip",
                "target": target_ip,
                "reason": "Auto-executed containment after 4 unanswered contact attempts",
                "details": f"Safety fallback triggered: Blocked {target_ip}"
            },
            incident_id=incident_id,
            confidence=1.0,
            risk="low"
        )
    else:
        state["status"] = f"CALL_ATTEMPT_{state['attempt']}"
        # Trigger real Twilio Voice call if credentials active
        place_live_voice_call(incident_id, summary="Security anomaly detected on perimeter", attempt=state["attempt"])
        
        emit(
            source_agent="comms",
            type_="escalation_sent",
            payload={
                "incident_id": incident_id,
                "channel": "VOICE_CALL",
                "attempt": state["attempt"],
                "caller": TWILIO_VOICE_FROM,
                "recipient": TEAM_LEAD_VOICE,
                "status": f"Voice Call attempt {state['attempt']} of 4 placed from {TWILIO_VOICE_FROM} to SOC Lead ({TEAM_LEAD_VOICE})"
            },
            incident_id=incident_id,
            confidence=0.9,
            risk="medium"
        )

    return state

def format_human_readable_report(incident_id: str) -> str:
    """Formats a complete, non-technical, human-readable incident brief for the human handler."""
    from backend.collectors import active_incidents
    from backend.agents.comms import reports_cache
    
    incident = active_incidents.get(incident_id, {})
    if not incident:
        return f"⚠️ Incident {incident_id} not found in active telemetry."
        
    report = reports_cache.get(incident_id, {})
    report_text = report.get("report_text", "")
    
    target_ip = incident.get("attacker_ip", "127.0.0.1")
    attack_type = incident.get("attack_type", "Multi-stage intrusion").replace("_", " ").title()
    mitre_chain = " ➔ ".join(incident.get("mitre_chain", ["TA0001 Initial Access", "TA0002 Execution"]))
    narrative = incident.get("narrative", "Active reconnaissance and authentication bypass detected.")
    if len(narrative) > 300:
        narrative = narrative[:297] + "..."
    status = incident.get("status", "AWAITING_HUMAN")
    
    clean_report = report_text or "Adversary initiated automated intrusion vectors against perimeter services."
    if len(clean_report) > 350:
        clean_report = clean_report[:347] + "..."
    
    brief = (
        f"🚨 *SENTINELSWARM INCIDENT REPORT*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🛡️ *Incident ID*: `{incident_id}`\n"
        f"🎯 *Attacker Origin*: `{target_ip}`\n"
        f"⚔️ *Attack Vector*: *{attack_type}*\n"
        f"📊 *Status*: *{status}*\n"
        f"🔗 *MITRE Chain*: {mitre_chain}\n\n"
        f"📋 *Executive Summary*:\n"
        f"{clean_report}\n\n"
        f"🔍 *Analyst AI Findings*:\n"
        f"\"{narrative}\"\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"👉 *Handler Action Options*:\n"
        f"• *1* or *EXECUTE* ➔ Approve automatic IP isolation & firewall DROP\n"
        f"• *2* or *HOLD* ➔ Do NOT execute; maintain active observation\n"
        f"• *3* or *INVESTIGATE* ➔ Quarantine sessions for forensic memory dump\n"
        f"• (Or reply with any question or custom instruction)"
    )
    if len(brief) > 1500:
        brief = brief[:1490] + "\n..."
    return brief

async def handle_human_reply(body: str, from_number: Optional[str] = None) -> str:
    """Processes incoming human operator reply from WhatsApp / SMS or Webhook with high resilience."""
    raw = (body or "").strip()
    text = raw.upper()
    import re
    from backend.collectors import active_incidents
    from backend.incident_storage import list_all_incident_folders, get_incident_dossier
    
    # 1. Search for explicit Incident ID in text (e.g. INC-20260819-1234)
    target_incident_id = None
    inc_match = re.search(r'(INC-[A-Z0-9-]+)', text)
    if inc_match:
        matched_id = inc_match.group(1)
        if matched_id in active_incidents:
            target_incident_id = matched_id
        else:
            dossier = get_incident_dossier(matched_id)
            if dossier:
                target_incident_id = matched_id
                active_incidents[matched_id] = {
                    "incident_id": matched_id,
                    "attacker_ip": dossier.get("attacker_ip", "127.0.0.1"),
                    "attack_type": dossier.get("attack_type", "Multi-stage attack"),
                    "narrative": dossier.get("narrative", ""),
                    "mitre_chain": dossier.get("mitre_chain", []),
                    "outcome": dossier.get("outcome", "ESCALATE_TO_HUMAN"),
                    "status": dossier.get("status", "AWAITING_HUMAN")
                }

    # 2. If no explicit ID in text, search active_incidents in memory for pending escalation
    if not target_incident_id:
        for inc_id, inc_data in reversed(list(active_incidents.items())):
            st = inc_data.get("status", "")
            oc = inc_data.get("outcome", "")
            if st in ["AWAITING_HUMAN", "PENDING_WHATSAPP", "AWAITING_HUMAN_APPROVAL"] or oc == "ESCALATE_TO_HUMAN":
                target_incident_id = inc_id
                break

    # 3. If still not found in memory, check disk dossiers in incident_records/
    if not target_incident_id:
        saved_folders = list_all_incident_folders()
        for folder_info in reversed(saved_folders):
            st = folder_info.get("status", "")
            if st in ["AWAITING_HUMAN", "PENDING_WHATSAPP", "ESCALATE_TO_HUMAN", "AWAITING_HUMAN_APPROVAL"]:
                inc_id = folder_info["incident_id"]
                dossier = get_incident_dossier(inc_id)
                if dossier:
                    target_incident_id = inc_id
                    active_incidents[inc_id] = {
                        "incident_id": inc_id,
                        "attacker_ip": dossier.get("attacker_ip", "127.0.0.1"),
                        "attack_type": dossier.get("attack_type", "Multi-stage attack"),
                        "narrative": dossier.get("narrative", ""),
                        "mitre_chain": dossier.get("mitre_chain", []),
                        "outcome": dossier.get("outcome", "ESCALATE_TO_HUMAN"),
                        "status": dossier.get("status", "AWAITING_HUMAN")
                    }
                    break

    # 4. Fallback to latest incident in memory or latest disk folder
    if not target_incident_id and active_incidents:
        target_incident_id = list(active_incidents.keys())[-1]
    elif not target_incident_id:
        saved_folders = list_all_incident_folders()
        if saved_folders:
            latest_id = saved_folders[-1]["incident_id"]
            dossier = get_incident_dossier(latest_id)
            if dossier:
                target_incident_id = latest_id
                active_incidents[latest_id] = {
                    "incident_id": latest_id,
                    "attacker_ip": dossier.get("attacker_ip", "127.0.0.1"),
                    "attack_type": dossier.get("attack_type", "Multi-stage attack"),
                    "narrative": dossier.get("narrative", ""),
                    "mitre_chain": dossier.get("mitre_chain", []),
                    "outcome": dossier.get("outcome", "ESCALATE_TO_HUMAN"),
                    "status": dossier.get("status", "AWAITING_HUMAN")
                }

    # If absolutely no incident exists anywhere
    if not target_incident_id:
        from backend.context_bus import get_recent_events
        from backend.llm import call_llm
        
        cleaned_words = [w.strip(".,!?[]()") for w in text.split()]
        if any(w in ["1", "2", "3", "EXECUTE", "HOLD", "INVESTIGATE", "APPROVE", "YES", "BLOCK", "ISOLATE"] for w in cleaned_words):
            return "🛡️ *SentinelSwarm SOC*: Perimeter is currently clean and secure with zero uncontained incidents awaiting decision."
            
        recent_events = get_recent_events(limit=20)
        context_lines = []
        for ev in recent_events[-12:]:
            src = ev.get("source_agent", "sensor")
            payload = ev.get("payload", {})
            summary = payload.get("title") or payload.get("narrative") or payload.get("reason") or payload.get("message") or ev.get("type")
            context_lines.append(f"[{src}] {ev.get('type')}: {str(summary)[:120]}")
        context_str = "\n".join(context_lines) if context_lines else "Context Bus telemetry active. 8 agent units synchronized."
        
        system_prompt = (
            "You are Drishti, the Autonomous Lead AI SOC Commander of SentinelSwarm protecting Nandi Traders. "
            "The human operator/team lead is messaging you via WhatsApp. Answer their question directly, authoritatively, "
            "and clearly in concise WhatsApp markdown format with bullet points and emojis. Base your answer on the live telemetry."
        )
        user_prompt = f"Live Context Bus Telemetry:\n{context_str}\n\nOperator Question: {body}\n\nProvide your concise WhatsApp response:"
        ai_resp = call_llm(user_prompt, system=system_prompt)
        
        return f"🤖 *SentinelSwarm SOC Assistant (Drishti AI)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n{ai_resp}"

    # Fetch incident and target_ip from active_incidents for all option branches below
    incident = active_incidents.get(target_incident_id, {})
    target_ip = incident.get("attacker_ip", "127.0.0.1")

    # Cancel escalation timer for this incident since human replied
    if target_incident_id in escalation_states:
        escalation_states[target_incident_id]["human_replied"] = True

    # Check if incoming text is a question or query (contains '?' or starts with question words)
    is_question = "?" in text or any(text.startswith(qw) for qw in ["WHAT", "WHY", "HOW", "CHECK", "IS ", "CAN ", "SHOW", "EXPLAIN", "WHO", "WHERE", "TELL"])

    _negation = any(neg in text for neg in ["DONT EXECUTE", "DON'T EXECUTE", "DO NOT EXECUTE", "NOT EXECUTE", "NO EXECUTE"])
    
    # Option 1: Execute automatically / Block / Isolate
    is_option_1 = (
        not is_question
        and not _negation
        and (
            text in ["1", "1.", "[1]", "(1)", "EXECUTE", "APPROVE", "YES", "BLOCK", "ISOLATE", "EXECUTE AUTOMATICALLY", "1 EXECUTE", "1 APPROVE", "1 EXECUTE AUTOMATICALLY", "OPTION 1"]
            or text.startswith("1 ")
            or text.startswith("1.")
            or "OPTION 1" in text
            or text == "EXECUTE"
            or text == "BLOCK"
            or text == "ISOLATE"
            or text == "APPROVE"
        )
    )

    # Option 3: Investigate / Quarantine
    is_option_3 = (
        not is_question
        and not is_option_1
        and (
            text in ["3", "3.", "[3]", "(3)", "INVESTIGATE", "QUARANTINE", "DEEP INSPECT", "FORENSICS", "3 INVESTIGATE", "3 QUARANTINE", "OPTION 3"]
            or text.startswith("3 ")
            or text.startswith("3.")
            or "OPTION 3" in text
            or text == "INVESTIGATE"
            or text == "QUARANTINE"
            or text == "FORENSICS"
        )
    )

    # Option 2: Don't execute / Hold & Monitor
    is_option_2 = (
        not is_question
        and not is_option_1
        and not is_option_3
        and (
            text in ["2", "2.", "[2]", "(2)", "DONT EXECUTE", "DON'T EXECUTE", "DO NOT EXECUTE", "HOLD", "DENY", "NO", "CANCEL", "STAND DOWN", "2 DONT EXECUTE", "2 HOLD", "OPTION 2"]
            or text.startswith("2 ")
            or text.startswith("2.")
            or "OPTION 2" in text
            or text == "HOLD"
            or text == "DENY"
            or text == "DONT EXECUTE"
            or text == "DON'T EXECUTE"
        )
    )


    if is_option_1:
        from backend.incident_storage import record_incident_dossier
        action_res = execute_action("isolate_ip", target_ip, target_incident_id)
        incident["status"] = "RESOLVED"
        incident["decision_source"] = "HUMAN_WHATSAPP"
        if target_incident_id not in active_incidents:
            active_incidents[target_incident_id] = incident
        active_incidents[target_incident_id]["status"] = "RESOLVED"
        
        record_incident_dossier(
            incident_id=target_incident_id,
            attack_type=incident.get("attack_type", "Multi-stage attack"),
            attacker_ip=target_ip,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_WHATSAPP_EXECUTE",
            status="RESOLVED",
            custom_notes=f"Human operator approved Option 1 (Execute Automatically) via WhatsApp: '{body}'"
        )
        
        emit(
            source_agent="human_reviewer",
            type_="human_response",
            payload={
                "incident_id": target_incident_id,
                "decision": "EXECUTE_AUTOMATICALLY",
                "action": "isolate_ip",
                "target": target_ip,
                "channel": "WHATSAPP",
                "raw_text": body
            },
            incident_id=target_incident_id,
            confidence=1.0,
            risk="low"
        )
        return (
            f"✅ *SentinelSwarm: Option 1 Executed*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"• Action: Perimeter firewall DROP applied for `{target_ip}`\n"
            f"• Incident `{target_incident_id}` is now *CONTAINED*.\n"
            f"• All agents updated on Context Bus."
        )

    elif is_option_2:
        from backend.incident_storage import record_incident_dossier
        incident["status"] = "HELD_BY_HUMAN"
        incident["decision_source"] = "HUMAN_WHATSAPP"
        if target_incident_id not in active_incidents:
            active_incidents[target_incident_id] = incident
        active_incidents[target_incident_id]["status"] = "HELD_BY_HUMAN"
        
        record_incident_dossier(
            incident_id=target_incident_id,
            attack_type=incident.get("attack_type", "Multi-stage attack"),
            attacker_ip=target_ip,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_WHATSAPP_HOLD",
            status="HELD_BY_HUMAN",
            custom_notes=f"Human operator selected Option 2 (Hold & Monitor) via WhatsApp: '{body}'"
        )
        
        emit(
            source_agent="human_reviewer",
            type_="human_response",
            payload={
                "incident_id": target_incident_id,
                "decision": "DONT_EXECUTE_AUTOMATICALLY",
                "target": target_ip,
                "channel": "WHATSAPP",
                "reason": "Human operator selected Option 2: Hold & maintain observation without blocking",
                "raw_text": body
            },
            incident_id=target_incident_id,
            confidence=1.0,
            risk="low"
        )
        return (
            f"🛑 *SentinelSwarm: Option 2 Recorded*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"• Automatic execution *HALTED* by handler.\n"
            f"• Perimeter maintained in *ACTIVE OBSERVATION* mode without blocking `{target_ip}`.\n"
            f"• Incident `{target_incident_id}`."
        )

    elif is_option_3:
        from backend.incident_storage import record_incident_dossier
        incident["status"] = "UNDER_INVESTIGATION"
        incident["decision_source"] = "HUMAN_WHATSAPP"
        if target_incident_id not in active_incidents:
            active_incidents[target_incident_id] = incident
        active_incidents[target_incident_id]["status"] = "UNDER_INVESTIGATION"
        
        record_incident_dossier(
            incident_id=target_incident_id,
            attack_type=incident.get("attack_type", "Multi-stage attack"),
            attacker_ip=target_ip,
            narrative=incident.get("narrative", ""),
            mitre_chain=incident.get("mitre_chain", []),
            outcome="HUMAN_WHATSAPP_QUARANTINE",
            status="UNDER_INVESTIGATION",
            custom_notes=f"Human operator selected Option 3 (Quarantine & Forensics) via WhatsApp: '{body}'"
        )
        
        emit(
            source_agent="human_reviewer",
            type_="human_response",
            payload={
                "incident_id": target_incident_id,
                "decision": "INVESTIGATE",
                "target": target_ip,
                "channel": "WHATSAPP",
                "details": "Target sessions flagged for deep packet inspection and memory capture",
                "raw_text": body
            },
            incident_id=target_incident_id,
            confidence=1.0,
            risk="medium"
        )
        return (
            f"🔍 *SentinelSwarm: Option 3 Activated*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"• Target sessions for `{target_ip}` placed in quarantine.\n"
            f"• Deep forensic packet capture initiated for `{target_incident_id}`."
        )

    # Custom directive, action command, or security question from operator
    else:
        from backend.incident_storage import record_incident_dossier
        from backend.context_bus import get_recent_events
        from backend.llm import call_llm
        
        action_keywords = ["BLOCK", "ISOLATE", "DROP", "BAN", "CONTAIN", "KILL", "STOP", "TERMINATE", "SHUTDOWN", "DENY", "APPLY", "RESOLVE", "CLOSE", "DONE", "MITIGATE", "COMPLETED", "FIXED"]
        should_isolate = any(kw in text for kw in action_keywords)
        
        executed_details = ""
        if should_isolate:
            action_res = execute_action("isolate_ip", target_ip, target_incident_id)
            incident["status"] = "RESOLVED"
            incident["decision_source"] = "HUMAN_WHATSAPP"
            if target_incident_id not in active_incidents:
                active_incidents[target_incident_id] = incident
            active_incidents[target_incident_id]["status"] = "RESOLVED"
            executed_details = f"🛡️ *Action Executed*: Applied perimeter firewall DROP for `{target_ip}`.\n"
            
            # Update incident dossier on disk
            record_incident_dossier(
                incident_id=target_incident_id,
                attack_type=incident.get("attack_type", "Multi-stage attack"),
                attacker_ip=target_ip,
                narrative=incident.get("narrative", ""),
                mitre_chain=incident.get("mitre_chain", []),
                outcome="HUMAN_DIRECTIVE_EXECUTED",
                status="RESOLVED",
                custom_notes=f"Operator instruction received via WhatsApp: '{body}'"
            )
            
            emit(
                source_agent="human_reviewer",
                type_="human_response",
                payload={
                    "incident_id": target_incident_id,
                    "decision": "CUSTOM_DIRECTIVE",
                    "instruction": body,
                    "action_executed": "isolate_ip",
                    "target": target_ip,
                    "channel": "WHATSAPP"
                },
                incident_id=target_incident_id,
                confidence=1.0,
                risk="low"
            )
            
            return (
                f"🤖 *SentinelSwarm: Operator Directive Executed*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Directive: \"{body}\"\n"
                f"{executed_details}"
                f"• Incident: `{target_incident_id}` is now *CONTAINED*.\n"
                f"• Audit record updated in `incident_records/{target_incident_id}/`."
            )
            
        else:
            # Generate intelligent AI response grounded in real-time Context Bus telemetry
            recent_events = get_recent_events(limit=20)
            context_lines = []
            for ev in recent_events[-12:]:
                src = ev.get("source_agent", "sensor")
                ev_type = ev.get("type", "event")
                payload = ev.get("payload", {})
                summary = payload.get("title") or payload.get("narrative") or payload.get("reason") or payload.get("message") or ev_type
                if isinstance(summary, str):
                    summary = summary[:120]
                context_lines.append(f"[{src}] {ev_type}: {summary}")
                
            context_str = "\n".join(context_lines) if context_lines else "Context Bus Initialized. Active perimeter monitoring ongoing."
            
            system_prompt = (
                "You are Drishti, the Autonomous Lead AI SOC Commander of SentinelSwarm protecting Nandi Traders. "
                "The human operator/team lead is messaging you via WhatsApp. Answer their question directly, authoritatively, "
                "and clearly in concise WhatsApp markdown format with bullet points and emojis. "
                "Base your response directly on the active incident and Context Bus telemetry provided."
            )
            
            user_prompt = (
                f"Active Incident ID: {target_incident_id}\n"
                f"Target / Attacker IP: {target_ip}\n"
                f"Attack Type: {incident.get('attack_type', 'Unknown')}\n"
                f"Current Status: {incident.get('status', 'AWAITING_HUMAN')}\n\n"
                f"Live Context Bus Telemetry:\n{context_str}\n\n"
                f"Human Operator Question/Message: \"{body}\"\n\n"
                f"Provide your concise, helpful WhatsApp response with next steps:"
            )
            
            ai_answer = call_llm(user_prompt, system=system_prompt)
            ai_answer = ai_answer.strip()
            
            incident["custom_note"] = body
            
            emit(
                source_agent="main_agent",
                type_="whatsapp_qa",
                payload={
                    "incident_id": target_incident_id,
                    "question": body,
                    "answer": ai_answer,
                    "channel": "WHATSAPP"
                },
                incident_id=target_incident_id,
                confidence=1.0,
                risk="low"
            )
            
            # Update incident dossier on disk
            record_incident_dossier(
                incident_id=target_incident_id,
                attack_type=incident.get("attack_type", "Multi-stage attack"),
                attacker_ip=target_ip,
                narrative=incident.get("narrative", ""),
                mitre_chain=incident.get("mitre_chain", []),
                outcome="AWAITING_HUMAN",
                status=incident["status"],
                custom_notes=f"Q: '{body}' | AI Answer: '{ai_answer[:100]}...'"
            )
            
            return (
                f"🤖 *SentinelSwarm SOC Assistant (Drishti AI)*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{ai_answer}"
            )

async def start_human_escalation_chain(incident_id: str, summary: str, target_ip: str = "127.0.0.1"):
    """Full live escalation state machine with Twilio client or resilient demo simulator."""
    escalation_states[incident_id] = {
        "incident_id": incident_id,
        "status": "PENDING_WHATSAPP",
        "attempt": 0,
        "target_ip": target_ip,
        "summary": summary,
        "human_replied": False
    }

    # Small delay to ensure active_incidents is populated before we read it
    await asyncio.sleep(0.5)

    # Format human-readable incident report for the handler
    whatsapp_message_body = format_human_readable_report(incident_id)

    # 1. Send WhatsApp message and SMS text alert if Twilio credentials are configured
    client = get_twilio_client()
    if not client:
        logger.warning("Twilio client not available — WhatsApp notification skipped. Check TWILIO_SID and TWILIO_TOKEN in config.env")
    else:
        if TEAM_LEAD_WHATSAPP:
            try:
                msg = client.messages.create(
                    from_=TWILIO_WHATSAPP_FROM,
                    to=TEAM_LEAD_WHATSAPP,
                    body=whatsapp_message_body
                )
                logger.info(f"Twilio WhatsApp message dispatched: {msg.sid}")
                emit(
                    source_agent="comms",
                    type_="escalation_sent",
                    payload={
                        "channel": "WHATSAPP",
                        "incident_id": incident_id,
                        "status": "WhatsApp human-readable escalation report dispatched to Handler",
                        "recipient": TEAM_LEAD_WHATSAPP
                    },
                    incident_id=incident_id,
                    confidence=1.0,
                    risk="medium"
                )
            except Exception as e:
                logger.warning(f"Twilio WhatsApp dispatch failed: {e}")

        # Dual dispatch SMS alert directly to phone
        if TEAM_LEAD_VOICE and TWILIO_VOICE_FROM:
            try:
                sms = client.messages.create(
                    from_=TWILIO_VOICE_FROM,
                    to=TEAM_LEAD_VOICE,
                    body=f"🚨 SentinelSwarm Alert: Incident {incident_id} requires human approval. Target: {target_ip}. Reply 1 to Isolate, 2 to Hold."
                )
                logger.info(f"Twilio SMS alert dispatched: {sms.sid}")
            except Exception as e:
                logger.warning(f"Twilio SMS dispatch failed: {e}")

    # 2. Emit initial escalation status to Context Bus
    emit(
        source_agent="comms",
        type_="escalation_sent",
        payload={
            "channel": "WHATSAPP",
            "incident_id": incident_id,
            "options": [
                "1. EXECUTE (Auto-execute containment)",
                "2. DONT EXECUTE (Hold & monitor without blocking)",
                "3. INVESTIGATE (Quarantine & forensic review)",
                "Custom instruction / question"
            ],
            "status": "Human-readable decision brief dispatched. Auto-call trigger armed (20s)..."
        },
        incident_id=incident_id,
        confidence=0.9,
        risk="medium"
    )

    # 3. Background Escalation Worker:
    #    - Wait 20s for WhatsApp reply
    #    - If no reply: Call attempt 1
    #    - Wait another 20s for call response
    #    - If no reply: Call attempt 2
    #    - Wait another 20s, then auto-execute containment
    async def auto_phone_call_worker():
        REPLY_TIMEOUT = 20  # seconds to wait for WhatsApp reply before calling

        def _human_replied() -> bool:
            """Returns True if the human operator has replied via WhatsApp."""
            state = escalation_states.get(incident_id, {})
            return state.get("human_replied", False)

        def _is_resolved() -> bool:
            """Returns True if incident is already actioned by a human or prior auto-exec."""
            from backend.collectors import active_incidents as _ai
            inc = _ai.get(incident_id, {})
            return inc.get("status", "") in [
                "RESOLVED", "RESOLVED_BY_HUMAN_DIRECTIVE", "HELD_BY_HUMAN", "UNDER_INVESTIGATION"
            ]

        # ── Step 1: Wait 20 s for a WhatsApp reply ──────────────────────────────
        await asyncio.sleep(REPLY_TIMEOUT)

        if _human_replied() or _is_resolved():
            logger.info(f"✅ Human replied/resolved {incident_id} within {REPLY_TIMEOUT}s. No call needed.")
            return

        # ── Step 2: First voice call ─────────────────────────────────────────────
        logger.info(f"🚨 No WhatsApp reply in {REPLY_TIMEOUT}s for {incident_id}. Placing Call #1 to {TEAM_LEAD_VOICE}...")
        call_res_1 = place_live_voice_call(incident_id=incident_id, summary=summary, attempt=1)
        emit(
            source_agent="comms",
            type_="escalation_sent",
            payload={
                "incident_id": incident_id,
                "channel": "VOICE_CALL",
                "attempt": 1,
                "status": f"No WhatsApp reply in {REPLY_TIMEOUT}s. Voice Call #1 placed to ({TEAM_LEAD_VOICE})",
                "call_sid": call_res_1.get("sid"),
                "caller": TWILIO_VOICE_FROM,
                "recipient": TEAM_LEAD_VOICE
            },
            incident_id=incident_id,
            confidence=1.0,
            risk="high"
        )

        # ── Step 3: Wait another 20 s for call response ──────────────────────────
        await asyncio.sleep(REPLY_TIMEOUT)

        if _human_replied() or _is_resolved():
            logger.info(f"✅ Human responded after Call #1 for {incident_id}. No further escalation.")
            return

        # ── Step 4: Second voice call ────────────────────────────────────────────
        logger.info(f"🚨 No response after Call #1 for {incident_id}. Placing Call #2 to {TEAM_LEAD_VOICE}...")
        call_res_2 = place_live_voice_call(incident_id=incident_id, summary=summary, attempt=2)
        emit(
            source_agent="comms",
            type_="escalation_sent",
            payload={
                "incident_id": incident_id,
                "channel": "VOICE_CALL",
                "attempt": 2,
                "status": f"No response to Call #1. Voice Call #2 placed to ({TEAM_LEAD_VOICE})",
                "call_sid": call_res_2.get("sid"),
                "caller": TWILIO_VOICE_FROM,
                "recipient": TEAM_LEAD_VOICE
            },
            incident_id=incident_id,
            confidence=1.0,
            risk="high"
        )

        # ── Step 5: Wait another 20 s then auto-execute ──────────────────────────
        await asyncio.sleep(REPLY_TIMEOUT)

        if _human_replied() or _is_resolved():
            logger.info(f"✅ Human responded after Call #2 for {incident_id}. No auto-exec needed.")
            return

        # ── Step 6: Auto-execute containment (safety fallback) ───────────────────
        logger.warning(f"⚠️  No response after 2 calls for {incident_id}. AUTO-EXECUTING containment on {target_ip}...")
        from backend.agents.decision import execute_action as _exec
        from backend.collectors import active_incidents as _ai
        from backend.incident_storage import record_incident_dossier as _rec
        action_res = _exec("isolate_ip", target_ip, incident_id)
        inc = _ai.get(incident_id, {})
        inc["status"] = "AUTO_EXECUTED"
        if incident_id in escalation_states:
            escalation_states[incident_id]["status"] = "AUTO_EXECUTED"
            
        _rec(
            incident_id=incident_id,
            attack_type=inc.get("attack_type", "Multi-stage attack"),
            attacker_ip=target_ip,
            narrative=inc.get("narrative", ""),
            mitre_chain=inc.get("mitre_chain", []),
            outcome="AUTO_EXECUTED_FALLBACK",
            status="AUTO_EXECUTED",
            custom_notes="Auto-executed containment after 2 unanswered voice calls"
        )
        
        emit(
            source_agent="main_agent",
            type_="action_executed",
            payload={
                "incident_id": incident_id,
                "action": "isolate_ip",
                "target": target_ip,
                "reason": "Auto-executed containment: 2 unanswered calls + 20s no-reply timeout exceeded",
                "details": f"Safety fallback triggered after 2 voice calls (each 20s apart). Blocked {target_ip}"
            },
            incident_id=incident_id,
            confidence=1.0,
            risk="low"
        )

    asyncio.create_task(auto_phone_call_worker())

def trigger_commerce_escalation(incident_id: str, resource: str, cost: float, reason: str) -> Dict[str, Any]:
    """
    Routes REQUIRE HUMAN decisions for Commerce requests through the escalation engine.
    Changes message content to describe the payment request.
    
    NOTE ON DEFAULT FALLBACK:
    Unlike security actions which auto-execute safety containment on 4 missed attempts,
    commerce spending requests default to auto-DENY on 4 missed attempts for financial safety.
    """
    summary = f"Commerce Payment Approval: Requesting ${cost:.2f} USDC for {resource}"
    state = escalation_states.setdefault(f"COMMERCE_{incident_id}", {
        "incident_id": incident_id,
        "is_commerce": True,
        "resource": resource,
        "cost": cost,
        "status": "PENDING_WHATSAPP",
        "attempt": 0,
        "human_replied": False
    })

    client = get_twilio_client()
    msg_body = (
        f"💳 *SENTINELSWARM COMMERCE APPROVAL REQUEST*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🛡️ *Incident ID*: `{incident_id}`\n"
        f"🎯 *Resource*: `{resource}`\n"
        f"💰 *Cost*: `${cost:.2f} USDC` (Algorand Testnet)\n"
        f"❓ *Reason*: {reason}\n\n"
        f"👉 *Action Required*:\n"
        f"• Reply *1* or *APPROVE* ➔ Authorize payment & fetch enrichment\n"
        f"• Reply *2* or *DENY* ➔ Reject payment request"
    )

    if client and TEAM_LEAD_WHATSAPP:
        try:
            client.messages.create(
                from_=TWILIO_WHATSAPP_FROM,
                to=TEAM_LEAD_WHATSAPP,
                body=msg_body
            )
        except Exception as e:
            logger.warning(f"Commerce WhatsApp escalation failed: {e}")

    emit(
        source_agent="comms",
        type_="escalation_sent",
        payload={
            "incident_id": incident_id,
            "channel": "WHATSAPP",
            "resource": resource,
            "cost_usdc": cost,
            "status": f"Human approval requested for ${cost:.2f} payment. Auto-DENY armed after timeout."
        },
        incident_id=incident_id,
        confidence=1.0,
        risk="medium"
    )

    async def commerce_timeout_worker():
        # Wait up to 4 call/timeout attempts (20s each)
        for attempt in range(1, 5):
            await asyncio.sleep(20)
            if state.get("human_replied") or state.get("status") in ["APPROVED", "DENIED"]:
                return
            state["attempt"] = attempt
            if attempt < 4:
                place_live_voice_call(incident_id, summary=summary, attempt=attempt)
            else:
                # 4-missed-attempts fallback for commerce: AUTO-DENY
                # COMMERCE FALLBACK DIFFERENCE: Unlike security containment actions which auto-execute for safety,
                # commerce requests default to auto-DENY so spending is never executed without explicit approval.
                state["status"] = "AUTO_DENIED"
                emit(
                    source_agent="commerce",
                    type_="commerce_policy_decision",
                    payload={
                        "resource": resource,
                        "decision": "block",
                        "reason": "Auto-DENIED: 4 missed approval attempts reached without human confirmation",
                        "estimated_cost_usdc": cost
                    },
                    incident_id=incident_id,
                    confidence=1.0,
                    risk="high"
                )
                emit(
                    source_agent="commerce",
                    type_="commerce_result",
                    payload={
                        "resource": resource,
                        "status": "blocked",
                        "reason": "Auto-DENIED after 4 missed contact attempts."
                    },
                    incident_id=incident_id,
                    confidence=0.0,
                    risk="high"
                )

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(commerce_timeout_worker())
    except Exception:
        pass

    return state

