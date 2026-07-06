# Ensures a valid production .next build exists (fixes stale/mixed dev+prod cache).
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot | Split-Path -Parent
Set-Location $Root

$nodeDir = Join-Path $Root "tools\node"
if (Test-Path (Join-Path $nodeDir "node.exe")) {
    $env:PATH = "$nodeDir;$env:PATH"
}

$buildIdPath = Join-Path $Root ".next\BUILD_ID"

function Needs-Rebuild {
    if (Test-Path (Join-Path $Root ".next\dev")) { return $true }
    if (-not (Test-Path $buildIdPath)) { return $true }
    return $false
}

if (Needs-Rebuild) {
    Write-Host "Building Escalon Map for production..."
    if (Test-Path (Join-Path $Root ".next")) {
        Remove-Item (Join-Path $Root ".next") -Recurse -Force
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Build complete."
}
