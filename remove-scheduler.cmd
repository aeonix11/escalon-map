@echo off
schtasks /delete /tn "EscalonMapPoll" /f
if %ERRORLEVEL% EQU 0 (
  echo EscalonMapPoll task removed.
) else (
  echo Task not found or could not be removed.
)
pause
