# AI Collaboration Workflow

This workflow keeps multiple AI tools aligned when improving the MSC.AI site.

## 1. Start Every Session With A Snapshot

Use this snapshot for any project-understanding request, such as "help me first
understand this project", not only for code-editing tasks.

Run:

```bash
scripts/agent-bootstrap
git status --short --branch
git log -1 --oneline
```

Then read:

1. `AI_CONTEXT.md`
2. `TODO.md`
3. the newest version block in `changelog.html`
4. `docs/style-guide.md` if changing page structure or visual patterns
5. `docs/architecture-understanding.md` if validating architecture assumptions
6. `docs/ai-dialogue.md` if responding to another AI's review
7. `docs/project-memory-layer-localization.md` if changing repo memory workflow

Before making changes, state which baseline you are working from and which files you expect to touch.

## 2. Choose The Right Tracking File

Use `AI_CONTEXT.md` for handoff:

- What changed in code or behavior
- New environment variables
- Validation status
- What the next AI must know before editing

Use `TODO.md` for project work:

- Current priorities
- Blockers
- Strategic decisions still pending
- Follow-up tasks that are not yet implemented

Use `changelog.html` for published site history:

- New pages or sections
- User-visible UI/UX changes
- Strategy/content version bumps
- Major fixes worth showing to stakeholders

Do not put every tiny code patch in `changelog.html`. Do put any change there that affects what stakeholders see or how they should interpret the current version.

## 3. Version Naming

Use two different concepts:

- Product/content version: the visible site version in `changelog.html`, such as `v7.9.0`.
- Handoff state: the repo coordination state in `AI_CONTEXT.md`, dated by calendar day.

Do not bump the product/content version just because of an internal implementation fix. Use `AI_CONTEXT.md` for that unless the fix changes stakeholder-facing behavior.

## 4. End Every Session With A Handoff

Before ending a meaningful coding or content session:

1. Run relevant checks.
2. Update `AI_CONTEXT.md` with the latest handoff notes.
3. Update `TODO.md` if priorities, blockers, or task status changed.
4. Update `changelog.html` if the visible product/content version changed.
5. Summarize:
   - files changed
   - checks run
   - what still needs validation
   - whether changes are committed, staged, or local-only

## 5. Merge / Archive Decision

Recommended flow:

1. Work on a branch such as `codex/<short-task-name>`.
2. Push the branch and open a PR.
3. Validate the site.
4. If accepted, merge the PR.
5. If rejected, close the PR/delete the branch. Archiving an AI conversation does not revert files by itself.

## 6. High-Risk Areas

- Feedback sync: `fb.js`, `sb.js`, `server.js`, `decisions.html`
- Shared navigation: `nav.js`
- Page feedback IDs and `data-ver` attributes
- Static file exposure in `server.js`
- Any strategy rewrite in `chatJ.html` or `chatK.html`

When touching these areas, leave a clear handoff note in `AI_CONTEXT.md`.

## 7. AI-To-AI Review Loop

Use `docs/ai-dialogue.md` for cross-AI discussion.

Recommended loop:

1. Codex or Claude writes a claim/question packet in `docs/ai-dialogue.md`.
2. The user shares that packet with the other AI.
3. The other AI responds using the response template.
4. The first AI updates `docs/architecture-understanding.md`, `AI_CONTEXT.md`, or code based on the response.
5. Once settled, move the exchange from "Open Dialogue" to "Resolved Dialogue".

Operational agent-to-agent routing, such as Telegram-mediated Codex/Claude
dialogue, should remain a side-channel experiment and not become a required
step in this site workflow unless the user explicitly promotes it later.
