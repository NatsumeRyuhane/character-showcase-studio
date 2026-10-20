# Build and test

## Requirements

Node.js 18 or newer. Nothing to install: there is no `npm install` and no `node_modules`. Run every command below from `frontend/`.

## Commands

| Command | What it does |
| --- | --- |
| `node tools/build.mjs` (`npm run build`) | Builds `dist/` from `src/`, `runtime/`, `assets/`, `vendor/` |
| `node tools/check.mjs` (`npm run check`) | Runs all automated checks against the **built** output. Build first. |
| `node tools/server.mjs [port]` (`npm start`) | Serves `dist/` read-only on `http://127.0.0.1:8768/` in the foreground. Build first. |
| `./start.sh <command>` / `start.cmd <command>` (repository root) | The [launcher](launcher.md): `start`, `stop`, `restart`, `status`, `build`, `check`, `doctor`, `upgrade` |

Always run **build, then check**, and commit only when the check prints its final `PASS` line. The check:

1. Parses `dist/exploration-full-source.js` and the syntax of the tool scripts.
2. Decodes the shell and the sandboxed frame from `dist/index.html` and parses every embedded script; at least 9 must be present.
3. Asserts the sandbox and CSP are still there, all 13 designs are present, there are no external `<script src>` or `@import`, and no machine-specific paths such as `C:\Users\…` or `.codex/`.
4. Runs every regression script in `tests/check-*.cjs`.

## Tests

Tests are plain Node scripts using `node:assert` and `node:vm`. Most load source files into a VM context and call the production functions directly. There is no test framework.

To add a test:
1. Create `tests/check-<topic>.cjs` that exits non-zero on failure and prints a one-line `PASS: …` summary.
2. Add its file name to the list in `tools/check.mjs`. **It does not run otherwise.**

To add a source module:
1. Add a marker in the host file and a `replaceRequired(...)` line in `tools/build.mjs`. The build fails if a marker is missing.
2. Remember that it shares the main script's scope (see [architecture.md](architecture.md#build-pipeline)).

`tests/ae/` holds manual After Effects harnesses; see its README.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

- **Frontend:** build and check on Ubuntu and Windows with Node 18 and 22. The Windows run also confirms the line-ending setup produces a working build.
- **Launcher:** the launcher test suite on Ubuntu, macOS and Windows, plus the `start.sh` / `start.cmd` shims (see [launcher.md](launcher.md#tests-and-ci)).

A PR should not be merged with failing CI.

## Manual verification

The automated checks cover pure functions and generated data. They do not open a browser. After a UI or visual change, open the page (`./start.sh start` from the root) and check:

- The browser console has no errors.
- All 13 designs can be selected; inputs update the preview immediately; settings survive a reload.
- Timeline pause, seek and speed; intro → show → outro; continuous vs. repeat show.
- Landscape and portrait, swapped sides, both border modes with scrolling, badges, QR code.
- `dual` with two images.
- Narrow editor widths (tabs below 1120 px).

For export changes, also download a real HTML, OBS or AE package from the page and open it. Record notable runs in [`docs/qa/`](../qa/).

## Generated files and line endings

- `dist/` is **build output**. It is gitignored: never edit or commit it. Every checkout builds its own copy.
- `.gitattributes` forces LF line endings everywhere (CRLF only for `.cmd` / `.bat`). Before it existed, Windows checkouts converted sources to CRLF and the build embedded that, so the same source produced different output on Windows and macOS.
- **On a Windows checkout made before `.gitattributes` existed**, refresh line endings once, with no uncommitted changes:

  ```sh
  git rm -r --cached -q .
  git reset --hard
  ```

  After that, `git status` should be clean.
