# MSC.AI Project Memory Layer Localization

Last updated: 2026-05-03 by Codex.

Purpose: compare the ideal Project Memory Layer architecture with this repo's
existing coordination system, then recommend a local adaptation that respects
the current project rather than forcing a generic template onto it.

## Current MSC.AI Memory Architecture

This repo already has a meaningful memory layer. It is not starting from zero.

Existing pieces:

- `AGENTS.md`: tells new AI tools to read `AI_CONTEXT.md`, follow
  `docs/ai-workflow.md`, and check git status before editing.
- `AI_CONTEXT.md`: compact current-state handoff for AI tools.
- `CLAUDE.md`: Claude-specific entrypoint.
- `TODO.md`: active work queue, strategy priorities, and blockers.
- `changelog.html`: stakeholder-visible product/content version history.
- `docs/ai-workflow.md`: repo-specific AI collaboration workflow.
- `docs/architecture-understanding.md`: Codex's explicit model of the site
  architecture, written for peer review.
- `docs/ai-dialogue.md`: async AI-to-AI review protocol and dialogue log.
- `ai-bridge/`: experimental append-only file bridge for indirect AI-to-AI
  dialogue.
- `telegram-agent-bridge/`: paused sidecar prototype for future Telegram agent
  orchestration.

The repo's current memory model is therefore closer to:

```text
AGENTS.md
AI_CONTEXT.md
CLAUDE.md
TODO.md
changelog.html
docs/
  ai-workflow.md
  architecture-understanding.md
  ai-dialogue.md
experimental sidecars/
  ai-bridge/
  telegram-agent-bridge/
```

## What The Current Architecture Already Solves

### 1. AI Entry Point

The ideal architecture asks for `AGENTS.md`. This repo already has it.

Local adaptation: keep `AGENTS.md` short. Do not move product strategy into it.

### 2. Current State Snapshot

The ideal architecture asks for `PROJECT_CONTEXT.md`. This repo's equivalent is
`AI_CONTEXT.md`.

Local adaptation: do not create `PROJECT_CONTEXT.md` unless the team wants a
rename. `AI_CONTEXT.md` already performs that role and is referenced by
`AGENTS.md`, `CLAUDE.md`, and `TODO.md`.

### 3. Roadmap / Active Work Queue

The ideal architecture asks for `ROADMAP.md` or `TODO.md`. This repo already
uses `TODO.md` heavily and in Chinese, with strategic context and blockers.

Local adaptation: keep using `TODO.md`. Avoid splitting it until it becomes too
large to scan.

### 4. Stakeholder-Visible History

The ideal architecture asks for `CHANGELOG.md`. This repo uses
`changelog.html`, because the changelog is itself part of the stakeholder site.

Local adaptation: keep `changelog.html`. Do not add a parallel `CHANGELOG.md`
unless an automation specifically needs markdown.

### 5. Architecture Understanding

The ideal architecture asks for `ARCHITECTURE.md`. This repo has
`docs/architecture-understanding.md`.

Local adaptation: keep the current file name for now, because its role is
slightly different: it is both an architecture map and a peer-review packet for
Claude/original planning AI. If it stabilizes, it can later be renamed or
summarized into `docs/architecture.md`.

### 6. AI-to-AI Dialogue

The ideal architecture asks for `.agent/threads/`. This repo currently has:

- `docs/ai-dialogue.md` for curated dialogue protocol and log.
- `ai-bridge/threads/` for the append-only file bridge experiment.

Local adaptation: keep the current experiment sidecar while it is still being
tested. If the pattern becomes durable, migrate it to `.agent/threads/` or
`docs/agent-threads/` in a separate cleanup.

## Gaps Compared With The Ideal Architecture

### Gap 1: No Dedicated Product Intent File

The project's product intent is spread across `TODO.md`, `chatJ.html`,
`chatK.html`, and external Claude project knowledge.

Risk: a new AI can understand the code mechanics but miss the strategic goal:
MSC.AI as an incentive, ownership, and settlement layer for AI-generated work
and AI assets.

Local recommendation: add `docs/product-intent.md` later, but only after
`chatJ v7.10` is strategically settled. Creating it before the world model is
stable may freeze the wrong narrative.

### Gap 2: No Formal Decisions Log

The repo has decisions embedded in `TODO.md`, `AI_CONTEXT.md`, and content
pages, but no dedicated ADR-style `DECISIONS.md`.

Risk: future AI tools may reverse prior decisions because they cannot see why
those decisions were made.

Local recommendation: add `docs/decisions.md` after this experimental branch is
accepted or archived. Start with only durable engineering/product decisions:

- Node/Express on Railway rather than static hosting.
- Feedback sync through server proxy rather than browser Supabase writes.
- Telegram agent orchestration remains a sidecar, not part of the MSC website.
- `TODO.md`, `AI_CONTEXT.md`, and `changelog.html` remain separate truth
  surfaces.

### Gap 3: Bootstrap Script Was Missing

The current onboarding sequence was documented, but not executable.

Risk: every new AI has to manually remember which files to read and may skip a
step.

Local adaptation: `scripts/agent-bootstrap` has been added in this branch. It
prints:

- git status and latest commit
- required read order
- latest `AI_CONTEXT.md` handoff
- current `TODO.md` focus
- latest `changelog.html` version
- high-risk files
- local run/test commands

This is now the standard practical entrypoint for "please understand this
project first" requests.

### Gap 4: Handoffs Are Centralized, Not Per Session

`AI_CONTEXT.md` acts as rolling handoff state. That is useful, but it can become
too compressed over time.

Risk: important context gets overwritten by later summaries.

Local recommendation: keep `AI_CONTEXT.md` as the short current-state entry,
and add `.agent/handoffs/` only when multiple branches/agents are active at the
same time. Do not add it prematurely if it creates overhead.

### Gap 5: Experimental Agent Bridges Are Too Close To The Repo Root

`ai-bridge/` and `telegram-agent-bridge/` are useful experiments, but they are
not part of the MSC website's product architecture.

Risk: a future AI may treat these experiments as required site workflow or try
to deploy them with the website.

Local recommendation: keep them clearly labeled as sidecars. They should remain
blocked by `server.js` static-file rules and should not be referenced as
required steps in `docs/ai-workflow.md` unless the user explicitly promotes
them.

## Recommended Local Target State

Instead of copying the ideal structure literally, this repo should evolve toward:

```text
AGENTS.md
CLAUDE.md
AI_CONTEXT.md
TODO.md
changelog.html
docs/
  ai-workflow.md
  architecture-understanding.md
  ai-dialogue.md
  project-memory-layer-reference.md
  project-memory-layer-localization.md
  product-intent.md        # later, after chatJ v7.10
  decisions.md             # later, after current branch stabilizes
.agent/
  handoffs/                # later, only if needed
  threads/                 # later, if ai-bridge becomes durable
scripts/
  agent-bootstrap          # read-only AI startup snapshot
experimental sidecars/
  ai-bridge/
  telegram-agent-bridge/
```

## Local Adoption Sequence

### Step 1 - Document The Pattern

Done by this document and `docs/project-memory-layer-reference.md`.

### Step 2 - Keep Current Entry Points Stable

Do not rename `AI_CONTEXT.md`, `TODO.md`, or `changelog.html` right now. They
already work and are referenced by existing instructions.

### Step 3 - Add Bootstrap Script

Done in this branch as `scripts/agent-bootstrap`. It prints a read-only project
snapshot, required read order, current baseline, TODO focus, blockers,
architecture entry points, high-risk areas, sidecar experiments, and local check
commands.

### Step 4 - Add Decisions Log

Add `docs/decisions.md` when durable architecture/product decisions start
spreading across too many files.

### Step 5 - Promote Or Archive Sidecars

After evaluating `ai-bridge/` and `telegram-agent-bridge/`, either:

- archive them as experiments,
- move the durable file-thread pattern under `.agent/threads/`, or
- move Telegram orchestration to another project that is more appropriate for
  agent-control infrastructure.

## What Not To Do

- Do not replace `AI_CONTEXT.md` with `PROJECT_CONTEXT.md` just to match the
  generic reference architecture.
- Do not duplicate `changelog.html` with a markdown changelog unless there is a
  concrete automation need.
- Do not make Telegram agent orchestration a required MSC site workflow.
- Do not move every AI conversation into `TODO.md`.
- Do not treat append-only AI threads as final source of truth; promote settled
  conclusions into architecture or decisions documents.

## Bottom Line

The ideal Project Memory Layer is a reference model. For this repo, the correct
adaptation is evolutionary:

1. Preserve the existing `AI_CONTEXT.md` + `TODO.md` + `changelog.html`
   separation.
2. Use `docs/architecture-understanding.md` as the current architecture map.
3. Keep AI-to-AI bridges as sidecar experiments for now.
4. Use `scripts/agent-bootstrap` as the executable startup snapshot, because
   that directly supports the user's real need: a new AI can understand the
   project from one instruction.
