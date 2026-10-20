#!/bin/sh
# Shortcut for deploy/launcher/studio.py. Passes all arguments through,
# e.g. ./start.sh (menu), ./start.sh start, ./start.sh doctor.
cd "$(dirname "$0")" || exit 1
for py in python3 python; do
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import sys; sys.exit(sys.version_info < (3, 9))' 2>/dev/null; then
    exec "$py" deploy/launcher/studio.py "$@"
  fi
done
echo "需要 Python 3.9 或更新版本：https://www.python.org/downloads/" >&2
exit 1
