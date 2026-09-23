@echo off
title Sadik Sons Enterprise Management
color 1F

echo ==============================================================================
echo     SADIK SONS INDUSTRIAL ^& MEP CONTRACTING — DESKTOP SYSTEM
echo ==============================================================================
echo.
echo [1/3] Checking Node.js runtime environment...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed on this computer!
    echo Node.js is required to run the local offline database and server.
    echo.
    echo Please download and install the free LTS version from:
    echo https://nodejs.org/
    echo.
    echo Press any key to open the Node.js download page...
    pause >nul
    start https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js is detected.
echo.
echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing local dependencies (one-time setup)...
    call npm install --no-audit --no-fund
)

echo [OK] Dependencies ready.
echo.
echo [3/3] Starting Sadik Sons Desktop Engine on port 3000...
start /b "" node server.cjs

timeout /t 2 /nobreak >nul

echo.
echo Launching Application Window...

:: Try launching in Edge App mode (native window feel)
start msedge --app=http://localhost:3000 2>nul
if %errorlevel% neq 0 (
    :: Fallback to Chrome App mode
    start chrome --app=http://localhost:3000 2>nul
    if %errorlevel% neq 0 (
        :: Universal browser fallback
        start http://localhost:3000
    )
)

echo.
echo ==============================================================================
echo  SYSTEM ACTIVE: http://localhost:3000
echo  Keep this window open while using the software.
echo ==============================================================================
echo.
