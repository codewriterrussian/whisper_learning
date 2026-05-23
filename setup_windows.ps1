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
  Write-Host "Installing FFmpeg..."
  $WingetCommand = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $WingetCommand) {
    Stop-WithHelp "FFmpeg is missing." "Install FFmpeg with: winget install Gyan.FFmpeg"
  }
  & $WingetCommand.Source install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Stop-WithHelp "FFmpeg could not be installed." "winget failed while installing FFmpeg. Try running: winget install Gyan.FFmpeg"
  }
  $MachinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$MachinePath;$UserPath"
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Stop-WithHelp "FFmpeg was installed but is not available." "Restart PowerShell or your computer, then run setup_windows.ps1 again."
  }
}

Write-Host "Creating app folders..."
New-Item -ItemType Directory -Force -Path recordings\uploads, recordings\processed_audio, targets, transcripts, results, model_audio, runs, generated_reports | Out-Null

Write-Host "Creating Python environment..."
& $PythonCommand.Source -m venv .venv
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "Python environment could not be created." "Try running: python -m venv .venv"
}
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
  Stop-WithHelp "Python environment could not be created." "Expected to find .venv\Scripts\python.exe in this app folder."
}

Write-Host "Installing Python packages. This may take a while..."
& $VenvPython -m pip install -U pip
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "pip could not be upgraded." "Try running: .venv\Scripts\python.exe -m pip install -U pip"
}
& $VenvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp "Python packages could not be installed." "Try running: .venv\Scripts\python.exe -m pip install -r requirements.txt"
}

if (-not (Test-Path (Join-Path $Root "backend\package.json"))) {
  Stop-WithHelp "Backend package.json is missing." "Expected to find backend\package.json in this app folder."
}

if (-not (Test-Path (Join-Path $Root "frontend\package.json"))) {
  Stop-WithHelp "Frontend package.json is missing." "Expected to find frontend\package.json in this app folder."
}

Write-Host "Installing backend packages..."
Push-Location backend
& $NpmCommand.Source install
$NpmExitCode = $LASTEXITCODE
Pop-Location
if ($NpmExitCode -ne 0) {
  Stop-WithHelp "Backend packages could not be installed." "npm failed inside backend."
}

Write-Host "Installing frontend packages..."
Push-Location frontend
& $NpmCommand.Source install
$NpmExitCode = $LASTEXITCODE
Pop-Location
if ($NpmExitCode -ne 0) {
  Stop-WithHelp "Frontend packages could not be installed." "npm failed inside frontend."
}

Write-Host ""
Write-Host "Running system check..."
node scripts/doctor.js

Write-Host ""
Write-Host "Setup finished."
Write-Host "Next: double-click run_windows.bat to start the app."
Read-Host "Press Enter to close this window"
