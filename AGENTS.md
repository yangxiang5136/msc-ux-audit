# Agent Instructions

When the user asks to "understand", "research", "analyze", "review", "接手", "研究", "理解", or "先看一下" this project, run `scripts/agent-bootstrap` if available before answering. Then read `AI_CONTEXT.md` and the files it points to.

Before editing this repository, also run `scripts/agent-bootstrap` if available, then read `AI_CONTEXT.md`.

Then follow `docs/ai-workflow.md` for handoff and version-sync rules. Keep `AI_CONTEXT.md`, `TODO.md`, and `changelog.html` aligned with the type of change you make:

- `AI_CONTEXT.md`: current repo state and next-agent handoff.
- `TODO.md`: active work queue and strategic priorities.
- `changelog.html`: published, user-visible site version history.

Always check `git status --short --branch` before editing, because this repo may contain changes from another AI tool. `scripts/agent-bootstrap` includes this snapshot, but run it manually if you do not use the script.
