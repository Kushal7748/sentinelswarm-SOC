import sqlite3
import json
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import WebSocket

from backend.config import CONTEXT_BUS_DB

DB_PATH = Path(CONTEXT_BUS_DB)
if not DB_PATH.is_absolute():
    DB_PATH = Path(__file__).resolve().parent / CONTEXT_BUS_DB

active_websockets: List[WebSocket] = []

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            ts TEXT NOT NULL,
            incident_id TEXT,
            source_agent TEXT NOT NULL,
            type TEXT NOT NULL,
            mitre_stage TEXT,
            confidence REAL,
            risk TEXT,
            payload_json TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

async def register_ws(ws: WebSocket):
    await ws.accept()
    active_websockets.append(ws)

def unregister_ws(ws: WebSocket):
    if ws in active_websockets:
        active_websockets.remove(ws)

async def broadcast_ws(event: Dict[str, Any]):
    dead_sockets = []
    message = json.dumps(event)
    for ws in list(active_websockets):
        try:
            await ws.send_text(message)
        except Exception:
            dead_sockets.append(ws)
    for ws in dead_sockets:
        unregister_ws(ws)

def emit(
    source_agent: str,
    type_: str,
    payload: Any,
    incident_id: Optional[str] = None,
    mitre_stage: Optional[str] = None,
    confidence: Optional[float] = None,
    risk: Optional[str] = None
) -> Dict[str, Any]:
    event = {
        "id": str(uuid.uuid4()),
        "ts": datetime.now(timezone.utc).isoformat(),
        "incident_id": incident_id,
        "source_agent": source_agent,
        "type": type_,
        "mitre_stage": mitre_stage,
        "confidence": confidence,
        "risk": risk,
        "payload_json": json.dumps(payload) if not isinstance(payload, str) else payload,
    }
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        INSERT INTO events (id, ts, incident_id, source_agent, type, mitre_stage, confidence, risk, payload_json)
        VALUES (:id, :ts, :incident_id, :source_agent, :type, :mitre_stage, :confidence, :risk, :payload_json)
    """, event)
    conn.commit()
    conn.close()

    # Parsed payload for event transmission
    event_with_parsed = dict(event)
    try:
        event_with_parsed["payload"] = json.loads(event["payload_json"])
    except Exception:
        event_with_parsed["payload"] = payload

    # Broadcast to WebSockets asynchronously if event loop is running
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcast_ws(event_with_parsed))
        else:
            loop.run_until_complete(broadcast_ws(event_with_parsed))
    except RuntimeError:
        pass

    return event_with_parsed

def get_recent_events(limit: int = 100, since: Optional[str] = None, incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if incident_id:
        cursor.execute("SELECT * FROM events WHERE incident_id = ? ORDER BY ts ASC LIMIT ?", (incident_id, limit))
    elif since:
        cursor.execute("SELECT * FROM events WHERE ts > ? ORDER BY ts ASC LIMIT ?", (since, limit))
    else:
        cursor.execute("SELECT * FROM events ORDER BY ts DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        try:
            d["payload"] = json.loads(d["payload_json"])
        except Exception:
            d["payload"] = d["payload_json"]
        results.append(d)

    if not since and not incident_id:
        results.reverse()
    return results
