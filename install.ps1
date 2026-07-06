# Escalon Map - one-time installer (downloads Node.js + npm dependencies)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$NodeVersion = "20.19.0"
$NodeDir = Join-Path $Root "tools\node"
$NodeExe = Join-Path $NodeDir "node.exe"

Write-Host ""
Write-Host "========================================"
Write-Host "  Escalon Map - Installer"
Write-Host "========================================"
Write-Host ""

if (-not (Test-Path $NodeExe)) {
    Write-Host "Step 1/4: Downloading Node.js $NodeVersion (about 30 MB, one-time only)..."
    Write-Host "This may take a minute depending on your internet connection."
    Write-Host ""

    $zip = Join-Path $env:TEMP "node-$NodeVersion-win-x64.zip"
    $url = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"

    try {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    } catch {
        Write-Host "ERROR: Could not download Node.js."
        Write-Host "Check your internet connection and try again."
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    $extract = Join-Path $env:TEMP "escalon-node-extract"
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }

    Expand-Archive -Path $zip -DestinationPath $extract -Force
    $src = Join-Path $extract "node-v$NodeVersion-win-x64"

    New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null
    Copy-Item -Path (Join-Path $src "*") -Destination $NodeDir -Recurse -Force

    Remove-Item $zip -Force -ErrorAction SilentlyContinue
    Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Node.js installed."
}
else {
    Write-Host "Step 1/4: Node.js already installed - skipping download."
}

$env:PATH = "$NodeDir;$env:PATH"

Write-Host ""
Write-Host "Step 2/4: Installing app dependencies..."
Set-Location $Root

& npm.cmd install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm install failed."
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}

if (-not (Test-Path (Join-Path $Root ".env.local"))) {
    Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env.local")
}

Write-Host ""
Write-Host "Step 3/4: Building app for production..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Production build failed."
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Step 4/4: Creating desktop shortcut..."

$launcher = Join-Path $Root "Open Escalon Map.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Escalon Map.lnk"

try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $launcher
    $shortcut.WorkingDirectory = $Root
    $shortcut.Description = "Escalon Map timeline workspace"
    $shortcut.Save()
    Write-Host "Desktop shortcut created: Escalon Map"
}
catch {
    Write-Host "Could not create desktop shortcut (not critical)."
    Write-Host 'Use "Open Escalon Map.bat" in the project folder instead.'
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Installation complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "To open the app:"
Write-Host '  - Double-click "Escalon Map" on your desktop, OR'
Write-Host '  - Double-click "Open Escalon Map.bat" in this folder'
Write-Host ""

if ($Host.Name -eq "ConsoleHost") {
    Read-Host "Press Enter to close"
}
