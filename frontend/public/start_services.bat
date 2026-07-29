@echo off
title X100+ Voucher Scanner Backend Services
echo ============================================================
echo Starting X100+ Voucher Scanner Backend Services...
echo ============================================================

set SCRIPT_DIR=%~dp0

echo [1/2] Starting Python Vision & OCR Engine (Port 8130)...
start /B "Python Vision Engine" cmd /c "cd /d %SCRIPT_DIR%..\backend\python_service && python app.py"

echo [2/2] Starting MagTek STX Scanner API (.NET Port 5042)...
start /B "Scanner API" cmd /c "cd /d %SCRIPT_DIR%..\backend\ScannerApi && dotnet run --configuration Release"

echo ============================================================
echo All services launched!
echo - Scanner API: http://localhost:5042
echo - Python OCR Engine: http://localhost:8130
echo ============================================================
