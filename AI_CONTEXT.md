# MSC.AI Repo AI Context

Last updated: 2026-05-15 by Claude (Cowork).

This file is the first stop for any AI tool working on this repository. It exists to prevent version drift when multiple assistants edit the same site.

## Current Baseline

- Public product/content baseline: `changelog.html` latest published entry is `v7.9.0` from 2026-04-23.
- Strategic work in progress: `chatJ v7.10` has not been built yet; it is blocked on digesting stakeholder feedback listed in `TODO.md`.
- Current code track: Node/Express on Railway, serving static HTML pages plus feedback sync, visitor logging, **and the new `/wxapp/` mini-program redesign collaboration module**.
- Current local review-fix patch, not necessarily deployed yet: 2026-05-02 fixes for feedback persistence, feedback read/write security, static-file exposure, decision-panel clear-all, and broken `data-changelog` attributes.
- Feedback archive mechanism added: `feedback-archive/` plus `npm run archive:feedback`.
- **2026-05-15: `/wxapp/` 微信小程序改稿协作框架 added.** 4 roles (Sean / UIUX / Eng / CEO), 4 Supabase tables (proposal / revision / comment / annotation), Shadow DOM rendering, SVG annotation engine with anchored selectors, dual-device canvases (iOS 375×812 + Android 360×800). Shell deployed once, all proposals stored in Supabase → zero redeploys for content updates.

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
- `server.js`: Express server, feedback API proxy, **wxapp API proxy**, static serving rules, and visitor geolocation logging.
- `feedback-archive/`: repo-tracked permanent feedback exports; blocked from public static serving.
- `scripts/archive-feedback.mjs`: archives a decision-panel export or `/api/feedback` rows into `feedback-archive/`.
- `TODO.md`: active work queue and strategic context.
- `changelog.html`: published site version history.
- `docs/architecture-understanding.md`: Codex's explicit model of the repo architecture, written for peer review by another AI.
- `docs/ai-dialogue.md`: async dialogue protocol and current open questions between AI tools.
- `scripts/agent-bootstrap`: read-only startup snapshot for new AI tools.
- **`wxapp.html` / `wxapp-detail.html` / `wxapp-login.html`**: /wxapp/ mini-program redesign collaboration module (list / detail / login pages).
- **`wxapp.js` / `wxapp.css`**: front-end core for the wxapp module (Shadow DOM render, SVG annotation engine, 4-role auth).
- **`migrations/wxapp_001.sql`**: Supabase migration for the 4 wxapp tables. Blocked from public static serving.
- **`docs/wxapp-workflow.md`**: 4-party collaboration workflow, deployment checklist, Claude output conventions.
- **`docs/uiux-reference-will.md`**: 2026-05-15 distilled mainstream UIUX reference from Will's Notion library, with explicit "adapt / discard for MSC.AI" sections.

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
- Required for the `/wxapp/` module (4-role write access, see `docs/wxapp-workflow.md`):
  - `WXAPP_TOKEN_SEAN`
  - `WXAPP_TOKEN_UIUX`
  - `WXAPP_TOKEN_ENG`
  - `WXAPP_TOKEN_CEO`
- Optional:
  - `FEEDBACK_READ_TOKEN` (use this if read access should differ from write access; write token is also accepted for reads)
  - `SUPABASE_URL`
  - `DATA_DIR`
- `package-lock.json` exists. Docker still uses `npm install --omit=dev`; switching to `npm ci --omit=dev` remains an optional cleanup.
- **wxapp content updates do not trigger Railway redeploys**: shell HTML/JS/CSS deploys once, then all proposals/annotations/comments live in Supabase.

## Known Gotchas

- Do not serve internal repo files publicly. `server.js` blocks root markdown files, dotfiles, `/server.js`, package files, `/docs/*`, `/feedback-archive/*`, `/ai-bridge/*`, `/scripts/*`, `/node_modules/*`, and `/data/*`.
- Root markdown handoff files such as `/AI_CONTEXT.md`, `/AGENTS.md`, and `/CLAUDE.md` are also blocked by the root `*.md` static-file rule.
- `TODO.md` is task state, not a complete implementation log.
- `changelog.html` is published product history, not every local code patch.
- If an AI makes a meaningful code or content change, update this file before handing off.
- If a change affects users, strategy, visible site content, or deployment assumptions, also update `TODO.md` or `changelog.html` as appropriate.

## /wxapp/ Module Rules (added 2026-05-15, auth hardened later same day)

- **Auth model = HTTP-only cookie session + 404-on-miss page guard.**
- `/wxapp.html` and `/wxapp-detail.html` return **404 (not 401)** when no valid `wxapp_session` cookie → sandbox is invisible to outsiders.
- `/wxapp-login.html`, `/wxapp.js`, `/wxapp.css` stay public (login flow needs them).
- API endpoints accept token from `wxapp_session` cookie (browser auto-sends) **OR** `x-wxapp-token` header (curl/CI fallback).
- Login: `POST /api/wxapp/login {token}` → server sets HTTP-only Secure SameSite=Lax cookie, 30-day max-age.
- Logout: `POST /api/wxapp/logout` → clears cookie.
- Front-end stores **role only** in `localStorage["wxapp_role"]` (for UI display + fast routing decisions); token never persists client-side after login.
- Server resolves cookie → role → injects as `author_role` into all writes.
- Proposals are stored in Supabase; HTML/CSS strings are rendered inside Shadow DOM (`wpRender.mountProposal`). Never use iframes for wxapp content — drawing annotations must anchor to DOM selectors which iframes block.
- All annotation SVG paths use viewBox `0 0 100 100` (percentage coords) so they survive device/zoom changes.
- For all wxapp proposal HTML output by any AI:
  - All class names MUST be `.wp-` prefixed
  - NO `<script>` tags (CSS-only interactions)
  - Images must be `https://` URLs or `data:` base64
  - Soft limit: 8KB HTML + 4KB CSS per proposal; overflow → split into flow_group siblings

## Latest Handoff Notes

- The five review findings from 2026-05-02 have been addressed locally.
- Multi-AI handoff workflow added: `AI_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/ai-workflow.md`.
- Architecture peer-review packet added: `docs/architecture-understanding.md` and `docs/ai-dialogue.md`.
- Claude Code reviewed the patch through a side-channel experiment and identified public feedback reads as the top blocker; Codex added a read-side token gate to `GET /api/feedback`.
- Project Memory Layer docs added: `docs/project-memory-layer-reference.md` for other projects and `docs/project-memory-layer-localization.md` for this repo's adapted path.
- `scripts/agent-bootstrap` added as the standard read-only project understanding snapshot for new AI sessions.
- 2026-05-04: Feedback archive mechanism added and smoke-tested with a temp export. Real first archive still needs a browser export file or `FEEDBACK_READ_TOKEN`.
- 2026-05-15: `/wxapp/` mini-program redesign collaboration framework added. 4 role tokens, 4 Supabase tables, Shadow DOM rendering, SVG annotation engine. Deploy checklist:
  1. Run `migrations/wxapp_001.sql` in Supabase SQL Editor
  2. Add `WXAPP_TOKEN_SEAN/UIUX/ENG/CEO` to Railway env vars (generate with `openssl rand -base64 24`)
  3. `git push` → Railway auto-deploys once → from then on `/wxapp/` content updates require no redeploys
  4. Distribute role tokens to Sean / Wang / engineer / 辛总
- Before merging/deploying, validate in browser that:
  - chatA feedback can be saved and appears in `decisions.html`.
  - private paths such as `/TODO.md` return 404.
  - feedback read/write prompts for a token when no token is stored.
  - decision-panel clear-all clears cloud feedback only with the write token.
- To archive feedback, use `npm run archive:feedback -- --input <export.json> --date YYYY-MM-DD` or run it against `/api/feedback` with `FEEDBACK_READ_TOKEN`.
