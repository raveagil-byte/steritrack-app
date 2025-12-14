@echo off
echo Starting SteriTrack System...
echo --------------------------------

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    pause
    exit /b
)

echo Starting Backend Server...
start "SteriTrack Backend" cmd /k "echo Starting Backend... && node backend/server.js"

echo Waiting for backend to initialize...
timeout /t 2 /nobreak >nul

echo Starting Frontend Application...
start "SteriTrack Frontend" cmd /k "echo Starting Frontend... && npm run dev"

echo --------------------------------
echo System started!
echo Backend is running on port 3000
echo Frontend is running on Vite default port (usually 5173)
echo.
echo Please do not close the opened command windows.
echo To stop the servers, close the windows or press Ctrl+C in them.
echo.
pause
