# BandFan Mobile Migration Workspace Instructions

Read `docs/context.md`, `docs/mobile-ui-spec.md`, `docs/screen-specs.md`, and `docs/environment-and-cors.md` before substantial work.

## Goal

Build a separate mobile-first BandFan companion app that uses the existing backend and Firebase project.

## Working Rules

- Prefer minimal, targeted changes and explicit project structure.
- Do not assume the mobile app should mirror the full web app.
- Treat this `.migrate` package as the portable source of truth inside the new project.
- Reuse backend contracts and auth patterns before inventing new ones.
- Do not copy web UI architecture into mobile.
- Share types and API contracts when useful, but do not force shared UI code.
- Keep docs in `docs/` aligned with actual migration decisions.
- Preserve the documented mobile palette, shape language, and ergonomic layout rules unless the docs are intentionally updated.
- Under no circumstances should backend work for the mobile app knowingly risk breaking the current web app.
- Treat the current web app as a protected existing client whenever backend changes are proposed.
- Prefer additive, backward-compatible backend changes over in-place mutations of shared behavior.
- Never place Firebase Admin or service-account credentials in the mobile project.
- Only use client-safe Firebase configuration values in the mobile app.

## Product Scope

V1 scope:

- login
- discovery
- like/save
- vote
- liked/favorites
- simple playlists
- simple player
- account settings

Out of scope for v1:

- admin
- band management
- public band editing
- theme editor
- complex moderation tools
- full web player parity

## Architecture Defaults

- separate app project, not inside the current web runtime
- same backend and same Firebase project
- bearer-token auth against existing APIs
- contract cleanup before client-side duplication of business logic
- new mobile-focused backend surfaces are preferable to risky rewrites of current shared web contracts

## UI Defaults

- warm paper background, crisp dark borders, and hard-edged shadows
- square or near-square buttons and tabs
- one-handed right-thumb-friendly placement for frequent controls
- simple player rather than full web-player parity
