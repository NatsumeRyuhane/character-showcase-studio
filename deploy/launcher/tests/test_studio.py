"""End-to-end tests for deploy/launcher/studio.py.

Every test runs the launcher as a subprocess against a throwaway clone
(via STUDIO_ROOT) whose `origin` is a local bare repository, so nothing
touches the real checkout, a real preview server or GitHub.

Needs the launcher's dependencies (deploy/launcher/requirements.txt).
Run from the repository root:
    python -m unittest discover -s deploy/launcher/tests -v
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
STUDIO = REPO / "deploy" / "launcher" / "studio.py"
WINDOWS = os.name == "nt"
GIT_ENV = {
    "GIT_AUTHOR_NAME": "Launcher Test", "GIT_AUTHOR_EMAIL": "test@example.invalid",
    "GIT_COMMITTER_NAME": "Launcher Test", "GIT_COMMITTER_EMAIL": "test@example.invalid",
}
_local = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(["git", "-c", "commit.gpgsign=false", *args], cwd=cwd, capture_output=True,
                            text=True, env={**os.environ, **GIT_ENV})
    if result.returncode != 0:
        raise AssertionError(f"git {' '.join(args)} failed:\n{result.stderr}")
    return result.stdout.strip()


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def serves_page(port: int) -> bool:
    try:
        with _local.open(f"http://127.0.0.1:{port}/", timeout=1) as response:
            return b"Character Showcase Studio" in response.read(32768)
    except OSError:
        return False


class LauncherTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp = tempfile.TemporaryDirectory()
        base = Path(cls.tmp.name)
        cls.remote = base / "remote.git"
        cls.seed = base / "seed"
        cls.work = base / "work"
        # The current commit becomes `main` on a local "GitHub".
        git(base, "init", "-q", "--bare", str(cls.remote))
        # CI checks out a single commit; let the stand-in GitHub accept shallow history.
        git(cls.remote, "config", "receive.shallowUpdate", "true")
        git(base, "clone", "-q", "--no-hardlinks", str(REPO), str(cls.seed))
        git(cls.seed, "checkout", "-q", "-B", "main")
        git(cls.seed, "push", "-q", str(cls.remote), "main")
        git(cls.remote, "symbolic-ref", "HEAD", "refs/heads/main")
        git(base, "clone", "-q", str(cls.remote), str(cls.work))
        git(cls.seed, "remote", "set-url", "origin", str(cls.remote))

    @classmethod
    def tearDownClass(cls) -> None:
        cls.studio("stop")
        shutil.rmtree(cls.tmp.name, ignore_errors=True)

    @classmethod
    def studio(cls, *args: str, stdin=subprocess.DEVNULL) -> subprocess.CompletedProcess:
        env = {**os.environ, "STUDIO_ROOT": str(cls.work), "PYTHONIOENCODING": "utf-8"}
        return subprocess.run([sys.executable, str(STUDIO), *args], cwd=cls.work, env=env, stdin=stdin,
                              capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)

    def assertOk(self, result: subprocess.CompletedProcess) -> str:
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def assertRefused(self, result: subprocess.CompletedProcess, text: str) -> None:
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn(text, result.stdout)

    # ------------------------------------------------------------ basics

    def test_help_lists_every_command(self) -> None:
        out = self.assertOk(self.studio("--help"))
        for command in ("start", "stop", "restart", "status", "open", "build", "check", "doctor", "upgrade"):
            self.assertIn(command, out)

    def test_no_arguments_without_terminal_prints_help(self) -> None:
        self.assertIn("usage:", self.assertOk(self.studio()))

    def test_missing_dependencies_explain_how_to_install(self) -> None:
        # -S hides site-packages, which is where rich and questionary live.
        env = {**os.environ, "STUDIO_ROOT": str(self.work), "PYTHONIOENCODING": "utf-8"}
        result = subprocess.run([sys.executable, "-S", str(STUDIO), "status"], env=env, capture_output=True,
                                text=True, encoding="utf-8", errors="replace", timeout=60)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("pip install -r", result.stderr)

    def test_long_messages_are_not_wrapped(self) -> None:
        # Captured output (agents, CI) must keep each message on one line.
        git(self.work, "switch", "-q", "-c", "feature/a-rather-long-branch-name-to-force-wrapping")
        try:
            out = self.studio("upgrade").stdout
        finally:
            git(self.work, "switch", "-q", "main")
            git(self.work, "branch", "-q", "-D", "feature/a-rather-long-branch-name-to-force-wrapping")
        self.assertEqual(len(out.strip().splitlines()), 1, out)

    def test_doctor_reports_sections(self) -> None:
        out = self.assertOk(self.studio("doctor"))
        for section in ("运行环境", "Git 与 GitHub", "预览", "Node.js"):
            self.assertIn(section, out)

    def test_build_installs_frontend_dependencies_once(self) -> None:
        shutil.rmtree(self.work / "frontend" / "node_modules", ignore_errors=True)
        self.assertIn("前端依赖已安装", self.assertOk(self.studio("build")))
        self.assertTrue((self.work / "frontend" / "node_modules" / ".package-lock.json").exists())
        self.assertNotIn("正在安装前端依赖", self.assertOk(self.studio("build")))

    def test_check_builds_and_passes(self) -> None:
        self.assertIn("自动检查全部通过", self.assertOk(self.studio("check")))
        self.assertTrue((self.work / "frontend" / "dist" / "index.html").exists())

    # ------------------------------------------------------------ server lifecycle

    def test_server_lifecycle(self) -> None:
        port = str(free_port())
        try:
            self.assertIn("预览已启动", self.assertOk(self.studio("start", "--no-open", "--port", port)))
            self.assertTrue(serves_page(int(port)))
            first = json.loads((self.work / ".studio" / "server.json").read_text(encoding="utf-8"))

            self.assertIn("预览运行中", self.assertOk(self.studio("status")))
            self.assertIn("预览已在运行", self.assertOk(self.studio("start", "--no-open", "--port", port)))

            self.assertOk(self.studio("restart", "--no-open"))
            second = json.loads((self.work / ".studio" / "server.json").read_text(encoding="utf-8"))
            self.assertEqual(second["port"], int(port), "restart keeps the current port")
            self.assertNotEqual(second["pid"], first["pid"])
            self.assertTrue(serves_page(int(port)))

            self.assertIn("预览已停止", self.assertOk(self.studio("stop")))
            self.assertFalse(serves_page(int(port)))
            self.assertIn("预览没有在运行", self.assertOk(self.studio("stop")))
        finally:
            self.studio("stop")

    def test_start_refuses_a_port_used_by_another_program(self) -> None:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            sock.listen()
            port = sock.getsockname()[1]
            self.assertRefused(self.studio("start", "--no-open", "--no-build", "--port", str(port)), "已被其他程序占用")

    def test_stop_never_kills_an_unrelated_process(self) -> None:
        stranger = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
        try:
            state = self.work / ".studio" / "server.json"
            state.parent.mkdir(exist_ok=True)
            state.write_text(json.dumps({"pid": stranger.pid, "port": free_port(), "started": 0}), encoding="utf-8")
            self.assertIn("没有结束任何进程", self.assertOk(self.studio("stop")))
            time.sleep(0.5)
            self.assertIsNone(stranger.poll(), "the unrelated process must still be running")
            self.assertFalse(state.exists())
        finally:
            stranger.kill()
            stranger.wait()

    # ------------------------------------------------------------ upgrade

    def test_upgrade_refuses_off_main(self) -> None:
        git(self.work, "switch", "-q", "-c", "feature/test")
        try:
            self.assertRefused(self.studio("upgrade"), "更新只针对主线 main")
        finally:
            git(self.work, "switch", "-q", "main")
            git(self.work, "branch", "-q", "-D", "feature/test")

    def test_upgrade_refuses_uncommitted_changes(self) -> None:
        readme = self.work / "README.md"
        original = readme.read_bytes()
        readme.write_bytes(original + b"\nlocal edit\n")
        try:
            self.assertRefused(self.studio("upgrade"), "尚未提交的修改")
        finally:
            readme.write_bytes(original)

    def test_upgrade_refuses_unpushed_commits(self) -> None:
        git(self.work, "commit", "-q", "--allow-empty", "-m", "local only")
        try:
            self.assertRefused(self.studio("upgrade"), "尚未上传的提交")
        finally:
            git(self.work, "reset", "-q", "--hard", "origin/main")

    def test_upgrade_fast_forwards_then_reports_up_to_date(self) -> None:
        self.assertIn("已经是最新版本", self.assertOk(self.studio("upgrade")))
        (self.seed / "UPSTREAM.txt").write_text("new upstream commit\n", encoding="utf-8")
        git(self.seed, "add", "UPSTREAM.txt")
        git(self.seed, "commit", "-q", "-m", "upstream change")
        git(self.seed, "push", "-q", "origin", "main")
        out = self.assertOk(self.studio("upgrade"))
        self.assertIn("已更新 1 个提交", out)
        self.assertTrue((self.work / "UPSTREAM.txt").exists())
        self.assertIn("已经是最新版本", self.assertOk(self.studio("upgrade")))

    # ------------------------------------------------------------ interactive menu

    @unittest.skipIf(WINDOWS, "pty is POSIX-only")
    def test_menu_runs_status_and_quits(self) -> None:
        import pty
        import re
        import select

        env = {**os.environ, "STUDIO_ROOT": str(self.work), "TERM": "xterm-256color"}
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(self.work)
            os.execve(sys.executable, [sys.executable, str(STUDIO)], env)
        output = b""

        def pump(seconds: float) -> None:
            nonlocal output
            end = time.time() + seconds
            while time.time() < end:
                ready, _, _ = select.select([fd], [], [], 0.1)
                if ready:
                    try:
                        output += os.read(fd, 65536)
                    except OSError:
                        return

        def wait_for(text: str, seconds: float = 15) -> None:
            end = time.time() + seconds
            while time.time() < end and text not in re.sub(rb"\x1b\[[0-9;?]*[A-Za-z]", b"", output).decode("utf-8", "replace"):
                pump(0.2)

        wait_for("要做什么")
        for key in (b"\x1b[B", b"\x1b[B", b"\x1b[B", b"\r"):  # 查看状态 is the fourth item
            os.write(fd, key)
            pump(0.3)
        wait_for("按任意键返回菜单")
        os.write(fd, b"x")
        wait_for("要做什么")
        pump(0.5)
        os.write(fd, b"\x1b[A")  # Up from the first item wraps to 退出
        pump(0.3)
        os.write(fd, b"\r")
        pump(2)
        _, status = os.waitpid(pid, 0)
        text = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", output.decode("utf-8", "replace"))
        self.assertEqual(status, 0, text)
        for expected in ("角色展示设计工作台", "要做什么", "预览未运行", "当前分支", "按任意键返回菜单"):
            self.assertIn(expected, text)


if __name__ == "__main__":
    unittest.main()
