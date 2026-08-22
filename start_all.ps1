# SentinelSwarm SOC - PowerShell Launcher for Backend, Frontend & Tunnel
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SentinelSwarm SOC - Starting Backend, Frontend & Tunnel" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Starting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir'; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[2/3] Starting Twilio Webhook Tunnel (tunnel.py)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir'; python tunnel.py"

Start-Sleep -Seconds 2

Write-Host "[3/3] Starting Frontend Vite Dashboard (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir/frontend'; npm run dev"

Write-Host ""
Write-Host "SentinelSwarm SOC is up and running!" -ForegroundColor Cyan
Write-Host "  Backend API:        http://localhost:8000" -ForegroundColor White
Write-Host "  Context Bus WS:     ws://localhost:8000/ws" -ForegroundColor White
Write-Host "  WhatsApp Tunnel:    See NGROK_URL in config.env" -ForegroundColor White
Write-Host ""
