# BandFan Mobile Migration Context

## What this is

This folder prepares a separate mobile-first BandFan companion app for a follow-on coding agent.

## Source product

The current BandFan web app is the source product, backend baseline, and behavior reference. The mobile app should reuse the existing backend and Firebase project where practical.

## Current repo reality

- The current product is a Next.js web app.
- The current roadmap still prioritizes mobile-web quality and performance before a dedicated native app.
- The mobile app should therefore start as a narrow companion app, not a parity rebuild.
- The mobile app should focus on the fan listening journey rather than the full platform.
- The mobile UI should preserve BandFan's tactile visual identity through exact color, border, shadow, and shape rules documented in `docs/mobile-ui-spec.md`.
- The mobile interaction model should favor right-thumb comfort, especially for playback controls, quick song actions, and bottom navigation.

## Mobile app goal

Build a separate companion app for fans that supports:

- login
- discovery
- like/save
- vote/release support
- liked/favorites listening
- simple playlists
- simple player for fan listening only
- account settings

## Explicit non-goals for v1

- admin tools
- band management
- public band editing
- theme editor
- floating windows
- full web player parity
- migration of the existing web repo into a new app layout before the mobile app exists

## Architectural default

- create a separate mobile app project
- keep the current web app where it is
- use the same Firebase project
- use bearer-token auth against existing APIs
- share contracts and types later, not UI implementation now
- treat the current web app as a protected existing client: backend changes must be additive and backward-compatible

## Backend safety rule

The current web app must not be broken by mobile-driven backend work.

- do not remove or silently repurpose existing routes, fields, or response shapes that the web app may rely on
- do not change backend behavior in ways that risk regressions for the web app without an explicit, verified migration plan
- prefer new endpoints, optional fields, and additive contracts over mutating existing behavior
- if a backend cleanup is needed for mobile, assume the web app is still a required client and protect it accordingly

## Handoff expectation

The next agent should use this folder to bootstrap a clean mobile project plan and initial implementation path, while documenting any backend contract gaps that should be solved before broadening the client.

The next agent should also treat `docs/mobile-ui-spec.md` as the default UI brief unless a later accepted product decision replaces it.
