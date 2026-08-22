import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from backend.context_bus import init_db, register_ws, unregister_ws, get_recent_events, emit
from backend.demo_control import router as demo_router
from backend.config import BACKEND_PORT

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    init_db()
    # Emit system boot event
    emit(
        source_agent="main_agent",
        type_="system_ready",
        payload={"message": "SentinelSwarm Self-Healing SOC Engine Online", "status": "READY"},
        confidence=1.0,
        risk="low"
    )
    yield

app = FastAPI(
    title="SentinelSwarm SOC Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(demo_router)

from backend.voice import answer_question
from pydantic import BaseModel

class VoiceAskRequest(BaseModel):
    question: str

@app.post("/voice/ask")
async def voice_ask(req: VoiceAskRequest):
    return answer_question(req.question)

from backend.x402_service import lookup_and_pay_ip_reputation, get_all_payments
from backend.escalation import simulate_advance_call_attempt, get_escalation_status

class X402LookupRequest(BaseModel):
    ip: str = "192.168.1.8"
    incident_id: Optional[str] = "INC-X402"

class EscalationSimulateRequest(BaseModel):
    incident_id: str
    target_ip: Optional[str] = "192.168.1.8"

@app.post("/api/x402/lookup")
async def x402_lookup(req: X402LookupRequest):
    from backend.agents.commerce import process_commerce_request
    import time
    return process_commerce_request(
        resource="ip-reputation",
        reason=f"Manual UI x402 IP reputation lookup for {req.ip}",
        estimated_cost_usdc=0.01,
        source_agent="dashboard_user",
        incident_id=req.incident_id or f"INC-X402-{int(time.time())}",
        ip=req.ip
    )

@app.get("/api/x402/history")
async def x402_history():
    events = get_recent_events(limit=500)
    payments = []
    for ev in events:
        if ev.get("type") == "payment":
            payload = ev.get("payload", {})
            if isinstance(payload, dict):
                payments.append(payload)
    return payments

@app.post("/api/escalation/simulate-missed-call")
async def simulate_missed_call(req: EscalationSimulateRequest):
    return simulate_advance_call_attempt(req.incident_id, req.target_ip or "192.168.1.8")

from backend.escalation import simulate_advance_call_attempt, get_escalation_status, handle_human_reply, get_twilio_client
from backend.config import TWILIO_WHATSAPP_FROM, TEAM_LEAD_WHATSAPP
from fastapi import Request, Response

@app.get("/api/escalation/status/{incident_id}")
@app.post("/api/escalation/status/{incident_id}")
async def escalation_status(incident_id: str):
    return get_escalation_status(incident_id)

@app.post("/api/twilio/whatsapp")
@app.post("/twilio/incoming")
@app.post("/api/twilio/webhook")
async def twilio_whatsapp_webhook(request: Request):
    """Webhook endpoint for incoming WhatsApp responses from Team Lead / human reviewer."""
    body_text = ""
    from_number = ""
    try:
        form_data = await request.form()
        body_text = form_data.get("Body", "")
        from_number = form_data.get("From", "")
    except Exception:
        pass

    if not body_text:
        try:
            raw_bytes = await request.body()
            import urllib.parse
            parsed = urllib.parse.parse_qs(raw_bytes.decode('utf-8', errors='ignore'))
            if 'Body' in parsed:
                body_text = parsed['Body'][0]
            elif 'body' in parsed:
                body_text = parsed['body'][0]
            if 'From' in parsed:
                from_number = parsed['From'][0]
            elif 'from' in parsed:
                from_number = parsed['from'][0]
        except Exception:
            pass

    if not body_text:
        try:
            json_data = await request.json()
            body_text = json_data.get("Body", json_data.get("body", ""))
            from_number = json_data.get("From", json_data.get("from", ""))
        except Exception:
            pass

    print(f"[Twilio WhatsApp Webhook] Incoming message from '{from_number}': '{body_text}'")

    reply_msg = await handle_human_reply(body=body_text, from_number=from_number)

    # 1. Proactively dispatch reply directly to user's WhatsApp via Twilio REST API
    target_to = from_number if (from_number and "whatsapp" in from_number) else TEAM_LEAD_WHATSAPP
    if target_to:
        client = get_twilio_client()
        if client:
            try:
                msg_body = reply_msg
                if len(msg_body) > 1450:
                    msg_body = msg_body[:1440] + "\n..."
                client.messages.create(
                    from_=TWILIO_WHATSAPP_FROM,
                    to=target_to,
                    body=msg_body
                )
                print(f"Successfully sent WhatsApp REST reply to {target_to}")
            except Exception as e:
                print(f"Twilio REST WhatsApp error: {e}")

    # 2. Return valid XML-escaped TwiML MessagingResponse
    import xml.sax.saxutils as saxutils
    twiml_body = reply_msg if len(reply_msg) <= 1450 else (reply_msg[:1440] + "\n...")
    escaped_msg = saxutils.escape(twiml_body)
    twiml_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{escaped_msg}</Message>
</Response>"""
    return Response(content=twiml_xml, media_type="application/xml")

@app.post("/api/twilio/voice-decision/{incident_id}")
async def twilio_voice_decision_callback(incident_id: str, request: Request):
    """Handles DTMF keypress digits from phone call during emergency escalation."""
    digit = ""
    try:
        form_data = await request.form()
        digit = form_data.get("Digits", "")
    except Exception:
        pass

    reply_msg = await handle_human_reply(body=digit or "1", from_number="VOICE_CALL")

    spoken_response = "Authorization received. Action executed." if digit == "1" else "Decision recorded. Monitoring maintained."
    twiml_voice = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">{spoken_response}</Say>
    <Hangup/>
</Response>"""
    return Response(content=twiml_voice, media_type="application/xml")

@app.get("/healthz")
async def healthz():
    from backend.escalation import get_twilio_client
    from backend.config import TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM, TEAM_LEAD_WHATSAPP, TEAM_LEAD_VOICE, get_ngrok_url
    twilio_ok = bool(get_twilio_client())
    return {
        "status": "ok",
        "service": "sentinelswarm-soc",
        "twilio_configured": twilio_ok,
        "whatsapp_target": TEAM_LEAD_WHATSAPP,
        "voice_target": TEAM_LEAD_VOICE,
        "ngrok_url": get_ngrok_url()
    }

@app.post("/api/twilio/test-notify")
async def test_twilio_notify():
    """Proactively sends a test WhatsApp message to verify Twilio credentials and tunnel URL."""
    from backend.escalation import get_twilio_client
    from backend.config import TWILIO_WHATSAPP_FROM, TEAM_LEAD_WHATSAPP, get_ngrok_url
    client = get_twilio_client()
    if not client:
        return {"status": "ERROR", "message": "Twilio client init failed — check TWILIO_SID and TWILIO_TOKEN in config.env"}
    if not TEAM_LEAD_WHATSAPP:
        return {"status": "ERROR", "message": "TEAM_LEAD_WHATSAPP not set in config.env"}
    try:
        active_url = get_ngrok_url()
        msg = client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            to=TEAM_LEAD_WHATSAPP,
            body=(
                f"🧠 *SentinelSwarm — Connectivity Test*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"✅ Twilio WhatsApp integration is *working correctly*.\n\n"
                f"🔗 Webhook URL: `{active_url}/api/twilio/whatsapp`\n\n"
                f"Reply *1*, *2*, or *3* to test handler input processing.\n"
                f"Reply anything else to test Drishti AI conversation."
            )
        )
        return {"status": "SENT", "sid": msg.sid, "to": TEAM_LEAD_WHATSAPP, "webhook": f"{active_url}/api/twilio/whatsapp"}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


@app.post("/api/debug/whatsapp-simulate")
async def debug_whatsapp_simulate(request: Request):
    """Simulates an incoming WhatsApp message for testing handler input without Twilio.
    POST body: {\"body\": \"1\", \"from\": \"whatsapp:+919999999999\"}
    """
    try:
        json_data = await request.json()
        body_text = json_data.get("body", "")
        from_number = json_data.get("from", TEAM_LEAD_WHATSAPP)
    except Exception:
        body_text = ""
        from_number = TEAM_LEAD_WHATSAPP

    reply_msg = await handle_human_reply(body=body_text, from_number=from_number)
    return {"input": body_text, "reply": reply_msg, "status": "SIMULATED"}

@app.get("/api/incidents/folders")
async def get_incident_folders():
    """Returns list of all saved incident dossiers on disk."""
    from backend.incident_storage import list_all_incident_folders
    return list_all_incident_folders()

@app.get("/api/incidents/{incident_id}/dossier")
async def get_incident_dossier_route(incident_id: str):
    """Retrieves full incident dossier and timeline for the handler."""
    from backend.incident_storage import get_incident_dossier, record_incident_dossier
    from backend.collectors import active_incidents
    from backend.agents.comms import reports_cache
    
    dossier = get_incident_dossier(incident_id)
    if not dossier:
        inc = active_incidents.get(incident_id, {})
        rep = reports_cache.get(incident_id, {})
        dossier = record_incident_dossier(
            incident_id=incident_id,
            attack_type=inc.get("attack_type", "Security Incident"),
            attacker_ip=inc.get("attacker_ip", "127.0.0.1"),
            narrative=inc.get("narrative", ""),
            mitre_chain=inc.get("mitre_chain", []),
            outcome=inc.get("outcome", "RESOLVED"),
            status=inc.get("status", "RESOLVED"),
            report_text=rep.get("report_text", "")
        )
    return dossier

@app.post("/api/incidents/{incident_id}/export")
async def export_incident_route(incident_id: str):
    """Saves and exports all events and executive brief to incident_records/<incident_id>/."""
    from backend.incident_storage import record_incident_dossier
    from backend.collectors import active_incidents
    from backend.agents.comms import reports_cache
    
    inc = active_incidents.get(incident_id, {})
    rep = reports_cache.get(incident_id, {})
    dossier = record_incident_dossier(
        incident_id=incident_id,
        attack_type=inc.get("attack_type", "Security Incident"),
        attacker_ip=inc.get("attacker_ip", "127.0.0.1"),
        narrative=inc.get("narrative", ""),
        mitre_chain=inc.get("mitre_chain", []),
        outcome=inc.get("outcome", "RESOLVED"),
        status=inc.get("status", "RESOLVED"),
        report_text=rep.get("report_text", "")
    )
    return {"status": "success", "message": f"Dossier exported to {dossier['folder_path']}", "dossier": dossier}

@app.get("/events")
async def fetch_events(
    limit: int = Query(100, ge=1, le=500),
    since: Optional[str] = None,
    incident_id: Optional[str] = None
):
    return get_recent_events(limit=limit, since=since, incident_id=incident_id)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await register_ws(websocket)
    try:
        while True:
            # Keep connection open; receive client pings if sent
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        unregister_ws(websocket)
    except Exception:
        unregister_ws(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=BACKEND_PORT, reload=True)
