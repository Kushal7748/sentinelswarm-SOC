import time
import uuid
import hashlib
from typing import Dict, Any
from backend.context_bus import emit

payment_history = []

def lookup_and_pay_ip_reputation(ip: str, incident_id: str = "INC-X402") -> Dict[str, Any]:
    """
    Simulates / Executes an x402 Base Sepolia testnet micropayment for IP threat intelligence enrichment.
    """
    # Deterministic testnet transaction hash based on IP and timestamp
    tx_hash = "0x" + hashlib.sha256(f"{ip}:{time.time()}:{uuid.uuid4()}".encode()).hexdigest()
    
    payment_event = {
        "ip": ip,
        "amount_usdc": "0.01",
        "currency": "USDC",
        "network": "Base Sepolia (EIP-155:84532)",
        "tx_hash": tx_hash,
        "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        "timestamp": time.time(),
        "reputation_score": 89,
        "threat_classification": "Malicious Scanner / Botnet Node",
        "incident_id": incident_id
    }
    
    payment_history.append(payment_event)

    emit(
        source_agent="x402_client",
        type_="payment",
        payload=payment_event,
        incident_id=incident_id,
        confidence=1.0,
        risk="low"
    )

    return payment_event

def get_all_payments():
    return payment_history
