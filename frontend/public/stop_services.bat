@echo off
title Stop X100+ Voucher Scanner Services
echo ============================================================
echo Stopping Scanner API (.NET) and Python Vision Engine...
echo ============================================================

taskkill /F /IM ScannerApi.exe 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5042 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8130 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo All backend services stopped.
timeout /t 2 >nul
