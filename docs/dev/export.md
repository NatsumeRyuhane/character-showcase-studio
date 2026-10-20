# Export pipeline

How the three outputs (standalone HTML, OBS package, After Effects template) are produced. User-facing instructions are in Chinese in [`docs/user/`](../user/). Paths are relative to `frontend/`.

## Shared rules

- **Exports are snapshots.** Each one carries the design and images as they were at export time. Nothing syncs back, and old exports never update; they must be re-exported.
- **The sandbox only sends data.** The output dialog (`src/editor/OutputDialog.tsx`) assembles the state and the permitted images with `studioOutputPayload` (`src/output-payload.ts`) and sends them to the shell (`studio-output-export`). `runtime/export-packages.ts` validates them and builds the files. It never accepts HTML, script, expressions or file paths from the frame.
- **Limits.** State is at most 16 KiB, sent with the same `tuple-v1` encoding as persistence and expanded through the same restore path (`restoreStudioState`). Images must be PNG, JPEG or WebP base64, at most 18 MiB encoded each (shot uploads are capped at 12 MB). AE scene data is at most 48 MiB. JSON is written with `<` escaped.
- **The user clicks to download.** Downloads go through the shell and need user activation. AE is two clicks: "generate" for the slow sampling, then "download".
- **Image filtering.** `includeCharacters:false` drops all four character and shot images. `storyPackagingOnly:true` drops only the two shot images. The sandbox and the host apply the same filter.
- **Resolution.** `src/export-layout.js` fixes the logical size at 1920×1080 or 1080×1920. 4K only scales: coordinates, font sizes, strokes, radii, icons and shapes, plus their animation samples. Colour, opacity, time and speed are never scaled. Paths and samples can share references, so the scaler must create new arrays.

## Standalone HTML

A clean-output page: `.is-clean-output` hides the editor chrome. Its initial globals are `studioOutput` and `studioImages`, and persistence is set to `none` so it never overwrites the editor's settings. It keeps the original sandbox and CSP.

- `fit=contain` shows the whole composition; `fit=cover` fills the viewport with `max(width, height*ratio)` and crops.
- Transparent mode removes only the background fill. The canvas holding the rings stays (do not hide `.background-treatment`).
- `start:'show'` begins at the end of the derived intro.
- Playback is always automatic: shots → show → outro. Reduced motion is ignored.
- Keys: Space pause/resume, R replay intro, S jump to show, E enter outro (if enabled).

## OBS package

Built by `runtime/export-packages.ts`. There are two structures.

**Single source** (no Node needed): `output.html`, `scene.json`, `PREPARE-OBS.cmd` (writes `IMPORT-IN-OBS.json` with this folder's absolute path; never touches a running OBS), `README.txt` and `ASSET-NOTICES.txt`.

**Three synchronized layers** (0.11.0): `picture.html`, `effects.html` and `borders.html`, stacked bottom to top in OBS. External character sources can be inserted between them.
- `START-LAYERS.cmd` / `START-OBS-LAYERS.cmd` run `OBS-LAYERS-SERVER.mjs` (packaged from `runtime/obs-layer-server.mjs`). It is dependency-free Node 18+ and listens on `127.0.0.1` with an OS-assigned port. It reads `studio-sync.json` (a random key plus the three layer file names), writes `IMPORT-IN-OBS.json` from `scene-template.json`, and opens `control.html` (from `runtime/obs-layer-control.html`). Starting it again reuses a service that is already running.
- Endpoints: `/__studio_clock` (layers poll the shared clock), `/__studio_control` (play, pause, replay, show, ending).
- `runtime/obs-layer-host.ts` runs in each layer's trusted shell. It only talks to the same origin, polls the clock, and forwards `studio:layer-clock` messages to the sandbox. `src/obs-layer-sync.js` applies them: all three layers sample one absolute clock, so a reloaded layer catches up instead of replaying.
- The effects layer can only add light (scan lines, ripples, light leaks, flares). It cannot read other OBS sources' pixels. Real glow, chromatic aberration and distortion stay inside the picture layer.

Spout2 is not implemented by the page. Users add the obs-spout2-plugin filter in OBS. That path has never been tested end to end.

## After Effects template

The output is a ZIP containing `IMPORT_TO_AE.jsx`, `assets/` and notices. Running the script in AE builds native compositions, and the user saves the `.aep` from AE. The browser never produces a real `.aep`.

### Capture (in the sandbox)

1. `src/ae-export.js` measures the DOM once at the fixed output size, using the same `measure` path as the editor, with no AE-specific position patches. It extracts native text, separate assets and badge graphics, then restores the editor's measurement, clocks and text motion.
2. `src/ae-canvas-recorder.js` records the production canvas painters' paths as Bézier vertices.
3. `src/ae-geometry-motion.js` samples motion adaptively. For each interval it checks the curve at ¼, ½ and ¾; where the deviation is over 0.25 logical px it subdivides only the operations that need it, down to a quarter frame. The error includes absolute control points, stroke width and opacity. Static spans keep only their boundary keys. A change in path topology is an explicit error, not a silent morph. The sampler yields every 32 captures, so a background tab still finishes. The limit is 16,384 samples per path group.
4. Geometry is sampled at `introProgress: 1`, the settled show position. The intro move is recorded separately via optional recorder-only markers `studioIntroTransform / studioIntroOpacity / studioIntroRotation`:

   ```js
   introTransform: { from: [x, y], to: [x, y], scale: 1.44, rotation: degrees },
   introOpacity: 0.24
   ```

   `from` and `to` are composition coordinates. Local rotations must convert the anchor offset and mirroring too. The recorder's save/restore keeps the markers, and static cut shapes must not inherit ring markers.

### Import template (`runtime/ae-import-template.jsx`)

A trusted ES3 ExtendScript template. Scene data is embedded as a JSON literal and never evaluated as code.

- Sampled paths, stroke widths and group opacity use `valueAtTime` on the continuous-motion time with **LINEAR** keys. The GEOMETRY precomp has no time remap. The intro move is native Anchor/Position/Scale/Rotation on un-remapped time, so changing transition length never changes ring speed. `Geometry Speed = 0` freezes only the continuous motion.
- CRT shutdown runs the same `studioCRTPose` as the web page; the build injects `runtime/crt-motion.js` at `/* CRT_MOTION_FUNCTION */`, and the expressions embed it.
- Fonts missing on the desktop fall back explicitly (Arial Narrow / Arial / Georgia; Chinese uses Microsoft YaHei). Web WOFF2 fonts are not installed fonts.
- WebP uploads are converted to PNG, and the references are updated.

`01 MAIN` layer order, top to bottom: `CONTROLS` → borders (`BORDER TOP/BOTTOM/LEFT/RIGHT · background/text`) → `MODEL · ABOVE FX` → `FX OPTICS` → `FX ADJUSTMENT` → intro / ending (`06 ENDING`, `07 INTRO CHARACTER`, `08 INTRO CREATOR`) → show text → geometry / patterns / background. Replaceable assets go in green `REPLACE` / `MODEL` containers, and empty containers are created even without uploads. Border copy has a single source text, `Border copy · EDIT THIS`; the scrolling duplicates reference it.

`CONTROLS` sliders: colours and badge look, `Geometry Speed`, `Text Motion`, `Character / Author Shot Start / Duration`, `Show Transition Start / Duration`, `Information Start`, `Information Fade Duration`, `Title Fade Duration`, `Ending Start`, `Ending Transition Duration`, `Cyber Shutdown`, `Shutdown Duration`, `Post FX Strength / Glow / Speed / Fade`, `Post FX Character / Author / Showcase / Ending`.

Scene `narrative` may include `transitionStart / transitionDuration / infoDuration / endingTransitionDuration`, in output-composition seconds. When missing they default to `intro/6`, `0.8`, `.85/speed` and `min(.8/speed, ending.duration*.28)`. Start times are clamped to the composition, and the minimum duration is one frame. The `INTRO / SHOWCASE / ENDING / CYBER SHUTDOWN` markers are informational only. Sliders never lengthen compositions or layers. The shutdown stays anchored to the composition end. The maximum length is 204 s (30 + 60 + 12 at 0.5× speed).

Rich web textures (metal, cloud, plush gradients, CSS filters, frosted glass, grain, vignette, clip paths, SVG distortion) are approximated with native shapes and effects. They are not pixel-matched.

### Code and tests

| File | Role |
| --- | --- |
| `runtime/output-host.ts` | Entry of the shell's output host bundle |
| `runtime/export-packages.ts` | Validate sandbox data, build OBS and AE file lists |
| `runtime/export-zip.ts` | Dependency-free ZIP writer |
| `runtime/studio-output-host.ts` | Shell side of the export request: validate, build the output page, download |
| `runtime/obs-layer-host.ts` | Clock bootstrap copied into synchronized OBS layer pages |
| `tools/output-host-defines.mjs` | Files embedded in exports, as build-time constants |
| `tests/unit/export-packages.test.ts` | ZIP writer, AE validation, output page, OBS file lists |
| `tests/check-export-packages.cjs` | Production geometry, data bounds, script syntax, OBS scenes, ZIP integrity |
| `tests/check-ae-geometry-motion.cjs` | Rigid ring radius, production fixtures, intro transition, in-between error, static spans |
| `tests/check-ae-transitions.cjs`, `check-ae-postprocessing.cjs` | AE timing controls and post-processing data |
| `tests/check-output.cjs`, `check-resolution.cjs` | HTML output, filtering, escaping, 1080p / 4K invariance |
| `tests/check-obs-layers.cjs`, `check-obs-layer-clock.cjs`, `check-obs-sync-server.cjs` | Three-layer OBS output |
| `tests/ae/` | Manual harnesses that run inside After Effects |

Native AE verification records are in [`docs/qa/`](../qa/). The automated checks do not replace reviewing each design, font and effect combination in AE by hand.

Adobe scripting reference: https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html
