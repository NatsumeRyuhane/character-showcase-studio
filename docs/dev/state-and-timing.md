# State and timing

How settings are stored, encoded and restored, and how the timeline and motion clocks work. Covers the code as of 0.11.0. Paths are relative to `frontend/`.

## State

The editor state is one JSON snapshot: `privateContent` with `design: "character-explorations"` and `version: 6`. New fields are optional additions to version 6. Older snapshots, including the early exploration and old Studio formats, still restore.

`src/studio-state.ts` holds the state's types and defaults and its pure functions: `createStudioState` (a new project), `restoreStudioState(state, saved)` (validates a saved snapshot and applies it in place; `false` and no change for a missing or foreign one), `studioSnapshot` and `studioModelContent` (what is saved), and `stateSignature`. The editor module (`exploration-full-logic.js`) owns the one live `state` and the glue: when to save, recognising its own echoes, and rebuilding the motion clock after a restore. Typography settings are validated by `src/typography.ts`.

### Scopes

| Scope | Data |
| --- | --- |
| Global (shared by every design) | `activeDesign`, character name, current series, brand, credit, delivery formats, badge list, QR link, aspect ratio, border and scroll settings, side swap, playback and text-info switches |
| Per series | `seriesData.atelier / fur / mini`: series name, number prefix, work number, Chinese and English tagline |
| Per design | `variants[design]`: palette, fonts, background, geometry size and speed, badge look, text motion, filters, shadows. `dual` also stores the split ratio and guides. |
| Per design × series | `variants[design].geometryBySeries[series]`: only the selected geometry differs by series |

`activeDesign` defaults to `couture`, and only registered design keys are accepted on restore. The published startup preset overrides this default (see [Startup preset](#startup-preset)).

Other notable fields:
- `state.introDuration`: 0–30 s for the `model` and `title` intros (old default 4.5 s). In `story` mode it is always **derived** from the shot settings, so an old saved value cannot override it.
- `state.output`: `resolution / transparent / includeCharacters / start / fit / fps / aeIntro`.
- `state.narrative`: intro style, name reveal, show duration and playback, outro, shutdown, story shots and post-processing (see below).

### Size limit and `tuple-v1`

The shell rejects snapshots over **16 KiB**. To fit 13 designs, per-design settings are saved in a compact form:

```js
snapshot.variantEncoding = 'tuple-v1';
snapshot.variants = encodeStudioVariants(state.variants);
// On restore, expand over fresh defaults before the usual field validation:
expanded = decodeStudioVariants(source.variants, createDefaultVariants());
```

- In memory, `state.variants` is always the readable object form. Encoding only happens on save.
- Each design is a fixed-order array of **51 slots**: 27 main fields, 16 `effects`, 5 `shadows` and 3 `geometryBySeries`. Missing optional values are written as `null`.
- **Slots are append-only.** Changing the meaning or order of an existing slot needs a new encoding marker. Never derive the slot order from object key order.
- Decoding starts from a fresh copy of the default variants (`createDefaultVariants`) and then applies known non-null scalars. Settings that another snapshot omits do not inherit the current session's edits. Unknown designs, future slots and non-scalar slots are ignored, and the expanded values still go through the usual enum, colour and range validation.
- Untagged v6 and older snapshots restore through the old object path and keep its merge behaviour.
- `ownSnapshots` stores signatures of the encoded snapshots actually sent. `stateSignature` sorts object keys recursively, so when the host echoes the state back with reordered keys, it does not trigger a restore or reset the motion clocks.

Measured sizes at 0.9.0: default snapshot 10,493 bytes; every text field at its maximum, 12,005 bytes.

**When you add a field:** update the codec if it is per-design, and add or extend tests for old-object migration, default restoration from encoded snapshots, and maximum-length capacity (`tests/unit/variant-codec.test.ts`, `tests/unit/studio-state.test.ts`).

### Storage

`runtime/standalone-shell.js` owns persistence:

- Key: `codex:visualization-widget-state-v2:` + `JSON.stringify([location.pathname, location.search])`. **The key depends on the page URL.** `http://127.0.0.1:8768/` (the local server, which serves `dist/` at `/`), `https://nekokaii.com/showcase-generator`, and a file opened from disk (`file:///…/frontend/dist/index.html`) each keep separate settings. Moving the page to a new path starts from empty settings. Settings saved by opening the old root `index.html` from disk, before the move into `frontend/`, are not carried over.
- The frame sends state over the bridge, and the shell validates and stores it.
- **Images are never stored.** `images.model`, `portrait`, `introCharacter`, `introAuthor`, the logo, the QR image and the barcode image are read with `FileReader` and kept only for the current session. A real product needs asset IDs, file references and project packaging; that is the first backend need.

### Startup preset

`runtime/startup-defaults.json` is the published starting state. The build embeds it as data only, never as markup or script. It is `{ revision, widgetState }`, and the build rejects it if `widgetState` is over 16 KiB or `revision` is missing.

When a browser sees a new `revision` it applies the preset once, backs up the previous state under `<key>:before-startup-preset`, and records the revision under `<key>:startup-revision`. Later edits persist normally. Code changes that keep the same `revision` never overwrite a user's saved settings.

To publish a new preset, take the plain configuration JSON from an HTML export of the local editor, replace `widgetState`, and change `revision`. The current preset is `kgg-defaults-2026-10-20-v2` (Kgg / Studio-K, `district`, top and bottom borders, dark crimson, intro post-processing).

## Timing

There are two independent families of time. Keep them separate.

### 1. Narrative time (`src/timeline.ts`)

Narrative time is seekable, pausable and replayable. Every pose is a pure function of `(time, intro, narrative)`:

| Function | Purpose |
| --- | --- |
| `studioNarrativeSettings(raw)` | Validate and clamp settings, with defaults |
| `studioNarrativePose(time, intro, n)` | Opacity and motion values: `model`, `titleMove`, `titleAlpha`, `info`, `outro`, `brand`, `mark`, `geometry`, shutdown, … |
| `studioPhase(time, intro, n)` | `intro` / `show` / `outro` |
| `studioTotalDuration(intro, n)` | `intro + studioShowDuration(n) + enabled outro` |
| `studioAdvanceTime(t, dt, intro, n)` | Advances playback: continuous show, repeating show, automatic outro, manual outro |
| `studioRetime*` | Keeps relative progress inside the current phase when durations change |
| `studioStoryDuration(n)` / `studioStoryPose(time, intro, n)` | The two-shot poster intro |
| `studioCRTPose(progress)` | CRT power-off envelope (from `runtime/crt-motion.js`) |

Intro styles (`narrative.introStyle`):
- `story` (the default for new projects, set by the editor defaults; `studioNarrativeSettings` itself falls back to `model` for unknown values): a two-shot poster intro, character shot then creator shot, then the show.
- `model`: the model and rings are visible from the start. The name fades in during the show, or late in the intro (`nameReveal: 'delayed'`, `nameDelay`).
- `title`: the original big-title intro that shrinks into the info area.

Show playback without an outro (`showPlayback`):
- `continuous` (default): the intro and info entrance play once, then the show holds. Narrative progress clamps at the end of the show, while the continuous clocks keep running. The time readout shows `∞`. Pause and resume never replay the intro.
- `repeat`: loops the show segment every `showDuration` seconds.

Show and outro:
- `showDuration` is 1–60 s (old default 12).
- Outro: `outroEnabled`, `outroDuration` 1.5–12 s, `outroStyle` (`signature / orbit / quiet`), `outroContent` (`auto / word / logo`; `auto` falls back to the wordmark when there is no logo), `outroTrigger` (`auto` after the show, or `manual` via button or the E key).
- CRT shutdown: `shutdownEnabled` (default on) and `shutdownDuration` 0.3–1.5 s, capped at 45% of the outro and contained in it. Black mattes close only the stage. Borders stay on top.

Story intro fields, stored in `narrative`:

| Field | Meaning, default |
| --- | --- |
| `characterShotEnabled / authorShotEnabled` | Shot on/off, both on |
| `characterShotDuration / authorShotDuration` | 0.5–12 s, 2.5 / 2 |
| `storyTransitionDuration` | 0.15–3 s, 0.6 |
| `characterCorner / authorCorner` | Diagonal copy placement, `tl-br / tr-bl` |
| `characterEffect / authorEffect` | `none / crt / holo / polar` (legacy per-shot effects, still restored) |
| `characterEffectStrength / …Speed`, `authorEffect…` | 0.3 / 0.7 |
| `storyPackagingOnly / storyFlash` | Hide shot images / optional cut flash, both off |
| `characterScale / authorScale` | 1.15 / 1.25 |
| `characterX / characterY / authorX / authorY` | Image position %, 55 / 50 / 45 / 50 |

A disabled shot takes no time, and with both disabled the page goes straight to the show. During the two shots the main info, model layer and rings are hidden; the whole poster layer uses `display:none` when inactive, so child `visibility` cannot override it. Shot images fall back: character shot → main image → secondary image; creator shot → secondary image → main image; with no image, only the text packaging shows. `studioPaintStoryEffect(ctx, w, h, {effect, time, strength, speed, accent, dark})` is deterministic for the same input.

### 2. Continuous motion clocks (`src/motion-clock.ts`)

The ring, text and border clocks, and the background `t` / `gridMoving` clock, **only ever advance**. They never reset on replay, loop, phase change or speed change. Rings move from the first intro frame (`ringTime`). Speed changes must not cause phase jumps.

### Post-processing (`src/studio-post.js`)

One optical surface for every scene. `postEffect` is one of `none / polar / crt / holo / bloom / anamorphic / prism / film`; an old snapshot without it falls back to its legacy `characterEffect`. Settings: strength, glow, speed, fade, plus per-phase switches `postCharacter / postAuthor` (default on) and `postShow / postOutro` (default off). `studioPostSceneWeight(time, intro, n)` blends between phases using absolute time, so an effect does not restart between adjacent enabled phases.

Layering:
- The intro shots' images and captions sit **below** post-processing.
- In the show, the character and close-up images sit **above** it, while backgrounds and text are processed.
- Borders are always outside it.
