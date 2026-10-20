# Build and test

## Requirements

Node.js 18 or newer. Nothing to install: there is no `npm install` and no `node_modules`.

## Commands

| Command | What it does |
| --- | --- |
| `node tools/build.mjs` (`npm run build`) | Builds `index.html` and `dist/` from `src/`, `runtime/`, `assets/`, `vendor/` |
| `node tools/check.mjs` (`npm run check`) | Runs all automated checks against the **built** output. Build first. |
| `node tools/server.mjs [port]` (`npm start`) | Serves the folder read-only on `http://127.0.0.1:8768/` |
| `start.cmd` / `build.cmd` | Windows double-click shortcuts for the owner |

Always run **build, then check**, and commit only when the check prints its final `PASS` line. The check:

1. Parses `dist/exploration-full-source.js` and the syntax of the tool scripts.
2. Decodes the shell and the sandboxed frame from `index.html` and parses every embedded script; at least 9 must be present.
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

## Manual verification

The automated checks cover pure functions and generated data. They do not open a browser. After a UI or visual change, open the page (`npm start`) and check:

- The browser console has no errors.
- All 13 designs can be selected; inputs update the preview immediately; settings survive a reload.
- Timeline pause, seek and speed; intro → show → outro; continuous vs. repeat show.
- Landscape and portrait, swapped sides, both border modes with scrolling, badges, QR code.
- `dual` with two images.
- Narrow editor widths (tabs below 1120 px).

For export changes, also download a real HTML, OBS or AE package from the page and open it. Record notable runs in [`docs/qa/`](../qa/).

## Generated files and line endings

- `index.html` and `dist/` are **build output**, committed so the owner can open `index.html` directly. Never edit them by hand. Rebuild, and commit them in the same commit as the source change that produced them.
- `.gitattributes` forces LF line endings everywhere (CRLF only for `.cmd` / `.bat`). Before it existed, Windows checkouts converted sources to CRLF and the build embedded that, so the same source produced different output on Windows and macOS.
- **On a Windows checkout made before `.gitattributes` existed**, refresh line endings once, with no uncommitted changes:

  ```sh
  git rm -r --cached -q .
  git reset --hard
  ```

  After that, `git status` should be clean, and a fresh build should not change `index.html`.
