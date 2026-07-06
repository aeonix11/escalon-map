@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"
node "%~dp0scripts\poll-feeds.mjs"
