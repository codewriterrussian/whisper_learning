$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

foreach ($dir in @("recordings", "transcripts", "results", "runs", "model_audio", "generated_reports")) {
  if (Test-Path $dir) {
    Remove-Item $dir -Recurse -Force
    Write-Host "Removed $dir"
  }
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "Local generated practice data cleared."
