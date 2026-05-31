---
name: "BandFan Mobile Migration Backend Contracts"
description: "Use when defining, reviewing, or updating backend contracts for the mobile companion app."
applyTo: "docs/backend-seams.md, docs/api-contract-plan.md, docs/open-questions.md"
---
# Backend Contract Guidance

- Reuse existing backend seams where they already match the mobile slice.
- Prefer stable, purpose-built endpoints over direct Firestore access for business flows.
- Keep payloads small, explicit, and mobile-oriented.
- Preserve bearer-token auth consistency across protected routes.
- Document which existing routes are being reused and which new or cleaned-up contracts are required.
- Treat the current web app as a protected client that must keep working.
- Do not make destructive or ambiguous backend changes that could break existing web behavior.
- Prefer additive contracts, optional fields, or dedicated mobile endpoints over changing shared route semantics in place.
- If a shared route must change, require an explicit compatibility plan and verification path for the web app.
