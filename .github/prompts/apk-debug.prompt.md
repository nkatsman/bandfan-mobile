---
name: "apk-debug"
description: "Run the BandFan Android debug APK on a connected phone with Metro Fast Refresh. Use when: apk debug, run on phone, connect device, start Metro, adb reverse, launch app."
argument-hint: "Optional: device serial, APK path, or say reconnect only"
---
Use the `BandFan RN Dev APK Orchestrator` agent.

Goal:
Run the BandFan mobile Android debug APK on the connected physical Android phone with Metro Fast Refresh.

Environment split policy:
- debug/dev runs must use development environment values (for example `apps/mobile/.env.local`)
- debug/dev runs must not use release signing inputs (`BANDFAN_UPLOAD_*`)
- debug/dev runs may use localhost or adb reverse as needed
- release-only checks (non-debug signer, no localhost API endpoints) do not apply to debug runs

Default behavior:
- prefer connected device serial `41050DLJG000PD` when present
- do not stop just because `adb devices -l` hangs once; use bounded retries and direct `adb -s 41050DLJG000PD get-state` / `shell getprop` probes first
- take action in terminals; do not tell the user to run commands when the agent can run them
- use app id `space.bandfan.mobile`
- use launch activity `space.bandfan.mobile/.MainActivity`
- use Metro port `8081`
- start Metro from `apps/mobile` with `npx expo start --dev-client --port 8081`
- if Metro is stopped, crashed, missing from the terminal list, or port `8081` is not listening, restart Metro yourself before reporting status
- run `adb reverse tcp:8081 tcp:8081`
- install a debug APK only when the app is missing, stale, or explicitly requested
- otherwise reconnect Metro and relaunch the installed app

Autonomy policy:
- for recoverable states, execute the recovery instead of giving instructions
- recoverable states include: Metro stopped, Metro terminal missing, adb reverse missing, app needs relaunch, app shows dev-server/load-script error, stale port state, and first ADB enumeration timeout
- only ask the user to act when a required secret/prompt/physical action is truly needed: USB cable missing, phone unauthorized, RSA prompt, phone locked with no authorization, or insufficient permissions
- if blocked, give one concrete manual action and one concrete command; never output empty bullets

Crash and health policy:
- do not decide "no crash" from PID alone
- check recent logcat and crash buffer for `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS`, `Unable to load script`, `Could not connect`, `DevServer`, and package `space.bandfan.mobile`
- if the app process is alive but Metro is down or logcat shows load-script/dev-server errors, classify it as Metro/dev-server failure and restart Metro + reverse + relaunch
- after any recovery, verify with direct bundle/status request or Metro output and a fresh app relaunch

ADB hang recovery policy:
- never leave the user with blank next commands
- if `adb devices -l` hangs or times out, retry once with the explicit adb path `D:/Android/Sdk/platform-tools/adb.exe`
- if the preferred serial is known, probe it directly with `adb -s 41050DLJG000PD get-state`
- if direct serial probe succeeds, continue; do not call the device blocked
- only restart the adb server after direct serial probe also fails
- only ask the user to reconnect/authorize after both enumeration and direct serial probes fail

APK lookup order:
1. `D:/bfm/android/app/build/outputs/apk/debug/app-debug.apk`
2. `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

If no APK exists and install is needed:
- build from `D:/bfm/android` when available
- otherwise build from `apps/mobile/android`

Required status output:
- device found or blocked
- Metro running or started
- ADB reverse active
- APK installed or reused
- app launched or exact failure
- if blocked, give one next command only and make sure it is not blank

Keep output short.
