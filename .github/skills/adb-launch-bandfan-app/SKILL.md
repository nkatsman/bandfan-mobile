---
name: adb-launch-bandfan-app
description: "Launches the BandFan Android activity via adb shell am start and handles package/activity mismatch fallback."
---
# Launch App Activity

Use when starting the installed app from terminal.

## Primary command
```powershell
adb -s <serial> shell am start -W -n space.bandfan.mobile/.MainActivity
```

## Post-launch verification
```powershell
adb -s <serial> shell pidof space.bandfan.mobile
```

## Fallback when launch fails
1. Prompt to verify package id and activity name.
2. Run targeted recovery:
```powershell
adb -s <serial> shell am force-stop space.bandfan.mobile
adb -s <serial> shell pm clear space.bandfan.mobile
```
3. Capture crash details:
```powershell
adb -s <serial> logcat -d -b crash
```
4. Reinstall the debug APK.
5. Retry launch once:
```powershell
adb -s <serial> shell am start -W -n space.bandfan.mobile/.MainActivity
```

## Return
- selected serial
- launch command result
- post-launch process check result
- whether reinstall/verification fallback was used
- crash excerpt when available
- blocker details if launch still fails
