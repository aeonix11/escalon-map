@echo off
cd /d "%~dp0"
title Escalon Map Installer

echo.
echo This will download everything needed and install Escalon Map.
echo You only need to run this once.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
exit /b %ERRORLEVEL%
