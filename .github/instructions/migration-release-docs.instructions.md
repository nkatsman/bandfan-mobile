---
name: "BandFan Mobile Migration Release And Docs"
description: "Use when working on migration docs, handoff files, validation notes, or adjacent customization changes inside the .migrate package."
applyTo: ".github/**, docs/**"
---
# Migration Release And Docs Guidance

- Keep `docs/context.md`, `docs/backlog.md`, and `docs/open-questions.md` aligned with the real migration state.
- Prefer the smallest useful customization surface instead of recreating the full current repo customization framework.
- Keep descriptions keyword rich, scopes non-overlapping, and instructions narrow enough to stay efficient for the next agent.
- Do not freeze speculative stack decisions as if they were already accepted architecture.
- When a stack or contract decision becomes real, update the relevant docs so the next agent does not have to infer it from stale notes.
