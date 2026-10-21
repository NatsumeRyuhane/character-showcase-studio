# Architecture

Character Showcase Studio is a browser editor for animated character showcase screens. The editor UI and its content are Chinese. Users pick one of 13 visual designs, fill in character and brand content, tune motion and effects, and export the result as a standalone HTML page, an OBS browser-source package, or an editable After Effects template.

This document describes the code **as it is today**, after the staged frontend rewrite ([issue #3](https://github.com/nekokaii/character-showcase-studio/issues/3)): phase 1 (ES modules, Vite, TypeScript tooling), phase 2 (a Playwright screenshot baseline, used as the rewrite's safety net and removed after it), phase 3 (the pure logic as typed TypeScript modules with Vitest unit tests), phase 4 (the editor UI as React components, without the Codex widget's UI kit) and phase 5 (one module per design, and the editor's old main module split into session, views and app modules) are done. Read it before moving or splitting modules: several invariants below are easy to break silently.

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

- **One self-contained HTML file.** `node tools/build.mjs` writes `dist/index.html` (about 2.4 MB). Scripts, styles, icons, barcode/QR libraries and Latin fonts are all inlined. The page makes no network requests at runtime. Chinese text uses system fonts (Microsoft YaHei, PingFang SC).
- **Vite-bundled ES modules, with a React editor.** The editor's frame script is an ES module graph with entry `src/main.js`, which Vite bundles into one classic script; the same entry imports the CSS. The editor's controls are React components (`src/editor/`); the artwork and its paint loop are plain modules. `tools/build.mjs` then assembles the page. React, React DOM and React DOM's runtime dependency `scheduler` are the only npm packages that end up in the page, bundled in; the others (Vite, TypeScript, the test tools) are development-time only. All are locked in `package-lock.json`, and nothing is fetched at runtime.
- **No backend.** Settings live in the browser's `localStorage`. Uploaded images exist only for the current page session.
- **Origin.** The project started as an OpenAI Codex "visualization" widget and was later exported to run standalone. That is why the runtime still uses identifiers such as `codex-visualization`, `codex:visualization-widget-state-v2` and `widgetState`. `runtime/standalone-shell.js`, `runtime/standalone-host-bridge.js` and the frame's base stylesheet `runtime/frame.css` come from that exported widget runtime; its UI kit scripts (Floating UI tooltips, tabs, carousel, the full Lucide library) were removed in phase 4.

## Runtime layers

```
dist/index.html  (shell document, strict CSP)
├─ <script type="application/json" id="studio-startup-defaults">   published preset (data only)
├─ <iframe id="codex-visualization" sandbox="allow-scripts" data-srcdoc="…">
│    frame document (CSP, no network)
│    ├─ runtime/frame.css                     base element and form-control styles
│    ├─ widget-state JSON placeholder
│    ├─ runtime/standalone-host-bridge.js     talks to the shell over MessageChannel
│    └─ fragment = src/exploration-full-template.html
│         ├─ bundled CSS (imported by src/main.js: design languages, workspace, output, narrative, …)
│         ├─ vendor script: barcode + QR generator
│         └─ main script: Vite bundle of src/main.js → src/studio-app.js and its imports,
│                         including React and the editor components in src/editor/
├─ output host script   Vite bundle of runtime/output-host.ts → studio-output-host.ts, export-packages.ts, export-zip.ts, obs-layer-host.ts
└─ runtime/standalone-shell.js   storage, sizing, startup preset, srcdoc boot
```

- The **frame** is sandboxed with `allow-scripts` only. It cannot download files or touch storage directly, so it asks the shell over a `MessageChannel`.
- The **shell** owns `localStorage` and builds export packages (`studio-output-export` → `studio-output-result` messages). It only accepts validated data from the frame, never HTML or script. Downloads must stay tied to a user click (user activation).
- **Do not remove the sandbox or loosen either CSP** as a side effect of other work. Changing the security boundary is its own task and needs its own review.

## Build pipeline

`tools/build.mjs` does the following, in order:

1. Runs Vite (library mode, IIFE output, unminified, `target: 'esnext'`) on `src/main.js`. The result is one classic script with every imported module hoisted into a single function scope, plus one stylesheet built from the CSS that `src/main.js` imports, in import order. Nothing is lowered or minified, so the bundle runs the same code as the sources. `process.env.NODE_ENV` is defined as `production`, so React's production build is bundled.
   It runs Vite a second time, the same way, on `runtime/output-host.ts`: the shell's output host, a separate script that shares no code with the frame. The files it embeds in exports come in as build-time constants through Vite's `define` (see step 4).
2. Inserts that stylesheet into `src/exploration-full-template.html` at `/* STUDIO_STYLES */`, and `src/dual-language-markup.html` at `<!-- DUAL_LANGUAGE_MARKUP -->`.
3. Replaces the Google Fonts `@import` with `assets/fonts/fonts.css`, with every font inlined as base64, and swaps `'Noto Sans SC'` for system CJK fonts.
4. Supplies the export packager's constants, from `tools/output-host-defines.mjs` (which `vitest.config.mjs` uses too): `__STUDIO_AE_TEMPLATE__` (the AE template, with `crt-motion.js` at `/* CRT_MOTION_FUNCTION */`, its `export` keyword removed because ExtendScript is ES3), `__STUDIO_ASSET_NOTICES__`, `__STUDIO_OBS_LAYER_SERVER__` and `__STUDIO_OBS_LAYER_CONTROL__`.
5. Validates the result. A missing or unreplaced marker, duplicate element IDs, document markup inside the fragment, any remaining `<script src>` or `@import`, or an invalid `runtime/startup-defaults.json` (over 16 KiB, or missing `revision`) all fail the build.
6. Writes `dist/index.html`. It also writes `dist/character-explorations.fragment.html` and `dist/exploration-full-source.js`; `tools/check.mjs` parses those two.

Consequences:

- **Modules import what they use.** A new module needs no change to `build.mjs`; import it where it is used. New CSS is imported from `src/main.js`, whose import order is the cascade order. Modules may be `.ts`, or `.tsx` for React components; `tools/check.mjs` type-checks TypeScript (JavaScript is not type-checked yet).
- **Imported bindings are read-only.** Modules that need to replace the session's `motionClock` or restart frame timing call `setMotionClock` / `resetLastFrame` (`studio-session.js`).
- **Two bundles, plus classic scripts.** The frame script and the output host are Vite bundles. The bridge (`runtime/standalone-host-bridge.js`) and the shell (`runtime/standalone-shell.js`) are still classic scripts that `build.mjs` inserts as they are. The output host installs `globalThis.studioOutputHost`, the only name the shell uses from it.
- **`studioOBSLayerBootstrap` is copied by source text** into synchronized OBS layer pages, so it must stay self-contained (`runtime/obs-layer-host.ts`).
- **Tests:** Vitest unit tests in `tests/unit/` are found automatically; an older `tests/check-*.cjs` script runs only if it is listed in `tools/check.mjs` (see [build-and-test.md](build-and-test.md#tests)).
- **`dist/` is build output.** It is gitignored. Never edit or commit it.

## Source map (`src/`)

| File | Responsibility |
| --- | --- |
| `main.js` | Entry of the frame script: imports the CSS in cascade order, then `studio-app.js` |
| `exploration-full-template.html` | Base styles, the 13 empty `section[data-design]` views and the artwork template each one is filled from. No controls: those are React components. |
| `studio-app.js` | Starts the editor: builds the views, mounts the editor UI and the other page parts, registers the sync that `update()` runs, and drives the shared paint loop. Nothing imports it. |
| `studio-session.js` | The live session: `state`, the session-only `images`, the continuous `motionClock`, saving and restoring through the widget host, frame timing and image reading. It imports only pure modules (see [Module layers](#module-layers)). |
| `studio-views.js` | The 13 design views: built from the template, synced with the state (`syncView`), laid out (`measure`) and drawn each frame (`draw`). Text fitting, badges, codes, borders and CSS effects. |
| `designs/` | The canvas artwork, one module per design (see [Designs](#designs)) |
| `editor/` | The editor UI as React components (see [Editor workspace](#editor-workspace)) |
| `studio-workspace.css` | Styles of the three-pane editor, scoped under `.studio-editor` |
| `studio-preview.js` | Fits each design's artwork into its preview area, in the editor and in clean-output mode |
| `icons.ts` | The seven Lucide icons the studio uses, as the same `<svg>` Lucide produced |
| `design-language-styles.css` | Styles of the six language designs: fashion, avant-garde, plush, relaxed, cute and paper |
| `urban-language-styles.css` | Styles of the three urban designs, `district`, `tuner` and `arcade` |
| `dual-language-styles.css` / `dual-language-markup.html` | Styles and extra markup of the two-panel `dual` design |
| `motion-clock.ts` | Continuous ring, text and border clocks that never reset |
| `information-motion.ts` | Text entrance and subtle idle motion |
| `timeline.ts` | Narrative timing: intro / show / outro poses, looping, retiming |
| `story-intro.js` / `.css` | Two-shot poster intro (character shot → creator shot) and its deterministic overlay effects |
| `studio-narrative.js` / `.css` | Sequence changes made by the controls (retiming, switching intro styles), brand ending and shutdown artwork |
| `studio-post.js` / `.css` | Post-processing (polar, CRT, holo, bloom, anamorphic, prism, film) over one shared optical surface. Borders stay outside it. |
| `studio-text.js` / `.css` | DOM styling of the typography overrides (name font, size ratio, tracking, weight, italic, colour, intro titles) |
| `typography.ts` | Typography settings: validation and defaults, override text with letter case |
| `studio-state.ts` | Editor state types and defaults, restore and validation of saved snapshots, the saved snapshot (see [state-and-timing.md](state-and-timing.md#state)) |
| `variant-codec.ts` | `tuple-v1` compact encoding of per-design settings |
| `studio-output.js` / `.css` | Clean-output mode and the exported page's keyboard shortcuts; styles of the output dialog |
| `output-payload.ts` | What an HTML or OBS export sends to the shell: compact state, permitted images, output configuration |
| `export-layout.js` | Logical layout size and output scaling |
| `ae-canvas-recorder.js`, `ae-geometry-motion.js`, `ae-export.js` | AE export: record canvas paths, sample motion adaptively, measure layout and collect text and assets |
| `obs-layer-sync.js`, `obs-layers.css` | Three-layer OBS output: shared clock inside each layer |
| `badge-assets.json`, `badge-assets/` | Compatibility badge catalog (MMD, ARKit, VRCFT, lilToon, Poiyomi, MToon) and source notices |
| `barcode-code128.min.js`, `qrcode-generator.js` | Vendored libraries (see `THIRD-PARTY-NOTICES.md`) |

Design keys (`section[data-design]`): `couture` (the code's default), `brutalist`, `cloud`, `orbit`, `play`, `plush`, `poster`, `sticker`, `wave`, `dual`, `district`, `tuner`, `arcade`.

### Module layers

The frame script's modules import each other without cycles, in three layers:

- **`studio-session.js`** holds the state every module reads and changes. It imports only pure modules (`studio-state.ts`, `motion-clock.ts`), so any module can import it. `studio-app.js` connects the page to it with `connectStudio({ sync, notify })`: `update()` runs that `sync`, and an error message re-renders the editor through `notify`. A sync before the app has connected throws, so a startup-order mistake cannot pass silently.
- **The page parts** import the session and each other, but never the app: `studio-views.js`, `designs/`, `studio-narrative.js` (with `story-intro.js` and `studio-post.js`), `studio-text.js`, `studio-preview.js`, `studio-output.js`, `obs-layer-sync.js`, `ae-export.js` and the React components in `editor/`.
- **`studio-app.js`** imports the page parts and wires them together. `main.js` imports it, and nothing else does.

Keep it that way: a module that needs to trigger a sync calls `update()` or `syncStudio()` from the session rather than importing the app.

### Designs

`src/designs/` holds the canvas artwork, one module per design, registered in `designs/index.ts`. `designs/catalog.ts` lists the 13 designs and the family each belongs to (language, urban, dual or shared); `DesignKey`, `languageKeys` (the designs with their own palette) and the design picker's urban group are derived from it. Each design module exports a `Design` (`designs/types.ts`): its palette or CSS colours (`artColors`; `designArtColors` resolves either), caption text (`note`, `hello`), whether its copy moves below the name block (`copyBelowTitle`), and how it is painted. `paintExploration(ctx, w, h, t, key, settings)` paints one frame and depends only on its arguments; the paint loop and the AE export both call it.

- **Own painter.** The six language designs (`couture`, `brutalist`, `cloud`, `plush`, `play`, `sticker`) are built with `languageDesign` (`language.ts`), the three urban designs with `urbanDesign` (`urban.ts`). The scaffold paints the paper, background pattern, floor shadow and intro transform; the design module supplies its palette, accent and `signature` geometry, plus optional `backdrop`, `accents` or `crop` hooks. These painters cover only the `signature` geometry. Both scaffolds take the ring layout, clocks and two shape helpers from `ring-scene.ts`. `dual.ts` has its own painter for every geometry (`ownsEveryGeometry`).
- **Shared scene.** `shared-scene.ts` paints every other case: `orbit`, `poster` and `wave`, and any design with a non-signature geometry style. Its defaults are orbit's look; `poster.ts` and `wave.ts` set only `shared` (ring centre, paper, which geometry `signature` means, landscape corner cuts). `series-geometry.ts` draws the `facet`, `ribbon` and `blocks` devices for it.
- The painters keep their own small helpers (`line`, `disc`, `cast`, …), which differ slightly between scaffolds; changing one changes that family's frames. `kit.ts` holds the number and colour helpers shared by the painters and by the artwork's CSS colours in `studio-views.js`.

### Editor workspace

The controls are React components in `src/editor/`. The artwork is not: `studio-views.js` builds the 13 design views from the template, and the paint loop in `studio-app.js` draws them every frame. `studio-app.js` then calls `mountEditorUI(root, views)` (`editor/mount.tsx`), which renders `Workspace.tsx` synchronously.

- **One React root, rendered through portals.** The root itself is a detached element. The header, mobile tabs and `.studio-layout` are portalled into `#character-directions`; the layout adopts the `.studio-views` element that holds the sections. Each section gets its playback controls (portalled into its `.studio-preview`) and its own inspector (portalled into the section), so every design keeps its own open groups and scroll position. The output dialog is portalled into the root as well.
- **State bridge.** The session (`studio-session.js`) owns the mutable `state`, and everything mutates it in place. Components read it during render, change it in their event handlers and call `update()` (sync and save). Every sync calls `notifyEditor()` (`editor/store.ts`), and components re-render through `useEditorRevision()`. Hidden inspectors receive no new revision, so only the visible one re-renders.
- **Per-frame values stay imperative.** The seek bar's value, the time readout and the phase label change every frame; the paint loop writes them into elements that React renders but never updates.
- **Panels.** `ContentPanel.tsx` (left: series, character and brand, `NarrativePanel.tsx` with the sequence and post-processing, `TypographyPanel.tsx`, images, delivery formats and badges, link and codes), `Workspace.tsx` (header, toolbar, playback), `Inspector.tsx` (right: the current design's look, plus the shared border settings), `OutputDialog.tsx`. Shared pieces are in `controls.tsx`; display text derived from the state in `format.ts`.
- The desktop layout is `.studio-header` plus `.studio-layout`: a 260 px left pane, a flexible centre and a 280 px right pane. The side panes scroll independently. The root is `.studio-editor` at `100dvh`. `studio-preview.js` computes `--preview-width` to keep 16:9 or 9:16. Below 1120 px the panes become tabs; focus mode hides both side panes.
- `.studio-views` and the active `section[data-design]` use `display: contents` so their children join the outer grid; inactive designs are `hidden`. Controls with an `id` exist once: they are in the shared panes or only in the visible inspector.

### Adding a design

The urban designs (`district.ts`, `tuner.ts`, `arcade.ts`) are the most recent example:
- Add the key and its family to `designs/catalog.ts`, and its defaults (font, colour, badge, shadow, ring speed, background) to `variantDefaults` in `studio-state.ts`.
- Add a module in `src/designs/` and register it in `designs/index.ts` (see [Designs](#designs)): `languageDesign` or `urbanDesign` for a design with its own artwork, its own `paint` as in `dual.ts`, or only `shared` settings as in `poster.ts`.
- Add a `section[data-design]` to the template. The design picker lists every section, with the urban family in its own group.
- Add typography and layout rules for landscape, portrait and swapped layouts.
- Keep path topology fixed and record `studioIntroTransform`, so the AE export keeps continuous motion separate from editable transitions.
- Extend the tests: `tests/unit/designs.test.ts` checks every key has a module that matches its family; `check-urban-designs.cjs` covers topology, clocks, transparency, palettes and ratios; and `tools/check.mjs` asserts the design count.

Design-specific layout logic exists too. For example, `fitPosterCopy` in `studio-views.js` pushes the taglines below the skewed name block for designs with `copyBelowTitle`. It projects the name and its pseudo-elements through their CSS transforms in un-animated layout coordinates, adding margins for shadow and motion. AE capture goes through the same `measure` path.

`runtime/` holds the shell and frame runtime, the export packager, the ZIP writer, the AE ExtendScript template, the OBS layer server and control page, `crt-motion.js` (shared by the web page and AE), and `startup-defaults.json`.

`tools/` holds `build.mjs` and `output-host-defines.mjs`, `check.mjs`, `server.mjs` (a read-only static server for `dist/` on 127.0.0.1, port 8768 by default) and `prepare-vendor.py` (one-off vendor refresh, needs the network). Deploy scripts live in `deploy/cloudflare/`.

## Invariants

Keep these when changing or restructuring code. Most have regression tests in `tests/`; what the page looks like is checked by hand (see [build-and-test.md](build-and-test.md#manual-verification)).

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
- Each control `id` exists once on the page (the build also fails on duplicate IDs in the static fragment).

**State and security**
- The saved state is at most 16 KiB. Measure the full snapshot, including `modelContent` and `privateContent`. Never store DOM or base64 images in state.
- `tuple-v1` slots are append-only (see [state-and-timing.md](state-and-timing.md)).
- Keep the sandbox and both CSPs. Exported packages contain only trusted templates plus validated data literals.
- Badges and the urban designs are original artwork. Do not add official game logos, characters or UI assets.

## Known structural debt

What the frontend rewrite ([issue #3](https://github.com/nekokaii/character-showcase-studio/issues/3)) left as it was. None of it blocks work; fix it alongside a change that touches it.

- Several plain JavaScript modules are still written in the old dense style and are not type-checked: `ae-export.js` (lines up to about 1,400 characters), `studio-narrative.js`, `story-intro.js`, `studio-post.js`, `studio-text.js`, `export-layout.js` and `ae-canvas-recorder.js`. Convert one to TypeScript when you next need to change it substantially.
- The shared state is still one mutable object (`state` in `studio-session.js`) that every module reads and writes in place, rather than state passed in or changed through actions.
- The design CSS is not split per design: `design-language-styles.css` and `urban-language-styles.css` interleave rules for all their designs (shared portrait and swap sections, multi-design selectors), so splitting them would reorder the cascade.
- Exports are still the whole editor page in clean-output mode, React included. A separate player build (an export without the editor) is still to be decided ([issue #3](https://github.com/nekokaii/character-showcase-studio/issues/3)).
- The runtime still carries Codex widget naming. The `localStorage` key includes the page path (see [state-and-timing.md](state-and-timing.md#storage)), so **moving or renaming the served page loses every user's saved settings** unless a migration is added. The local server serves `dist/` at `/` to keep that path stable.
