@echo off
cd /d "%~dp0"

if not exist .git (
  echo Initializing git repository...
  git init
)

echo.
echo === git status ===
git status

echo.
echo === Staging files ===
git add -A
git reset HEAD -- node_modules .env.local escalon.db .next 2>nul

echo.
echo === Creating commit ===
git commit -m "Initial Escalon Map: Next.js timeline with SQLite" -m "- Next.js timeline app backed by SQLite" -m "- Signal Hub: RSS feeds, AI scan, background polling scripts" -m "- Delete flows, milestone-fragment linking, video fragment time input" -m "- Expanded Signal Hub grid layout"

echo.
echo === Done ===
git status
git log -1 --oneline
