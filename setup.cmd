@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"

echo Installing dependencies...
call npm.cmd install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

if not exist ".env.local" (
  copy /Y ".env.example" ".env.local"
  echo Created .env.local - add API keys in Settings for AI features.
)

echo.
echo Setup complete. Start the app with:
echo   Open Escalon Map.bat
echo Then open http://localhost:3000
