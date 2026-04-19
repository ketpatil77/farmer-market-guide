@echo off
REM E-Kisan Market - Server Startup with ConnectionAbortedError Fix
REM This batch file starts the HTTP server and realtime SSE server

setlocal

set "BASE_DIR=%~dp0"
set "PORT=8000"
set "REALTIME_PORT=8765"
set "SECRETS_FILE=%BASE_DIR%local.env.bat"

REM Load local secrets (API keys, runtime overrides) if present
if exist "%SECRETS_FILE%" (
  call "%SECRETS_FILE%"
)

echo.
echo ========================================
echo E-Kisan Market - Starting Servers
echo ========================================
echo.
echo HTTP Server Port: %PORT%
echo Realtime Server Port: %REALTIME_PORT%
if defined API_NINJAS_KEY (
  echo API Ninjas Key: Loaded
) else (
  echo API Ninjas Key: Missing (external feed will use fallback)
)
echo.

REM Create logs directory for server diagnostics
if not exist "%BASE_DIR%logs" mkdir "%BASE_DIR%logs"

REM Start HTTP server with no-cache headers so refresh always reflects latest code
echo Starting HTTP server on port %PORT%...
start "E-Kisan Market HTTP Server" cmd /k "cd /d "%BASE_DIR%" && python scripts\static_server.py %PORT%"

REM Start realtime sync server (SSE) with logging
echo Starting Realtime SSE server on port %REALTIME_PORT%...
start "E-Kisan Market Realtime SSE Server" cmd /k "cd /d "%BASE_DIR%" && set FARMA_REALTIME_PORT=%REALTIME_PORT% && python scripts\realtime_server.py"

REM Wait briefly for servers to start
echo.
echo Waiting for servers to initialize (2 seconds)...
timeout /t 2 /nobreak >nul
curl -s "http://localhost:%REALTIME_PORT%/health" >nul 2>&1 && (
  echo Realtime health check: OK
) || (
  echo Realtime health check: WARN (SSE server may still be booting)
)

REM Open dashboards via browser
echo.
echo Opening Buyer, Farmer, and Middleman dashboards in your browser...
start "" "http://localhost:%PORT%/buyer-dashboard.html"
start "" "http://localhost:%PORT%/farmer-dashboard.html"
start "" "http://localhost:%PORT%/middleman-dashboard.html"

echo.
echo ========================================
echo Servers started successfully!
echo ========================================
echo.
echo Access the dashboards:
echo • Buyer: http://localhost:%PORT%/buyer-dashboard.html
echo • Farmer: http://localhost:%PORT%/farmer-dashboard.html
echo • Middleman: http://localhost:%PORT%/middleman-dashboard.html
echo.
echo Note: Server logs are saved in logs/ directory
echo Server is optimized to handle ConnectionAbortedError with:
echo • Improved timeout configuration
echo • Better connection handling
echo • Client-side retry logic with exponential backoff
echo.
echo To stop servers, close the command windows or press Ctrl+C in each.
echo.

endlocal
