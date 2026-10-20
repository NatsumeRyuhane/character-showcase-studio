@echo off
cd /d "%~dp0"
node tools/build.mjs
if errorlevel 1 pause
