---
name: adb-device-check
description: "Checks physical Android connection with adb devices and handles no-device fallback for USB debugging/RSA trust/reconnect."
---
# ADB Device Check

Use when validating whether a physical Android device is available for deploy.

## Primary command
```powershell
adb devices -l
```

Use a bounded timeout. A hung `adb devices -l` is not, by itself, proof that the phone is disconnected.

## Success criteria
- At least one device row shows status `device`.

## Target selection rules
- If a preferred serial is known, probe it directly before blocking:
```powershell
adb -s <serial> get-state
adb -s <serial> shell getprop ro.build.version.sdk
```
- If direct serial probing succeeds, select that serial even if `adb devices -l` hung or produced stale output.
- If exactly one Android device is `device`, lock that serial as `<serial>`.
- If two or more Android devices are `device`, require explicit target serial selection.
- If any device is `unauthorized` or `offline`, treat as blocked until re-authorized/reconnected.
- If no Android device is listed and the user mentions an iPhone connection, explain ADB cannot target iOS hardware.

## Fallback when `adb devices -l` hangs
1. Probe the preferred serial directly when available.
2. If direct probe fails, run:
```powershell
adb kill-server
adb start-server
```
3. Re-run direct serial probe, then `adb devices -l`.
4. Only ask the user to reconnect/authorize after these checks fail.

## Fallback when no device found
1. Ask user to enable Developer options and USB debugging.
2. Ask user to reconnect USB cable and accept the RSA fingerprint prompt on phone.
3. Re-run:
```powershell
adb devices -l
```

## Return
- connected device serial(s)
- selected target serial
- whether fallback was used
- blocker message if still no device
