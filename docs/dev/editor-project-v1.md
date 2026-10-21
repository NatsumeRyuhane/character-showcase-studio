# Editor project format, version 1

The video editor of the reference branch (`feature/video-editor-0.16.1`, pinned at `fc95cc1`, see [video-editor-port.md](video-editor-port.md)) saves its projects in this format. The ported editor never writes it. It only reads it, to convert old projects to `version: 2`, so this page describes exactly what the reference accepts and what each field means.

The source of truth is `validateProject` and `validateOutput` in the reference's `tools/editor-media.mjs`, and the defaults in `src/studio-editor.js` (`project = {version: 1, …}`, `studioNewClip`). A project is valid when `validateProject` returns without throwing. The fixtures in [`frontend/tests/fixtures/editor-project-v1/`](../../frontend/tests/fixtures/editor-project-v1/README.md) all pass it.

## Where projects come from

- **Auto-save:** `.studio-media/project.json` next to the reference checkout, written on every change. Assets live in `.studio-media/assets/<id>/` (`original`, proxies and `asset.json`), exports in `.studio-media/exports/`.
- **Download:** "保存剪辑工程" downloads the same JSON, plus `template`.

Neither embeds video or audio; only template images are embedded.

## Time

All times are **seconds at 1× speed**, as floating-point numbers.

- `clip.start` is a position on the editing timeline.
- `clip.in` and `clip.out` are positions in the **source** media. A clip plays the source from `in` to `out`, so its length on the timeline is `out - in`, starting at `start`.
- Keyframe `time` is in **source** seconds as well, so splitting or trimming a clip keeps its motion where it was.
- `output.duration` is the length of the film.

## Top level

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | `1` | Required. |
| `assets` | array, ≤ 300 | Asset records, see [Assets](#assets). |
| `clips` | array, ≤ 300 | Clips, see [Clips](#clips). |
| `grade` | [grade](#grade) | Global grade, applied over the whole composite, borders included. |
| `output` | [output](#output) | Export settings. |
| `designSync` | boolean, optional | "展示页同步素材": show the footage in the showcase workspace too. Preview only. Default `false`. |
| `transparent` | boolean, optional | Export with a transparent background. Not checked by `validateProject`; read as `!!project.transparent`. |
| `videoTracks` | array, ≤ 64, optional | Extra video tracks, see [Extra tracks](#extra-tracks). Absent in projects from before 0.16.0. |
| `template` | object, optional | The showcase template, see [Template](#template). Absent in projects from before 0.16.1 and in timeline-only saves. |

## Output

| Field | Rule | Meaning |
| --- | --- | --- |
| `width`, `height` | integers, 64–7680; even unless `codec` is `prores` | Output size in pixels. |
| `fps` | integer, 1–60 | Output frame rate. |
| `duration` | 0.1–3600 | Film length in seconds. |
| `durationMode` | `'auto'`, `'custom'` or absent | `auto` follows the showcase's intro + show + outro. **Absent** (projects from before 0.13.0) means: `auto` if `duration` is within 0.11 s of the showcase's total, otherwise `custom`. |
| `bitrate` | 0.1–250 | Target average bitrate, Mbps. Ignored by ProRes. |
| `codec` | `h264`, `h265`, `av1`, `vp9`, `prores` | Encoder. |
| `acceleration` | `auto`, `cpu`, `nvenc`, `qsv`, `amf`; absent means `auto` | Encoding device. `vp9` and `prores` allow only `auto` or `cpu`. |

New projects start as 1920×1080 (1080×1920 in portrait), 30 fps, `durationMode: 'auto'`, 20 Mbps, `h264`, `auto`.

## Assets

An asset in `project.assets` is a copy of the service's record for that asset (`asset.json`) at the time it was imported or refreshed. `validateProject` checks only that `id` is a UUID (`/^[a-f0-9-]{36}$/`) and unique. The service's own `asset.json` is the authority when exporting.

| Field | Meaning |
| --- | --- |
| `id` | UUID. Also the folder name under `.studio-media/assets/`. |
| `name` | Original file name, at most 240 characters. |
| `kind` | `'audio'` for audio. **Absent for video and images.** |
| `image` | `true` for PNG, JPEG, WebP or BMP (by file name). |
| `duration` | Seconds. Images are given 5. |
| `width`, `height`, `fps` | Video and images only. `fps` comes from `avg_frame_rate` (or `r_frame_rate`), defaulting to 30. |
| `codec`, `pixelFormat` | From FFprobe. Audio has `codec` only. |
| `alpha` | Transparent: the pixel format has alpha, or the stream has `alpha_mode` = 1. |
| `audio` | The file has an audio stream. |
| `channels`, `sampleRate` | Audio only. |
| `status` | `'ready'` once probed and previewed. |
| `preview`, `previewRevision`, `previewStatus`, `previewMode`, `proxy` | Service paths and state of the preview files. Not meaningful outside the machine that made them. |

## Clips

| Field | Rule | Meaning |
| --- | --- | --- |
| `id` | UUID, unique | |
| `assetId` | an `assets[].id` | |
| `layer` | see [Layers](#layers) | Which band the clip sits in. Audio assets must be on `audio-1` / `audio-2`, everything else on a visual layer. |
| `trackId` | optional, a `videoTracks[].id` of the same (canonical) layer | An extra track; absent means the layer's default track. |
| `start` | 0–3600 | Timeline position, seconds. |
| `in`, `out` | `in` 0–86400, `out` 0.001–86400, `out > in` | Source range, seconds. |
| `x`, `y` | −100–200 | Centre of the clip, percent of the canvas. Default 50, 50. |
| `scale` | −800–800 | Percent of the "fit" size: the source scaled to fit inside the canvas, keeping its aspect ratio. Negative mirrors horizontally; the height uses the absolute value. Default 100. |
| `flipY` | optional boolean | Mirror vertically. Absent means `false` (projects from before 0.15.2). |
| `rotate` | −360–360 | Degrees. |
| `opacity` | 0–100 | Percent. |
| `cropLeft`, `cropRight`, `cropTop`, `cropBottom` | 0–49 | Percent of the clip's own size, cut from each side. |
| `fadeIn`, `fadeOut` | 0–3600 | Picture fade, seconds. |
| `transition` | `fade`, `slide`, `zoom` | How the fades look. |
| `volume` | 0–2 | Audio gain (1 = 100 %). |
| `audioFadeIn`, `audioFadeOut` | optional, 0–3600 | Audio fades, seconds. **Absent** (projects from before 0.13.0) means the picture fade (`fadeIn` / `fadeOut`) applies to the sound too. |
| `keyframes` | optional, see [Keyframes](#keyframes) | |
| `grade` | [grade](#grade) | Per-clip grade. |
| `key` | see below | Chroma key. |

`key` is `{ enabled, color, tolerance, softness, spill }`: `color` is `#rrggbb`; `tolerance` 0–1; `softness` 0.001–1; `spill` 0–1. `enabled` is not checked by `validateProject`. New clips start with `{ enabled: false, color: '#00ff00', tolerance: 0.15, softness: 0.12, spill: 0.5 }`.

Within one track, a later clip in `clips` draws above an earlier one.

### Layers

| `layer` | Band (top to bottom) | Notes |
| --- | --- | --- |
| `above-border` | Above the border | |
| `under-border` | Above post-processing, unaffected by it | The default for new visual clips. |
| `above-text` | Above the text, affected by post-processing | |
| `under-text` | Below the text, affected by post-processing | |
| `audio-1`, `audio-2` | Audio tracks | |
| `under-post` | *Legacy*, read as `above-text` | From before 0.15.0. |
| `under-intro-text`, `under-show-text` | *Legacy*, both read as `under-text` | From 0.12.4–0.12.5. In those versions they were also hidden outside their scene; since 0.12.6 they play for the clip's whole length. |

The reference never rewrites legacy names in saved projects; it maps them when reading (`studioEditorLayer`).

### Extra tracks

`videoTracks[]` entries are `{ id, layer, name }`: `id` a unique UUID, `layer` one of the four visual layers (canonical names only), `name` 1–60 characters, not blank. On the timeline, extra tracks of a layer sit above that layer's default track, in array order from the top.

### Keyframes

`keyframes` maps a property (`x`, `y`, `scale`, `rotate`, `opacity`) to at most 500 keyframes `{ time, value, easing }`:

- `time` in source seconds, 0–86400, **strictly increasing** within a property.
- `value` within that property's clip range.
- `easing` is `linear` (also when absent), `smooth` (smoothstep) or `hold`. It applies from that keyframe to the next.

Before the first keyframe the value is the first keyframe's; after the last, the last one's. A property with keyframes ignores the clip's plain value.

### Grade

`{ exposure, contrast, saturation, hue }`: exposure −3–3 stops (applied as brightness `2^exposure`), contrast 0–3, saturation 0–3, hue −180–180 degrees. Neutral is `{ 0, 1, 1, 0 }`.

## Template

`template` is `{ version: 1, design, images?, imageNames? }`:

- `design` is a full showcase state snapshot, the same object the showcase saves (`design: 'character-explorations'`, `version: 6`), with `playing: false` and `time` set to the editor's playhead. `main` reads the same version 6, but the reference snapshot can hold values `main` does not accept: `postDispersion`, and intro shots longer than `main`'s limits (see [video-editor-port.md](video-editor-port.md#showcase-changes-outside-the-port)). `main`'s restore clamps or drops them.
- `images` maps an image slot (`qr`, `barcode`, `logo`, `model`, `portrait`, `introCharacter`, `introAuthor`) to a `data:image/png|jpeg|webp;base64,…` URL of at most 16 MiB, or `''`.
- `imageNames` maps the same slots to file names of at most 512 characters.

Opening a project without `template` keeps the current showcase.

## Converting to version 2

The ported editor converts a version 1 project when it opens one (a file, or the auto-saved `project.json`). The conversion is a pure function, `migrateV1(project, context) → { project, report }`. It needs the showcase's total duration as context, to resolve a missing `durationMode`. The user sees a warning built from `report` first and confirms; cancelling leaves the current project as it was. The original `project.json` is kept as `project.v1.json`.

The project frame rate is `output.fps`, as `{ num: fps, den: 1 }`. Then:

1. **Endpoints, not lengths, are rounded.** `start`, `in` and `out` each become the nearest frame: `round(seconds × fps)`, with `in` and `out` measured in project frames of source time. The length is computed from the rounded endpoints, so clips that touched still touch.
2. **Fades and keyframe times** round to the nearest frame the same way. If two keyframes of one property land on the same frame, the later one (by original time) is kept.
3. **A clip shorter than one frame** after rounding is removed.
4. **Legacy fields are made explicit:** legacy layer names become canonical, a missing `durationMode` is resolved, missing audio fades get the picture fades' values, a missing `flipY` becomes `false`.
5. **`output.duration`** rounds to the nearest frame, at least one frame.

`report` lists every change: moved cut points with the largest shift, merged keyframes, removed clips, and resolved legacy fields. The details of the version 2 format are defined in phase 1.
