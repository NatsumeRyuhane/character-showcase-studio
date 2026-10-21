# Video editor port

The local video editor is being ported onto the rewritten frontend, in phases tracked in [issue #11](https://github.com/nekokaii/character-showcase-studio/issues/11). This page is the port's working reference: what the reference implementation is, where each part of it goes, and the acceptance checklist the port is measured against.

It is transitional. When the port is finished (phase 7), the lasting parts move into a permanent `video-editor.md` and this page is deleted.

Related: [editor-project-v1.md](editor-project-v1.md) (the reference's project format).

## The reference

| | |
| --- | --- |
| Branch | `feature/video-editor-0.16.1` on `nekokaii/character-showcase-studio` |
| Pinned commit | `fc95cc1` (2026-10-21, "feat(editor): 保存 0.16.1 本机剪辑完整版本") |
| Based on | `e58a189`, the flat layout from before the frontend rewrite ([issue #3](https://github.com/nekokaii/character-showcase-studio/issues/3)) |
| User guide | `docs/VIDEO-EDITOR.md` on that branch (Chinese) |

**The reference is never merged, rebased or edited.** The four files it hooks into (`src/studio-workspace.js`, `src/exploration-full-logic.js`, the old `tools/build.mjs` and `tools/server.mjs`) no longer exist on `main`. Read it with `git show fc95cc1:<path>`. In this page, reference paths are relative to the reference branch's root, which has no `frontend/` folder.

If the owner adds commits to the branch, move the pin here and add the new behaviour to the checklist in the same change.

To run the reference, check it out in a separate worktree, run `npm ci` and `node tools/server.mjs 19378`, then open `http://127.0.0.1:19378/?workspace=edit`. It needs FFmpeg and FFprobe (from `tools/ffmpeg/bin/` on Windows, otherwise from `PATH`) and a desktop Chrome or Edge. Its `npm run check` and `npm run check:editor` pass at the pinned commit; the browser-driven `tests/check-editor-*.mjs` scripts need the running service.

## How the reference works

- **Preview.** `<video>` and `<img>` elements are inserted into the showcase's own layer stack, positioned with CSS transforms and graded with CSS filters. Chroma key runs in a WebGL shader, falling back to a 2D canvas. Audio plays through Web Audio. Preview uses low-resolution proxies.
- **Local service.** Plain `node:http`, merged into `tools/server.mjs` and listening on `127.0.0.1:19378`. It inspects media with FFprobe, makes proxies with FFmpeg, stores the project and assets under `.studio-media/`, and runs one export job at a time.
- **Export.** FFmpeg decodes each source continuously into lossless PNG frames. `playwright-core` drives a headless system Chrome or Edge that loads the page in render mode (`?editor-render=1`), seeks to each frame's time and takes a transparent screenshot over CDP. The PNGs go to FFmpeg as an AVI/MPNG stream and are encoded there. Audio is mixed by FFmpeg from the original files. Because export renders the same page as the preview, the two cannot diverge.
- **Bridge.** The sandboxed frame cannot reach the network. It asks the shell (`runtime/editor-host.js`) over `postMessage`, and the shell calls the service.

## Where each part goes

| Reference file | Role | Target | Phase |
| --- | --- | --- | --- |
| `src/studio-editor-core.js` | Track rows and layers, clip poses, keyframe interpolation, split, CPU chroma key | `src/editor/timeline/` (TypeScript, frame-based) | 1 |
| `src/studio-editor-transform.js` | Viewport handle math: move, corner scale, rotate, snapping | Pure TypeScript module | 1 |
| `src/studio-editor-key.js` | WebGL chroma key | Preview player | 5 |
| `src/studio-editor.js` | The whole editor UI, preview player, undo, render-mode API | React components and the preview player | 4–6 |
| `src/studio-editor.css` | Editor styles | Imported from `src/main.js` | 4–5 |
| `runtime/editor-host.js` | Shell bridge to the service; monitor window | `runtime/` as TypeScript (bridge), monitor in the editor | 3, 5 |
| `tools/editor-media.mjs` | HTTP API, import, probe, proxies, project store, export jobs | `frontend/tools/` | 2, 6 |
| `tools/editor-frames.mjs` | Continuous source decoder | `frontend/tools/` | 6 |
| `tools/editor-png.mjs` | AVI/MPNG packets for the encoder | `frontend/tools/` | 6 |
| `tools/server.mjs` (changes) | Mounts the service, hides dotfiles and `node_modules/` | `frontend/tools/server.mjs` | 2 |
| `tools/build.mjs` (changes) | Loosens both CSPs for `127.0.0.1` | Reviewed separately, local build only | 3 |
| `setup-editor.cmd`, `start-editor.cmd`, `tools/setup-editor.ps1`, `tools/open-editor.ps1` | Windows setup and start | Replaced by the [launcher](launcher.md) | 2 |
| `src/studio-post.js` (`studioEditorTextLayers`, `editorSeek`, `previewRasterScale`) | Splits text out of the showcase so footage can sit between layers; render-mode seeking; preview raster scale | `src/studio-post.js` / `src/studio-views.js` | 6 |
| `src/exploration-full-logic.js`, `src/studio-workspace.js` (changes) | Preview raster scale, editor mount and mode button | `src/studio-views.js`, `src/editor/` | 5–6 |
| `tests/check-editor-*.mjs` | Acceptance scenarios | See [Acceptance checklist](#acceptance-checklist) | all |

### Showcase changes outside the port

The reference commit also changes the showcase itself. These are not part of the port; each becomes its own small change, if the owner wants to keep it (question 3 in #11):

- **RGB dispersion strength** (`postDispersion`, 0–100 %, default 25 %) in post-processing (`src/studio-post.js`, `src/studio-narrative.js`, `tests/check-post-processing.cjs`).
- **Long intro shots:** character and author shots up to 600 s, the legacy intro up to 1800 s (`src/timeline.js`, `src/studio-narrative.js`, `tests/check-narrative.cjs`, `tests/check-motion-state.cjs`).
- **Wider AE limits** to match (`runtime/export-packages.js`, `tests/check-export-packages.cjs`).
- **`district` layout tweak:** new `--edition-y` and moved `.hello` (`src/urban-language-styles.css`).

## Decisions that differ from the reference

- **Time is in integer frames**, in a new project format (`version: 2`) with a rational frame rate. Old `version: 1` projects, which use seconds, are converted on import after a warning, and the original is backed up. See [editor-project-v1.md](editor-project-v1.md#converting-to-version-2).
- **The timeline is split into pure commands and a swappable view.** The view only reports intents in frames and never changes the project; every rule lives in the commands. A shared jsdom suite tests any view implementation.
- **The service runs from the launcher**, on the launcher's port 8768, not a separate 19378 (a different origin means different saved settings).
- **The editor stays out of the public site and out of HTML / OBS exports**, and the loosened CSP applies only to the local build.

### Not carried over

- Edits applied inside pointer handlers, and hit-testing with `elementFromPoint` / `clientWidth`, which only run in a real browser.
- Undo by whole-project snapshots (60 steps), replaced by command history.
- The FFmpeg checksum fetched at setup time; the port pins it in the setup step.
- `"engines": { "node": ">=18" }`; the frontend needs Node 22.12.
- The committed `dist/` and root `index.html` of the old layout.

## Acceptance checklist

The port is done when every row holds on the ported editor. "Ref. test" is the reference script that covers it, under `tests/` on the reference branch. Those scripts drive a real browser and the running service, so their ported equivalents are run by hand at phase milestones, never in CI. Rows marked *new* are not in the reference.

### Import and assets

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| A1 | Import video, transparent MOV, PNG, JPEG and WebP by drag-and-drop or file picker. A MOV without a MIME type still goes to FFmpeg. | `integration` | 2, 5 |
| A2 | Import MP3, WAV, FLAC, M4A, AAC, OGG, Opus, AIFF and WMA. An MP3 with cover art is audio. | `audio-tracks` | 2, 5 |
| A3 | Importing only adds to the library. Dragging from the library onto a track at a time creates a clip, the target track is highlighted, and an asset can be used many times. | `integration` | 4 |
| A4 | Alpha is detected from the pixel format or from the VP9 `alpha_mode` / `ALPHA_MODE` tag, even when FFprobe reports `yuv420p`. | `preview` | 2 |
| A5 | Preview proxies: long side at most 960 px and at most 30 fps. Opaque sources get H.264, transparent ones lossless VP9 with alpha, audio gets AAC. A fitting transparent VP9 WebM and a compatible H.264 MP4 are reused without transcoding. The original is kept for export. | `preview`, `preview-export` | 2 |
| A6 | Deleting a library asset shows how many clips use it, removes the asset and those clips, and can be undone. The files stay on disk. | `interaction` | 5 |

### Timeline

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| T1 | Rows, top to bottom: above border, *border* (fixed), above post-processing (unaffected), *post-processing* (fixed), above text (affected), *intro / show / outro text* (fixed), below text (affected), *showcase* (fixed), audio 1, audio 2. Fixed rows take no clips. | `text-tracks` | 1, 4 |
| T2 | Drag a clip sideways to change its start and up or down to change track. A cross-track drag is one undo step. | `advanced`, `custom-tracks` | 1, 4 |
| T3 | Set start, source in and source out in the inspector. Split at the playhead when it is inside the clip. Delete (the Delete key, but not inside text fields), duplicate, undo (Ctrl+Z), redo (Ctrl+Shift+Z). | `integration`, `interaction` | 1, 4, 5 |
| T4 | Within a track, a later clip draws above an earlier one; "move up" changes that order. | `custom-tracks` | 1 |
| T5 | "+" adds a track of the same kind above a video track (at most 64 extra), named with a number. "×" removes an empty extra track only. Both can be undone and are saved. | `custom-tracks` | 1, 4 |
| T6 | Audio clips go only on audio tracks, visual clips only on visual tracks. | `audio-tracks` | 1 |
| T7 | Duration mode "auto" follows intro + show + outro, "custom" is typed in, and typing a duration switches to custom. Clip parts past the film's end are not exported. | `advanced`, `long-intro` | 1, 5 |
| T8 | The library and inspector collapse, "enlarge preview" hides both and shrinks the timeline, and the timeline height can be dragged or changed with the arrow keys. The preview stays centred. | `advanced` | 4, 5 |
| T9 | *new* Every position is a whole frame: dragging, trimming, splitting, keyframes and the playhead snap to frames. | — | 1, 4 |

### Clip properties

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| P1 | Position, scale, rotation, opacity and four-side crop. A new clip fits the canvas, keeping its aspect ratio. Scale runs from −800 % to 800 %: negative mirrors horizontally, and height uses the absolute value. "Flip horizontal" toggles the sign; "flip vertical" is a separate flag. "Reset transform" restores the defaults. | `negative-scale` | 1, 5 |
| P2 | In the viewport: click selects, drag moves, corners scale proportionally, the top handle rotates. Shift locks the axis, snaps rotation to 15° and scale to 5 %. Esc cancels the drag. One drag is one undo step. | `interaction` | 1, 5 |
| P3 | Keyframes for x, y, scale, rotation and opacity. "Record current transform" keys all five. Once a property has keyframes, changing it records one at the playhead; x and y are recorded as a pair. Easing is linear, smooth or hold. Keyframes can be navigated, deleted, or cleared while keeping the current pose. They follow source time, so splitting and trimming keep the motion. | `simple-keyframes`, `advanced` | 1, 5 |
| P4 | Fade in and out, slide and zoom transitions. A cross-dissolve is an upper overlapping clip fading in. | `core`, `advanced` | 1, 5 |
| P5 | Volume 0–200 % and separate audio fades. In old projects, a clip without audio fades uses its picture fades; new clips start with none. | `advanced`, `audio-tracks`, `animation-export` | 1, 5 |
| P6 | Chroma key: colour, tolerance, edge softness, green-spill suppression. It keeps the source's own alpha. GPU, with a CPU fallback. | `core`, `integration`, `hardware` | 1, 5 |
| P7 | Per-clip exposure, contrast, saturation and hue; a global grade over the whole composite, borders included. | `core` | 1, 5 |

### Showcase integration

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| S1 | The stacking order is the same in preview, monitor, design sync and export. Text is split out of the showcase so footage can sit above or below it. Post-processing applies once to above-text clips, the text, below-text clips and the scene. Borders stay outside it. All 13 designs, intro shots and the outro. | `text-tracks` | 6 |
| S2 | "Sync footage" (in both workspaces, the same setting, saved with the project) shows the footage at the current time in the showcase workspace and follows a design switch. It does not change the export. | `interaction`, `text-tracks` | 6 |
| S3 | The editor uses the current design. Aspect presets (16:9, 9:16, custom) keep the long side. Entering from the showcase inherits its ratio; portrait uses the portrait layout. | `portrait`, `browser` | 5, 6 |

### Preview

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| V1 | Video plays on its own and is only seeked on start, jumps and clip entry. Nothing redraws while paused. Preview uses proxies; the showcase is drawn once by the editor player at a reduced raster scale. | `preview` | 5 |
| V2 | "Monitor" opens a document picture-in-picture window, always on top, 960×540, picture only, 16:9 filled with a centred crop, muted and read-only. It follows time, transforms and playback. Without picture-in-picture it falls back to a normal window and says so. | `clean-monitor`, `advanced` | 5 |

### Export

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| E1 | Width and height 64–7680 (even, except ProRes), 1–60 fps, up to 1 hour, 0.1–250 Mbps. H.264, H.265 and AV1 in MP4; VP9 in WebM; ProRes 4444 in MOV. A transparent background needs VP9 or ProRes, and opaque text, borders and footage stay opaque. | `core`, `codecs` | 6 |
| E2 | Frame by frame, not screen recording, so a slow render drops nothing. Progress shows the encoder device and composite frame rate. Cancel works. One export at a time. | `service`, `parallel-export` | 6 |
| E3 | Sources are decoded continuously from the originals and frames picked by source timestamp. Handles variable frame rate, trims, one source in several clips and a different output frame rate. Buffering is bounded. | `frames`, `sequential-export` | 6 |
| E4 | Lossless PNG frames go to the encoder as AVI/MPNG. The finished file's packet count must equal the expected frame count. | `png-transport` | 6 |
| E5 | Two parallel render workers (one above 4K) share one decode queue and encode in order. | `parallel-export` | 6 |
| E6 | NVENC, QSV and AMF are offered only after a test encode succeeds. "Auto" prefers the GPU and falls back to the CPU with a reason; an explicitly chosen GPU fails loudly. VP9 alpha and ProRes use the CPU. | `hardware` | 6 |
| E7 | Audio is mixed from the original files with trims, start, volume and fades: PCM for ProRes, Opus for VP9, AAC otherwise. | `integration`, `audio-tracks` | 6 |
| E8 | Showcase animation, keyframes and transitions export exactly as previewed. | `animation-export`, `parallel-export` | 6 |

### Projects

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| R1 | The project saves automatically to `.studio-media/project.json`; assets live in `.studio-media/assets/`, exports in `.studio-media/exports/`. Reloading restores the project. | `integration` | 2, 5 |
| R2 | "Save project" downloads JSON including the full showcase template (every design's settings, text, typography, colours, borders, timing, and uploaded images with their names). Opening one checks the file and its assets first and keeps the current project on failure; opening can be undone. A timeline-only JSON keeps the current template. | `project-template` | 1, 5 |
| R3 | *new* `version: 1` projects are converted to `version: 2` after a warning, with the original backed up. | — | 1, 5 |

### Local service

| # | Behaviour | Ref. test | Phase |
| --- | --- | --- | --- |
| Q1 | Listens on `127.0.0.1` only and checks the `Host` header. Rejects cross-site requests. Every write needs the session token. Assets are referenced by UUID, never by path, and originals are never served. Render frames use a per-job secret that expires when the job ends. FFmpeg gets argument arrays. Uploads are capped at 20 GB. | `service` | 2, 3 |

## Samples

- **Projects:** hand-written `version: 1` projects in [`frontend/tests/fixtures/editor-project-v1/`](../../frontend/tests/fixtures/editor-project-v1/README.md), covering the format's edge cases for the conversion tests. Real projects from the owner are requested in #11.
- **Media:** the reference tests generate their media with FFmpeg's `lavfi` sources (for example a transparent ProRes 4444 MOV from `color=c=black@0` plus `drawbox`). The port does the same, so no media files are committed. A real transparent MOV from the owner is requested in #11.
