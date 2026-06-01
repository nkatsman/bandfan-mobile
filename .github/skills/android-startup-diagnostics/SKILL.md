---
name: android-startup-diagnostics
description: "Diagnoses install-success launch-failure on Android by verifying process startup, capturing crash logs, and applying ordered recovery steps."
---
# Android Startup Diagnostics

Use when APK installs but app does not open, closes immediately, fails to stay running, shows a red error screen, cannot load the script, cannot connect to the development server, or the user asks whether it crashed.

## Primary diagnostics
1. Clear old crash lines to avoid stale attribution:
```powershell
adb -s <serial> logcat -c
```
2. Timed launch:
```powershell
adb -s <serial> shell am start -W -n space.bandfan.mobile/.MainActivity
```
3. Process presence:
```powershell
adb -s <serial> shell pidof space.bandfan.mobile
```
4. Recent app/dev-server log capture:
```powershell
adb -s <serial> logcat -d -t 400 | Select-String -Pattern "space.bandfan.mobile|ReactNativeJS|DevServer|Unable to load script|Could not connect|FATAL EXCEPTION|AndroidRuntime|Exception|Error" -CaseSensitive:$false
```
5. Crash buffer capture:
```powershell
adb -s <serial> logcat -d -b crash
```
6. Optional package sanity:
```powershell
adb -s <serial> shell dumpsys package space.bandfan.mobile
```

PID interpretation:
- A PID only means the process exists.
- It does not prove the JS bundle loaded or that the app is healthy.
- If PID exists but recent logs show `Unable to load script`, `Could not connect`, or `DevServer`, diagnose Metro/dev-server wiring and recover Metro + reverse + relaunch.

## Crash-pattern matcher (required)
After collecting crash output, match the first high-signal pattern and return one concise diagnosis line.

Recommended quick filter:
```powershell
adb -s <serial> logcat -d -b crash | Select-String -Pattern "space.bandfan.mobile|AndroidRuntime|FATAL EXCEPTION|UnsatisfiedLinkError|ActivityNotFoundException|ClassNotFoundException|Unable to start activity|NoClassDefFoundError|Could not find class|Couldn't load script|Unable to load script" -CaseSensitive:$false
```

Pattern to likely cause mapping:
- `UnsatisfiedLinkError|dlopen failed|No implementation found` -> native library or ABI mismatch. First fix: verify device ABI vs APK native-code and rebuild/reinstall.
- `ActivityNotFoundException|ClassNotFoundException|Could not find class.*MainActivity` -> activity/class mismatch. First fix: verify package/activity, then clean rebuild and reinstall.
- `Unable to start activity|FATAL EXCEPTION: main` -> runtime startup crash. First fix: clear app data, relaunch, inspect first stack trace app frame.
- `NoClassDefFoundError` -> missing dependency/class at runtime. First fix: clean rebuild, reinstall, and verify dependency packaging.
- `Couldn't load script|Unable to load script` -> Metro/dev-bundle connection issue. First fix: restart Metro, rerun adb reverse, relaunch.
- `Could not connect to development server|DevServerException` -> Metro/dev-server connection issue. First fix: restart Metro, rerun adb reverse, relaunch.

If no pattern matches, return `unknown-startup-crash` and include top 10 crash lines.

Confidence guidance:
- `high`: direct match with package-specific crash lines and known pattern.
- `medium`: pattern match without package-specific lines.
- `low`: no clear match, using unknown fallback.

## Recovery sequence
1. Force-stop only:
```powershell
adb -s <serial> shell am force-stop space.bandfan.mobile
```
2. Relaunch once with `am start -W`.
3. Only if category is `Unable to start activity|FATAL EXCEPTION: main|NoClassDefFoundError|unknown-startup-crash`, clear app data:
```powershell
adb -s <serial> shell pm clear space.bandfan.mobile
```
4. Reinstall current debug APK.
5. Relaunch with `am start -W` once.

Do not clear app data first for ABI mismatch, activity/class mismatch, or Metro script-load issues.

## Common blocker patterns and fixes
- Native library / ABI crash:
  - verify device ABI and APK native-code compatibility
  - rebuild debug APK with matching architecture support
- Immediate Java/Kotlin startup crash:
  - inspect `AndroidRuntime` / `FATAL EXCEPTION` lines in crash buffer
  - clear app data and retry; if persistent, rebuild and reinstall
- Activity not found or intent error:
  - verify package and launch activity are `space.bandfan.mobile/.MainActivity`
- Works on old APK but not latest:
  - compare crash excerpt between builds
  - clean rebuild of debug APK then reinstall

## Return
- launch timing result
- process running yes/no
- crash excerpt (or "none")
- most likely cause and first fix
- diagnosis confidence (high/medium/low)
- recovery steps applied
- next manual action if still blocked
