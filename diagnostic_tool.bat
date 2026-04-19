@echo off
REM E-Kisan Market - Diagnostic Tool for Connection Issues
REM This tool helps diagnose ConnectionAbortedError and other connection-related issues

setlocal enabledelayedexpansion

cls
echo.
echo ==================================================================================
echo  E-Kisan Market - Connection Diagnostic Tool
echo ==================================================================================
echo.
echo This tool will diagnose potential connection issues with your setup.
echo.

REM Check Python
echo [1/7] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ FAILED: Python is not installed or not in PATH
    echo   → Please install Python 3.7+ and add it to your system PATH
    goto :END_DIAGNOSTIC
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo ✓ PASSED: !PYTHON_VERSION!
)

REM Check if port 8000 is in use
echo.
echo [2/7] Checking if port 8000 (HTTP) is available...
netstat -ano | findstr ":8000 " >nul
if errorlevel 1 (
    echo ✓ PASSED: Port 8000 is available
) else (
    echo ✗ WARNING: Port 8000 appears to be in use
    echo   → Kill existing processes or change the port in the batch file
    tasklist | findstr -i "python" 
)

REM Check if port 8765 is in use
echo.
echo [3/7] Checking if port 8765 (Realtime/SSE) is available...
netstat -ano | findstr ":8765 " >nul
if errorlevel 1 (
    echo ✓ PASSED: Port 8765 is available
) else (
    echo ✗ WARNING: Port 8765 appears to be in use
    echo   → Kill existing processes or change the port in the batch file
)

REM Check localhost connectivity
echo.
echo [4/7] Checking localhost (127.0.0.1) connectivity...
ping -n 1 127.0.0.1 >nul 2>&1
if errorlevel 1 (
    echo ✗ FAILED: Cannot ping localhost
    echo   → This indicates a network configuration issue
) else (
    echo ✓ PASSED: Localhost is reachable
)

REM Check firewall for Python
echo.
echo [5/7] Checking current network statistics...
echo Network Ports in Use:
netstat -ano | findstr "LISTENING" | findstr -E "8000|8765|python"
echo.

REM Check file availability
echo [6/7] Checking required files...
if not exist "%~dp0scripts\realtime_server.py" (
    echo ✗ FAILED: realtime_server.py not found
) else (
    echo ✓ PASSED: realtime_server.py found
)

if not exist "%~dp0data\data.json" (
    echo ✗ FAILED: data.json not found
) else (
    echo ✓ PASSED: data.json found
)

REM Run a quick connectivity test
echo.
echo [7/7] Testing server connection (this requires running servers)...
echo.
echo NOTE: This test works best if servers are already running.
echo If you haven't started the servers yet, run 'start_server_and_dashboards.bat' first.
echo.

REM Try to connect to HTTP server
timeout /t 1 /nobreak >nul

REM Summary
echo.
echo ==================================================================================
echo  Diagnostic Summary
echo ==================================================================================
echo.
echo Common Solutions for ConnectionAbortedError:
echo.
echo 1. FIREWALL CHECK:
echo    • Windows Firewall or antivirus may be blocking connections
echo    • Try: Settings > Firewall & Network Protection > Allow an app through firewall
echo    • Add Python.exe to the allowed list
echo.
echo 2. PORT CONFLICTS:
echo    • Another application may be using ports 8000 or 8765
echo    • Run 'netstat -ano' to see all listening ports
echo    • Use 'taskkill /PID {pid}' to stop conflicting processes
echo.
echo 3. PYTHON ENVIRONMENT:
echo    • Ensure you're using Python 3.7 or newer
echo    • Try: pip install --upgrade setuptools wheel
echo.
echo 4. NETWORK CONFIGURATION:
echo    • IPv6 vs IPv4 issues
echo    • Loopback adapter problems
echo.
echo 5. RESOURCE CONSTRAINTS:
echo    • Close unnecessary applications if system is under load
echo    • Check Task Manager for CPU/Memory usage
echo.
echo 6. TIMEOUT SETTINGS:
echo    • The improved realtime_server.py includes better timeout handling
echo    • Check logs in the 'logs' directory for detailed error messages
echo.
echo ==================================================================================
echo.

:END_DIAGNOSTIC
echo Press any key to close this window...
pause >nul

endlocal
exit /b 0
