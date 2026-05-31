---
name: "vm"
description: "Launch a preset BandFan Android emulator VM from the D-drive SDK/AVD setup. Use when the user asks for /vm, emulator, Android virtual device, Pixel 4a, Pixel 7, or Pixel 7 Pro."
argument-hint: "Optional: pixel4a, pixel7, pixel7pro, list, or status"
---
Launch or inspect a BandFan Android emulator VM using the D-drive Android setup.

Always use these paths:

- `ANDROID_HOME=D:\Android\Sdk`
- `ANDROID_SDK_ROOT=D:\Android\Sdk`
- `ANDROID_AVD_HOME=D:\Android\Avd`
- prepend `D:\Android\Sdk\platform-tools`, `D:\Android\Sdk\emulator`, and `D:\Android\Sdk\cmdline-tools\latest\bin` to `Path`

Preset choices:

- `pixel4a` -> `BandFan_Pixel_4a_API_36`
- `pixel7` -> `BandFan_Pixel_7_API_36`
- `pixel7pro` -> `BandFan_Pixel_7_Pro_API_36`
- default when no choice is provided -> `pixel7`
- `list` -> list available AVDs
- `status` -> show `adb devices -l`, `sys.boot_completed`, `wm size`, and `wm density`

For a launch request, run the emulator async so it stays open:

```powershell
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
$env:ANDROID_AVD_HOME='D:\Android\Avd'
$env:Path='D:\Android\Sdk\platform-tools;D:\Android\Sdk\emulator;D:\Android\Sdk\cmdline-tools\latest\bin;' + $env:Path
D:\Android\Sdk\emulator\emulator.exe -avd <AVD_NAME> -no-snapshot-save
```

For `list`, run:

```powershell
$env:ANDROID_AVD_HOME='D:\Android\Avd'
D:\Android\Sdk\emulator\emulator.exe -list-avds
```

For `status`, run:

```powershell
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
$env:ANDROID_AVD_HOME='D:\Android\Avd'
$env:Path='D:\Android\Sdk\platform-tools;D:\Android\Sdk\emulator;D:\Android\Sdk\cmdline-tools\latest\bin;' + $env:Path
adb devices -l
adb shell getprop sys.boot_completed
adb shell wm size
adb shell wm density
```

After launching, report the selected preset, AVD name, terminal id if one exists, and the follow-up status command. Do not install Android Studio or change SDK packages from this prompt.
