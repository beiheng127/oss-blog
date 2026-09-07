@echo off
rem ============================================================
rem  OSS Blog - Ghost startup (local dev mode)
rem  Uses Node 22.23.1 (Ghost 6.x requires ^22.23.1 || ^24.20.0)
rem  Starts:
rem    1) SMTP catch-all server on 2525  (captures local member emails)
rem    2) Magic-link watcher            (extracts latest signup/signin
rem                                       URL from ghost-dev.log and
rem                                       writes it to inbox/latest-magic-link.txt)
rem    3) Ghost itself        on 2368  (the actual blog)
rem  Avoids ghost-cli's reg.exe dependency (fails under restricted shells).
rem ============================================================
set "NODE_DIR=C:\Users\ruia3\AppData\Local\nvm\v22.23.1"
set "PATH=%NODE_DIR%;%PATH%"
set "NODE_ENV=development"
set "RUNTIME_DIR=%~dp0runtime"

echo.
echo Starting OSS Blog dev stack ...
echo   Site   : http://localhost:2368
echo   Admin  : http://localhost:2368/ghost
echo   SMTP   : 127.0.0.1:2525  (captures outgoing magic-link emails)
echo   Magic link : %RUNTIME_DIR%\inbox\latest-magic-link.txt
echo.

rem --- 1) SMTP catch (background) ---
echo [1/3] Starting SMTP catch-all on 2525 ...
start "OSS-SMTP" /B "%NODE_DIR%\node.exe" "%RUNTIME_DIR%\smtp-catch.js" 2525

rem --- 2) Magic-link watcher (background) ---
echo [2/3] Starting magic-link watcher ...
start "OSS-EXT" /B "%NODE_DIR%\node.exe" "%RUNTIME_DIR%\extract-magic-link.js" --watch

rem --- 3) Ghost itself (foreground; closing this window stops it) ---
echo [3/3] Starting Ghost on 2368 ...
cd /d "%RUNTIME_DIR%"
"%NODE_DIR%\node.exe" current\index.js