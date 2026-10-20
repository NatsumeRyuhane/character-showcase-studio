@echo off
cd /d "%~dp0frontend"
where node >nul 2>nul
if %errorlevel%==0 (
  node tools/server.mjs 8768
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server 8768 --bind 127.0.0.1
  goto :eof
)
echo Install Node.js 18+ or Python 3, or open index.html directly.
pause
