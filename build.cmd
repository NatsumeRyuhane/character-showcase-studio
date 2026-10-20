@echo off
cd /d "%~dp0frontend"
node tools/build.mjs
if errorlevel 1 pause
