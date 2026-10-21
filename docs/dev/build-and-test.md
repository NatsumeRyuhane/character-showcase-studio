# Build and test

## Requirements

Node.js 22.12 or newer, with npm (it ships with Node.js). Run every command below from `frontend/`.

Install the build dependencies with `npm ci` once, and again whenever `package-lock.json` changes. It needs the network. The [launcher](launcher.md) does this automatically before every build that needs it. React, React DOM and React DOM's runtime dependency `scheduler` are bundled into the page; the other dependencies (Vite, TypeScript, Vitest, jsdom) are development tools only. The built page loads nothing.

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Installs exactly the locked dependencies into `node_modules/` |
| `node tools/build.mjs` (`npm run build`) | Builds `dist/` from `src/`, `runtime/`, `assets/`, `vendor/` |
| `node tools/check.mjs` (`npm run check`) | Runs all automated checks against the **built** output. Build first. |
| `npm run typecheck` | Runs `tsc` alone; `check.mjs` runs it too |
| `npm test` | Runs the [unit tests](#unit-tests) alone; `check.mjs` runs them too. `npx vitest` keeps them running in watch mode. |
| `node tools/server.mjs [port]` (`npm start`) | Serves `dist/` read-only on `http://127.0.0.1:8768/` in the foreground. Build first. |
| `./start.sh <command>` / `start.cmd <command>` (repository root) | The [launcher](launcher.md): `start`, `stop`, `restart`, `status`, `build`, `check`, `doctor`, `upgrade` |

Always run **build, then check**, and commit only when the check prints its final `PASS` line. The check:

1. Parses `dist/exploration-full-source.js` and the syntax of the tool and test configuration scripts, runs the TypeScript check (`tsc`, see `tsconfig.json`; JavaScript is allowed but not type-checked yet), and runs the [unit tests](#unit-tests).
2. Decodes the shell and the sandboxed frame from `dist/index.html` and parses every embedded script; at least 5 must be present.
3. Asserts the sandbox and CSP are still there, all 13 designs are present, there are no external `<script src>` or `@import`, and no machine-specific paths such as `C:\Users\…` or `.codex/`.
4. Runs every regression script listed in it from `tests/check-*.cjs`.

## Tests

There are two kinds of automated tests, and `node tools/check.mjs` runs both. Write new tests as unit tests; an older script moves to a unit test when the module it exercises becomes TypeScript.

### Unit tests

`tests/unit/*.test.ts` are [Vitest](https://vitest.dev/) tests. They import the source modules directly, as the bundle does, and test their exported functions. `vitest.config.mjs` limits Vitest to this folder. `tsconfig.json` includes it, so the tests are type-checked too.

`tests/unit/*.test.tsx` test the React editor components. They start with `// @vitest-environment jsdom`, render the components into jsdom, and replace `src/studio-session.js` (and `src/studio-views.js` where needed) with a stand-in (`vi.mock`) that holds a fresh `createStudioState()`, so each control can be checked against the setting it writes (see `editor-panels.test.tsx`).

To add one, create `tests/unit/<module>.test.ts` (`.test.tsx` for components). Vitest finds it automatically; nothing needs registering. Write new tests here.

### Older regression scripts

`tests/check-*.cjs` are plain Node scripts using `node:assert` and `node:vm`. Most load source files into a VM context and call the production functions directly, and several stub just enough DOM to run parts of the session or views modules (`studio-session.js`, `studio-views.js`).

Source files are ES modules, so these scripts load them through `tests/support/module-script.cjs`: `load(scope, ...files)` runs each file as a classic script in the shared context, and `moduleScript(file)` returns that script text for tests that slice it. It strips the types from `.ts` files with the transformer Vite uses, drops imports of other modules (load those into the same context yourself), inlines JSON imports and removes `export` keywords. A `.ts` file keeps its own scope, as a module does: only its exports become globals of the context, while `.js` files share one scope. It supports only the import and export forms the sources use, at the start of a line, and throws on anything else. `designModules` lists the `src/designs/` modules in load order, for scripts that paint (`load(scope, ...designModules)`).

A script that only tests a module's exports moves to `tests/unit/` when that module is converted. The scripts that run the session, the views or the shell scripts stay until those are TypeScript. To change the list, edit `tools/check.mjs`: **a script that is not listed there does not run.** Each script exits non-zero on failure and prints a one-line `PASS: …` summary.

`tests/ae/` holds manual After Effects harnesses; see its README.

### Adding a source module

Create it in `src/`, in TypeScript for new code, and import it where it is used. Editor UI goes in `src/editor/` as React components (`.tsx`), rendered from `Workspace.tsx` (see [architecture.md](architecture.md#editor-workspace)). Imports name the file with its extension, `.ts` included (`import { … } from './variant-codec.ts'`). Import new CSS from `src/main.js`, in cascade order. `tools/build.mjs` needs no change (see [architecture.md](architecture.md#build-pipeline)).

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

- **Frontend:** `npm ci`, build and check on Ubuntu and Windows with Node 22 and 24. The Windows run also confirms the line-ending setup produces a working build.
- **Launcher:** the launcher test suite on Ubuntu, macOS and Windows, plus the `start.sh` / `start.cmd` shims (see [launcher.md](launcher.md#tests-and-ci)).

A PR should not be merged with failing CI.

## Manual verification

`node tools/check.mjs` covers pure functions and generated data and does not open a browser, so nothing automated checks what the page looks like. After a UI or visual change, open the page (`./start.sh start` from the root) and check:

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
