# Architecture

Character Showcase Studio is a browser editor for animated character showcase screens. The editor UI and its content are Chinese. Users pick one of 13 visual designs, fill in character and brand content, tune motion and effects, and export the result as a standalone HTML page, an OBS browser-source package, or an editable After Effects template.

This document describes the code **as it is today**, before the planned frontend restructure. Read it before moving or splitting modules: several invariants below are easy to break silently.

Related: [state-and-timing.md](state-and-timing.md), [export.md](export.md), [build-and-test.md](build-and-test.md), [deploy.md](deploy.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `frontend/` | The web app: `src/`, `runtime/`, `assets/`, `vendor/`, `tests/`, `tools/`, `package.json`, `THIRD-PARTY-NOTICES.md`. The build writes to `frontend/dist/`, which is gitignored. |
| `deploy/launcher/` | The local [launcher](launcher.md); `start.sh` / `start.cmd` at the root call it |
| `deploy/cloudflare/` | Wrangler config, the Worker, and the deploy build step |
| `docs/` | `user/` (Chinese), `dev/` (English), `qa/`, `CHANGELOG.md` |
| `.github/` | `CONTRIBUTING.md`, issue and PR templates |
| `AGENTS.md`, `.agents/` | Agent instructions and tooling (`CLAUDE.md` and `.claude` point here) |

**Paths in the `docs/dev/` pages are relative to `frontend/` unless they start with another top-level folder.**

## Shape of the product

- **One self-contained HTML file.** `node tools/build.mjs` writes `dist/index.html` (about 2.5 MB). Scripts, styles, icons, barcode/QR libraries and Latin fonts are all inlined. The page makes no network requests at runtime. Chinese text uses system fonts (Microsoft YaHei, PingFang SC).
- **No package manager, no framework, no bundler.** The build is a Node script that splices source files into each other at marker comments.
- **No backend.** Settings live in the browser's `localStorage`. Uploaded images exist only for the current page session.
- **Origin.** The project started as an OpenAI Codex "visualization" widget and was later exported to run standalone. That is why the runtime still uses identifiers such as `codex-visualization`, `codex:visualization-widget-state-v2` and `widgetState`. `runtime/visualize.html`, `runtime/visualize.css`, `runtime/standalone-shell.js` and `runtime/standalone-host-bridge.js` are that exported widget runtime.

## Runtime layers

```
dist/index.html  (shell document, strict CSP)
├─ <script type="application/json" id="studio-startup-defaults">   published preset (data only)
├─ <iframe id="codex-visualization" sandbox="allow-scripts" data-srcdoc="…">
│    frame document (CSP, no network)
│    ├─ runtime/visualize.css
│    ├─ widget-state JSON placeholder
│    ├─ runtime/standalone-host-bridge.js     talks to the shell over MessageChannel
│    └─ runtime/visualize.html kit            Floating UI + Lucide, inlined
│         └─ fragment = src/exploration-full-template.html
│              ├─ injected CSS (design languages, workspace, output, narrative, …)
│              ├─ vendor script: barcode + QR generator
│              └─ main script: src/exploration-full-logic.js with modules spliced in
├─ output host script   runtime/export-zip.js + export-packages.js + obs-layer-host.js + studio-output-host.js
└─ runtime/standalone-shell.js   storage, sizing, startup preset, srcdoc boot
```

- The **frame** is sandboxed with `allow-scripts` only. It cannot download files or touch storage directly, so it asks the shell over a `MessageChannel`.
- The **shell** owns `localStorage` and builds export packages (`studio-output-export` → `studio-output-result` messages). It only accepts validated data from the frame, never HTML or script. Downloads must stay tied to a user click (user activation).
- **Do not remove the sandbox or loosen either CSP** as a side effect of other work. Changing the security boundary is its own task and needs its own review.

## Build pipeline

`tools/build.mjs` (about 100 lines, no dependencies) does the following, in order:

1. Concatenates the scene modules into `/* SCENE_FUNCTION */` and splices further modules into the main script at marker comments:

   | Marker in `src/exploration-full-logic.js` | Inserted source |
   | --- | --- |
   | `/* SCENE_FUNCTION */` | `urban-language-scene.js`, `design-language-scene.js`, `dual-language-scene.js`, `exploration-full-scene.js` (with `studio-geometry.js` at `/* LEGACY_SERIES_GEOMETRY */`) |
   | `/* MOTION_FUNCTIONS */` | `motion-clock.js` |
   | `/* TIMELINE_FUNCTIONS */` | `runtime/crt-motion.js`, `timeline.js` |
   | `/* INFORMATION_MOTION */` | `information-motion.js` |
   | `/* VARIANT_CODEC */` | `variant-codec.js` |
   | `/* STUDIO_TEXT */` | `studio-text.js` |
   | `/* STUDIO_WORKSPACE */` | `studio-workspace.js` |
   | `/* STUDIO_NARRATIVE */` | `story-intro.js`, `studio-post.js`, `studio-narrative.js` |
   | `/* STUDIO_OUTPUT */` | `export-layout.js`, `ae-canvas-recorder.js`, `ae-geometry-motion.js`, `ae-export.js`, `studio-output.js` |
   | `/* OBS_LAYER_SYNC */` | `obs-layer-sync.js` |
   | `/* BADGE_ASSETS */{}` | `badge-assets.json` |

2. Splices CSS and markup into `src/exploration-full-template.html` at `/* DESIGN_LANGUAGE_STYLES */`, `/* URBAN_LANGUAGE_STYLES */`, `/* DUAL_LANGUAGE_STYLES */`, `/* STUDIO_WORKSPACE_STYLES */`, `/* STUDIO_OUTPUT_STYLES */`, `/* STUDIO_NARRATIVE_STYLES */` and `<!-- DUAL_LANGUAGE_MARKUP -->`.
3. Replaces the Google Fonts `@import` with `assets/fonts/fonts.css`, with every font inlined as base64, and swaps `'Noto Sans SC'` for system CJK fonts.
4. Inlines Floating UI and Lucide from `vendor/` in place of their unpkg `<script src>` tags.
5. Fills the export packager's placeholders: `__STUDIO_AE_TEMPLATE__` (the AE template, with `crt-motion.js` at `/* CRT_MOTION_FUNCTION */`), `__STUDIO_ASSET_NOTICES__`, `__STUDIO_OBS_LAYER_SERVER__` and `__STUDIO_OBS_LAYER_CONTROL__`.
6. Validates the result. A missing marker, duplicate element IDs, document markup inside the fragment, any remaining `<script src>` or `@import`, or an invalid `runtime/startup-defaults.json` (over 16 KiB, or missing `revision`) all fail the build.
7. Writes `dist/index.html`. It also writes `dist/character-explorations.fragment.html` and `dist/exploration-full-source.js`; `tools/check.mjs` parses those two.

Consequences:

- **All spliced modules share one function scope.** They reference each other's top-level names (`state`, `root`, `clamp`, `studioNarrativePose`, …) without imports. Insertion order matters.
- **A new source file must be wired into `build.mjs` by hand.** A new test must be added to the list in `tools/check.mjs`.
- **`dist/` is build output.** It is gitignored. Never edit or commit it.

## Source map (`src/`)

| File | Responsibility |
| --- | --- |
| `exploration-full-template.html` | Preview canvas, global and per-design controls, base styles. Holds the 13 `section[data-design]` views. |
| `exploration-full-logic.js` | The main IIFE: defaults, validation and restore, form binding, the shared paint loop, image reading. Every other script module is spliced into it. |
| `studio-workspace.js` / `.css` | Turns the original controls into the three-pane editor: shared content (left), preview and playback (centre), current design's inspector (right). Tabs below 1120 px, focus mode. Styles are scoped under `.studio-editor`. |
| `exploration-full-scene.js` | Base scene, geometry and background painting |
| `design-language-scene.js` / `design-language-styles.css` | Fashion, avant-garde, plush, relaxed, cute and paper designs |
| `urban-language-scene.js` / `urban-language-styles.css` | The three urban designs, `district`, `tuner` and `arcade`: palettes, recommended geometry, animated backgrounds, typography |
| `dual-language-scene.js` / `-styles.css` / `-markup.html` | The two-panel `dual` design |
| `studio-geometry.js` | Switchable geometry options (`orbit`, `slices`, `wave`, `ring`, …) |
| `motion-clock.js` | Continuous ring, text and border clocks that never reset |
| `information-motion.js` | Text entrance and subtle idle motion |
| `timeline.js` | Narrative timing: intro / show / outro poses, looping, retiming |
| `story-intro.js` / `.css` | Two-shot poster intro (character shot → creator shot) and its deterministic overlay effects |
| `studio-narrative.js` / `.css` | Intro and outro controls, brand ending |
| `studio-post.js` / `.css` | Post-processing (polar, CRT, holo, bloom, anamorphic, prism, film) over one shared optical surface. Borders stay outside it. |
| `studio-text.js` / `.css` | Typography controls (name font, size ratio, tracking, weight, italic, colour, intro titles) |
| `variant-codec.js` | `tuple-v1` compact encoding of per-design settings |
| `studio-output.js` / `.css` | Output dialog, clean-output mode, export requests to the shell |
| `export-layout.js` | Logical layout size and output scaling |
| `ae-canvas-recorder.js`, `ae-geometry-motion.js`, `ae-export.js` | AE export: record canvas paths, sample motion adaptively, measure layout and collect text and assets |
| `obs-layer-sync.js`, `obs-layers.css` | Three-layer OBS output: shared clock inside each layer |
| `badge-assets.json`, `badge-assets/` | Compatibility badge catalog (MMD, ARKit, VRCFT, lilToon, Poiyomi, MToon) and source notices |
| `barcode-code128.min.js`, `qrcode-generator.js` | Vendored libraries (see `THIRD-PARTY-NOTICES.md`) |

Design keys (`section[data-design]`): `couture` (the code's default), `brutalist`, `cloud`, `orbit`, `play`, `plush`, `poster`, `sticker`, `wave`, `dual`, `district`, `tuner`, `arcade`.

### Editor workspace

After `exploration-full-logic.js` creates the design views, it calls `mountStudioWorkspace(root, views)` and then binds the original form controls.

- The desktop layout is `.studio-header` plus `.studio-layout`: a 260 px left pane, a flexible centre and a 280 px right pane. The side panes scroll independently. The root is `.studio-editor` at `100dvh`. The centre computes `--preview-width` to keep 16:9 or 9:16.
- `.studio-content` (left): shared content. Series management (ATELIER / FUR / MINI) sits on top, then character and brand, images, delivery formats and badges, link and barcode.
- `.studio-canvas-toolbar` + `.studio-preview` + `.studio-playback` (centre): the design picker, ratio, borders, the preview, play / intro / show / swap / timeline / speed.
- `.studio-inspector` (right): the current design's palette and fonts, geometry, background, text motion, badges, shadows, filters. Controls for `dual` and for borders only appear when relevant.
- The old `.viz-carousel` becomes `.studio-views`. It and the active `section[data-design]` use `display: contents` so their children join the outer grid; inactive designs are `hidden`. The series picker, playback speed and border controls exist once and move to the active design on switch.

### Adding a design

The 0.8.8 urban designs are the most recent example:
- Register the key in `variantDefaults`, `languageKeys` and `languageNotes`, with its own font, colour, badge, shadow, ring-speed and background defaults.
- Add a `section[data-design]` to the template and an `<option>` to the picker.
- Add painting: `urbanLanguagePalette(variant, dark)` and `paintUrbanLanguage(ctx, w, h, t, variant, settings)`. `paintExploration` dispatches to that module first; only the `signature` geometry uses the design's own rings, and other geometry choices fall back to the shared painters.
- Add typography and layout rules for landscape, portrait and swapped layouts.
- Keep path topology fixed and record `studioIntroTransform`, so the AE export keeps continuous motion separate from editable transitions.
- Extend the tests: `check-urban-designs.cjs` (topology, clocks, transparency, palettes, ratios), plus the design count asserted in `tools/check.mjs`.

Design-specific layout logic exists too. For example, `fitPosterCopy` in `exploration-full-logic.js` pushes the `poster` taglines below the skewed name block. It projects the name and its pseudo-elements through their CSS transforms in un-animated layout coordinates, adding margins for shadow and motion. AE capture goes through the same `measure` path.

`runtime/` holds the shell and frame runtime, the export packager, the ZIP writer, the AE ExtendScript template, the OBS layer server and control page, `crt-motion.js` (shared by the web page and AE), and `startup-defaults.json`.

`tools/` holds `build.mjs`, `check.mjs`, `server.mjs` (a read-only static server for `dist/` on 127.0.0.1, port 8768 by default) and `prepare-vendor.py` (one-off vendor refresh, needs the network). Deploy scripts live in `deploy/cloudflare/`.

## Invariants

Keep these when changing or restructuring code. Most have regression tests in `tests/`.

**Motion and timing**
- Narrative animation is a **pure function of time**. Seeking, pausing, replaying and changing speed must reproduce the same frame. Never drive transitions with one-shot CSS animations or event sequences.
- **Continuous clocks never reset.** Ring, text, border and background motion keep their phase across intro → show → outro, replays, loops and speed changes.
- **QR codes and barcodes never move.** They have to stay scannable.
- **Borders persist** from the first intro frame to the last outro frame. They are independent of info or outro opacity and sit outside post-processing.
- The **editor** respects `prefers-reduced-motion`. **Exported output** ignores it and always plays.

**Layout**
- Layout always happens at the logical size: 1920×1080 landscape or 1080×1920 portrait. Output resolution (1080p / 4K) only scales the result. Never feed transformed DOM bounds back into layout measurement.
- Check every new layout at 16:9 and 9:16, with sides swapped, a long name, all badges plus the QR code, and a narrow editor.
- Editor chrome must not leak into the artwork (`.design-art`).
- The workspace **moves** the original form nodes instead of cloning them, so there is exactly one control per ID. The build fails on duplicate IDs.

**State and security**
- The saved state is at most 16 KiB. Measure the full snapshot, including `modelContent` and `privateContent`. Never store DOM or base64 images in state.
- `tuple-v1` slots are append-only (see [state-and-timing.md](state-and-timing.md)).
- Keep the sandbox and both CSPs. Exported packages contain only trusted templates plus validated data literals.
- Badges and the urban designs are original artwork. Do not add official game logos, characters or UI assets.

## Known structural debt

The planned frontend restructure is meant to fix these:

- Source files are written in a dense, minified-looking style, with single lines up to about 1,700 characters. Line-based diffs and merges are hard to use.
- Modules communicate through one shared closure scope, not imports.
- `exploration-full-logic.js` mixes defaults, validation, persistence, form binding and painting.
- The runtime still carries Codex widget naming. The `localStorage` key includes the page path (see [state-and-timing.md](state-and-timing.md#storage)), so **moving or renaming the served page loses every user's saved settings** unless a migration is added. The local server serves `dist/` at `/` to keep that path stable.
