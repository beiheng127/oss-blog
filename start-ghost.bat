@echo off
rem ============================================================
rem  OSS Blog - Ghost startup (local dev mode)
rem  Uses Node 22.23.1 (Ghost 6.x requires ^22.23.1 || ^24.20.0)
rem  Starts Ghost directly via node, avoiding ghost-cli's reg.exe
rem  dependency (which fails under some restricted shells).
rem ============================================================
set "NODE_DIR=C:\Users\ruia3\AppData\Local\nvm\v22.23.1"
set "PATH=%NODE_DIR%;%PATH%"
set "NODE_ENV=development"

cd /d "%~dp0runtime"

echo.
echo Starting Ghost (local dev mode) ...
echo   Site  : http://localhost:2368
echo   Admin : http://localhost:2368/ghost
echo   Keep this window open; closing it stops the server.
echo.

"%NODE_DIR%\node.exe" current\index.js
