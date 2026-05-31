# Architecture

## Recommended project shape

Start with a separate mobile app project beside the current web app instead of restructuring the existing repository first.

Recommended initial layout outside this folder:

```text
BandFan/
  bandfan/         # existing Next.js web app
  bandfan-mobile/  # new mobile app project
```

If the mobile app proves durable, later consolidation into a monorepo can look like:

```text
BandFan/
  apps/
    web/
    mobile/
  packages/
    shared-types/
    api-contracts/
    design-tokens/
```

## Current scaffold decision

The first implementation pass now lives inside this migration workspace as:

```text
bandfan-mobile/
  apps/
    mobile/
      app/
      src/
      .env.example
```

This keeps the mobile app separate from the current web runtime while still allowing the migration handoff docs to stay next to the scaffold.

## Default assumptions

- the web app remains the source backend reference
- the mobile app reuses the same Firebase project
- authenticated API requests use bearer tokens
- backend cleanup is preferable to client-side duplication
- share contracts and types before attempting to share UI code

## Accepted initial stack

- Expo
- React Native
- TypeScript
- Expo Router for shallow tab navigation and modal player routing
- Firebase client SDK for auth
- TanStack Query for server-state flows
- Zustand for local player and session state
- Zod for environment parsing and contract validation helpers
- Expo AV as the initial simple-player dependency

## What not to do first

- do not move the current web app into a new repo structure before the mobile app exists
- do not attempt to make the current Next.js app also serve as the mobile app
- do not aim for route-by-route parity

## Mobile app defaults

- mobile-first navigation
- fan-focused authenticated experience
- simple playback state model
- server-backed discovery and preferences
- explicit API client layer with typed request and response models

## Initial mobile structure

- `apps/mobile/app/` for routes and route groups
- `apps/mobile/src/features/` for auth, discovery, liked, playlists, player, and account flows
- `apps/mobile/src/components/` for shared tactile UI primitives
- `apps/mobile/src/design/` for BandFan mobile tokens
- `apps/mobile/src/state/` for session, music, and player state
- `apps/mobile/src/lib/` for env, Firebase, and query wiring
