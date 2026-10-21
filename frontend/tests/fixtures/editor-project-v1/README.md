# Version 1 editor projects

Hand-written projects in the reference editor's format (see [editor-project-v1.md](../../../../docs/dev/editor-project-v1.md)), for the `version: 1` → `version: 2` conversion tests. Each one passes the reference's `validateProject` at commit `fc95cc1`.

They are format samples, not openable projects: the assets they name do not exist on disk, and their asset records keep only the fields the format describes, not the service's preview paths. UUIDs follow the pattern `00000000-0000-4000-8000-<n>` so they are easy to tell apart.

| File | Covers | Expected on conversion (30 fps unless noted) |
| --- | --- | --- |
| `minimal.json` | No assets or clips; a new project's defaults | Converts with an empty report |
| `basic.json` | One asset of each kind (video, transparent MOV at 29.97 fps, image, audio); every current visual layer and both audio tracks; transforms, crop, fades, transitions, chroma key, per-clip and global grade, audio fades and volume | The two `under-border` clips that touch at 2.0166 s still touch, at frame 60 |
| `legacy-0.12.json` | 24 fps; no `durationMode`, no `designSync`, no audio fades, no `flipY`; the legacy layers `under-post`, `under-intro-text`, `under-show-text` | Layers become `above-text` and `under-text`; audio fades take the picture fades; `flipY` becomes `false`; `durationMode` is resolved from the showcase duration given as context. All of it is listed in the report. |
| `custom-tracks.json` | Extra tracks on two layers, clips on them, overlapping clips on one default track, `designSync: true` | Track ids, names, order and clip order are unchanged |
| `keyframes.json` | Keyframes on all five properties, every easing, negative and zero scale, `flipY`; `x` and `y` keyframes at 1.0 s and 1.01 s | The 1.0 s and 1.01 s keyframes both land on frame 30; the 1.01 s one is kept and the merge is reported |
| `sub-frame.json` | Custom duration off the frame grid; a clip that rounds to zero frames, one that rounds up to one frame, one exactly one frame long; a fade longer than its clip and one shorter than a frame | The zero-frame clip is removed and reported; the next two are one frame long; the fades become 18 and 1 frames on a 15-frame clip |
| `template.json` | 1080×1920 at 60 fps, ProRes on the CPU, `transparent: true`, a clip below the text, and a `template` with an embedded image, an empty image slot and a file name | The template passes through unchanged |

Add real projects from the owner here as they arrive (requested in [#11](https://github.com/nekokaii/character-showcase-studio/issues/11)), after removing anything private, and note in the table what each one covers.
