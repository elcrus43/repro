@echo off
title Re-Pro CRM - Local Server
cd /d "%~dp0"
echo ======================================================
echo           Re-Pro CRM - Local Server
echo ======================================================
echo.
echo Starting Vite and API server...
echo The browser will open automatically.
echo Press Ctrl+C in this window to stop.
echo.
call npm run dev -- --open
if errorlevel 1 (
    echo.
    echo [ERROR] Server exited with an error.
    pause
)
