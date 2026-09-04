@echo off
rem ============================================================
rem  OSS Blog - Ghost stop
rem  Kills the Ghost process listening on port 2368.
rem ============================================================
setlocal enabledelayedexpansion
set "FOUND="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":2368" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    echo Stopping Ghost process PID=%%a ...
    taskkill /F /PID %%a >nul 2>&1
)
if not defined FOUND (
    echo No running Ghost process found (port 2368 is not listening).
)
endlocal
