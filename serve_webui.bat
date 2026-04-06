@echo off
setlocal

set "PORT=38765"
if not "%~1"=="" set "PORT=%~1"

set "ROOT_DIR=%~dp0webroot"
set "URL=http://127.0.0.1:%PORT%/"
set "SIMULATOR_URL=%URL%simulator.html"

echo Starting FloppyCompanion WebUI server
echo Root: %ROOT_DIR%
echo WebUI: %URL%
echo Simulator: %SIMULATOR_URL%

where py >nul 2>&1
if not errorlevel 1 (
    py -3 -m http.server %PORT% --bind 127.0.0.1 --directory "%ROOT_DIR%"
    goto :eof
)

where python >nul 2>&1
if not errorlevel 1 (
    python -m http.server %PORT% --bind 127.0.0.1 --directory "%ROOT_DIR%"
    goto :eof
)

echo Error: Python 3 is required to run the local web server.
exit /b 1