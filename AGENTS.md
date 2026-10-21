# Agent guide

This file is for AI coding agents (Codex, Claude Code and others) working in this repository. Read it fully before you change anything. Human contributors should read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md), which is in Chinese.

## The project

Character Showcase Studio is a browser editor for animated character showcase screens. It exports a standalone HTML page, OBS browser-source packages, and editable After Effects templates. It is one self-contained HTML page, built with Vite from the TypeScript and JavaScript modules in `frontend/`, with a React editor UI and no backend. It is live at https://nekokaii.com/showcase-generator.

| Read | When |
| --- | --- |
| [docs/dev/architecture.md](docs/dev/architecture.md) | Before any code change. Runtime layers, build pipeline, module map, **invariants** |
| [docs/dev/state-and-timing.md](docs/dev/state-and-timing.md) | Touching settings, persistence, the timeline, intro/outro, post-processing |
| [docs/dev/export.md](docs/dev/export.md) | Touching HTML / OBS / AE export |
| [docs/dev/build-and-test.md](docs/dev/build-and-test.md) | Building, testing, adding modules or tests |
| [docs/dev/deploy.md](docs/dev/deploy.md) | Anything about the live site |
| [docs/dev/launcher.md](docs/dev/launcher.md) | The local launcher (`start.sh` / `start.cmd`) |
| [docs/user/](docs/user/) | What users see and are told (Chinese) |

## Agent files

- **`AGENTS.md` and `.agents/` are the only real agent files**, whichever tool you use. Instructions go in `AGENTS.md`. Skills go in `.agents/skills/<name>/SKILL.md`, and shared tool configuration goes in `.agents/`.
- Tool-specific entry points only point back to them: `.claude` is a symlink to `.agents/`, and `CLAUDE.md` contains just `@AGENTS.md`. Edit only the real files. Never replace the symlink with a copy, never put content in a tool-specific folder or file, and if another tool needs its own entry point, add a symlink or import instead of a new file.
- Personal settings written through `.claude` land in `.agents/settings.local.json`, which is gitignored. Do not commit them.
- On Windows, Git checks out symlinks as small text files unless symlink support is on (`core.symlinks=true`, which needs Developer Mode or administrator rights). If `.claude` is a file instead of a folder, tell the person a developer needs to set this up. Do not "fix" it by committing a copy.

## Who you are working for

The repository owner is **nekokaii**, who designs the product but **does not have a software background** and may not know how git or GitHub work. Other collaborators, such as NatsumeRyuhane, are developers.

When the person you are working for may be the owner, or you are not sure:

- **Speak plain Chinese.** Explain git and GitHub steps in everyday terms: what will happen, what it affects, how to undo it. Do not assume they know words like branch, commit, push, merge or PR; explain each the first time.
- **Ask before any outward-facing or hard-to-undo step:** pushing, opening or merging a PR, deploying, deleting branches or files, discarding changes. Approval for one step does not cover the next.
- **Describe changes by what they look like**, such as "the title moves lower in portrait mode", not only by file names. Offer to open the page so they can see it.
- **Never "fix" things silently.** If a request would break an invariant, a security boundary, or someone else's work, say so and propose an alternative.
- If you are unsure what they want, ask one clear question rather than guessing.

## Language

| Chinese | English |
| --- | --- |
| User-facing docs (`README.md`, `docs/CHANGELOG.md`, `.github/CONTRIBUTING.md`, `docs/user/`), UI text | Technical docs (`AGENTS.md`, `docs/dev/`, `docs/qa/`, `tests/**/README.md`) |
| GitHub issues, PR titles and descriptions | Code, identifiers, code comments |
| Commit messages | Replies to English-language comments or reviews |
| Conversation with the owner | |

## GitHub access is required

Many design decisions and much of the context behind this project live only on GitHub, in issues, PR descriptions and review threads, not in the code or docs. Working without them means working blind. You need a working [GitHub CLI](https://cli.github.com/) (`gh`), logged in with access to `nekokaii/character-showcase-studio`.

**Check at the start of every session:**

```sh
gh auth status
gh repo view nekokaii/character-showcase-studio --json name
```

**If either check fails** (`gh` missing, not logged in, or no access to the repo):

1. **Warn the person right away, in plain Chinese.** Tell them you cannot see the project's issues and PRs, so you may miss earlier decisions and cannot open PRs.
2. Help them fix it. Installing `gh` is a normal software install. Logging in is interactive, so the person runs `gh auth login` themselves; in Claude Code they can type `! gh auth login`. If they lack access to the repository, the owner has to add them as a collaborator.
3. Do not quietly carry on with work that touches design or behaviour. Continue without GitHub only if the person explicitly agrees after your warning, and say in your final report that you could not check GitHub.

If `gh` reports an authentication error inside a sandboxed agent environment, the sandbox may be blocking the system credential store. Ask to retry outside the sandbox before deciding the login is broken.

**Use GitHub as the project's memory:**

- Before starting a task, read its issue and any linked PRs, and search for earlier related discussion:

  ```sh
  gh issue view <number> --comments
  gh issue list --state all --search "<keywords>"
  gh pr list --state all --search "<keywords>"
  ```

- `gh pr view --comments` does not show inline review threads or whether they are resolved. Read those with `gh api graphql`, using `reviewThreads` with `isResolved`.
- When the person makes a design decision in your conversation, write it into the relevant issue or PR, in Chinese and after asking them, so the next person and the next agent can find it.

## Git and GitHub workflow

### Before you start

0. Confirm GitHub access (see [above](#github-access-is-required)) and read the task's issue or PR if there is one.
1. Run `git status` and `git branch --show-current`.
   - If there are uncommitted changes you did not make, **stop and ask** whose they are. Never discard, stash or commit them on your own.
   - If a merge, rebase or cherry-pick is in progress, stop and ask.
2. Run `git fetch origin`.
3. Create a new branch from the latest `main` for the task:

   ```sh
   git switch -c <type>/<short-slug> origin/main    # e.g. fix/poster-title-overlap
   ```

   Use the commit types below for `<type>`. One branch per task, and never reuse someone else's branch.

### Do not commit directly to `main`

`main` is the shared, reviewed version, and the live site is deployed from it. Work there skips review and can collide with collaborators. GitHub does not block it in this repo, so **you** are the safeguard.

- Always work on a branch, even for one-line changes.
- If the person asks you to commit or push to `main`, or you notice you are on `main` with changes:
  1. Explain in plain Chinese why that is risky: no review, it can overwrite or conflict with others' work, and the live site is deployed from `main`. Suggest the branch + PR path instead.
  2. Ask them to confirm **explicitly** that they understand and still want to commit to `main` this time.
  3. Proceed only on a clear yes, for that one time. Do not treat it as standing permission.
- If you have uncommitted changes on `main`, move them to a branch with `git switch -c <type>/<slug>`. The changes come along.

### Change → check → commit

Work in small, focused steps:

1. Make one focused change.
2. In `frontend/`: `npm ci` if `node_modules/` is missing or `package-lock.json` changed, then `node tools/build.mjs`, then `node tools/check.mjs` (it includes the TypeScript check and the unit tests). Both must pass. If you changed the launcher, also run its tests (see [launcher.md](docs/dev/launcher.md#tests-and-ci)).
3. For UI or visual changes, open the page and check it as well (see [build-and-test.md](docs/dev/build-and-test.md#manual-verification)).
4. Check `git status` and `git diff --stat`. Stage only files that belong to this change, and never blindly stage everything (`git add -A` / `git add .`).
5. Commit. Never commit `frontend/dist/`; it is gitignored build output.

Never bundle unrelated changes in one commit.

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) with an English type and a Chinese description:

```
<type>[(scope)]: <中文简述>

[中文正文：改了什么、为什么]
```

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`, `perf`, `ci`, `style`, `revert`.
- An optional scope is an English noun for the area, e.g. `fix(export): …`, `feat(narrative): …`.
- Examples: `fix(poster): 修复竖屏互换时标题遮挡短句`, `docs: 更新 OBS 三层输出说明`.
- Do not add AI attribution lines (`Co-Authored-By: <AI>`, "Generated with …").

### Push and pull request

1. **Ask before pushing.** Then push the branch with `git push -u origin <branch>`.
2. Open a PR into `main` with `gh pr create`. CI runs on every PR, and it must pass before merging. If it fails, read the log with `gh pr checks` / `gh run view --log-failed`, fix the cause, and tell the person. The title and description are in Chinese and follow [the template](.github/pull_request_template.md): what changed, why, how it was checked, and screenshots for visual changes.
3. **Merge only through GitHub**, after review, and only when the owner or a maintainer says to. Never merge into `main` locally.
4. To bring a pushed branch up to date with `main`, use `git merge origin/main`, not rebase, so no force-push is needed.

### Never

- Force-push (`--force`, `--force-with-lease`) or rewrite history that has been pushed.
- Run `git reset --hard`, `git clean`, `git checkout -- <file>` or `git restore` on work you did not create, without explicit approval.
- Delete branches that are not yours.
- Commit secrets: `.wrangler/`, `.dev.vars`, `.env*`, tokens, API keys.
- Edit or commit `frontend/dist/` (build output).

## Code rules

- **The web app lives in `frontend/`.** The editor's code is ES modules in `frontend/src/` (entry `src/main.js`), which Vite bundles; its controls are React components in `frontend/src/editor/`, the canvas artwork is one module per design in `frontend/src/designs/`, and the shared editor state lives in `frontend/src/studio-session.js`; `frontend/runtime/` holds the shell-side scripts and templates that `frontend/tools/build.mjs` assembles around it. Import a new module where it is used. New tests are Vitest tests in `frontend/tests/unit/`, found automatically; the older `frontend/tests/check-*.cjs` scripts run only if listed in `frontend/tools/check.mjs` (see [build-and-test.md](docs/dev/build-and-test.md#tests)). Paths in `docs/dev/` are relative to `frontend/`.
- **Keep the invariants** in [architecture.md](docs/dev/architecture.md#invariants). In particular: timeline poses are pure functions of time; continuous clocks never reset; borders persist; layout happens at logical size; saved state stays within 16 KiB; `tuple-v1` slots are append-only.
- **Keep the sandbox and the CSPs.** Changing the security boundary is a separate, reviewed task, never a side effect.
- **Storage is keyed by page path.** Moving or renaming the served page loses users' saved settings unless you add a migration.
- **Write new modules in TypeScript**, readably formatted like `src/designs/` and `src/editor/`. When you substantially change one of the remaining dense JavaScript modules (see [architecture.md](docs/dev/architecture.md#known-structural-debt)), converting it is welcome; otherwise match the surrounding style. Do not start large refactors or reformat whole files without agreement in an issue.
- Do not add runtime network dependencies, npm packages or frameworks without agreement. The page must keep working offline from `file://`.
- Do not add official game logos, characters or UI assets. Badges and designs are original artwork.

## Documentation rules

Update docs in the same branch as the change:

| Change | Update |
| --- | --- |
| Anything users notice | The `## 未发布` section of `docs/CHANGELOG.md`, and the relevant page in `docs/user/` (Chinese) |
| Architecture, state fields, timing, export internals, build or deploy | The relevant page in `docs/dev/` (English) |
| A notable manual or native-app verification | A new record in `docs/qa/` (`<version>-<topic>.md`, English) plus a row in its README |

`docs/CHANGELOG.md` holds only `## 未发布` and the most recent release. Older releases live in git history. When cutting a release, rename `## 未发布` to the new version and date, delete the previous release's section, and add an empty `## 未发布`.

Do not leave stale statements behind. Fix or remove them.

## Deployment

Deploying (`npx wrangler deploy` in `deploy/cloudflare/`) updates the public site and needs the owner's Cloudflare login. **Never deploy without the owner's explicit approval for that deploy.** Deploy only from an up-to-date `main` with a clean tree and passing checks. Pushing or merging on GitHub does **not** deploy. See [deploy.md](docs/dev/deploy.md).

## Environment notes

- The frontend needs Node.js 22.12+ with npm; its build dependencies are installed with `npm ci` in `frontend/`, which the launcher runs automatically when needed. The launcher needs Python 3.9+ with pip; `start.sh` / `start.cmd` install its dependencies automatically.
- `start.cmd` / `start.sh` at the root run the launcher `deploy/launcher/studio.py` (see [launcher.md](docs/dev/launcher.md)). Always call it with a subcommand: subcommands are a pure, non-interactive CLI, while running it without arguments opens a menu meant for people. To preview, use `./start.sh start --no-open` and `./start.sh stop`; run `./start.sh doctor` when the environment seems broken. The owner works on Windows and double-clicks `start.cmd`, so keep it working.
- `.gitattributes` forces LF line endings. A Windows checkout made before it existed needs a one-time refresh; see [build-and-test.md](docs/dev/build-and-test.md#generated-files-and-line-endings). `./start.sh doctor` reports CRLF files.

## Before you report a task as done

- [ ] You read the related issues and PRs, or told the person you could not reach GitHub.
- [ ] Build and check pass; UI changes were also checked in the browser.
- [ ] Each commit is focused, with a Conventional Commits message in Chinese.
- [ ] Docs and `docs/CHANGELOG.md` are updated where needed.
- [ ] You told the person, in plain words, what changed, what you checked, and what you did **not** check.
- [ ] You asked before pushing, opening a PR or deploying, and did not merge or deploy without explicit approval.
