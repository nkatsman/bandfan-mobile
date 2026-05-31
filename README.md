# BandFan Mobile Migration Handoff

This folder is a handoff package for building a separate mobile-first BandFan companion app that reuses the existing backend and Firebase project.

It is intentionally documentation-first. It does not scaffold a stack or source tree. The goal is to give another agent enough structure, constraints, and launch guidance to start a clean mobile project without dragging over the current web app architecture.

This package is meant to be portable. If you move `.migrate` into a new project, the next agent should be able to work from this folder alone without needing direct access to the source BandFan web repository.

Start here:

1. Read `docs/context.md`
2. Read `docs/scope.md`
3. Read `docs/backend-seams.md`
4. Read `docs/launch-instructions.md`

What this package is for:

- defining the first mobile app slice
- documenting which backend seams already exist
- carrying the necessary environment and CORS guidance into the new project
- keeping the mobile effort narrow and fan-focused
- carrying over useful repo guidance into a lighter `.github` customization surface

What this package is not for:

- cloning the current Next.js app structure
- reproducing web-only route chrome, player behavior, or theme-editor workflows
- defining a final mobile stack beyond practical defaults
