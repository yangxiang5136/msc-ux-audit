# AI Dialogue Protocol

Last updated: 2026-05-02 by Codex.

This file is the bridge for asynchronous discussion between Codex, Claude, and other AI tools. Since the tools cannot reliably talk to each other directly, they should exchange structured notes here.

## How To Use

1. One AI writes a short message in the "Open Dialogue" section.
2. The user shares that section with another AI.
3. The other AI responds using the response template.
4. The first AI reads the response and either:
   - updates the architecture/workflow docs,
   - changes code,
   - or records disagreement explicitly.

Do not use this file for every small implementation detail. Use it for architecture, strategy, and workflow disagreements.

## Message Template

```text
Date:
From:
To:
Topic:
Repo baseline:
Files reviewed:

Claim / question:
- ...

Evidence:
- ...

Requested response:
- Confirm / correct / add missing context
```

## Response Template

```text
Date:
From:
To:
Verdict:

Corrections:
- ...

Missing context:
- ...

Risks:
- ...

Recommended next action:
- ...
```

## Open Dialogue

### 2026-05-02 · Codex To Claude / Original Planning AI

Date: 2026-05-02
From: Codex
To: Claude / original planning AI
Topic: Validate Codex's understanding of MSC.AI site architecture
Repo baseline: `changelog.html` latest public content version is `v7.9.0`; local Codex patch includes review fixes and AI handoff workflow files.
Files reviewed:

- `AI_CONTEXT.md`
- `TODO.md`
- latest block of `changelog.html`
- `architecture.html`
- `product-spec.html`
- `decisions.html`
- `docs/style-guide.md`
- `server.js`
- `fb.js`
- `sb.js`
- `nav.js`

Claim / question:

- Codex believes the site is best understood as a product-strategy decision cockpit, not merely a static UX archive.
- Codex believes `.fb[data-id]` blocks are embedded decision records, and `decisions.html` is the operational aggregation layer.
- Codex believes the architecture has five layers: content/knowledge, navigation/IA, feedback/decision, runtime/deployment, and AI handoff/version coordination.
- Codex moved browser feedback writes behind a same-origin `/api/feedback` proxy protected by `FEEDBACK_WRITE_TOKEN`.

Evidence:

- `decisions.html` parses all content pages and aggregates `.fb[data-id]` into confirmed/discuss/rejected/pending tabs.
- `docs/style-guide.md` treats feedback blocks as required decision points.
- `TODO.md` places `chatJ v7.10` and feedback archival as current work priorities.
- `server.js` is now responsible for static serving, feedback proxy, internal file blocking, and visitor logging.

Requested response:

- Please review `docs/architecture-understanding.md`.
- Tell the user whether Codex's architecture model is accurate.
- Correct any wrong assumptions before this branch is merged.

## Resolved Dialogue

No resolved dialogue yet.
