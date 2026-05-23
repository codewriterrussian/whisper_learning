@echo off
setlocal
cd /d "%~dp0"

if "%BACKEND_PORT%"=="" set BACKEND_PORT=6174
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=6173
if "%FRONTEND_HOST%"=="" set FRONTEND_HOST=127.0.0.1
if "%VITE_API_BASE%"=="" set VITE_API_BASE=http://localhost:%BACKEND_PORT%
if "%WHISPER_MODEL%"=="" set WHISPER_MODEL=large-v3-turbo
if "%WHISPER_DEVICE%"=="" set WHISPER_DEVICE=auto
if "%WHISPER_WARMUP%"=="" set WHISPER_WARMUP=0
if "%STT_LANGUAGE_AUTO_OVERRIDE%"=="" set STT_LANGUAGE_AUTO_OVERRIDE=0
if "%PYTHON%"=="" if exist "%~dp0.venv\Scripts\python.exe" set PYTHON=%~dp0.venv\Scripts\python.exe
where ffmpeg >nul 2>nul
if errorlevel 1 (
  for /f "delims=" %%F in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$candidates=@($env:ProgramFiles + '\ffmpeg\bin\ffmpeg.exe', $env:ProgramFiles + '\Gyan\FFmpeg\bin\ffmpeg.exe', ${env:ProgramFiles(x86)} + '\ffmpeg\bin\ffmpeg.exe', 'C:\ProgramData\chocolatey\bin\ffmpeg.exe', 'C:\ffmpeg\bin\ffmpeg.exe'); foreach ($candidate in $candidates) { if ($candidate -and (Test-Path $candidate)) { Split-Path -Parent $candidate; exit } }; $roots=@($env:LOCALAPPDATA + '\Microsoft\WinGet\Packages', 'C:\ffmpeg'); foreach ($root in $roots) { if ($root -and (Test-Path $root)) { $match = Get-ChildItem -Path $root -Filter ffmpeg.exe -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; if ($match) { Split-Path -Parent $match.FullName; break } } }"') do set "PATH=%%F;%PATH%"
)

echo App is starting...
echo You can close the backend and frontend windows to stop the app.
echo.

if not exist "backend\node_modules" (
  echo The app is not set up yet. Please run setup_windows.ps1 first.
  pause
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo The app is not set up yet. Please run setup_windows.ps1 first.
  pause
  exit /b 1
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg is missing. This app needs FFmpeg to process your audio.
  echo Run setup_windows.ps1 for help.
  pause
  exit /b 1
)

start "Whisper Practice Backend" /D "%~dp0backend" cmd /k "set PORT=%BACKEND_PORT%&& npm run dev"
start "Whisper Practice Frontend" /D "%~dp0frontend" cmd /k "set FRONTEND_HOST=%FRONTEND_HOST%&& set FRONTEND_PORT=%FRONTEND_PORT%&& set VITE_API_BASE=%VITE_API_BASE%&& npm run dev"

timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:%FRONTEND_PORT%/"

echo App opened in your browser.
echo Close the backend and frontend windows when finished.
pause
