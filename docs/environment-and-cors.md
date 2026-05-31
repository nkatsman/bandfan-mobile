# Environment And CORS

## Purpose

This document tells the next agent which Firebase values the mobile app needs, which credentials must never be placed in the mobile client, and how to update Google Cloud Storage CORS safely when browser-based access requires it.

This document is self-contained. It should be usable after `.migrate` is moved into a new project.

## Client-side Firebase config

The mobile app should use the public Firebase client configuration from the existing BandFan Firebase project.

Expected client config fields:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

For a separate mobile app, these may be renamed into the new project's preferred env style, but the underlying values come from the same Firebase project.

## Credential safety rule

Only the Firebase client configuration belongs in the mobile app.

Never place server credentials inside the mobile project.

Do not copy or embed:

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- service-account JSON files
- Firebase Admin SDK credentials of any kind

The service account remains server-only and must stay out of the mobile codebase.

## Mobile project expectation

The next agent should prepare the mobile project to accept the Firebase client config through that project's environment mechanism.

The mobile project docs should clearly separate:

- client-safe Firebase config needed by the app
- server-only secrets that must remain in backend or deployment environments

## Storage CORS

Native mobile clients do not generally rely on browser CORS in the same way web clients do. However, CORS still matters for:

- any hosted web preview of the mobile client
- Expo web or browser-based testing
- existing web app flows that read from Firebase Storage in the browser

Because the current BandFan platform already has browser-facing Storage usage, treat CORS changes carefully and keep them compatible with the existing web app.

## Current repo reference

This handoff package already contains a copied baseline CORS file in:

- `config/storage.cors.json`

Treat that file as the baseline rather than replacing it blindly.

## CORS update rule

When adding a new browser origin for mobile-web preview or hosted testing:

- preserve existing origins
- add only the new required origin entries
- do not remove the current web app origins

## Recommended CORS workflow

1. Identify the real bucket from the Firebase project.
2. Start from `config/storage.cors.json`.
3. Add any new web origins required for mobile web preview.
4. Apply the updated CORS file to the bucket.
5. Verify the existing web app still works.

## Example gcloud workflow

Set the bucket CORS using Google Cloud CLI:

```bash
gcloud storage buckets update gs://YOUR_STORAGE_BUCKET --cors-file=config/storage.cors.json
```

Inspect the resulting bucket config:

```bash
gcloud storage buckets describe gs://YOUR_STORAGE_BUCKET
```

## Origin guidance

Keep existing origins such as local web development and current production web domains.

Add new origins only when they are truly needed, for example:

- local web preview host for the mobile project
- hosted preview domain for the mobile web build

Do not invent placeholder origins and leave them in production config.

## Verification guidance

After updating CORS:

- verify the current BandFan web app still loads storage-backed media correctly
- verify any new browser-based mobile preview can access the expected storage assets
- if a CORS change risks breaking the current web app, treat it as a blocker and roll back to a compatible config
