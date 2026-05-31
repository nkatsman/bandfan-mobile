# Backend Seams

The mobile app should reuse existing backend seams where possible instead of talking directly to Firestore for business flows.

This document is self-contained. It describes the backend routes and contracts the mobile app should expect to exist on the deployed BandFan backend. It does not require direct source-repo access.

## Existing reusable seams

- Firebase client configuration is already used by the current BandFan clients.
- authenticated bearer-token pattern already exists on protected fan APIs.
- discover feed route: `/api/fan/discover/songs`
- fan preferences route: `/api/fan/preferences`
- vote compatibility route: `/api/votes`
- canonical release-support route: `/api/release-support`
- song play tracking route: `/api/song-plays`
- account settings route: `/api/account/settings`

## Existing auth contract

Protected fan APIs already expect:

- `Authorization: Bearer <firebase-id-token>`

That is mobile-friendly. A mobile client can sign in with Firebase Auth, retrieve the ID token, and attach it to API requests.

## Likely reusable first-pass mobile flows

- authentication via Firebase client SDK
- discovery feed fetch
- save/like updates via preferences route
- vote/release support updates
- play-count tracking
- account settings read/write where the route contract fits the mobile app

## Likely backend cleanup needed for mobile

- current-user bootstrap endpoint for mobile app startup
- dedicated liked-songs read endpoint if the current web path is too indirect
- mobile-friendly playlist read/write contract
- normalization of response payload shapes across fan APIs
- explicit image/audio URL handling rules for mobile clients

## Backend principle

If a flow is awkward from mobile, prefer tightening or adding a server contract rather than bypassing business logic with direct client Firestore access.

## Web app safety constraint

The existing web app is a protected client.

- mobile-driven backend work must not break current web flows
- prefer additive changes such as new endpoints, new optional fields, and new mobile-focused contracts
- avoid destructive renames, semantic rewrites of shared payloads, or changes to existing routes unless the web app is updated and verified in lockstep
- when in doubt, keep the current web route behavior stable and add a mobile-specific surface instead
