# Escalon Map — first-time setup
# If PowerShell blocks this script, use setup.cmd instead.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Installing dependencies..."
& npm.cmd install
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm install failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host "Created .env.local — add your API keys before using AI features."
}

Write-Host "Setup complete. Run: npm.cmd run dev"
Write-Host "Open http://localhost:3000"
