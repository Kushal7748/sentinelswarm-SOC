import os
from pathlib import Path
from dotenv import load_dotenv

# Load config.env from workspace root or parent
env_path = Path(__file__).resolve().parent.parent / "config.env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Network
LAPTOP_A_IP = os.getenv("LAPTOP_A_IP", "127.0.0.1")
LAPTOP_B_IP = os.getenv("LAPTOP_B_IP", "127.0.0.1")
LAPTOP_C_IP = os.getenv("LAPTOP_C_IP", "127.0.0.1")

# Target Company (Laptop A)
COMPANY_SITE_PORT = int(os.getenv("COMPANY_SITE_PORT", "5000"))
MAILHOG_SMTP_PORT = int(os.getenv("MAILHOG_SMTP_PORT", "1025"))
MAILHOG_UI_PORT = int(os.getenv("MAILHOG_UI_PORT", "8025"))
ACTION_RECEIVER_PORT = int(os.getenv("ACTION_RECEIVER_PORT", "5001"))
ACTION_RECEIVER_SECRET = os.getenv("ACTION_RECEIVER_SECRET", "change-me-before-demo")

# SentinelSwarm Backend (Laptop B)
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
DASHBOARD_PORT = int(os.getenv("DASHBOARD_PORT", "5173"))
CONTEXT_BUS_DB = os.getenv("CONTEXT_BUS_DB", "context_bus.db")

# LLM Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Twilio (WhatsApp & Voice)
TWILIO_SID = os.getenv("TWILIO_SID", "").strip()
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "").strip()
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886").strip()
TEAM_LEAD_WHATSAPP = os.getenv("TEAM_LEAD_WHATSAPP", "").strip()
TEAM_LEAD_VOICE = os.getenv("TEAM_LEAD_VOICE", "").strip()
TWILIO_VOICE_FROM = os.getenv("TWILIO_VOICE_FROM", "").strip()
def get_ngrok_url() -> str:
    """Dynamically reads NGROK_URL from config.env or environment to handle live tunnel updates."""
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    return os.getenv("NGROK_URL", "https://your-ngrok-id.ngrok-free.app").strip()

NGROK_URL = get_ngrok_url()

# x402 Micropayments
AGENT_WALLET_ADDRESS = os.getenv("AGENT_WALLET_ADDRESS", "").strip()
AGENT_WALLET_PRIVATE_KEY = os.getenv("AGENT_WALLET_PRIVATE_KEY", "").strip()
X402_NETWORK = os.getenv("X402_NETWORK", "eip155:84532").strip()

# x402 Commerce Agent (Algorand Testnet)
ALGORAND_NETWORK = os.getenv("ALGORAND_NETWORK", "testnet").strip()
PAY_TO_ADDRESS = os.getenv("PAY_TO_ADDRESS", "G7QWRIJODICBDG6JAVXNKHNTCKTBJZBXTSCGQLSMXSCIKEJ5SNFPEJSFQQ").strip()
CLIENT_MNEMONIC = os.getenv("CLIENT_MNEMONIC", os.getenv("COMMERCE_AGENT_MNEMONIC", "")).strip()
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS", os.getenv("COMMERCE_AGENT_ADDRESS", "")).strip()
COMMERCE_AGENT_ADDRESS = WALLET_ADDRESS or os.getenv("COMMERCE_AGENT_ADDRESS", "").strip()
COMMERCE_AGENT_PRIVATE_KEY = os.getenv("COMMERCE_AGENT_PRIVATE_KEY", "").strip()
X402_ALGORAND_NETWORK = os.getenv("X402_ALGORAND_NETWORK", "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=").strip()
FACILITATOR_URL = os.getenv("FACILITATOR_URL", os.getenv("X402_FACILITATOR_URL", "https://facilitator.goplausible.xyz")).strip()
X402_FACILITATOR_URL = FACILITATOR_URL
DEMO_MODE = os.getenv("DEMO_MODE", "true").strip().lower() == "true"

# Voice / Text-to-Speech
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()

