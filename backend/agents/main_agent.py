import time
from typing import Dict, Any
from backend.context_bus import emit

AGENT_NAMES = [
    "detector.phishing",
    "detector.intrusion",
    "detector.exfil",
    "analyst",
    "remediation",
    "caution",
    "decision",
    "main_agent"
]

DEFAULT_SCORE = {
    "catch_rate": 1.0,
    "fp_rate": 0.0,
    "avg_latency_ms": 320,
    "health": 100,
    "status": "active",
    "history": [100, 100, 100, 100, 100]
}

agent_scores: Dict[str, Dict[str, Any]] = {
    name: {
        "catch_rate": 1.0,
        "fp_rate": 0.0,
        "avg_latency_ms": 250 + (i * 35),
        "health": 100,
        "status": "active",
        "history": [100, 100, 100, 100, 100]
    }
    for i, name in enumerate(AGENT_NAMES)
}

# Pre-instantiated standby backups
STANDBY: Dict[str, Dict[str, Any]] = {
    name: {
        "catch_rate": 1.0,
        "fp_rate": 0.0,
        "avg_latency_ms": 280,
        "health": 100,
        "status": "standby",
        "history": [100, 100, 100, 100, 100]
    }
    for name in AGENT_NAMES
}

def calculate_health(catch_rate: float, fp_rate: float, avg_latency_ms: float) -> int:
    latency_penalty = min(avg_latency_ms / 5000.0, 1.0)
    score = 100 * (0.5 * catch_rate + 0.3 * (1.0 - fp_rate) + 0.2 * (1.0 - latency_penalty))
    return max(0, min(100, round(score)))

def update_agent_metrics(
    agent_name: str,
    latency_ms: float,
    is_true_positive: bool = True,
    is_false_positive: bool = False
) -> Dict[str, Any]:
    if agent_name not in agent_scores:
        return {}
    
    agent = agent_scores[agent_name]
    if agent["status"] != "active":
        return agent

    # Update latency moving average
    agent["avg_latency_ms"] = round(0.7 * agent["avg_latency_ms"] + 0.3 * latency_ms)

    # Update accuracy rates
    if is_false_positive:
        agent["fp_rate"] = min(1.0, agent["fp_rate"] + 0.15)
    elif is_true_positive:
        agent["catch_rate"] = min(1.0, agent["catch_rate"] * 0.9 + 0.1)

    agent["health"] = calculate_health(
        agent["catch_rate"],
        agent["fp_rate"],
        agent["avg_latency_ms"]
    )
    
    # Keep score history for sparklines
    agent["history"] = (agent["history"] + [agent["health"]])[-20:]

    emit(
        source_agent="main_agent",
        type_="agent_score_update",
        payload={
            "agent": agent_name,
            "metrics": agent
        }
    )

    # Check hot-swap threshold
    check_and_swap(agent_name)
    return agent

def check_and_swap(agent_name: str):
    agent = agent_scores.get(agent_name)
    if not agent or agent["status"] != "active":
        return

    if agent["health"] < 60:
        agent["status"] = "swapped_out"
        
        # Promote standby instance
        backup = STANDBY.get(agent_name, {
            "catch_rate": 1.0, "fp_rate": 0.0, "avg_latency_ms": 250, "health": 100, "status": "active", "history": [100]*5
        })
        backup_name = f"backup.{agent_name}"
        backup["status"] = "active"
        agent_scores[agent_name] = backup  # Active slot replaced by fresh standby

        emit(
            source_agent="main_agent",
            type_="agent_swap",
            payload={
                "failed_agent": agent_name,
                "health": agent["health"],
                "reason": f"Health score dropped to {agent['health']} (below safety threshold 60)",
                "replacement": backup_name,
                "timestamp": time.time()
            }
        )

def degrade_agent(agent_name: str, penalty_amount: int = 25) -> Dict[str, Any]:
    """Presenter trigger: Simulate degradation / failure of an agent to demonstrate hot-swap."""
    if agent_name not in agent_scores:
        return {}
    
    agent = agent_scores[agent_name]
    agent["fp_rate"] = min(1.0, agent["fp_rate"] + (penalty_amount / 50.0))
    agent["catch_rate"] = max(0.2, agent["catch_rate"] - (penalty_amount / 100.0))
    agent["avg_latency_ms"] += 1200
    agent["health"] = calculate_health(agent["catch_rate"], agent["fp_rate"], agent["avg_latency_ms"])
    agent["history"] = (agent["history"] + [agent["health"]])[-20:]

    emit(
        source_agent="main_agent",
        type_="agent_score_update",
        payload={
            "agent": agent_name,
            "metrics": agent,
            "degraded": True
        }
    )

    check_and_swap(agent_name)
    return agent

def get_all_scores() -> Dict[str, Any]:
    return agent_scores
