# Legacy frontend snapshot

A frozen copy of `frontend/` as it was before the frontend rewrite (issue #3, tracking PR #4), taken from commit `b8495e4`. It exists only so the rewritten frontend can be compared against the original behaviour: build output, test results and, from phase 2 on, screenshots.

- **Do not edit anything in this folder.** Fixes and features go into `frontend/`. If the original behaviour itself is wrong, record that in #3 instead of patching the snapshot.
- It builds and checks exactly as before, with Node.js 18+ and no `npm install`. Run from this folder:

  ```sh
  node tools/build.mjs    # writes frontend-legacy/dist/ (gitignored)
  node tools/check.mjs
  ```

- The launcher, CI deploys and the live site never use it.
- **Delete this folder when the rewrite is done**, before `refactor/frontend-rewrite` merges into `main`.
