# Validation

## Validation goals for planning and setup

- the mobile project scope stays inside the defined v1 slice
- auth flow is compatible with existing bearer-token routes
- discovery, like, vote, liked, playlists, player, and account settings all have a documented backend path
- unresolved contract gaps are written down instead of improvised away

## Validation goals for the first working mobile build

- user can log in successfully
- discovery loads with real backend data
- like/save persists and reloads correctly
- vote persists and reloads correctly
- liked screen reflects server-backed state
- simple playlists are navigable and playable
- play events can be recorded without breaking playback
- account settings load and save through a stable contract

## Validation style

- prefer explicit manual flow checks during the earliest mobile slice
- keep stack-specific commands in the future mobile project's own docs
- do not copy current web validation commands into the mobile app unless they are still directly relevant

## Current scaffold validation

- `apps/mobile` compiles with `npm run typecheck`
- Firebase client config is isolated to `apps/mobile/.env.example` and local development now reads the real client-safe values from `apps/mobile/.env.local`
- the first shell stays inside v1 fan scope: sign-in, discovery, liked, playlists, player, and account
- backend-dependent flows still document gaps instead of inventing new shared backend behavior
- Discovery now requests the real `GET /api/fan/discover/songs` route when `EXPO_PUBLIC_API_BASE_URL` is configured, with explicit loading, empty, and error states in the screen.
- The shared mobile API client now supports unauthenticated GET plus authenticated GET, POST, and PATCH with bearer-token injection and normalized errors.
- React Native Firebase auth persistence now initializes native auth with AsyncStorage-backed persistence when the `@firebase/auth` RN helper is available, and web auth now uses explicit browser persistence so signed-in state survives reload.
- A live configured sign-in succeeded with the shared Firebase project, and signed-in state restored successfully after an app reload in the local Expo web preview.
- Like/save now uses the protected `POST /api/fan/preferences` path with optimistic local updates and discovery query invalidation. Live backend validation confirmed the deployed route expects `{ kind: 'save-song', targetId, value }`, and the mobile adapter now normalizes the app-facing `{ songId, liked }` input into that server shape.
- Release support now uses the canonical `POST /api/release-support` path with optimistic local vote updates and discovery query invalidation.
- Live backend validation confirmed the deployed release-support response currently returns `releaseSupported`, and the mobile adapter now accepts that field explicitly.
- The local Expo web preview can verify auth and UI flow, but live backend fetches from `http://localhost` are currently blocked by deployed CORS policy. Discovery, save, and release-support route validation therefore required direct authenticated backend requests in addition to browser checks.
