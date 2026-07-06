@echo off
REM Re-launch in a persistent window so errors stay visible (desktop shortcut safe).
if /I not "%~1"=="RUN" (
  cmd /k ""%~f0" RUN"
  exit /b
)

cd /d "%~dp0"
title Escalon Map
call "%~dp0_env.cmd"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo First-time setup required.
  echo.
  echo Running installer - downloads Node.js once, then installs the app.
  echo Please wait...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
  if errorlevel 1 (
    echo.
    echo Setup failed. Try double-clicking "Install Escalon Map.cmd" instead.
    goto :done
  )
  call "%~dp0_env.cmd"
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js still not available after install.
  echo Run "Install Escalon Map.cmd" and check for errors.
  goto :done
)

if not exist node_modules (
  echo Installing dependencies...
  call "%~dp0setup.cmd"
  if errorlevel 1 goto :done
)

echo.
echo Starting Escalon Map...
echo Keep this window open while you use the app.
echo Close it to stop the app.
echo.

if not exist .next\BUILD_ID (
  echo Building app for production - first time only, may take a minute...
  call npm.cmd run build
  if errorlevel 1 (
    echo.
    echo Build failed. See errors above.
    goto :done
  )
) else (
  if exist .next\dev (
    echo Clearing old development cache and rebuilding...
    rmdir /s /q .next
    call npm.cmd run build
    if errorlevel 1 (
      echo.
      echo Build failed. See errors above.
      goto :done
    )
  )
)

start "" http://localhost:3000
call npm.cmd run start
if errorlevel 1 (
  echo.
  echo Server stopped or failed to start.
  echo If port 3000 is already in use, close other Escalon Map windows and try again.
  echo Or run: npm run start -- -p 3001
)

:done
echo.
pause
