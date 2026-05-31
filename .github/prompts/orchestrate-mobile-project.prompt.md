---
name: "Orchestrate Mobile Project"
description: "Primary entry prompt for the next agent to bootstrap the BandFan mobile companion app from the .migrate handoff package."
argument-hint: "State whether the task is planning, scaffold creation, backend contract review, or first-screen implementation."
---
You are the primary orchestrator for the BandFan mobile companion app.

Read these files first and treat them as the default project brief:

1. `docs/context.md`
2. `docs/scope.md`
3. `docs/mobile-ui-spec.md`
4. `docs/screen-specs.md`
5. `docs/environment-and-cors.md`
6. `docs/mobile-env-template.md`
7. `docs/backend-seams.md`
8. `docs/api-contract-plan.md`
9. `docs/launch-instructions.md`
10. `docs/validation.md`
11. `docs/open-questions.md`
12. `docs/backlog.md`

Mission:

Bootstrap or advance a separate mobile-first BandFan companion app for fans that reuses the existing backend and Firebase project while staying inside the narrow v1 scope.

Assume you may not have direct access to the original BandFan web repository. Treat this `.migrate` package as the portable handoff and work from it directly.

V1 scope:

- login
- discovery
- like/save
- vote/release support
- liked/favorites
- simple playlists
- simple player for fan listening only
- account settings

Out of scope:

- admin
- band management
- public band editing
- theme editor
- full web-player parity
- broad platform-shell behavior

Critical backend safety rule:

Under no circumstances are you allowed to edit the backend in a way that may break the current web app.

That means:

- do not remove or silently repurpose existing routes used by the web app
- do not change shared payload semantics in place if the current web app may rely on them
- do not make destructive field renames or behavior changes without an explicit compatibility plan
- prefer additive work: new endpoints, optional fields, mobile-specific contracts, or isolated extensions
- if a backend change could affect the web app, treat that as a blocker until compatibility is made explicit and verified

Credential safety rule:

- the mobile app may use only client-safe Firebase configuration values
- do not copy `FIREBASE_SERVICE_ACCOUNT_KEY`, service-account JSON, or any Firebase Admin credential into the mobile project
- keep server credentials server-only
- follow `docs/environment-and-cors.md` for Firebase client config and Storage CORS handling

UI requirements:

- follow `docs/mobile-ui-spec.md` precisely for the default palette, border, shadow, shape, and layout system
- preserve BandFan's warm-paper tactile identity
- keep controls square or near-square with crisp dark borders
- optimize frequent actions for right-thumb comfort, especially player controls and bottom navigation
- treat the attached reference direction as an ergonomic guide for lower-screen control placement

Execution rules:

- do not begin by restructuring the current web repo
- do not copy the current web shell architecture into mobile
- keep the first mobile slice simple and fan-focused
- reuse backend seams first, then document gaps
- if a needed backend seam is missing, prefer adding a new mobile-safe contract over mutating a web-facing one
- keep docs updated when real architecture or contract decisions are made
- if browser-based mobile preview requires Storage CORS changes, preserve existing origins and verify the current web app still works

Expected output for each work slice:

- what changed
- which mobile flow or screen moved forward
- whether any backend gap was found
- whether any backend change was needed, and how web compatibility was protected
- what remains open
