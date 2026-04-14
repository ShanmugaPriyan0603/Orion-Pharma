@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"
goto :main

:cleanup_started_services
for %%P in (3000 5000 8545) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$lines = netstat -ano ^| Select-String ':%%P .*LISTENING'; foreach ($line in $lines) { $parts = ($line.ToString() -split '\s+') ^| Where-Object { $_ -ne '' }; $pidValue = [int]$parts[-1]; if ($pidValue -gt 0) { try { Stop-Process -Id $pidValue -Force -ErrorAction Stop } catch {} } }" >nul 2>&1
)
exit /b 0

:show_backend_log
if not exist "%BACKEND_LOG%" (
    echo Backend startup log was not created.
    exit /b 0
)
echo.
echo --- Backend startup log (last 80 lines) ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%BACKEND_LOG%' -Tail 80"
echo --- End backend startup log ---
echo.
exit /b 0

:ensure_node_modules
set "TARGET=%~1"
set "NAME=%~2"
if exist "%TARGET%\node_modules" (
    echo   - %NAME% dependencies already installed
    exit /b 0
)

echo   - Installing %NAME% dependencies...
pushd "%TARGET%"
call npm install >nul 2>&1
set "INSTALL_EXIT=%errorlevel%"
popd
if not "%INSTALL_EXIT%"=="0" (
    echo   - Failed to install %NAME% dependencies
    exit /b 1
)
echo   - %NAME% dependencies installed
exit /b 0

:wait_for_http
set "URL=%~1"
set "TRIES=%~2"
set /a COUNT=0

:wait_loop
set /a COUNT+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2) ^| Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if "%errorlevel%"=="0" exit /b 0
if %COUNT% GEQ %TRIES% exit /b 1
timeout /t 1 /nobreak >nul
goto :wait_loop

:wait_for_port
set "HOST=%~1"
set "LISTEN_PORT=%~2"
set "TRIES=%~3"
set /a COUNT=0

:wait_port_loop
set /a COUNT+=1
netstat -ano | findstr /R /C:":%LISTEN_PORT% .*LISTENING" >nul 2>&1
if "%errorlevel%"=="0" exit /b 0
if %COUNT% GEQ %TRIES% exit /b 1
timeout /t 1 /nobreak >nul
goto :wait_port_loop

:main
cd /d "%~dp0"

echo ===============================================================
echo   PharmaChain Intelligence System - Startup
echo ===============================================================
echo.

set "ROOT=%cd%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "BLOCKCHAIN=%ROOT%\blockchain"
set "BACKEND_LOG=%ROOT%\backend-startup.log"
set "NO_PAUSE=0"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"
set "HARDHAT_DISABLE_TELEMETRY_PROMPT=1"
set "HARDHAT_DISABLE_TELEMETRY=1"

REM Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from: https://nodejs.org/
    goto :fatal
)

echo [1/6] Checking MongoDB connection...
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: MongoDB is not running on 127.0.0.1:27017
    echo.
    echo Please start MongoDB first using one of these options:
    echo   1. Run start-mongodb.bat ^(as Administrator^)
    echo   2. Run: net start MongoDB
    echo   3. Run manually: mongod --dbpath C:\data\db
    echo.
    echo The backend will retry connection when MongoDB starts.
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
) else (
    echo MongoDB is running.
)

echo.
echo [2/6] Checking and installing dependencies if needed...
call :ensure_node_modules "%BACKEND%" "backend"
if errorlevel 1 goto :fatal

call :ensure_node_modules "%FRONTEND%" "frontend"
if errorlevel 1 goto :fatal

call :ensure_node_modules "%BLOCKCHAIN%" "blockchain"
if errorlevel 1 goto :fatal

echo.
echo Cleaning up any stale app listeners from prior runs...
call :cleanup_started_services

echo.
echo [3/6] Starting local blockchain node...
start "PharmaChain Blockchain Node" cmd /k "set PORT=8545 && set HARDHAT_DISABLE_TELEMETRY_PROMPT=1 && set HARDHAT_DISABLE_TELEMETRY=1 && cd /d ""%BLOCKCHAIN%"" && npm run node"

echo Waiting for blockchain node to start...
call :wait_for_port "127.0.0.1" 8545 30
if errorlevel 1 (
    echo WARNING: Blockchain node did not start in time.
    echo It may still be starting. Continuing anyway...
)

echo.
echo [4/6] Deploying smart contract ^(this may take a moment^)...
cd /d "%BLOCKCHAIN%"
set "HARDHAT_DISABLE_TELEMETRY_PROMPT=1"
set "HARDHAT_DISABLE_TELEMETRY=1"
call npm run deploy 2>nul
if errorlevel 1 (
    echo WARNING: Contract deployment failed or was skipped.
    echo The system will work in demo mode without blockchain.
)
cd /d "%ROOT%"

echo.
echo [5/6] Starting backend...
if exist "%BACKEND_LOG%" del "%BACKEND_LOG%" >nul 2>&1
start "PharmaChain Backend" cmd /k "set PORT=5000 && cd /d ""%BACKEND%"" && (node server.js > ""%BACKEND_LOG%"" 2>&1)"

echo Waiting for backend to start...
call :wait_for_http "http://127.0.0.1:5000/api/health" 45
if errorlevel 1 (
    echo ERROR: Backend is not reachable at http://127.0.0.1:5000/api/health
    call :show_backend_log
    echo Capturing failure state and stopping started services...
    call :cleanup_started_services
    goto :fatal
) else (
    echo Backend is running.
)

echo.
echo [6/6] Starting frontend...
start "PharmaChain Frontend" cmd /k "set PORT=3000 && cd /d ""%FRONTEND%"" && npm run dev"

call :wait_for_http "http://127.0.0.1:3000" 30
if errorlevel 1 (
    echo WARNING: Frontend is not reachable yet.
    echo Check the Frontend terminal for errors.
) else (
    echo Frontend is running.
)

echo.
echo ===============================================================
echo   Startup Complete!
echo ---------------------------------------------------------------
echo   Frontend:   http://localhost:3000
echo   Backend:    http://localhost:5000/api
echo   Blockchain: http://127.0.0.1:8545
echo   MongoDB:    mongodb://127.0.0.1:27017
echo ===============================================================
echo.
echo If any service failed to start, check the respective terminal window.
echo.
goto :end

:fatal
echo.
echo Startup stopped due to an error.
exit /b 1

:end
if "%NO_PAUSE%"=="1" goto :done
echo Press any key to exit this window...
pause >nul
:done
endlocal
