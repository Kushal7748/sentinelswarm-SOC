import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.context_bus import get_recent_events

INCIDENTS_BASE_DIR = Path(__file__).resolve().parent.parent / "incident_records"
INCIDENTS_BASE_DIR.mkdir(exist_ok=True)

def record_incident_dossier(
    incident_id: str,
    attack_type: str = "Unknown Attack",
    attacker_ip: str = "127.0.0.1",
    narrative: str = "",
    mitre_chain: Optional[List[str]] = None,
    outcome: str = "PENDING",
    status: str = "AWAITING_HUMAN",
    report_text: str = "",
    custom_notes: str = ""
) -> Dict[str, Any]:
    """
    Saves every event and comprehensive human-readable description for an incident
    into a dedicated directory: incident_records/<incident_id>/
    """
    incident_folder = INCIDENTS_BASE_DIR / incident_id
    incident_folder.mkdir(parents=True, exist_ok=True)
    
    # 1. Fetch all raw Context Bus events associated with this incident
    events = get_recent_events(limit=500, incident_id=incident_id)
    if not events:
        # Fallback to recent events matching incident_id in payload
        all_recent = get_recent_events(limit=100)
        events = [e for e in all_recent if e.get("incident_id") == incident_id]
        
    chain = mitre_chain or ["TA0043 Reconnaissance", "TA0001 Initial Access", "TA0002 Execution"]
    
    # 2. Build Structured Incident Dossier
    dossier = {
        "incident_id": incident_id,
        "recorded_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "attack_type": attack_type,
        "attacker_ip": attacker_ip,
        "status": status,
        "decision_outcome": outcome,
        "mitre_chain": chain,
        "executive_summary": report_text or (
            f"Adversary initiated {attack_type} targeting perimeter endpoints. "
            f"Automated sensor swarm detected intrusion patterns across MITRE chain: {' -> '.join(chain)}."
        ),
        "technical_narrative": narrative or "Detailed telemetry correlation captured by Analyst AI.",
        "custom_notes": custom_notes,
        "total_events_captured": len(events),
        "folder_path": str(incident_folder),
        "events": events
    }
    
    # 3. Save JSON Dossier
    json_path = incident_folder / "incident_dossier.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(dossier, f, indent=2)
        
    # 4. Save Raw Events Log
    events_path = incident_folder / "events.json"
    with open(events_path, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
        
    # 5. Save Human-Readable Markdown Report
    md_content = f"""# 🛡️ SENTINELSWARM INCIDENT DOSSIER
**Incident ID**: `{incident_id}`  
**Timestamp**: `{dossier['recorded_at']}`  
**Attack Vector**: **{attack_type}**  
**Attacker IP**: `{attacker_ip}`  
**Status**: `{status}`  
**Outcome**: `{outcome}`  

---

## 📋 Executive Summary
{dossier['executive_summary']}

---

## 🔍 Technical Analysis & Attack Progression
- **MITRE ATT&CK Stages**: `{' ➔ '.join(chain)}`
- **Analyst Findings**:  
  > {narrative}

---

## ⚖️ Swarm Governance & Actions
- **Decision Outcome**: `{outcome}`
- **Containment Applied**: {'Firewall DROP applied for ' + attacker_ip if outcome == 'AUTO_EXECUTE' else 'Awaiting / Processed via Human Decision Pipeline'}
{f"- **Human Operator Directive**: {custom_notes}" if custom_notes else ""}

---

## 📜 Chronological Telemetry Events ({len(events)} events)
| Timestamp | Source Agent | Event Type | Confidence | Risk | Details |
|---|---|---|---|---|---|
"""
    for ev in events:
        ts = ev.get("ts", "")[:19]
        src = ev.get("source_agent", "sensor")
        ev_type = ev.get("type", "event")
        conf = f"{int(ev.get('confidence', 0)*100)}%" if ev.get('confidence') is not None else "-"
        risk = ev.get("risk", "low")
        payload = ev.get("payload", {})
        summary = payload.get("title") or payload.get("reason") or payload.get("message") or payload.get("action") or str(payload)[:60]
        md_content += f"| `{ts}` | `{src}` | `{ev_type}` | {conf} | `{risk}` | {summary} |\n"

    report_md_path = incident_folder / "INCIDENT_REPORT.md"
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return dossier

def get_incident_dossier(incident_id: str) -> Optional[Dict[str, Any]]:
    """Loads existing incident dossier from disk folder, cross-referencing active_incidents in memory for latest status."""
    json_path = INCIDENTS_BASE_DIR / incident_id / "incident_dossier.json"
    data = None
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass

    if data:
        try:
            from backend.collectors import active_incidents
            if incident_id in active_incidents:
                live_inc = active_incidents[incident_id]
                if live_inc.get("status"):
                    data["status"] = live_inc["status"]
                if live_inc.get("custom_note"):
                    data["custom_notes"] = live_inc["custom_note"]

            # Cross-reference Context Bus events for human_response
            events = data.get("events", [])
            if not events:
                events = get_recent_events(limit=200, incident_id=incident_id)

            for ev in reversed(events):
                if ev.get("type") == "human_response":
                    payload = ev.get("payload", {})
                    decision = str(payload.get("decision") or "").upper()
                    if any(k in decision for k in ["EXECUTE", "APPROVE", "1", "DIRECTIVE", "RESOLVE", "ISOLATE"]):
                        data["status"] = "RESOLVED"
                    elif any(k in decision for k in ["HOLD", "DONT", "DENY", "2"]):
                        data["status"] = "HELD_BY_HUMAN"
                    elif any(k in decision for k in ["INVESTIGATE", "QUARANTINE", "3", "INSPECT"]):
                        data["status"] = "UNDER_INVESTIGATION"
                    break
        except Exception:
            pass

    return data

def list_all_incident_folders() -> List[Dict[str, Any]]:
    """Returns summaries of all recorded incident folders, with live status from memory."""
    summaries = []
    if not INCIDENTS_BASE_DIR.exists():
        return summaries

    from backend.collectors import active_incidents

    for folder in INCIDENTS_BASE_DIR.iterdir():
        if folder.is_dir():
            dossier_path = folder / "incident_dossier.json"
            if dossier_path.exists():
                try:
                    with open(dossier_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        inc_id = data.get("incident_id", folder.name)
                        live_status = data.get("status", "RESOLVED")
                        if inc_id in active_incidents and active_incidents[inc_id].get("status"):
                            live_status = active_incidents[inc_id]["status"]

                        summaries.append({
                            "incident_id": inc_id,
                            "attack_type": data.get("attack_type", "Unknown"),
                            "attacker_ip": data.get("attacker_ip", "127.0.0.1"),
                            "status": live_status,
                            "recorded_at": data.get("recorded_at", ""),
                            "folder_path": str(folder),
                            "events_count": data.get("total_events_captured", 0)
                        })
                except Exception:
                    continue
    summaries.sort(key=lambda x: x.get("recorded_at", ""), reverse=True)
    return summaries
