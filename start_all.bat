@echo off
echo ===================================================
echo   SentinelSwarm SOC - Starting Backend and Frontend
echo ===================================================

echo [1/2] Launching Backend on http://0.0.0.0:8000 ...
start "SentinelSwarm Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 >nul

echo [2/2] Launching Frontend Dashboard on http://localhost:5173 ...
start "SentinelSwarm Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers initiated!
echo Backend:   http://localhost:8000
echo Dashboard: http://localhost:5173
echo.
