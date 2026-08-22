import sqlite3
import os
from pathlib import Path
from backend.context_bus import DB_PATH, init_db, emit
from backend.agents.main_agent import agent_scores, DEFAULT_SCORE, AGENT_NAMES
from backend.collectors import active_incidents
from backend.agents.comms import reports_cache

def reset_entire_demo():
    """Wipes SQLite events, resets agent health scores to 100, clears active incidents."""
    # 1. Reset database
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(str(DB_PATH))
            conn.execute("DELETE FROM events")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error clearing events: {e}")
    init_db()

    # 2. Reset agent scores in memory
    for name in AGENT_NAMES:
        agent_scores[name] = {
            "catch_rate": 1.0,
            "fp_rate": 0.0,
            "avg_latency_ms": 250,
            "health": 100,
            "status": "active",
            "history": [100, 100, 100, 100, 100]
        }

    # 3. Clear memory caches
    active_incidents.clear()
    reports_cache.clear()

    # 4. Emit clean system ready event
    emit(
        source_agent="main_agent",
        type_="system_ready",
        payload={"message": "SentinelSwarm State Reset Completed. All agents active and healthy at 100%.", "status": "RESET_COMPLETE"},
        confidence=1.0,
        risk="low"
    )
    print("SentinelSwarm Demo Reset Complete.")

if __name__ == "__main__":
    reset_entire_demo()
