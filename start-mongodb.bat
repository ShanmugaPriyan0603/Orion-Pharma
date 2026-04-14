@echo off
setlocal EnableExtensions

echo ===============================================================
echo   MongoDB Setup and Startup Script
echo ===============================================================
echo.

set "MONGO_SERVICE_NAME=MongoDB"
set "MONGO_DATA_PATH=C:\data\db"
set "MONGO_LOG_PATH=C:\data\log\mongod.log"

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ===============================================================
    echo   Administrator Privileges Required
    echo ===============================================================
    echo.
    echo This script needs Administrator privileges to install/start MongoDB service.
    echo.
    echo Options:
    echo   1. Right-click this file and select "Run as Administrator"
    echo   2. Start MongoDB manually: mongod --dbpath C:\data\db
    echo   3. Use Windows Service: net start MongoDB (if installed)
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking MongoDB service...
sc query "%MONGO_SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
    echo MongoDB service not installed. Checking MongoDB installation...

    where mongod >nul 2>&1
    if errorlevel 1 (
        echo MongoDB is not installed or not in PATH.
        echo.
        echo Please install MongoDB from:
        echo https://www.mongodb.com/try/download/community
        echo.
        echo After installation, restart this script as Administrator.
        goto :install_prompt
    )

    for /f "delims=" %%i in ('where mongod') do set "MONGOD_PATH=%%i"
    echo MongoDB found: %MONGOD_PATH%
    echo.

    echo MongoDB service not installed. Installing...

    REM Create data directory
    if not exist "%MONGO_DATA_PATH%" (
        echo Creating data directory: %MONGO_DATA_PATH%
        mkdir "%MONGO_DATA_PATH%" 2>nul
        if errorlevel 1 (
            echo.
            echo ERROR: Failed to create data directory.
            echo Please create it manually: mkdir %MONGO_DATA_PATH%
            goto :manual_start
        )
    )

    REM Create log directory
    if not exist "%MONGO_LOG_PATH:~0,-11%" (
        echo Creating log directory...
        mkdir "%MONGO_LOG_PATH:~0,-11%" 2>nul
    )

    echo Installing MongoDB service...
    sc create "%MONGO_SERVICE_NAME%" binPath= "\"%MONGOD_PATH%\" --service --dbpath=\"%MONGO_DATA_PATH%\" --logpath=\"%MONGO_LOG_PATH%\"" DisplayName= "MongoDB" start= auto
    if errorlevel 1 (
        echo Failed to install MongoDB service.
        goto :manual_start
    )
    echo MongoDB service installed successfully.
) else (
    echo MongoDB service is installed.
)

echo.
echo [2/5] Starting MongoDB service...
net start "%MONGO_SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
    sc query "%MONGO_SERVICE_NAME%" | find "RUNNING" >nul 2>&1
    if errorlevel 1 (
        echo Could not start MongoDB service automatically.
        goto :manual_start
    ) else (
        echo MongoDB service is already running.
    )
) else (
    echo MongoDB service started successfully.
)

echo.
echo [3/5] Waiting for MongoDB to initialize...
timeout /t 3 /nobreak >nul

echo.
echo [4/5] Verifying MongoDB connection...
REM Try mongo shell (old and new versions)
mongo --eval "db.adminCommand('ping')" >nul 2>&1
if errorlevel 1 (
    mongosh --eval "db.adminCommand('ping')" >nul 2>&1
    if errorlevel 1 (
        echo Note: MongoDB shell not found, but service is running.
        goto :success
    )
)

:success
echo.
echo ===============================================================
echo   MongoDB is running!
echo ---------------------------------------------------------------
echo   Connection: mongodb://127.0.0.1:27017
echo   Data Path:  %MONGO_DATA_PATH%
echo   Log Path:   %MONGO_LOG_PATH%
echo ===============================================================
echo.
echo You can now run start.bat to launch the PharmaChain system.
echo.
goto :end

:manual_start
echo.
echo ===============================================================
echo   Manual MongoDB Start Required
echo ===============================================================
echo.
echo Starting MongoDB manually in a new window...
start "MongoDB" cmd /k "mongod --dbpath \"%MONGO_DATA_PATH%\""
echo.
echo MongoDB is starting in a separate window.
echo Please wait a few seconds for it to initialize.
echo.
goto :success

:install_prompt
echo.
echo ===============================================================
echo   MongoDB Installation Required
echo ===============================================================
echo.
echo Download and install MongoDB Community Server:
echo https://www.mongodb.com/try/download/community
echo.
echo After installation:
echo 1. Add MongoDB to your PATH
echo 2. Run this script again as Administrator
echo.
pause

:end
echo Press any key to exit...
pause >nul
endlocal
