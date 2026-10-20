# Launcher

`deploy/launcher/studio.py` is the cross-platform entry point for running the studio locally. The root shortcuts `start.sh` (macOS / Linux) and `start.cmd` (Windows, double-clickable) find Python 3.9+ and pass all arguments through to it.

## Requirements

| Tool | Needed for |
| --- | --- |
| Python 3.9+ | The launcher itself |
| `rich`, `questionary` (`deploy/launcher/requirements.txt`) | The interactive menu only. When they are missing, the menu offers to install them with `python -m pip install -r deploy/launcher/requirements.txt`. |
| Node.js 18+ | Building and serving (`frontend/tools/*.mjs`) |
| Git, `gh` | `upgrade`; `doctor` checks them |

Subcommands use only the standard library, so `doctor` works before the menu dependencies are installed. The file also carries PEP 723 metadata, so `uv run deploy/launcher/studio.py` works too.

## Commands

No arguments in a terminal opens the menu (Chinese). Agents and scripts should call subcommands directly:

| Command | Behaviour |
| --- | --- |
| `start [--port N] [--no-open] [--no-build]` | Builds, starts `frontend/tools/server.mjs` in the background, waits until the page answers, then opens the browser. If our server is already running, it just reports or opens it. |
| `stop` | Stops the server this launcher started |
| `restart [...]` | `stop`, then `start`, keeping the current port unless `--port` is given |
| `status` | Server state, whether `frontend/dist/` is older than the sources, current branch |
| `open` | Opens the running preview in the browser |
| `build` / `check` | `node tools/build.mjs`, and also `node tools/check.mjs` for `check` |
| `doctor` | Checks Python, Node, menu dependencies, git branch and uncommitted changes, CRLF line endings, the `.claude` symlink, `gh` login and repo access, the port, and build freshness. Prints a fix hint for each problem. Exits 0 even when it reports problems. |
| `upgrade` | Fast-forwards `main` to `origin/main`, rebuilds, and restarts a running preview |

Errors exit with status 1 and a plain-Chinese message.

## Design notes

- **Fixed origin.** Browser storage is per origin and the saved-settings key includes the path (see [state-and-timing.md](state-and-timing.md#storage)). The launcher always uses `http://127.0.0.1:8768/`. If the port is taken it stops with an explanation rather than silently picking another port, because a different port means empty settings.
- **Background server.** The server runs detached: a new session on POSIX, `DETACHED_PROCESS` on Windows. Its PID and port go in `.studio/server.json` and its output in `.studio/server.log` (`.studio/` is gitignored), so closing the terminal does not stop the preview and a later `stop` or `status` can find it.
- **Never kill a stranger.** `stop` only signals the recorded PID if that process is alive **and** the port serves our page; it checks for the page title. A stale record is cleared without killing anything.
- **Proxy-free health checks.** Local requests bypass any HTTP proxy configured in the environment.
- **Conservative `upgrade`.** It only fast-forwards when the current branch is `main`, there are no uncommitted changes to tracked files, and local `main` has no unpushed commits. Otherwise it explains why and stops, because those situations mean someone's work is in progress. It never merges, rebases, stashes or resets.

## Changing the launcher

- Keep subcommands stdlib-only; only the menu may use the pip dependencies.
- User-facing text is Chinese; code and comments are English.
- Check by hand: `python deploy/launcher/studio.py doctor`, then `start --no-open`, `status`, `restart --no-open` and `stop` in sequence, with and without the menu dependencies installed. Windows behaviour (`start.cmd`, process detaching, `taskkill`) needs a Windows machine to verify.
