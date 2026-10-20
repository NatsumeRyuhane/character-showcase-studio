#!/bin/sh
# Shortcut for deploy/launcher/studio.py. Installs the launcher's Python
# dependencies when missing, then passes all arguments through:
# ./start.sh (menu), ./start.sh start, ./start.sh doctor, ...
cd "$(dirname "$0")" || exit 1
REQUIREMENTS=deploy/launcher/requirements.txt

PY=
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(sys.version_info < (3, 9))' 2>/dev/null; then
    PY=$candidate
    break
  fi
done
if [ -z "$PY" ]; then
  echo "需要 Python 3.9 或更新版本：https://www.python.org/downloads/" >&2
  exit 1
fi

if ! "$PY" -c 'import rich, questionary' >/dev/null 2>&1; then
  echo "正在安装启动器依赖（${REQUIREMENTS}）……" >&2
  if ! "$PY" -m pip install --quiet --disable-pip-version-check -r "${REQUIREMENTS}" >&2; then
    echo "依赖安装失败，请根据上方信息处理（例如改用虚拟环境），或手动运行：" >&2
    echo "  ${PY} -m pip install -r ${REQUIREMENTS}" >&2
    exit 1
  fi
fi

exec "$PY" deploy/launcher/studio.py "$@"
