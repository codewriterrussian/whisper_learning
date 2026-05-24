$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not $env:PYTHON) {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if (-not $pythonCommand) {
    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
  }
  if (-not $pythonCommand) {
    throw "Python was not found. Set PYTHON to your environment's python.exe path."
  }
  $env:PYTHON = $pythonCommand.Source
}

function Test-Ffmpeg {
  $Command = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $Command) {
    return $false
  }
  & $Command.Source -version *> $null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-Ffmpeg)) {
  throw "ffmpeg is required. Install it with: winget install Gyan.FFmpeg"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCommand) {
  throw "npm was not found. Install Node.js 20 or newer, then restart PowerShell."
}
$NpmBin = $npmCommand.Source

if (-not $env:WHISPER_MODEL) { $env:WHISPER_MODEL = "large" }
if (-not $env:WHISPER_DEVICE) { $env:WHISPER_DEVICE = "auto" }
if (-not $env:WHISPER_WARMUP) { $env:WHISPER_WARMUP = "1" }
if (-not $env:WHISPER_RETRY_DEVICE) { $env:WHISPER_RETRY_DEVICE = "same" }
if (-not $env:BACKEND_PORT) { $env:BACKEND_PORT = "6174" }
if (-not $env:FRONTEND_PORT) { $env:FRONTEND_PORT = "6173" }
if (-not $env:FRONTEND_HOST) { $env:FRONTEND_HOST = "127.0.0.1" }
if (-not $env:VITE_API_BASE) { $env:VITE_API_BASE = "http://localhost:$($env:BACKEND_PORT)" }

Write-Host "[INFO] Using Python: $env:PYTHON"
Write-Host "[INFO] Using Whisper model: $env:WHISPER_MODEL"
Write-Host "[INFO] Using Whisper device: $env:WHISPER_DEVICE"
Write-Host "[INFO] Whisper warmup: $env:WHISPER_WARMUP"
Write-Host "[INFO] Frontend port: $env:FRONTEND_PORT"
Write-Host "[INFO] Backend port: $env:BACKEND_PORT"

if (-not (Test-Path "backend/node_modules")) {
  Write-Host "[INFO] Installing backend dependencies..."
  Push-Location backend
  & $NpmBin install
  Pop-Location
}

if (-not (Test-Path "frontend/node_modules")) {
  Write-Host "[INFO] Installing frontend dependencies..."
  Push-Location frontend
  & $NpmBin install
  Pop-Location
}

$backend = Start-Process -FilePath $NpmBin -ArgumentList @("run", "dev") -WorkingDirectory (Join-Path $Root "backend") -NoNewWindow -PassThru
$frontend = Start-Process -FilePath $NpmBin -ArgumentList @("run", "dev") -WorkingDirectory (Join-Path $Root "frontend") -NoNewWindow -PassThru

try {
  Wait-Process -Id $backend.Id, $frontend.Id
} finally {
  if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
  if (-not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force }
}
