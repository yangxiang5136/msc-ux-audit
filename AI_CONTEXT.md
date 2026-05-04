# MSC.AI Repo AI Context

Last updated: 2026-05-02 by Codex.

This file is the first stop for any AI tool working on this repository. It exists to prevent version drift when multiple assistants edit the same site.

## Current Baseline

- Public product/content baseline: `changelog.html` latest published entry is `v7.9.0` from 2026-04-23.
- Strategic work in progress: `chatJ v7.10` has not been built yet; it is blocked on digesting stakeholder feedback listed in `TODO.md`.
- Current code track: Node/Express on Railway, serving static HTML pages plus feedback sync and visitor logging.
- Current local review-fix patch, not necessarily deployed yet: 2026-05-02 fixes for feedback persistence, feedback read/write security, static-file exposure, decision-panel clear-all, and broken `data-changelog` attributes.

## Read Order For Every New AI Session

Trigger this flow when the user asks to understand, research, analyze, review,
or take over the project, even if they are not asking for code edits yet.

1. Run `scripts/agent-bootstrap` if available; otherwise run `git status --short --branch`.
2. Read this file.
3. Read `TODO.md` for active strategy/product work.
4. Read the newest section in `changelog.html` for the last published site version.
5. If creating or editing a page, read `docs/style-guide.md`.
6. If changing AI handoff rules, read `docs/ai-workflow.md`.
7. If validating architecture assumptions, read `docs/architecture-understanding.md` and `docs/ai-dialogue.md`.
8. If changing repo memory workflow, read `docs/project-memory-layer-localization.md`.

Do not assume memory from a prior chat is current. Trust the repo files and `git status`.

## Source Map

- `index.html`: product design center home page.
- `chatA.html` to `chatK.html`: product, commercial, strategy, and UI proposal modules.
- `decisions.html`: aggregated feedback and decision dashboard.
- `fb.js`: shared feedback UI, localStorage merge, and feedback client integration.
- `sb.js`: browser feedback client. It talks to same-origin `/api/feedback`; it should not contain Supabase secrets.
- `nav.js`: shared sidebar and section navigation behavior.
- `server.js`: Express server, feedback API proxy, static serving rules, and visitor geolocation logging.
- `TODO.md`: active work queue and strategic context.
- `changelog.html`: published site version history.
- `docs/architecture-understanding.md`: Codex's explicit model of the repo architecture, written for peer review by another AI.
- `docs/ai-dialogue.md`: async dialogue protocol and current open questions between AI tools.
- `scripts/agent-bootstrap`: read-only startup snapshot for new AI tools.

## Feedback System Rules

- Feedback blocks should use `.fb[data-id]`.
- New or materially changed feedback blocks should include `data-ver`.
- Use `data-desc` or `.fb-d` for the decision-panel description.
- `chatA` now uses `.fb ceo-section` so it participates in the same persistence flow.
- Browser feedback reads/writes go through `window.MSC_SB`, which calls `/api/feedback`.
- Server reads require `FEEDBACK_READ_TOKEN` or `FEEDBACK_WRITE_TOKEN`; writes and clear-all require `FEEDBACK_WRITE_TOKEN`.
- Supabase access requires `SUPABASE_SERVICE_ROLE_KEY`.

## Deployment Notes

- Railway runs `node server.js`.
- Required for cloud feedback sync:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FEEDBACK_WRITE_TOKEN`
- Optional:
  - `FEEDBACK_READ_TOKEN` (use this if read access should differ from write access; write token is also accepted for reads)
  - `SUPABASE_URL`
  - `DATA_DIR`
- There is no `package-lock.json` yet, so the Dockerfile still uses `npm install --omit=dev`.

## Known Gotchas

- Do not serve internal repo files publicly. `server.js` blocks root markdown files, dotfiles, `/server.js`, package files, `/docs/*`, `/ai-bridge/*`, `/scripts/*`, `/node_modules/*`, and `/data/*`.
- Root markdown handoff files such as `/AI_CONTEXT.md`, `/AGENTS.md`, and `/CLAUDE.md` are also blocked by the root `*.md` static-file rule.
- `TODO.md` is task state, not a complete implementation log.
- `changelog.html` is published product history, not every local code patch.
- If an AI makes a meaningful code or content change, update this file before handing off.
- If a change affects users, strategy, visible site content, or deployment assumptions, also update `TODO.md` or `changelog.html` as appropriate.

## Latest Handoff Notes

- The five review findings from 2026-05-02 have been addressed locally.
- Multi-AI handoff workflow added: `AI_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/ai-workflow.md`.
- Architecture peer-review packet added: `docs/architecture-understanding.md` and `docs/ai-dialogue.md`.
- Claude Code reviewed the patch through a side-channel experiment and identified public feedback reads as the top blocker; Codex added a read-side token gate to `GET /api/feedback`.
- Project Memory Layer docs added: `docs/project-memory-layer-reference.md` for other projects and `docs/project-memory-layer-localization.md` for this repo's adapted path.
- `scripts/agent-bootstrap` added as the standard read-only project understanding snapshot for new AI sessions.
- Before merging/deploying, validate in browser that:
  - chatA feedback can be saved and appears in `decisions.html`.
  - private paths such as `/TODO.md` return 404.
  - feedback read/write prompts for a token when no token is stored.
  - decision-panel clear-all clears cloud feedback only with the write token.
