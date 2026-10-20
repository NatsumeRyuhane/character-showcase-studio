#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = ["rich>=13", "questionary>=2"]
# ///
"""Character Showcase Studio launcher.

Run with no arguments for the interactive menu, or with a subcommand
(start, stop, restart, status, open, build, check, doctor, upgrade).
Subcommands only need the standard library, so `doctor` still works when
the menu's pip dependencies are missing.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
DIST_PAGE = FRONTEND / "dist" / "index.html"
STATE_DIR = ROOT / ".studio"
STATE_FILE = STATE_DIR / "server.json"
LOG_FILE = STATE_DIR / "server.log"
REQUIREMENTS = Path(__file__).resolve().parent / "requirements.txt"

REPO = "nekokaii/character-showcase-studio"
HOST = "127.0.0.1"
# Browser storage is per origin: changing the port or host starts from empty settings.
DEFAULT_PORT = 8768
PAGE_MARKER = "Character Showcase Studio"
MIN_PYTHON = (3, 9)
MIN_NODE = 18
WINDOWS = os.name == "nt"

try:
    from rich.console import Console
    from rich.table import Table

    _console = Console()
except ImportError:  # Subcommands fall back to plain output.
    _console = None


class LauncherError(Exception):
    """A failure with a message meant for the user."""


# ---------------------------------------------------------------- output

def say(message: str = "", style: str | None = None) -> None:
    if _console:
        _console.print(message, style=style, highlight=False)
    else:
        print(re.sub(r"\[/?[a-z ]+\]", "", message))


def ok(message: str) -> None:
    say(f"[green]✓[/green] {message}")


def warn(message: str) -> None:
    say(f"[yellow]![/yellow] {message}")


def fail(message: str) -> None:
    say(f"[red]✗[/red] {message}")


# ---------------------------------------------------------------- helpers

def run(args: list[str], cwd: Path = ROOT, capture: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=cwd, capture_output=capture, text=True,
                          encoding="utf-8", errors="replace")


def git(*args: str) -> subprocess.CompletedProcess:
    return run(["git", *args])


def node_version() -> tuple[int, ...] | None:
    if not shutil.which("node"):
        return None
    result = run(["node", "--version"])
    match = re.match(r"v(\d+)\.(\d+)", result.stdout.strip())
    return tuple(int(part) for part in match.groups()) if match else None


def require_node() -> None:
    version = node_version()
    if version is None:
        raise LauncherError("没有找到 Node.js。请先安装 Node.js 18 或更新版本：https://nodejs.org/")
    if version[0] < MIN_NODE:
        raise LauncherError(f"Node.js 版本过低（{version[0]}.{version[1]}），需要 18 或更新版本：https://nodejs.org/")


def url(port: int) -> str:
    return f"http://{HOST}:{port}/"


# Never send local health checks through an HTTP proxy from the environment.
_local = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def page_responds(port: int, timeout: float = 1.0) -> bool:
    """True only if our page answers on the port, not some other program."""
    try:
        with _local.open(url(port), timeout=timeout) as response:
            return response.status == 200 and PAGE_MARKER in response.read(32768).decode("utf-8", "replace")
    except OSError:
        return False


def port_in_use(port: int) -> bool:
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((HOST, port)) == 0


def pid_alive(pid: int) -> bool:
    if WINDOWS:
        result = run(["tasklist", "/FI", f"PID eq {pid}", "/NH", "/FO", "CSV"])
        return f'"{pid}"' in result.stdout
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def read_state() -> dict | None:
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return state if isinstance(state.get("pid"), int) and isinstance(state.get("port"), int) else None
    except (OSError, ValueError):
        return None


def running_server() -> dict | None:
    """The server this launcher started, if it is still alive and serving our page."""
    state = read_state()
    if state and pid_alive(state["pid"]) and page_responds(state["port"]):
        return state
    return None


def dist_is_stale() -> bool:
    if not DIST_PAGE.exists():
        return True
    built = DIST_PAGE.stat().st_mtime
    sources = [FRONTEND / name for name in ("src", "runtime", "assets", "vendor")]
    sources.append(FRONTEND / "tools" / "build.mjs")
    for source in sources:
        files = source.rglob("*") if source.is_dir() else [source]
        if any(path.is_file() and path.stat().st_mtime > built for path in files):
            return True
    return False


# ---------------------------------------------------------------- commands

def cmd_build(_args: argparse.Namespace | None = None) -> None:
    require_node()
    say("正在构建页面……")
    result = run(["node", "tools/build.mjs"], cwd=FRONTEND)
    if result.returncode != 0:
        say(result.stdout + result.stderr)
        raise LauncherError("构建失败，详细信息见上方输出。")
    ok(result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "构建完成")


def cmd_check(args: argparse.Namespace | None = None) -> None:
    cmd_build(args)
    say("正在运行自动检查……")
    result = run(["node", "tools/check.mjs"], cwd=FRONTEND)
    if result.returncode != 0:
        say(result.stdout + result.stderr)
        raise LauncherError("自动检查未通过，详细信息见上方输出。")
    ok("自动检查全部通过")


def cmd_start(args: argparse.Namespace) -> None:
    port = getattr(args, "port", None) or DEFAULT_PORT
    current = running_server()
    if current:
        ok(f"预览已在运行：{url(current['port'])}")
        if not getattr(args, "no_open", False):
            webbrowser.open(url(current["port"]))
        return
    if port_in_use(port):
        raise LauncherError(f"端口 {port} 已被其他程序占用。请关闭占用它的程序，或运行 `start --port 8769` 使用其他端口"
                            "（注意：换端口后浏览器中保存的设置会从空白开始）。")
    if not getattr(args, "no_build", False) or not DIST_PAGE.exists():
        cmd_build()
    require_node()
    if port != DEFAULT_PORT:
        warn(f"使用端口 {port}：浏览器中保存的设置与默认端口 {DEFAULT_PORT} 互不相通。")

    STATE_DIR.mkdir(exist_ok=True)
    log = open(LOG_FILE, "a", encoding="utf-8")
    options: dict = {"cwd": FRONTEND, "stdout": log, "stderr": subprocess.STDOUT, "stdin": subprocess.DEVNULL}
    if WINDOWS:
        options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    else:
        options["start_new_session"] = True
    process = subprocess.Popen(["node", "tools/server.mjs", str(port)], **options)
    log.close()

    for _ in range(50):
        if page_responds(port, timeout=0.5):
            break
        if process.poll() is not None:
            raise LauncherError(f"预览服务器启动失败，日志见 {LOG_FILE}")
        time.sleep(0.2)
    else:
        process.terminate()
        raise LauncherError(f"预览服务器没有响应，日志见 {LOG_FILE}")

    STATE_FILE.write_text(json.dumps({"pid": process.pid, "port": port, "started": time.time()}), encoding="utf-8")
    ok(f"预览已启动：{url(port)}")
    say("关闭此窗口不会停止预览；需要停止时运行「停止预览」。", style="dim")
    if not getattr(args, "no_open", False):
        webbrowser.open(url(port))


def cmd_stop(_args: argparse.Namespace | None = None) -> None:
    state = read_state()
    if not state or not pid_alive(state["pid"]):
        STATE_FILE.unlink(missing_ok=True)
        ok("预览没有在运行")
        return
    if not page_responds(state["port"]):
        # The recorded PID may now belong to an unrelated process; never kill it.
        STATE_FILE.unlink(missing_ok=True)
        warn("记录中的预览进程已不再提供页面，已清除记录，没有结束任何进程。")
        return
    pid = state["pid"]
    if WINDOWS:
        run(["taskkill", "/PID", str(pid), "/T", "/F"])
    else:
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    for _ in range(25):
        if not page_responds(state["port"], timeout=0.3):
            break
        time.sleep(0.2)
    STATE_FILE.unlink(missing_ok=True)
    ok("预览已停止")


def cmd_restart(args: argparse.Namespace) -> None:
    previous = running_server()
    cmd_stop()
    if previous and args.port is None:
        args.port = previous["port"]
    cmd_start(args)


def cmd_status(_args: argparse.Namespace | None = None) -> None:
    current = running_server()
    if current:
        started = time.strftime("%Y-%m-%d %H:%M", time.localtime(current.get("started", 0)))
        ok(f"预览运行中：{url(current['port'])}（进程 {current['pid']}，启动于 {started}）")
    else:
        say("预览未运行")
    if not DIST_PAGE.exists():
        warn("尚未构建页面")
    elif dist_is_stale():
        warn("源码比构建结果新，重启预览或运行「构建」即可更新")
    else:
        ok("构建结果是最新的")
    branch = git("branch", "--show-current").stdout.strip()
    if branch:
        say(f"当前分支：{branch}")


def cmd_open(_args: argparse.Namespace | None = None) -> None:
    current = running_server()
    if not current:
        raise LauncherError("预览没有在运行，请先「启动预览」。")
    webbrowser.open(url(current["port"]))
    ok(f"已在浏览器中打开 {url(current['port'])}")


def cmd_upgrade(args: argparse.Namespace) -> None:
    if not shutil.which("git"):
        raise LauncherError("没有找到 Git，无法更新。请先安装 Git：https://git-scm.com/")
    branch = git("branch", "--show-current").stdout.strip()
    if branch != "main":
        raise LauncherError(f"当前在分支「{branch or '（无）'}」上，这通常表示有一项修改正在进行中。"
                            "更新只针对主线 main：请先完成并提交这项修改（或请 AI 助手协助），切换回 main 后再更新。")
    if git("status", "--porcelain", "--untracked-files=no").stdout.strip():
        raise LauncherError("main 上有尚未提交的修改。为避免覆盖它们，没有进行更新。请先请 AI 助手把这些修改移到新分支。")
    say("正在从 GitHub 获取最新版本……")
    fetched = git("fetch", "origin")
    if fetched.returncode != 0:
        raise LauncherError("无法连接 GitHub：" + (fetched.stderr.strip() or "未知错误"))
    ahead = int(git("rev-list", "--count", "origin/main..HEAD").stdout.strip() or 0)
    behind = int(git("rev-list", "--count", "HEAD..origin/main").stdout.strip() or 0)
    if ahead:
        raise LauncherError(f"本地 main 有 {ahead} 个尚未上传的提交，和 GitHub 上的版本不一致。为避免丢失，没有进行更新，请联系开发者处理。")
    if not behind:
        ok("已经是最新版本")
        return
    merged = git("merge", "--ff-only", "origin/main")
    if merged.returncode != 0:
        raise LauncherError("更新失败：" + merged.stderr.strip())
    ok(f"已更新 {behind} 个提交")
    was_running = running_server()
    cmd_build()
    if was_running:
        args.port, args.no_open = was_running["port"], True
        cmd_stop()
        cmd_start(args)


def cmd_doctor(_args: argparse.Namespace | None = None) -> None:
    problems = 0

    def check(passed: bool | None, message: str, hint: str = "") -> None:
        nonlocal problems
        if passed:
            ok(message)
        elif passed is None:
            warn(message + (f"\n    → {hint}" if hint else ""))
        else:
            problems += 1
            fail(message + (f"\n    → {hint}" if hint else ""))

    say("[bold]运行环境[/bold]")
    check(sys.version_info >= MIN_PYTHON, f"Python {sys.version.split()[0]}", "需要 Python 3.9 或更新版本")
    version = node_version()
    check(version is not None and version[0] >= MIN_NODE,
          f"Node.js {'.'.join(map(str, version)) if version else '未安装'}", "需要 Node.js 18 或更新版本：https://nodejs.org/")
    try:
        import questionary  # noqa: F401
        import rich  # noqa: F401
        check(True, "菜单所需的 Python 依赖已安装")
    except ImportError:
        check(None, "菜单所需的 Python 依赖未安装（命令行子命令不受影响）",
              f"{Path(sys.executable).name} -m pip install -r {REQUIREMENTS.relative_to(ROOT)}")

    say("\n[bold]Git 与 GitHub[/bold]")
    if not shutil.which("git"):
        check(False, "没有找到 Git", "安装 Git：https://git-scm.com/")
    else:
        branch = git("branch", "--show-current").stdout.strip()
        check(True, f"当前分支：{branch or '（无）'}")
        dirty = git("status", "--porcelain").stdout.strip()
        check(None if dirty else True, "有尚未提交的修改" if dirty else "没有未提交的修改",
              "如果不是你的修改，请先询问其他成员")
        crlf = [line.split("\t")[-1] for line in git("ls-files", "--eol").stdout.splitlines()
                if "w/crlf" in line and not line.endswith((".cmd", ".bat"))]
        check(not crlf, "换行符正常" if not crlf else f"{len(crlf)} 个文件使用了 Windows 换行符",
              "按 docs/dev/build-and-test.md「Generated files and line endings」刷新一次")
        claude = ROOT / ".claude"
        check(claude.is_dir() or None, ".claude 符号链接正常" if claude.is_dir() else ".claude 不是文件夹（Git 符号链接未启用）",
              "需开启 Git 符号链接支持（core.symlinks=true）；只影响 Claude Code")
    if not shutil.which("gh"):
        check(False, "没有找到 GitHub 命令行工具 gh（AI 助手需要它读取 Issue 与 PR）", "安装：https://cli.github.com/")
    elif run(["gh", "auth", "status"]).returncode != 0:
        check(False, "gh 尚未登录", "在终端运行：gh auth login")
    elif run(["gh", "repo", "view", REPO, "--json", "name"]).returncode != 0:
        check(False, f"无法访问仓库 {REPO}", "请仓库所有者把你加为协作者")
    else:
        check(True, f"可以访问 GitHub 仓库 {REPO}")

    say("\n[bold]预览[/bold]")
    current = running_server()
    if current:
        check(True, f"预览运行中：{url(current['port'])}")
    elif port_in_use(DEFAULT_PORT):
        check(False, f"端口 {DEFAULT_PORT} 被其他程序占用", "关闭占用的程序，或使用 start --port 指定其他端口")
    else:
        check(True, f"端口 {DEFAULT_PORT} 可用")
    if not DIST_PAGE.exists():
        check(None, "尚未构建页面", "运行「构建」或直接「启动预览」")
    else:
        check(None if dist_is_stale() else True,
              "源码比构建结果新" if dist_is_stale() else "构建结果是最新的", "重新构建即可")

    say()
    if problems:
        fail(f"发现 {problems} 个需要处理的问题")
    else:
        ok("环境正常")


# ---------------------------------------------------------------- menu

MENU = [
    ("启动预览", "start"),
    ("停止预览", "stop"),
    ("重启预览（重新构建）", "restart"),
    ("查看状态", "status"),
    ("在浏览器中打开", "open"),
    ("构建", "build"),
    ("构建并运行自动检查", "check"),
    ("诊断环境", "doctor"),
    ("更新到最新版本", "upgrade"),
]


def ensure_menu_dependencies() -> bool:
    try:
        import questionary  # noqa: F401
        import rich  # noqa: F401
        return True
    except ImportError:
        pass
    command = [sys.executable, "-m", "pip", "install", "-r", str(REQUIREMENTS)]
    print("交互菜单需要安装两个 Python 依赖（rich、questionary）。")
    print("将运行：" + " ".join(command))
    if input("现在安装吗？[y/N] ").strip().lower() not in ("y", "yes"):
        print("已取消。也可以直接使用子命令，例如：start、stop、doctor（运行 --help 查看全部）。")
        return False
    if subprocess.run(command).returncode != 0:
        print("安装失败。请根据上方提示处理，或请 AI 助手协助安装。")
        return False
    # Run again in a fresh interpreter so the new packages import cleanly.
    raise SystemExit(subprocess.call([sys.executable, *sys.argv]))


def menu(parser: argparse.ArgumentParser) -> None:
    import questionary

    while True:
        say()
        current = running_server()
        say(f"[bold]角色展示设计工作台[/bold]  " + (f"[green]预览运行中[/green] {url(current['port'])}" if current else "[dim]预览未运行[/dim]"))
        choice = questionary.select("要做什么？", choices=[*(questionary.Choice(label, value) for label, value in MENU),
                                                         questionary.Choice("退出", "quit")]).ask()
        if choice in (None, "quit"):
            return
        try:
            dispatch(parser.parse_args([choice]))
        except SystemExit:
            pass  # The error is already shown; stay in the menu.
        questionary.press_any_key_to_continue("按任意键返回菜单").ask()


# ---------------------------------------------------------------- entry

COMMANDS = {
    "start": cmd_start, "stop": cmd_stop, "restart": cmd_restart, "status": cmd_status,
    "open": cmd_open, "build": cmd_build, "check": cmd_check, "doctor": cmd_doctor, "upgrade": cmd_upgrade,
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="studio", description="角色展示设计工作台启动器。不带参数运行时显示交互菜单。")
    sub = parser.add_subparsers(dest="command")
    for name, help_text in [("start", "构建并在后台启动本机预览"), ("restart", "停止后重新构建并启动预览")]:
        command = sub.add_parser(name, help=help_text)
        command.add_argument("--port", type=int, default=None, help=f"端口（默认 {DEFAULT_PORT}；restart 默认沿用当前端口）")
        command.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
        command.add_argument("--no-build", action="store_true", help="跳过构建，直接使用已有的构建结果")
    for name, help_text in [("stop", "停止本机预览"), ("status", "查看预览与构建状态"), ("open", "在浏览器中打开预览"),
                            ("build", "构建页面"), ("check", "构建并运行自动检查"), ("doctor", "诊断运行环境"),
                            ("upgrade", "把 main 更新到 GitHub 上的最新版本并重新构建")]:
        sub.add_parser(name, help=help_text)
    return parser


def dispatch(args: argparse.Namespace) -> None:
    try:
        COMMANDS[args.command](args)
    except LauncherError as error:
        fail(str(error))
        raise SystemExit(1)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = build_parser()
    args = parser.parse_args()
    if args.command:
        dispatch(args)
    elif sys.stdin.isatty() and ensure_menu_dependencies():
        try:
            menu(parser)
        except KeyboardInterrupt:
            pass
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
