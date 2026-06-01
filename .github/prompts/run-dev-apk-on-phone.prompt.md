---
name: "Run Dev APK On Phone"
description: "Improved prompt for BandFan: run Expo/React Native Android debug APK on a physical phone with Fast Refresh and ADB fallback handling."
argument-hint: "Optional: provide APK path override or specific device serial"
---
Use the agent `BandFan RN Dev APK Orchestrator`.

Goal:
Run the BandFan mobile Android debug build on a physical Android device with Expo dev-client Fast Refresh.

Repository-specific assumptions:
- app id: `space.bandfan.mobile`
- launch activity: `space.bandfan.mobile/.MainActivity`
- preferred connected device serial: `41050DLJG000PD`
- preferred adb path: `D:/Android/Sdk/platform-tools/adb.exe`
- default debug APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- fallback APK path: `D:/bfm/android/app/build/outputs/apk/debug/app-debug.apk`
- Metro command: `npx expo start --dev-client` from `apps/mobile`

Autonomy requirements:
- take action in terminals; do not tell the user to run commands when the agent can run them
- if Metro is stopped, missing, or port `8081` is not listening, restart Metro before reporting status
- if the app process is alive but logcat shows `Unable to load script`, `Could not connect`, or `DevServer`, treat it as Metro/dev-server failure and recover with Metro restart + adb reverse + relaunch
- do not decide "no crash" from PID alone; inspect recent logcat/crash buffer before concluding health

Required steps and fallback behavior:
1. Device readiness check
   - Validate selected Android device can accept this APK class:
     - `adb -s <serial> shell getprop ro.build.version.sdk`
     - `adb -s <serial> shell getprop ro.product.cpu.abilist`
   - If APK exists, compare with APK requirements via `aapt dump badging <apk-path>` (minSdkVersion and native-code).
   - If readiness fails, provide exact fix path before continuing.
2. Device check with `adb devices -l`
   - Use bounded timeout; a single hung `adb devices -l` is not a hard blocker.
   - If `adb devices -l` hangs, probe preferred serial directly:
     - `adb -s 41050DLJG000PD get-state`
     - `adb -s 41050DLJG000PD shell getprop ro.build.version.sdk`
   - If direct serial probe succeeds, lock `41050DLJG000PD` and continue.
   - Restart adb server only after both enumeration and direct serial probes fail.
   - If no Android device: prompt for USB debugging, RSA trust prompt, cable reconnect, then retry.
   - If multiple Android devices: choose a target serial and use `adb -s <serial>` for all device-bound commands.
   - If only iPhone/non-Android hardware is connected: explain that ADB cannot deploy to iOS devices.
3. Install APK with `adb -s <serial> install -r <apk-path>`
   - If APK path is missing: build it with `cd apps/mobile/android ; .\\gradlew.bat :app:assembleDebug --no-daemon --console=plain` then retry install.
   - If install fails: `adb -s <serial> uninstall space.bandfan.mobile` then retry install once.
4. Start Metro first with `cd apps/mobile ; npx expo start --dev-client`
   - Wait for ready output before device launch steps.
5. Reverse Metro port with `adb -s <serial> reverse tcp:8081 tcp:8081`
   - If reverse fails: restart/verify Metro, retry reverse once, and only then report same-network manual connection as a true blocker.
6. Launch app with `adb -s <serial> shell am start -W -n space.bandfan.mobile/.MainActivity`
   - If launch fails: verify package/activity, force-stop, reinstall current debug APK if available, then retry once before blocking.
7. Startup diagnostics (required if app does not stay running, shows a red error screen, cannot load script, cannot connect to dev server, or the user asks whether it crashed)
   - Clear stale logs first: `adb -s <serial> logcat -c`
   - Launch with timing: `adb -s <serial> shell am start -W -n space.bandfan.mobile/.MainActivity`
   - Check process: `adb -s <serial> shell pidof space.bandfan.mobile`
   - Check recent app/dev-server logs for `space.bandfan.mobile|ReactNativeJS|DevServer|Unable to load script|Could not connect|FATAL EXCEPTION|AndroidRuntime`
   - Capture crash buffer: `adb -s <serial> logcat -d -b crash`
   - Prefer crash lines matching `space.bandfan.mobile` or `AndroidRuntime`
   - If launch regression after successful install: apply in order
     - `adb -s <serial> shell am force-stop space.bandfan.mobile`
     - relaunch once
     - only then `pm clear` for runtime/unknown categories
     - reinstall and relaunch once

If iPhone path is requested instead of Android APK deploy:
- Explain this workflow deploys Android APKs only.
- Provide iOS setup prerequisites and links:
  - Enable iPhone Developer Mode in Settings > Privacy & Security > Developer Mode after first dev-signed install.
  - Trust the development machine when prompted on device.
  - Use Expo development build guidance for iOS device setup.

Knowledge base links:
- Android developer options: https://developer.android.com/studio/debug/dev-options
- Android device setup and troubleshooting: https://developer.android.com/studio/run/device
- React Native running on device: https://reactnative.dev/docs/running-on-device
- Expo development builds: https://docs.expo.dev/develop/development-builds/create-a-build/
- Expo docs repository: https://github.com/expo/expo/tree/main/docs
- React Native docs repository: https://github.com/facebook/react-native-website/tree/main/docs

Output requirements:
- show command-by-command status
- show which fallbacks were used
- if startup diagnostics run, output one line: most likely cause + first fix
- include diagnosis confidence: high/medium/low
- include exact next command for user if blocked; never output blank command bullets
