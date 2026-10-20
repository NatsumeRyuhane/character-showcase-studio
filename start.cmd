@echo off
rem Shortcut for deploy\launcher\studio.py. Passes all arguments through,
rem e.g. start.cmd (menu), start.cmd start, start.cmd doctor.
chcp 65001 >nul
cd /d "%~dp0"
set "STUDIO_PY="
where py >nul 2>nul && set "STUDIO_PY=py -3"
if not defined STUDIO_PY where python >nul 2>nul && set "STUDIO_PY=python"
if not defined STUDIO_PY (
  echo 需要 Python 3.9 或更新版本：https://www.python.org/downloads/
  pause
  exit /b 1
)
%STUDIO_PY% deploy\launcher\studio.py %*
if errorlevel 1 pause
