$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Re-Pro CRM.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "D:\CODING\realtor-match\start-server.bat"
$Shortcut.WorkingDirectory = "D:\CODING\realtor-match"
$Shortcut.IconLocation = "D:\CODING\realtor-match\public\favicon.ico, 0"
$Shortcut.Description = "Запуск локального сервера Re-Pro CRM"
$Shortcut.Save()

Write-Output "Shortcut created: $ShortcutPath"
