@echo off
echo ========================================================
echo  [REA CRM] Pushing changes to GitHub...
echo ========================================================
echo.

git status -s
echo.

set MSG=%*
if "%MSG%"=="" (
    set /p MSG="Enter commit message (or press Enter for auto): "
)

if "%MSG%"=="" (
    set MSG=wip: sync update from %COMPUTERNAME%
)

git add .
git commit -m "%MSG%"
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Changes pushed to GitHub successfully!
) else (
    echo.
    echo [ERROR] Push failed. Try running 'sync-pull.bat' first.
)

echo.
timeout /t 5 >nul 2>&1 || ping -n 5 127.0.0.1 >nul
