@echo off
echo ========================================================
echo  [REA CRM] Pulling updates from GitHub...
echo ========================================================
echo.

git pull --rebase --autostash origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Project is up to date!
) else (
    echo.
    echo [ERROR] Failed to pull changes. Check 'git status'.
)

echo.
timeout /t 5 >nul 2>&1 || ping -n 5 127.0.0.1 >nul
