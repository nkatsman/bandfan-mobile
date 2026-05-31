# Open Questions

These should be resolved explicitly instead of being decided implicitly during implementation.

## Resolved for the first scaffold

- The first mobile client defaults to Expo with React Native and TypeScript.
- The first project lives as a separate mobile app inside `apps/mobile` rather than restructuring the current web app.
- The first player dependency choice is Expo AV.
- The first UI pass encodes the mobile tokens immediately in `apps/mobile/src/design/tokens.ts`.
- Playlists are currently treated as built-in collections first: Discovery and Liked.
- Votes remain visible as a standalone action in the first mobile UI pass.
- Native Firebase auth persistence now uses AsyncStorage through the React Native auth helper exposed by the installed `@firebase/auth` package surface.

## Product

- How much account settings functionality belongs in v1 beyond basic profile and listening preferences?
- Should the primary transport cluster sit exactly centered or slightly right-weighted to further favor right-thumb reach?
- Should song quick actions on Discovery use a vertical right-edge stack, a horizontal footer row, or both depending on item density?

## Technical

- Do liked songs need a dedicated endpoint before UI work begins?
- Is a dedicated `/api/mobile/me` bootstrap route worth adding before the first client pass?
- The discovery route itself is now wired, but its response envelope is still not explicitly documented. The mobile client currently accepts a small set of array-or-envelope variants and requires each item to expose an id, title, and artist. If the deployed backend differs, prefer an additive documented contract rather than looser client-side guessing.
- Live validation confirmed the deployed `POST /api/fan/preferences` route currently expects `{ kind: 'save-song', targetId, value }`. If a more mobile-friendly `{ songId, liked }` contract is still desired, it should be added as an additive server contract rather than inferred client-side.
- Live validation confirmed the deployed `POST /api/release-support` route accepts `{ songId, supported }`, but the current response uses `releaseSupported` rather than the earlier assumed `supported` echo.
- The deployed backend currently rejects `http://localhost` origins for the discovery route, which limits Expo web preview to auth and UI verification unless backend CORS is widened for local mobile development.

## Delivery

- What is the acceptance bar for calling the mobile prototype successful enough to justify repo consolidation?
