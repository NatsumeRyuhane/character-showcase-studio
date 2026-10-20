# Build and test

## Requirements

Node.js 22.12 or newer, with npm (it ships with Node.js). Run every command below from `frontend/`.

Install the build dependencies with `npm ci` once, and again whenever `package-lock.json` changes. It needs the network. The [launcher](launcher.md) does this automatically before every build that needs it. The dependencies (Vite, TypeScript, Vitest, Playwright) are development tools only; the built page loads nothing.

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Installs exactly the locked dependencies into `node_modules/` |
| `node tools/build.mjs` (`npm run build`) | Builds `dist/` from `src/`, `runtime/`, `assets/`, `vendor/` |
| `node tools/check.mjs` (`npm run check`) | Runs all automated checks against the **built** output. Build first. |
| `npm run typecheck` | Runs `tsc` alone; `check.mjs` runs it too |
| `npm test` | Runs the [unit tests](#unit-tests) alone; `check.mjs` runs them too. `npx vitest` keeps them running in watch mode. |
| `npm run test:visual` | Builds and runs the [visual regression tests](#visual-regression-tests) in Docker. Add `-- --update-snapshots` to rewrite the baseline. |
| `node tools/server.mjs [port]` (`npm start`) | Serves `dist/` read-only on `http://127.0.0.1:8768/` in the foreground. Build first. |
| `./start.sh <command>` / `start.cmd <command>` (repository root) | The [launcher](launcher.md): `start`, `stop`, `restart`, `status`, `build`, `check`, `doctor`, `upgrade` |

Always run **build, then check**, and commit only when the check prints its final `PASS` line. The check:

1. Parses `dist/exploration-full-source.js` and the syntax of the tool and test configuration scripts, runs the TypeScript check (`tsc`, see `tsconfig.json`; JavaScript is allowed but not type-checked yet), and runs the [unit tests](#unit-tests).
2. Decodes the shell and the sandboxed frame from `dist/index.html` and parses every embedded script; at least 9 must be present.
3. Asserts the sandbox and CSP are still there, all 13 designs are present, there are no external `<script src>` or `@import`, and no machine-specific paths such as `C:\Users\…` or `.codex/`.
4. Runs every regression script listed in it from `tests/check-*.cjs`.

## Tests

There are two kinds of automated tests, and `node tools/check.mjs` runs both. They are moving from the second kind to the first during the rewrite (issue #3, phase 3).

### Unit tests

`tests/unit/*.test.ts` are [Vitest](https://vitest.dev/) tests. They import the source modules directly, as the bundle does, and test their exported functions. `vitest.config.mjs` limits Vitest to this folder. `tsconfig.json` includes it, so the tests are type-checked too.

To add one, create `tests/unit/<module>.test.ts`. Vitest finds it automatically; nothing needs registering. Write new tests here.

### Older regression scripts

`tests/check-*.cjs` are plain Node scripts using `node:assert` and `node:vm`. Most load source files into a VM context and call the production functions directly, and several stub just enough DOM to run parts of the editor module.

Source files are ES modules, so these scripts load them through `tests/support/module-script.cjs`: `load(scope, ...files)` runs each file as a classic script in the shared context, and `moduleScript(file)` returns that script text for tests that slice it. It strips the types from `.ts` files with the transformer Vite uses, drops imports of other modules (load those into the same context yourself), inlines JSON imports and removes `export` keywords. It supports only the import and export forms the sources use, at the start of a line, and throws on anything else.

A script that only tests a module's exports moves to `tests/unit/` when that module is converted. The scripts that need the editor module or the shell scripts stay until those are split up. To change the list, edit `tools/check.mjs`: **a script that is not listed there does not run.** Each script exits non-zero on failure and prints a one-line `PASS: …` summary.

`tests/ae/` holds manual After Effects harnesses; see its README.

### Adding a source module

Create it in `src/`, in TypeScript for new code, and import it where it is used. Imports name the file with its extension, `.ts` included (`import { … } from './variant-codec.ts'`). Import new CSS from `src/main.js`, in cascade order. `tools/build.mjs` needs no change (see [architecture.md](architecture.md#build-pipeline)).

## Visual regression tests

`tests/visual/` holds a [Playwright](https://playwright.dev/) screenshot baseline of the preview: every design, landscape and portrait, at four points on the timeline (character shot 1.2 s, creator shot 4 s, show 11 s, outro 18.4 s), plus the swapped layout in the show. That is 10 frames per design, 130 in all, in `tests/visual/__screenshots__/<design>/`. It is the safety net for the rest of the rewrite: a refactor that should not change the picture must leave every frame identical.

**How a frame is made.** Each test seeds `localStorage` with a saved state, the way a returning user's browser has one, and loads the page. The state is `tests/visual/fixtures/studio-state.json` (a frozen copy of the startup preset, so publishing a new preset does not move the baseline) with the design, ratio, side swap and `time` set, and `playing: false`. A paused state restores with its motion clock rebuilt from `time`, so the frame is a pure function of the state. The tests do not click or seek through the editor UI, which phase 4 replaces. Each test screenshots the active design's `.design-art` element and fails on page errors or console warnings.

Rules the harness relies on:

- **Never play.** Unpaused playback under a fake clock is not deterministic (see the [phase 1 record](../qa/0.11.0-rewrite-phase-1.md#browser-comparison)).
- **No reduced motion.** With `prefers-reduced-motion` the editor freezes post-processing time at 0, which renders a different frame.
- **Fixed preview size.** The editor sizes the preview from the window, so the viewport (1280×800 landscape, 1280×1080 portrait) decides the frame size, 708×398 and 405×720. If the editor layout changes the preview size, every frame changes; keep the size or rebuild the baseline on the commit before the layout change, at the new size.
- **Pinned environment.** Fonts and rasterization differ between systems, so the baseline holds only in the Playwright Linux image (`mcr.microsoft.com/playwright:v<version>-noble`). `playwright.config.mjs` refuses to run elsewhere. The comparison is exact: any changed pixel fails. With Playwright 1.64.1 the image's x86-64 and arm64 variants render identical frames; if they ever diverge, CI (x86-64) is the reference, and `docker run --platform linux/amd64` reproduces it.

**Running.** `npm run test:visual` needs Docker. `tools/visual-docker.mjs` mounts `frontend/` into the image whose tag matches the locked `@playwright/test`, installs Linux dependencies into a Docker volume (your `node_modules/` is untouched), builds, and runs the tests (about half a minute after the first run). Pass Playwright arguments after `--`, for example `npm run test:visual -- -g poster` for one design. A failure writes the expected, actual and diff images to `test-results/`.

**Updating the baseline.** Only when a change is meant to alter the picture:

1. Run `npm run test:visual -- --update-snapshots`.
2. Open every changed PNG (`git status tests/visual/__screenshots__`) and confirm that each difference is intended and that nothing else moved.
3. Commit the new frames in the same commit as the change that caused them, and say in the PR which designs changed and why.

When the Playwright version changes, update the image tag in `.github/workflows/ci.yml` too. A new browser can rasterize differently, so rebuild the baseline in its own commit, with no other change, after checking the diffs.

Not covered yet: uploaded images (every frame uses the placeholders), the border modes other than the fixture's top and bottom borders, post-processing effects other than its prism, long names, the narrow editor, and exports.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

- **Frontend:** `npm ci`, build and check on Ubuntu and Windows with Node 22 and 24. The Windows run also confirms the line-ending setup produces a working build.
- **Frontend visual regression:** the [visual regression tests](#visual-regression-tests) in the pinned Playwright image. On failure, the expected, actual and diff images are uploaded as the `visual-regression-report` artifact.
- **Legacy frontend:** build and check of the frozen pre-rewrite snapshot in `frontend-legacy/` (see its README), so it stays usable for comparison until the rewrite is done.
- **Launcher:** the launcher test suite on Ubuntu, macOS and Windows, plus the `start.sh` / `start.cmd` shims (see [launcher.md](launcher.md#tests-and-ci)).

A PR should not be merged with failing CI.

## Comparing with the legacy frontend

Until the rewrite is done, `frontend-legacy/` holds the frontend as it was before it (see its README). It builds and checks the old way (`node tools/build.mjs`, `node tools/check.mjs`, no `npm ci`). Use it to compare behaviour: build both, diff the output of the two checks, and compare the pages in a browser. Serve them on different ports (`node tools/server.mjs 8790` in each folder, with another port for one of them) so your real preview on 8768 keeps its saved settings.

## Manual verification

`node tools/check.mjs` covers pure functions and generated data and does not open a browser; the visual tests cover only the frames listed above. After a UI or visual change, open the page (`./start.sh start` from the root) and check:

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
