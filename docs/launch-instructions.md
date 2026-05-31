# Launch Instructions

## First read order

1. `docs/context.md`
2. `docs/scope.md`
3. `docs/mobile-ui-spec.md`
4. `docs/screen-specs.md`
5. `docs/environment-and-cors.md`
6. `docs/mobile-env-template.md`
7. `docs/backend-seams.md`
8. `docs/api-contract-plan.md`
9. `docs/validation.md`

## Mission

Bootstrap a separate mobile-first BandFan companion app that reuses the existing backend and Firebase project while staying within the narrow fan-focused v1 scope.

Assume this `.migrate` package may be the only BandFan material available inside the new mobile project. Do not rely on direct access to the original web repository.

## Starting assumptions

- the mobile app is a separate project
- the current web app remains unchanged unless backend contract cleanup is required
- Firebase Auth powers sign-in
- protected API requests use bearer tokens
- backend reuse is preferred over direct client duplication of business logic
- the mobile UI should inherit the color and tactile system in `docs/mobile-ui-spec.md`
- the first client should be optimized for right-thumb comfort rather than desktop parity
- backend changes must not create regressions for the current web app
- only client-safe Firebase config belongs in the mobile app
- service-account credentials must remain server-only

## Local mobile env file

For local Expo development, this project now expects:

- `apps/mobile/.env.local`

The local file should contain only public mobile variables:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_WEB_API_PROXY_URL`

For local web preview, set `EXPO_PUBLIC_WEB_API_PROXY_URL` to `http://localhost:8787` so browser requests use the local BandFan proxy.

The `npm run web` script now starts both the proxy and Expo web server together.

Do not place `FIREBASE_SERVICE_ACCOUNT_KEY` or any Firebase Admin credential in the mobile project.

## Practical build order

1. choose and scaffold the mobile app project
2. define the initial mobile design tokens and layout rules from `docs/mobile-ui-spec.md`
3. define screen responsibilities from `docs/screen-specs.md`
4. prepare environment handling for Firebase client config using `docs/environment-and-cors.md` and `docs/mobile-env-template.md`
5. wire Firebase Auth
6. create a typed API client with auth-header injection
7. connect Discovery to the existing backend
8. connect save/like and vote flows
9. add a simple player model and screen or sheet
10. add Liked / Favorites
11. add simple playlists
12. add account settings
13. document any backend contract gaps discovered during implementation

## What to avoid

- porting the current web shell architecture
- reproducing the full bottom-player behavior
- broad repo restructuring before proving the mobile app
- adding admin or band-management scope to the first slice
- replacing the warm BandFan palette with generic dark streaming-app colors
- hiding important controls in top-corner or overflow-heavy layouts when they belong in the thumb zone
- mutating shared backend contracts in place if that may break the current web app
- treating the mobile project as permission to redesign shared backend behavior without compatibility checks
- placing Firebase Admin credentials or service-account material in the mobile project

## Handoff quality bar

The next agent should leave behind:

- a clear project plan or scaffold for the mobile app
- a mobile UI implementation that matches the documented palette, shape system, and ergonomic guidance
- a documented backend contract map
- backend changes, if any, that are explicitly backward-compatible with the web app
- explicit unresolved questions
- validation notes that match the chosen mobile stack
