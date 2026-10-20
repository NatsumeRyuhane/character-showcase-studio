@echo off
cd /d "%~dp0frontend"
where node >nul 2>nul
if not %errorlevel%==0 (
  echo Node.js 18+ is required. Install it from https://nodejs.org/
  pause
  goto :eof
)
node tools/build.mjs
if errorlevel 1 (
  pause
  goto :eof
)
node tools/server.mjs 8768
