---
name: "apk-build"
description: "Build and verify the BandFan mobile Android APK using the BandFan Android Release Builder workflow."
argument-hint: "Optional: say build, verify existing APK, or diagnose a failed APK build."
---
Build the BandFan mobile Android APK.

Use the `BandFan Android Release Builder` agent workflow and follow its constraints exactly.

Requirements:

- do not modify app source unless explicitly asked
- run `npm run -s typecheck` from `apps/mobile`
- build with release env values only (no localhost, no dev proxy, no development app env)
- prefer `apps/mobile/.env.release.local` for release builds; never use debug/dev env values for release
- sync `apps/mobile/app`, `apps/mobile/src`, `apps/mobile/assets`, and `apps/mobile/app.json` into `D:\bfm`
- make sure Android media playback permissions from `app.json` are present in the short build copy manifest when needed
- verify release builds keep BandFan debug overlays disabled unless the user explicitly asks for a special debug-overlay build
- use D-drive Android paths: `ANDROID_HOME=D:\Android\Sdk`, `ANDROID_AVD_HOME=D:\Android\Avd`, `GRADLE_USER_HOME=D:\Android\GradleCache`, `NPM_CONFIG_CACHE=D:\npm-cache`
- use Node 20 from `D:\tools\node-v20.19.5-win-x64` when available
- generate the Expo Android bundle manually from `D:\bfm`
- build release APK from `D:\bfm\android`
- set signing env vars before release build: `BANDFAN_UPLOAD_STORE_FILE`, `BANDFAN_UPLOAD_STORE_PASSWORD`, `BANDFAN_UPLOAD_KEY_ALIAS`, `BANDFAN_UPLOAD_KEY_PASSWORD`
- copy the final APK to `apps/mobile/builds/bandfan-mobile-pixel8pro-release.apk`
- verify with `apksigner` and `aapt`
- verify the final APK is not debuggable and that debug overlay controls are gated behind `__DEV__`
- fail the build if the signer is Android Debug
- fail the build if release bundle contains `localhost` or `http://` app API endpoints
- report only the APK path, byte size, package name, version, SDK levels, signature result, and any failure excerpt