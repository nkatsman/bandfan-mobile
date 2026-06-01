---
name: expo-metro-dev-client
description: "Starts and maintains Expo Metro for Android dev-client Fast Refresh, with restart plus reverse-port relink fallback when Metro crashes."
---
# Metro Keep-Alive For Fast Refresh

Use when enabling live reload/Fast Refresh while running debug build on device.

## Primary command
Run from `apps/mobile`:
```powershell
npx expo start --dev-client
```

## Fallback when Metro crashes or exits
Do not ask the user to restart Metro when terminal tools are available. Restart it directly.

1. Check whether port `8081` answers:
```powershell
Invoke-WebRequest http://127.0.0.1:8081/status -UseBasicParsing -TimeoutSec 10
```
2. If status is not `packager-status:running`, restart Metro in `apps/mobile`:
```powershell
npx expo start --dev-client --port 8081
```
3. Re-run reverse port setup:
```powershell
adb -s <serial> reverse tcp:8081 tcp:8081
```
4. Re-launch app activity:
```powershell
adb -s <serial> shell am start -n space.bandfan.mobile/.MainActivity
```

## If app is alive but cannot load script
- Treat as Metro/dev-server wiring failure.
- Restart or verify Metro, rerun adb reverse, force-stop app, relaunch.
- Do not call this a successful app health check merely because `pidof` returns a PID.

## Return
- selected serial
- Metro status
- crash detected yes/no
- whether reverse+relaunch recovery was executed
