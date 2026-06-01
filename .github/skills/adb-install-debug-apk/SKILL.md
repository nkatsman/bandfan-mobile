---
name: adb-install-debug-apk
description: "Installs BandFan debug APK over adb with uninstall-and-retry fallback on install failure."
---
# Install Debug APK

Use when installing the Android debug build onto a connected physical device.

## Primary command
```powershell
adb -s <serial> install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Optional path fallback before install
If the primary path does not exist, try:
```powershell
adb -s <serial> install -r D:/bfm/android/app/build/outputs/apk/debug/app-debug.apk
```

## Build fallback when APK does not exist
From `apps/mobile/android`, run:
```powershell
.\gradlew.bat :app:assembleDebug --no-daemon --console=plain
```
Then retry install once.

## Fallback when install fails
1. Remove old app:
```powershell
adb -s <serial> uninstall space.bandfan.mobile
```
2. Retry install once using the same APK path.

## Return
- selected serial
- apk path used
- install outcome
- whether uninstall fallback was used
- final blocker if still failing
