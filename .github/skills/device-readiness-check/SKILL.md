---
name: device-readiness-check
description: "Validates whether a target phone is actually ready for BandFan debug deploy (Android SDK/ABI/debug prerequisites), and provides fix instructions including iPhone developer-mode guidance when iOS is requested."
---
# Device Readiness Check

Use before APK install to confirm the selected device can run the target debug build and connect to Metro.

## Inputs
- target serial (Android)
- optional apk path
- optional target platform intent (`android` or `ios`)

## Android readiness commands
1. Device presence and status:
```powershell
adb devices -l
```
2. Platform API level:
```powershell
adb -s <serial> shell getprop ro.build.version.sdk
```
3. CPU ABI support:
```powershell
adb -s <serial> shell getprop ro.product.cpu.abilist
```
4. Optional APK requirement inspection when APK exists:
```powershell
aapt dump badging <apk-path>
```
5. Optional package precheck:
```powershell
adb -s <serial> shell pm list packages space.bandfan.mobile
```

## Android pass criteria
- Device state is `device` (not `offline` or `unauthorized`).
- API level is compatible with APK minSdkVersion.
- Device ABI list contains at least one APK native-code ABI (or APK is architecture-agnostic).
- USB debugging is enabled and RSA trust is accepted.

## `aapt` fallback behavior
- If `aapt` is unavailable on host, do not fail readiness solely for that reason.
- Continue with SDK/ABI/device-state checks and report `apk-badging-skipped` as a warning.
- Suggested host check:
```powershell
Get-Command aapt -ErrorAction SilentlyContinue
```

## Android fix instructions by failure type
- `unauthorized`:
  - unlock phone and accept RSA fingerprint prompt
  - if prompt does not appear: toggle USB debugging off/on and reconnect cable
- `offline`:
  - reconnect cable, disable/enable USB debugging, run `adb kill-server` then `adb start-server`
- no device detected:
  - enable Developer options, enable USB debugging, use data-capable cable
  - on Windows, install OEM USB driver if needed
- minSdk mismatch:
  - use newer Android device or build flavor/APK compatible with the device SDK
- ABI mismatch:
  - rebuild APK with matching architecture support, or use device with supported ABI
- vendor restrictions (common on some OEM ROMs):
  - enable vendor-specific "Install via USB" / "USB debugging (Security settings)" options when present

## iPhone / iOS guidance
This workflow deploys Android APKs via ADB and cannot install on iPhone.

If user asks for iPhone development setup, provide this path:
- iPhone requires an iOS build, not APK
- enable iPhone Developer Mode: Settings > Privacy & Security > Developer Mode
- trust the development machine when prompted
- use Expo development-build flow for iOS device provisioning/signing

## Knowledge base references
- Android developer options: https://developer.android.com/studio/debug/dev-options
- Android hardware device setup and troubleshooting: https://developer.android.com/studio/run/device
- React Native running on device: https://reactnative.dev/docs/running-on-device
- Expo development builds: https://docs.expo.dev/develop/development-builds/create-a-build/
- Expo docs source (GitHub): https://github.com/expo/expo/tree/main/docs
- React Native docs source (GitHub): https://github.com/facebook/react-native-website/tree/main/docs

## Return
- readiness status: pass/fail
- selected serial (android)
- detected sdk and abi values
- apk constraints summary when checked
- warnings (for example `apk-badging-skipped`)
- blocker category
- exact next fix steps
