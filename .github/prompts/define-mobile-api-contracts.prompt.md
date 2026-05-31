---
name: "Define Mobile API Contracts"
description: "Review or define the backend contracts needed for the BandFan mobile companion app."
argument-hint: "State the mobile flow or screen and whether the goal is reuse, cleanup, or new endpoint design."
---
Define or refine the backend contracts for the BandFan mobile app.

Requirements:

- read `docs/backend-seams.md` and `docs/api-contract-plan.md`
- map the requested flow to existing routes first
- prefer the smallest durable contract surface
- keep auth and payload shapes consistent
- update the docs when contract assumptions change
