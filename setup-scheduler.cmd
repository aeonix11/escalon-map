@echo off
cd /d "%~dp0"
echo Registering Escalon Map RSS poller (every 30 minutes)...
schtasks /create /tn "EscalonMapPoll" /tr "%~dp0poll.cmd" /sc minute /mo 30 /ru %USERNAME% /f
if %ERRORLEVEL% EQU 0 (
  echo Task registered successfully.
  echo Run poll.cmd manually anytime to fetch feeds immediately.
) else (
  echo Failed to register task. Try running as administrator.
)
pause
