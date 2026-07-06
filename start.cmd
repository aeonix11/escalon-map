@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"
call npm.cmd run dev
