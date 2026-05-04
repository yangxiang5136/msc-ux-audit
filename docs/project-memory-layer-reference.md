# Project Memory Layer Reference

Last updated: 2026-05-03 by Codex.

Purpose: this document is a portable reference architecture for teams that use
multiple AI tools on the same repository. It is designed for the common failure
mode where a new AI chat has no memory of previous conversations, but still
needs to understand the project accurately before editing files.

## Core Idea

The repository should carry its own durable memory.

Do not rely on any single AI chat history as the source of truth. Chat memory is
fragile, tool-specific, and easy to lose. Instead, create a small project memory
layer inside the repo so a new AI tool can recover context by reading files and
running a standard bootstrap command.

The desired user command becomes:

```text
Please first research and understand this project.
```

A well-instrumented project should make that command deterministic. A new agent
should treat that command as a trigger to run the bootstrap script or equivalent
startup snapshot, then quickly learn:

- what the project is trying to become
- what state it is currently in
- how the architecture works
- which files are source-of-truth files
- which decisions should not be casually overturned
- what the last AI/tool changed
- what remains risky or unresolved

## Recommended File Structure

```text
AGENTS.md
PROJECT_CONTEXT.md
PRODUCT_INTENT.md
ARCHITECTURE.md
DECISIONS.md
ROADMAP.md or TODO.md
CHANGELOG.md
.agent/
  handoffs/
  reviews/
  threads/
scripts/
  agent-bootstrap
```

This is an idealized shape. Existing projects should adapt it rather than copy
it mechanically.

## File Responsibilities

### AGENTS.md

`AGENTS.md` is the entry protocol.

It should be short and operational:

- what every AI must read first
- what commands to run before editing
- what files are high risk
- what must be updated before handoff
- how to treat dirty worktrees and changes from other tools

It should not contain the full product strategy.

### PROJECT_CONTEXT.md

`PROJECT_CONTEXT.md` is the short-term memory snapshot.

It answers:

- what the project is
- current phase
- current branch/track
- latest meaningful changes
- current blockers
- active risks
- next recommended action

Keep it compact. If this file becomes too long, new agents stop reading it
carefully.

### PRODUCT_INTENT.md

`PRODUCT_INTENT.md` records the goal and product boundaries.

It answers:

- why this project exists
- who it serves
- what success means
- what is explicitly out of scope
- product principles that should survive implementation churn

This prevents technically correct changes that drift away from the project
goal.

### ARCHITECTURE.md

`ARCHITECTURE.md` is the technical map.

It should include:

- layers and modules
- important data flows
- runtime/deployment model
- external services
- local development commands
- high-risk files
- protected invariants

It should explain why the system is shaped the way it is, not just list files.

### DECISIONS.md

`DECISIONS.md` records durable architecture/product decisions.

Use ADR-style entries:

```text
## 2026-05-03 - Use Telegram as an agent control plane

Status: proposed

Decision:
Telegram should be a sidecar orchestration layer, not part of the main product.

Reason:
The user needs mobile control over multiple AI agents without polluting the
product architecture.

Tradeoffs:
Requires a separate policy and approval model.
```

The goal is not bureaucracy. The goal is to preserve why a decision was made.

### ROADMAP.md / TODO.md

This is the active work queue.

It should include:

- current priorities
- active blockers
- near-term tasks
- strategic follow-ups

It should not be used as a complete implementation log.

### CHANGELOG.md

This is user-visible or stakeholder-visible history.

It should not include every internal code patch. It should include changes that
affect product behavior, visible content, stakeholder interpretation, or
deployment expectations.

### .agent/handoffs/

Each meaningful AI session should produce a handoff note:

```text
.agent/handoffs/2026-05-03-codex.md
```

Suggested format:

```text
Agent:
Date:
Branch:
Goal:
Files changed:
Validation:
Open risks:
Recommended next action:
```

Handoffs are not discussion threads. They are concise state transfer.

### .agent/threads/

Use threads for indirect AI-to-AI dialogue.

Rules:

- append-only
- each message has author, timestamp, intent, and mode
- no agent rewrites previous messages
- discussion conclusions must eventually be promoted into `DECISIONS.md`,
  `PROJECT_CONTEXT.md`, or `ARCHITECTURE.md`

The thread is evidence. It is not the final source of truth.

### scripts/agent-bootstrap

This is the professionalizing piece.

It gives every agent the same starting snapshot:

- git branch/status
- latest commit
- key memory files
- latest handoff
- latest decision
- current TODO/roadmap summary
- high-risk areas
- local run/test commands

The ideal agent startup becomes:

```text
Run scripts/agent-bootstrap, read the referenced memory files, then explain your
understanding before editing.
```

## Minimal Adoption Path

Do not introduce every file at once if the project is small. Start with:

```text
AGENTS.md
PROJECT_CONTEXT.md
ARCHITECTURE.md
DECISIONS.md
.agent/handoffs/
.agent/threads/
scripts/agent-bootstrap
```

Then add `PRODUCT_INTENT.md` and a refined changelog once the project has enough
product complexity to justify them.

## Operating Rules

1. New AI sessions begin by reading `AGENTS.md`.
2. Agents run the bootstrap command before editing.
3. Agents repeat their understanding back to the user before large changes.
4. Agent-to-agent dialogue goes into append-only thread files.
5. Final conclusions move out of threads and into source-of-truth docs.
6. Every meaningful work session ends with a short handoff.
7. High-risk actions require explicit user approval.

## Anti-Patterns

- One giant context file that mixes product goal, architecture, TODOs, and logs.
- Treating chat transcripts as source of truth.
- Updating `CHANGELOG.md` for invisible internal changes.
- Letting AI-to-AI thread files become the only place a decision is recorded.
- Making every new AI tool invent its own onboarding process.
- Moving a sidecar agent orchestration experiment into the product runtime
  before it proves value.

## Success Criteria

The architecture is working when a new AI tool can enter the repo cold and, in
one pass, accurately answer:

- What is this project?
- What is the current goal?
- How does it run?
- What are the high-risk files?
- What was the last meaningful change?
- What should I avoid breaking?
- What is the next reasonable action?
