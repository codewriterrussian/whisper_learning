$ErrorActionPreference = "Stop"

function Stop-WithHelp($Title, $Help) {
  Write-Host ""
  Write-Host "Setup stopped: $Title" -ForegroundColor Red
  Write-Host $Help
  Write-Host ""
  Read-Host "Press Enter to close this window"
  exit 1
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "Whisper Speaking Practice setup"
Write-Host "This will check your computer and install the app's local dependencies."
Write-Host ""

if ((Get-ExecutionPolicy -Scope CurrentUser) -eq "Restricted") {
  Write-Host "PowerShell may block setup scripts on this computer." -ForegroundColor Yellow
  Write-Host "If this script closes unexpectedly, open PowerShell and run:"
  Write-Host "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
  Write-Host ""
}

$PythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCommand) { $PythonCommand = Get-Command py -ErrorAction SilentlyContinue }
if (-not $PythonCommand) {
  Stop-WithHelp "Python is missing." "Please install Python 3.10 or newer from https://www.python.org/downloads/ and check 'Add Python to PATH'."
}

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCommand) { $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $NodeCommand -or -not $NpmCommand) {
  Stop-WithHelp "Node.js/npm is missing." "Please install Node.js LTS from https://nodejs.org/ and restart PowerShell."
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Stop-WithHelp "FFmpeg is missing." "Install FFmpeg with: winget install Gyan.FFmpeg"
}

Write-Host "Creating app folders..."
New-Item -ItemType Directory -Force -Path recordings\uploads, recordings\processed_audio, targets, transcripts, results, model_audio, runs, generated_reports | Out-Null

Write-Host "Installing Python packages. This may take a while..."
& $PythonCommand.Source -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "Python packages could not be installed." "Try running: python -m pip install -r requirements.txt"
}

Write-Host "Installing backend packages..."
& $NpmCommand.Source --prefix backend install
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "Backend packages could not be installed." "Check your internet connection and run setup again."
}

Write-Host "Installing frontend packages..."
& $NpmCommand.Source --prefix frontend install
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "Frontend packages could not be installed." "Check your internet connection and run setup again."
}

Write-Host ""
Write-Host "Running system check..."
node scripts/doctor.js

Write-Host ""
Write-Host "Setup finished."
Write-Host "Next: double-click run_windows.bat to start the app."
Read-Host "Press Enter to close this window"
