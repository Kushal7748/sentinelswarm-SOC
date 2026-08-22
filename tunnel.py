import sys
import os
import re
import ssl
import time
import subprocess
from pathlib import Path

# Allow download over environments with proxy/custom CA
ssl._create_default_https_context = ssl._create_unverified_context

def update_config_env(public_url: str):
    env_path = Path(__file__).resolve().parent / "config.env"
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        if "NGROK_URL=" in content:
            new_content = re.sub(r'NGROK_URL=.*', f'NGROK_URL={public_url}', content)
        else:
            new_content = content + f"\nNGROK_URL={public_url}\n"
        env_path.write_text(new_content, encoding="utf-8")
        print(f"[+] Updated config.env with NGROK_URL={public_url}")

def start_ssh_tunnel(port=8000):
    print(f"[*] Attempting SSH tunnel via serveo.net for 127.0.0.1:{port}...")
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", f"80:127.0.0.1:{port}", "serveo.net"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    
    url_found = None
    for line in iter(proc.stdout.readline, ''):
        print(line, end='')
        match = re.search(r'https://[a-zA-Z0-9\.\-]+\.serveousercontent\.com', line)
        if match:
            url_found = match.group(0)
            update_config_env(url_found)
            print("\n" + "=" * 60)
            print("  TWILIO CONFIGURATION INSTRUCTIONS:")
            print("=" * 60)
            print("1. Twilio WhatsApp Sandbox Webhook URL:")
            print(f"   URL: {url_found}/api/twilio/whatsapp")
            print("   Method: HTTP POST")
            print("\n2. Twilio Voice Webhook (optional):")
            print(f"   URL: {url_found}/api/twilio/voice-decision/INC-LIVE")
            print("   Method: HTTP POST")
            print("=" * 60 + "\n")
            break
            
    proc.wait()

def start_tunnel(port=8000):
    print("=" * 60)
    print("  SentinelSwarm - Starting Webhook Tunnel for Twilio")
    print("=" * 60)
    
    try:
        from pyngrok import ngrok
        tunnel = ngrok.connect(port, "http")
        public_url = tunnel.public_url.replace("http://", "https://")
        print(f"\n[+] Public Ngrok Tunnel URL: {public_url}")
        update_config_env(public_url)
        print("\n" + "=" * 60)
        print("  TWILIO CONFIGURATION INSTRUCTIONS:")
        print("=" * 60)
        print("1. Twilio WhatsApp Webhook:")
        print(f"   URL: {public_url}/api/twilio/whatsapp")
        print("   Method: HTTP POST")
        print("=" * 60 + "\n")
        ngrok.get_ngrok_process().proc.wait()
    except Exception as e:
        print(f"[-] pyngrok note: {e}")
        print("[*] Falling back to high-reliability SSH tunnel...")
        start_ssh_tunnel(port)

if __name__ == "__main__":
    start_tunnel(8000)

