@echo off
REM Puts bundled Node.js on PATH when present (set by install.ps1).
set "ESCALON_ROOT=%~dp0"
if "%ESCALON_ROOT:~-1%"=="\" set "ESCALON_ROOT=%ESCALON_ROOT:~0,-1%"
if exist "%ESCALON_ROOT%\tools\node\node.exe" (
  set "PATH=%ESCALON_ROOT%\tools\node;%PATH%"
)
