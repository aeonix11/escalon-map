@echo off
cd /d "%~dp0"
echo Registering Escalon Map RSS poller (every 30 minutes, silent)...
schtasks /create /tn "EscalonMapPoll" /tr "wscript.exe //B \"%~dp0poll-silent.vbs\"" /sc minute /mo 30 /ru %USERNAME% /f
if %ERRORLEVEL% EQU 0 (
  echo Task registered successfully.
  echo Background polls run hidden — no CMD window during gaming.
  echo Run poll.cmd manually if you want a visible fetch with console output.
) else (
  echo Failed to register task. Try running as administrator.
)
pause
