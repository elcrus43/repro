# Регистрирует ежедневную задачу в Планировщике заданий Windows (08:30)
# для локального обновления базы новостроек г. Кирова в REA CRM.

$TaskName = "ReaCRM_Daily_Developments_Update"
$ProjectDir = "D:\CODING\realtor-match"
$NodeExe = (Get-Command node -ErrorAction Stop).Source

$Action = New-ScheduledTaskAction `
    -Execute $NodeExe `
    -Argument "scripts/update-developments.mjs" `
    -WorkingDirectory $ProjectDir

$Trigger = New-ScheduledTaskTrigger -Daily -At 08:30
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Ежедневное обновление каталога строящихся ЖК г. Кирова для REA CRM" `
    -Force

Write-Host "Задача '$TaskName' успешно зарегистрирована (ежедневно в 08:30)."
