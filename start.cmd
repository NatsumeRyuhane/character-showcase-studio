@echo off
rem Shortcut for deploy\launcher\studio.py. Installs the launcher's Python
rem dependencies when missing, then passes all arguments through:
rem start.cmd (menu), start.cmd start, start.cmd doctor, ...
chcp 65001 >nul
cd /d "%~dp0"
rem Pause before closing only when double-clicked (no arguments); agents and CI must never block.
set "STUDIO_PAUSE="
if "%~1"=="" set "STUDIO_PAUSE=1"
set "REQUIREMENTS=deploy\launcher\requirements.txt"
set "STUDIO_PY="
where py >nul 2>nul && set "STUDIO_PY=py -3"
if not defined STUDIO_PY where python >nul 2>nul && set "STUDIO_PY=python"
if not defined STUDIO_PY (
  echo 需要 Python 3.9 或更新版本：https://www.python.org/downloads/ 1>&2
  if defined STUDIO_PAUSE pause
  exit /b 1
)

%STUDIO_PY% -c "import rich, questionary" >nul 2>nul
if errorlevel 1 (
  echo 正在安装启动器依赖（%REQUIREMENTS%）…… 1>&2
  %STUDIO_PY% -m pip install --quiet --disable-pip-version-check -r "%REQUIREMENTS%" 1>&2
  if errorlevel 1 (
    echo 依赖安装失败，请根据上方信息处理，或手动运行： 1>&2
    echo   %STUDIO_PY% -m pip install -r %REQUIREMENTS% 1>&2
    if defined STUDIO_PAUSE pause
    exit /b 1
  )
)

%STUDIO_PY% deploy\launcher\studio.py %*
if errorlevel 1 if defined STUDIO_PAUSE pause
