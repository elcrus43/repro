@echo off
chcp 65001 >nul
echo ========================================================
echo  [REA CRM] Синхронизация: отправка изменений на GitHub
echo ========================================================
echo.

git status -s
echo.

set /p MSG="Введите описание коммита (или нажмите Enter для авто): "

if "%MSG%"=="" (
    set MSG=wip: sync from %COMPUTERNAME% %DATE% %TIME%
)

git add .
git commit -m "%MSG%"
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Изменения успешно отправлены в репозиторий!
) else (
    echo.
    echo [ОШИБКА] Не удалось отправить изменения.
    echo Возможно, на сервере есть новые коммиты. Запустите сначала sync-pull.bat
)

echo.
timeout /t 5
