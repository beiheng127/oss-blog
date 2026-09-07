@echo off
rem ============================================================
rem  OSS Blog - Ghost stop
rem  Kills all three background dev processes:
rem    - Ghost on 2368
rem    - SMTP catch on 2525
rem    - Magic-link watcher (node extract-magic-link.js --watch)
rem ============================================================
setlocal enabledelayedexpansion

echo Stopping OSS Blog dev stack ...

rem --- Ghost on 2368 ---
set "FOUND="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":2368" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    echo  * Killing Ghost PID=%%a (2368) ...
    taskkill /F /PID %%a >nul 2>&1
)
if not defined FOUND echo  - Ghost (2368): not running.

rem --- SMTP catch on 2525 ---
set "FOUND="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":2525" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    echo  * Killing SMTP catch PID=%%a (2525) ...
    taskkill /F /PID %%a >nul 2>&1
)
if not defined FOUND echo  - SMTP catch (2525): not running.

rem --- Magic-link watcher (find by commandline) ---
set "FOUND="
for /f "skip=1 tokens=2 delims=," %%a in ('wmic process where "name='node.exe' and commandline like '%%extract-magic-link%%watch%%'" get processid /format:csv 2^>nul') do (
    set "FOUND=1"
    echo  * Killing magic-link watcher PID=%%a ...
    taskkill /F /PID %%a >nul 2>&1
)
if not defined FOUND echo  - Magic-link watcher: not running.

echo.
echo Done.
endlocal