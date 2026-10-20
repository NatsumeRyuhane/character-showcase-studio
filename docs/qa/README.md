# QA records

Records of past manual and native-app verification runs (browser, After Effects, OBS). Older records are kept as written, in Chinese, for history. They are not instructions, and nothing here is run by the build.

Paths these records mention, such as `outputs/…`, `work/…` and `archives/…`, point to folders on the original author's machine. They were never part of this repository. Treat any numbers quoted (sample counts, pixel errors, byte sizes) as true for the version tested, not for the current code.

| File | Version | Scope |
| --- | --- | --- |
| [`handoff-log.md`](handoff-log.md) | up to 0.8.8 | Rolling log, newest first: urban designs (0.8.8), CRT shutdown and AE transitions (0.8.7), continuous show (0.8.6), poster title clearance (0.8.5), standalone output, three-pane workspace, earlier layout fixes |
| [`2026-10-19-export.md`](2026-10-19-export.md) | before 0.8.0 | First OBS / AE export acceptance |
| [`0.8.0-narrative.md`](0.8.0-narrative.md) | 0.8.0 | Intro and brand outro |
| [`0.8.1-resolution.md`](0.8.1-resolution.md) | 0.8.1 | 1080p / 4K layout invariance |
| [`0.8.2-borders.md`](0.8.2-borders.md) | 0.8.2 | Persistent borders, separate AE border layers |
| [`0.8.3-sequence.md`](0.8.3-sequence.md) | 0.8.3 | Show duration, CRT power-off |
| [`0.8.4-ring-motion.md`](0.8.4-ring-motion.md) | 0.8.4 | AE ring path interpolation fix |
| [`0.9.0-story-intro.md`](0.9.0-story-intro.md) | 0.9.0 | Two-shot poster intro |
| [`0.11.0-rewrite-phase-1.md`](0.11.0-rewrite-phase-1.md) | after 0.11.0 | Frontend rewrite phase 1 (ES modules + Vite) compared with `frontend-legacy/`: free names, check output, page bytes, 78 seeked browser frames |

New records go in this folder in English, named `<version>-<topic>.md`, and get a row in this table.
