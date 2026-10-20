# Launcher

`deploy/launcher/studio.py` is the cross-platform entry point for running the studio locally. The root shortcuts `start.sh` (macOS / Linux) and `start.cmd` (Windows, double-clickable) find Python 3.9+ and pass all arguments through to it.

## Requirements

| Tool | Needed for |
| --- | --- |
| Python 3.9+ with pip | The launcher |
| `rich`, `questionary` (`deploy/launcher/requirements.txt`) | Required. `start.sh` / `start.cmd` check for them and run `python -m pip install -r deploy/launcher/requirements.txt` when missing. If that fails (no pip, an externally managed Python, no network), they print why and the manual command, then exit 1. Running `studio.py` directly without them prints the install command and exits 2. |
| Node.js 18+ | Building and serving (`frontend/tools/*.mjs`) |
| Git, `gh` | `upgrade`; `doctor` checks them |

The file also carries PEP 723 metadata, so `uv run deploy/launcher/studio.py` works too.

## Two modes

- **Interactive menu:** run with no arguments in a terminal (`start.cmd` double-click, `./start.sh`). Arrow-key menu in Chinese.
- **Pure CLI, for agents and scripts:** run with a subcommand. Subcommands never prompt and never open the menu. When output is captured, `rich` prints plain text without colour and without wrapping, so each message stays on one line. The shims send their own messages (dependency install) to stderr, and `start.cmd` never pauses when given arguments.

## Commands

| Command | Behaviour |
| --- | --- |
| `start [--port N] [--no-open] [--no-build]` | Builds, starts `frontend/tools/server.mjs` in the background, waits until the page answers, then opens the browser. If our server is already running, it just reports or opens it. |
| `stop` | Stops the server this launcher started |
| `restart [...]` | `stop`, then `start`, keeping the current port unless `--port` is given |
| `status` | Server state, whether `frontend/dist/` is older than the sources, current branch |
| `open` | Opens the running preview in the browser |
| `build` / `check` | `node tools/build.mjs`, and also `node tools/check.mjs` for `check` |
| `doctor` | Checks Python, Node, git branch and uncommitted changes, CRLF line endings, the `.claude` symlink, `gh` login and repo access, the port, and build freshness. Prints a fix hint for each problem. Exits 0 even when it reports problems. |
| `upgrade` | Fast-forwards `main` to `origin/main`, rebuilds, and restarts a running preview |

Errors exit with status 1 and a plain-Chinese message.

## Design notes

- **Fixed origin.** Browser storage is per origin and the saved-settings key includes the path (see [state-and-timing.md](state-and-timing.md#storage)). The launcher always uses `http://127.0.0.1:8768/`. If the port is taken it stops with an explanation rather than silently picking another port, because a different port means empty settings.
- **Background server.** The server runs detached: a new session on POSIX, `DETACHED_PROCESS` on Windows. Its PID and port go in `.studio/server.json` and its output in `.studio/server.log` (`.studio/` is gitignored), so closing the terminal does not stop the preview and a later `stop` or `status` can find it.
- **Never kill a stranger.** `stop` only signals the recorded PID if that process is alive **and** the port serves our page; it checks for the page title. A stale record is cleared without killing anything.
- **Proxy-free health checks.** Local requests bypass any HTTP proxy configured in the environment.
- **Conservative `upgrade`.** It only fast-forwards when the current branch is `main`, there are no uncommitted changes to tracked files, and local `main` has no unpushed commits. Otherwise it explains why and stops, because those situations mean someone's work is in progress. It never merges, rebases, stashes or resets.

## Tests and CI

`deploy/launcher/tests/test_studio.py` runs the launcher end to end as a subprocess. Each run uses a throwaway clone whose `origin` is a local bare repository, selected with the test-only `STUDIO_ROOT` environment variable, so it never touches your checkout, a running preview or GitHub. It covers every subcommand except `open` (which launches a browser), the refusals, a real `upgrade` fast-forward, unwrapped captured output, the missing-dependency message and, on POSIX via a pseudo-terminal, the menu.

```sh
python -m pip install -r deploy/launcher/requirements.txt
python -m unittest discover -s deploy/launcher/tests -v
```

CI (`.github/workflows/ci.yml`) runs these tests on Ubuntu, macOS and Windows. It also checks that `start.sh` installs the dependencies into a fresh environment, and that `start.cmd` runs subcommands without pausing.

## Changing the launcher

- Subcommands must stay non-interactive. Only the no-argument menu may prompt.
- User-facing text is Chinese; code and comments are English.
- Add or extend a test in `deploy/launcher/tests/` for every behaviour change, and keep CI green on all three operating systems. Windows-only paths (`start.cmd`, `DETACHED_PROCESS`, `taskkill`) are only exercised in CI.
