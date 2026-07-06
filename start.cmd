@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"
if not exist .next\BUILD_ID (
  echo Building Escalon Map for production (first time only)...
  call npm.cmd run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)
call npm.cmd run start
