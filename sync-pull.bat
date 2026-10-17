@echo off
chcp 65001 >nul
echo ========================================================
echo  [REA CRM] Синхронизация: получение обновлений с GitHub
echo ========================================================
echo.

git pull --rebase --autostash origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Проект успешно обновлен до последней версии!
) else (
    echo.
    echo [ВНИМАНИЕ] Возник конфликт при синхронизации.
    echo Проверьте статус командой: git status
)

echo.
timeout /t 5
