---
name: adb-reverse-metro
description: "Configures adb reverse for Metro port 8081, with automatic retry/relink before same-network fallback guidance."
---
# Reverse Metro Port

Use when wiring device traffic back to local Metro bundler.

## Primary command
```powershell
adb -s <serial> reverse tcp:8081 tcp:8081
```

## Fallback when reverse fails
- Do not immediately hand work back to the user.
- Verify Metro is running on port `8081`.
- Probe the selected serial directly with `adb -s <serial> get-state`.
- Reattempt reverse once:
```powershell
adb -s <serial> reverse tcp:8081 tcp:8081
```
- If reverse still fails and the device is reachable, restart adb server once, rerun direct serial probe, then retry reverse.
- Only after those attempts fail, explain that `adb reverse` may be unsupported or blocked and provide same-network connection guidance.

## Return
- selected serial
- reverse outcome
- whether automatic retry/relink was executed
- whether manual network setup is required
