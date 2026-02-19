@echo off
REM Start Chrome with CDP and expose via ngrok
REM For use with Mimir deployed on Render

echo.
echo ================================
echo   Mimir CDP Setup (Windows)
echo ================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ngrok not found!
    echo.
    echo Please install ngrok:
    echo   Download from: https://ngrok.com/download
    echo   Or use: choco install ngrok
    echo.
    pause
    exit /b 1
)

REM Find Chrome installation
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist %CHROME_PATH% (
    echo [ERROR] Chrome not found!
    echo Please install Google Chrome or update the CHROME_PATH in this script.
    echo.
    pause
    exit /b 1
)

echo [1/3] Cleaning up existing Chrome CDP instances...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq chrome*" >nul 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Starting Chrome with CDP on port 9222...
start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug-mimir" --no-first-run --no-default-browser-check
timeout /t 3 /nobreak >nul
echo       Chrome started successfully!
echo.

echo [3/3] Starting ngrok tunnel...
echo.
echo ================================================================
echo   COPY THE CDP URL BELOW TO MIMIR FRONTEND
echo ================================================================
echo.
echo   1. Look for: "Forwarding https://XXXX.ngrok.io"
echo   2. Copy that HTTPS URL (e.g., https://abc-123.ngrok.io)
echo   3. In Mimir frontend:
echo      - Browser Mode: Select "Existing (CDP)"
echo      - CDP URL: Paste the ngrok HTTPS URL
echo   4. Execute your test!
echo.
echo   Note: Using HTTP tunnel (free, no limits!)
echo.
echo ================================================================
echo.

REM Start ngrok (blocks until Ctrl+C)
REM Using HTTP tunnel instead of TCP - completely free!
ngrok http 9222

echo.
echo Cleaning up...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq chrome*" >nul 2>nul
echo Done!
pause
