@echo off
cd /d "%~dp0"

echo Removing old node_modules (if present)...
if exist node_modules (
  rmdir /s /q node_modules 2>nul
)

echo Installing dependencies...
call npm.cmd install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

if not exist ".env.local" (
  copy /Y ".env.example" ".env.local"
  echo Created .env.local - add API keys for AI features.
)

echo.
echo Setup complete. Start the app with:
echo   cmd /c npm.cmd run dev
echo Then open http://localhost:3000
