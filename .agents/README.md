# Agent files

The shared home for agent tooling in this repository, whichever AI tool you use. The main instructions are in [`../AGENTS.md`](../AGENTS.md).

- `skills/<name>/SKILL.md`: reusable task workflows (none yet).
- Shared, committed tool configuration goes here too, e.g. `settings.json` for Claude Code.
- Personal, machine-local settings (`settings.local.json`) are gitignored. Do not commit them.

`.claude` is a symlink to this folder, for tools that look there. Edit files here only.
