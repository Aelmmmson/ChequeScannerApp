@echo off
:: Cheque Scanner App - Quick Install Runner
:: Run this as Administrator

echo ========================================
echo Cheque Scanner App - Quick Install Setup
echo ========================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

:: Define paths
set "SCRIPT_DIR=%~dp0"
set "INSTALL_SCRIPT=%SCRIPT_DIR%cheque-scanner-install.ps1"

:: Check if PowerShell script exists
if not exist "%INSTALL_SCRIPT%" (
    echo ERROR: Installation script not found!
    echo Please ensure cheque-scanner-install.ps1 is in the same directory
    pause
    exit /b 1
)

:: Run the PowerShell script
echo Running installation script...
echo.
powershell -ExecutionPolicy Bypass -File "%INSTALL_SCRIPT%"

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Installation encountered issues.
    echo Please check the error messages above.
    pause
    exit /b %errorLevel%
)

echo.
echo Installation completed successfully!
pause