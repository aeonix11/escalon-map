@echo off
cd /d "%~dp0"
call "%~dp0_env.cmd"
set "PATH=C:\Program Files\GitHub CLI;C:\Program Files\Git\bin;C:\Program Files\Git\cmd;%PATH%"

echo.
echo === Escalon Map - Push to GitHub ===
echo.

where gh >nul 2>&1
if errorlevel 1 (
  echo GitHub CLI not found. Install from: https://cli.github.com/
  pause
  exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
  echo Not logged into GitHub yet. Follow the prompts...
  echo.
  gh auth login
  if errorlevel 1 (
    echo Login failed or was cancelled.
    pause
    exit /b 1
  )
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Creating GitHub repo and linking origin...
  gh repo create escalon-map --private --source=. --remote=origin
  if errorlevel 1 (
    echo Repo create failed. Try a different name or create the repo on github.com first.
    pause
    exit /b 1
  )
)

echo.
echo Pushing commits...
git push -u origin master
if errorlevel 1 (
  echo Push failed.
  pause
  exit /b 1
)

echo.
echo Done! Your code is on GitHub.
gh repo view --web 2>nul
pause
