$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$PythonBin = if ($env:PYTHON) { $env:PYTHON } else { "python" }

& $PythonBin -m unittest tests.test_stt_providers
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
