---
name: "BandFan Mobile Migration Core"
description: "Use when working on mobile app setup, project structure, migration docs, or companion-app architecture."
applyTo: ".github/**, docs/**"
---
# Mobile Migration Guidance

- Read `docs/context.md` first.
- Treat the current BandFan web app as the source backend and behavior reference, not as a UI architecture template.
- Keep the first mobile slice narrow and fan-focused.
- Prefer a separate mobile app over embedding mobile work into the existing web app structure.
- Reuse existing bearer-auth backend seams where possible.
- If a backend flow is awkward for mobile, document the contract gap explicitly before inventing client-side workarounds.
- Keep migration docs concise, operational, and current.
