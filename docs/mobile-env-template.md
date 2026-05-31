# Mobile Env Template

## Purpose

This document shows what the future mobile project should accept as environment configuration.

It is intentionally limited to client-safe values.

This document is self-contained and is meant to travel with `.migrate` into the new project.

## Important answer

No, the mobile project should not simply copy the current `.env.local` wholesale.

Reason:

- the current `.env.local` contains both client-safe Firebase config and server-only credentials
- the mobile app may use only the client-safe Firebase config
- server credentials such as `FIREBASE_SERVICE_ACCOUNT_KEY` must never be copied into the mobile project

## Current safe client-side keys from this repo

These are the Firebase client-config keys the new mobile project should expect to receive for client setup:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Current server-only key in this repo

The mobile project must not include this server-only credential:

- `FIREBASE_SERVICE_ACCOUNT_KEY`

## Mobile template example

The future mobile project can rename these to match its stack, but it should contain only client-safe values.

Example template:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Optional app config keys

If the mobile project needs them, keep them separate from Firebase credentials.

Example:

```text
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_APP_ENV=
```

## What not to do

- do not copy `FIREBASE_SERVICE_ACCOUNT_KEY`
- do not copy raw service-account JSON into the mobile app
- do not assume every key from the web app belongs in the mobile app
- do not expose server secrets through a mobile env file

## Recommended workflow

1. Start from this template, not from a raw copy of the web app env file.
2. Fill only the client-safe Firebase values from the existing Firebase project.
3. Add app-specific public variables only as needed.
4. Keep server-only credentials in backend or deployment environments only.
