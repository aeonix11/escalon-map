@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"
echo Building Escalon Map for production...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. Fix errors above and try again.
  exit /b 1
)
echo Build complete.
