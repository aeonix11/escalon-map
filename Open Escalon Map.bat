@echo off
cd /d "%~dp0"
title Escalon Map
call "%~dp0_env.cmd"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo First-time setup required.
  echo.
  echo Running installer — this downloads Node.js and app files once.
  echo Please wait...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
  if errorlevel 1 (
    echo.
    echo Setup failed. Try double-clicking "Install Escalon Map.cmd" instead.
    pause
    exit /b 1
  )
  call "%~dp0_env.cmd"
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js still not available after install.
  echo Run "Install Escalon Map.cmd" and check for errors.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call "%~dp0setup.cmd"
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo.
echo Starting Escalon Map...
echo Keep this window open while you use the app.
echo Close it to stop the app.
echo.
if not exist .next\BUILD_ID (
  echo Building app for production (first time only, may take a minute)...
  call npm.cmd run build
  if errorlevel 1 (
    echo.
    echo Build failed. See errors above.
    pause
    exit /b 1
  )
)
start "" http://localhost:3000
call npm.cmd run start
pause
