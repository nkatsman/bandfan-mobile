# API Contract Plan

## Goal

Give the mobile app a small, explicit, stable contract surface for the first fan-focused release.

## Reuse immediately where practical

- `GET /api/fan/discover/songs`
- `POST /api/fan/preferences`
- `POST /api/release-support` or the temporary `/api/votes` compatibility route
- `POST /api/song-plays`
- `PATCH /api/account/settings`

## Current deployed like or save contract

Live validation against the deployed BandFan backend confirmed that the current reusable save route expects this request shape:

```text
POST /api/fan/preferences

{
  kind: 'save-song',
  targetId: string,
  value: boolean
}
```

Current observed write response shape:

```text
{
  kind: 'save-song',
  targetId: string,
  value: boolean
}
```

Mobile adapter note:

- the mobile app still uses `{ songId, liked }` internally and translates that input into the deployed backend payload at the edge
- if a flatter mobile-oriented request body is still desirable later, add it as a new documented contract or additive compatibility layer rather than mutating the current web-safe route silently

## Preferred release-support request shape

For the current mobile vote or support flow, the preferred request contract for the canonical release-support route is:

```text
POST /api/release-support

{
  songId: string,
  supported: boolean
}
```

Preferred write response shape:

```text
{
  data: {
    songId: string,
    supported: boolean
  },
  meta?: {},
  error?: null
}
```

Compatibility note:

- live validation confirmed the deployed backend currently returns `releaseSupported` and `releaseSupportCount`
- the mobile client currently tolerates an empty success body, a direct echo object, or a response that uses `supported`, `releaseSupported`, or `voted`
- that tolerance is temporary and should not become the accepted long-term contract
- the compatibility shim route is intentionally not used in the mobile client for this slice

## Preferred discovery response shape

Even before any backend cleanup, the preferred long-term discovery contract for mobile should be explicit and stable.

Preferred shape:

```text
{
  data: {
    songs: [
      {
        id: string,
        title: string,
        artist: string,
        durationLabel?: string,
        liked?: boolean,
        voted?: boolean,
        sourceLabel?: string,
        artworkColor?: string
      }
    ]
  },
  meta?: {},
  error?: null
}
```

Contract notes:

- `id`, `title`, and `artist` should be treated as required.
- `liked` and `voted` may remain false-by-default when the request is unauthenticated.
- `artworkColor` is acceptable for the current tactile mobile UI while the media contract remains intentionally narrow.
- The mobile client currently tolerates a few legacy envelope variants, but that tolerance is only a temporary safeguard and should not become the accepted contract.

## Add or normalize early if missing

- `GET /api/mobile/me`
  - returns current user profile summary, saved ids, voted ids, and lightweight app settings needed for bootstrap
- `GET /api/mobile/liked`
  - returns the current user's liked or saved songs in a mobile-ready list shape
- `GET /api/mobile/playlists`
  - returns built-in playlist definitions and contents for Discovery and Liked
- `GET /api/mobile/account`
  - lightweight account settings payload focused on the mobile app

## Contract principles

- keep payloads small and purpose-built
- prefer normalized ids and display-ready fields over deeply nested raw documents
- serialize timestamps consistently
- do not return web-only UI concerns in the API
- keep auth consistent across all protected routes
- preserve backward compatibility with the current web app unless an explicit coordinated migration is planned and verified

## Response-shape preference

Prefer:

```text
{ data, meta, error }
```

or another equally consistent shape across the mobile-facing surface.

## Migration note

Do not block the first mobile prototype on perfect contract cleanup. Reuse the existing routes when they are good enough, but document each gap clearly and avoid baking route inconsistencies into the client architecture.
