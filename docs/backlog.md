# Backlog

## Completed in current scaffold

1. Chose Expo + React Native + TypeScript as the initial mobile stack.
2. Froze the first-pass token file in `apps/mobile/src/design/tokens.ts`.
3. Scaffolded the separate mobile app in `apps/mobile`.
4. Wired initial Firebase Auth setup, shallow mobile navigation, and the first shell screens.
5. Added a reusable mobile API client with public-base-url config, auth-ready GET/POST/PATCH support, normalized errors, and runtime validation hooks.
6. Replaced the local Discovery seed path with the real `GET /api/fan/discover/songs` integration path while preserving the current UI structure.
7. Enabled React Native Firebase auth persistence with AsyncStorage-backed session restore and restore-aware bearer-token reads.
8. Wired like/save through the protected `POST /api/fan/preferences` route with one-place request normalization, optimistic local state, and discovery reload invalidation.
9. Wired release support through the canonical `POST /api/release-support` route with one-place request normalization and optimistic local vote state.
10. Replaced the flat color export with a two-layer global theming system: raw palette tokens, semantic UI tokens, persisted light or dark mode, a shared sidebar theme control, an Account theme control, and a Discovery logo tap quick switch.

## Ordered next steps

1. Run one real configured local validation pass with Firebase client env, public API base, authenticated restore, and protected write checks.
2. Confirm the smallest mobile-safe liked-songs contract, then replace the local liked shell with server-backed state.
3. Confirm the smallest mobile-safe playlists contract, then replace the built-in local playlist shell with backend data.
4. Connect account settings read and write flows.
5. Finish the simple player implementation on top of the chosen audio stack.
