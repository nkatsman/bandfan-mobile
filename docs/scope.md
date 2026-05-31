# Scope

## V1 user journey

1. Log in
2. Land on Discovery
3. Browse songs
4. Like songs
5. Vote on songs
6. Open Favorites / Liked
7. Listen from there
8. Use simple playlists centered on Discovery and Liked
9. Open Account Settings

## In scope

- fan authentication
- discovery feed
- song cards or rows with play, like, and vote actions
- liked/favorites list
- simple playlists
- compact player experience
- basic account settings relevant to the mobile app
- a mobile UI system with explicit BandFan colors, hard-edge surfaces, square controls, and right-thumb-friendly control placement

## Out of scope

- band creation
- upload flows
- admin routes
- moderation tools
- public band owner editing
- multi-window UI
- complex theme customization
- full desktop feature parity
- deep audio controls beyond the essentials

## Product guardrails

- prefer a focused listening app over a broad platform shell
- keep navigation shallow
- keep the player simple
- avoid inheriting web-specific complexity unless the mobile app genuinely needs it
- bias high-frequency actions toward the lower-right and lower-center thumb zone
- keep important controls physically obvious through border, fill, shadow, and size differences before adding visual noise

## UI guardrails

- follow `docs/mobile-ui-spec.md` for color, spacing, border, shadow, and shape defaults
- preserve BandFan's warm-paper palette instead of drifting into generic dark music-app styling
- keep buttons and tabs square or near-square with visible borders
- keep the player action cluster ergonomic for one-handed right-thumb use
