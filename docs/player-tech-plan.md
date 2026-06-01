# Player — Technical Improvement Plan

> Research date: June 2026  
> Scope: playback engine, state management, caching, background audio, lock-screen controls, normalization  
> Out of scope: UI layout, screen design, auth, backend contracts

---

## 1. Reference Repositories & Sources

| Source | What to study | License |
|---|---|---|
| [doublesymmetry/react-native-track-player (v4)](https://github.com/doublesymmetry/react-native-track-player/tree/v4) | Background service pattern, queue guard, seek debounce | Apache-2.0 (**v5 is commercially licensed — do not use v5 without purchasing a license**) |
| [expo-audio docs](https://docs.expo.dev/versions/latest/sdk/audio/) | `useAudioPlayer`, `useAudioPlaylist`, `preload()`, `downloadFirst`, `setActiveForLockScreen`, `useAudioPlayerStatus` | MIT (part of Expo SDK) |
| [expo-file-system docs](https://docs.expo.dev/versions/latest/sdk/filesystem/) | `File.downloadFileAsync`, `Paths.document`, `Paths.cache`, `DownloadTask` | MIT |
| [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) | Encrypted sync key-value store, Zustand persist adapter | MIT |
| RNTP v4 example `/src/hooks/` | `useSetupTrackPlayer`, `useTrackPlayerEvents`, skip-guard pattern | Apache-2.0 |

---

## 2. Current Architecture — Root Causes of Known Bugs

### 2.1 Layered-audio bug (rapid skip / back)

**Location:** `src/state/player-store.ts` — `nextTrack`, `previousTrack`, `playSong`

```
// inside nextTrack / previousTrack
void playSong(nextSong);  // ← fire-and-forget inside Zustand set callback
```

`playSong` is async. Both `nextTrack` and `previousTrack` call it with `void` inside a synchronous Zustand set callback. If the user taps skip twice in quick succession:

1. Call A enters `playSong`, reads `playbackSound !== null`, calls `unloadPlaybackSound()`.
2. Inside `unloadPlaybackSound`, `playbackSound = null` is set **synchronously** before the `await soundToUnload.unloadAsync()`.
3. Call B enters `playSong`, reads `playbackSound === null` (it was just nulled), skips to `Audio.Sound.createAsync(...)`.
4. Call A's `await unloadPlaybackSound()` resumes, then **also** calls `Audio.Sound.createAsync(...)`.
5. Result: two sound objects load concurrently. Whichever finishes last "wins" the `playbackSound` variable. The other sound plays silently in memory — layered audio.

There is **no in-flight guard** (no request ID, no AbortController reference, no lock).

### 2.2 Progress bar thumb flicker

**Location:** `src/components/ui/seek-bar.tsx`, `src/state/player-store.ts — seekToPercent`

```
// seekToPercent in store
set({ progressPercent: clamped });         // 1. optimistic update → rerenders SeekBar
void (async () => {
  await playbackSound.setPositionAsync(…); // 3. async seek completes
})();
// meanwhile, handlePlaybackStatus fires:
usePlayerStore.setState({ progressPercent });  // 2. overrides the optimistic with actual position
```

The status callback fires at `expo-av`'s internal interval (~500ms). When the user drags and releases the thumb, the optimistic store update happens at step 1, but the status callback fires at step 2 and resets `progressPercent` back to the pre-seek position before `setPositionAsync` completes at step 3. The result: thumb visibly snaps back, then jumps to the correct position.

SeekBar has a local `isDragging` guard that blocks incoming `value` prop changes while dragging — but it does **not** guard the brief window between `onPanResponderRelease` (which exits dragging) and the seek completing.

### 2.3 Normalization — flag-only, not applied

**Location:** `src/state/player-store.ts — isNormalizationEnabled`, `src/features/preferences/player-settings-api.ts`

The `isNormalizationEnabled` flag:
- Is persisted to Firebase via `/api/account/settings`
- Is correctly loaded into the player store
- Is surfaced in the UI via `music-preference-controls.tsx`
- **Is never read by the audio playback path** — `expo-av`'s `Audio.Sound.createAsync` does not receive any gain/volume instruction based on this flag

The normalization flow (API round-trip, Zod schema, default value) must **not be changed**. Only the playback side needs to implement the actual audio effect.

### 2.4 Background audio stops after ~3 minutes on Android

**Location:** `src/state/player-store.ts — ensureAudioMode`

```ts
await Audio.setAudioModeAsync({ staysActiveInBackground: true });
```

This is the `expo-av` mechanism, which is insufficient on Android. Android requires a `FOREGROUND_SERVICE` with `foregroundServiceType="mediaPlayback"` and an associated `MediaSession` notification to keep audio alive past ~3 minutes when the screen is off. The current build does not declare this service.

### 2.5 No buffering / loading state exposed to UI

`expo-av`'s `AVPlaybackStatus` has `isBuffering` but the current store never reads or propagates it. The UI has no way to show a loading spinner or disable controls while a track is loading.

### 2.6 `ensureAudioMode` called on every track load

Called inside `playSong` on every track switch. It is an async operation that adds latency to every track start. It only needs to be called once on app startup (or once on first play).

---

## 3. Migration Path — `expo-av` → `expo-audio`

`expo-audio` is the official successor to `expo-av` (both maintained by Expo, both MIT). It is already in the Expo SDK and does not require adding a new dependency for Expo-managed projects.

### Key API changes

| Current (`expo-av`) | New (`expo-audio`) | Why |
|---|---|---|
| `Audio.Sound.createAsync(uri)` | `createAudioPlayer(source)` or `player.replace(source)` | `replace()` is atomic — no unload/reload race |
| `sound.setOnPlaybackStatusUpdate(fn)` | `useAudioPlayerStatus(player)` hook or `player.addListener('playbackStatusUpdate', fn)` | React-native, no manual subscription teardown |
| `sound.setPositionAsync(ms)` | `player.seekTo(seconds)` | Native seek, returns a Promise |
| Manual `Audio.setAudioModeAsync` | `setAudioModeAsync({ shouldPlayInBackground, interruptionMode })` once at startup | Same API, clearer options |
| Background: `staysActiveInBackground: true` only | Config plugin `enableBackgroundPlayback: true` + `player.setActiveForLockScreen(true, metadata)` | Proper Android foreground service + lock screen |
| No preloading | `Audio.preload(url, { preferredForwardBufferDuration: 30 })` | Preload next track while current plays |
| No native playlist | `useAudioPlaylist({ sources, loop })` | Gapless or near-gapless queue, native next/previous |
| No buffering state | `status.isBuffering` from `useAudioPlayerStatus` | Expose to UI |
| `updateInterval` fixed (~500ms) | `useAudioPlayer(source, { updateInterval: 100 })` | Smooth progress bar |

### Atomic source swap — fixes layered audio

```ts
// Instead of: unload + createAsync (two-step, race-prone)
player.replace({ uri: song.audioUrl }); // atomic, no intermediate null state
player.play();
```

`replace()` is synchronous from the JS side — it tells the native layer to swap the source. No intermediate unloaded state. No race between two concurrent `createAsync` calls.

### What stays the same

- Zustand store shape (`queue`, `activeIndex`, `shuffle`, `loopMode`, `progressPercent`, etc.) — no changes
- `PlayerSettings` schema and normalization flow in `player-settings-api.ts` — no changes
- `SeekBar` component — minor guard improvement only (see §4.2)
- All API calls, Firebase auth, song types — no changes
- `normalizationEnabled` flag persistence and load path — no changes

---

## 4. Bug Fixes

### 4.1 Concurrency guard for track changes

Add a module-level `pendingPlayId` ref (a counter or UUID). On every call to `playSong`, stamp the request. Before doing anything async (including replace/seek), check if the stamp is still current. Abandon if it has been superseded.

```ts
let pendingPlayId = 0;

async function playSong(song: Song | null) {
  const thisId = ++pendingPlayId;
  // ...
  // before every await:
  if (pendingPlayId !== thisId) return; // superseded by newer request
}
```

This pattern is adapted from RNTP's example `useSetupTrackPlayer` hook and standard React data-fetching cancel patterns.

### 4.2 Seek bar flicker fix

Two complementary fixes:

**A. Post-seek progress freeze (in player store):**  
After calling `seekTo`, disable processing of `progressPercent` updates from the status callback for ~400ms (a short debounce window). Store a `seekingUntil: number | null` timestamp. `handlePlaybackStatus` checks it and skips the state update if `Date.now() < seekingUntil`.

**B. SeekBar local drag state extended through seek commit:**  
Keep `isDragging = true` until the `onSeek` callback fires AND the store's `progressPercent` matches the seek target within a tolerance (±1%). This prevents the thumb from snapping back between `onPanResponderRelease` and seek completion.

### 4.3 Audio mode — call once

Move `ensureAudioMode` / `setAudioModeAsync` out of `playSong` and into a one-time `initializeAudio()` function called at app startup (e.g., from `app-providers.tsx`). Add a boolean guard so it is called at most once.

---

## 5. New Features to Add

### 5.1 Background playback + lock screen controls (Android & iOS)

**Config changes:**
```json
// app.json
["expo-audio", { "enableBackgroundPlayback": true }]
```

**Runtime:**
```ts
// on every track start:
player.setActiveForLockScreen(true, {
  title: song.title,
  artist: song.artist,
  artworkUrl: song.coverArtUrl,
});

// on stop / app unmount:
player.clearLockScreenControls();
```

Android also requires `requestNotificationPermissionsAsync()` once before showing lock-screen controls.

**References:** expo-audio docs §"Playing audio in the background", §`setActiveForLockScreen`

### 5.2 Preloading next track

When a track starts playing and the queue has a next item, call `Audio.preload(nextSong.audioUrl)` with a forward buffer duration. The expo-audio `useAudioPlayer` or `createAudioPlayer` call will then resolve the preloaded buffer near-instantly.

```ts
// after playSong succeeds
const nextSong = queue[getNextQueueIndex(state, true)];
if (nextSong?.audioUrl) {
  void Audio.preload(nextSong.audioUrl, { preferredForwardBufferDuration: 30 });
}
```

Clear the preload cache (`Audio.clearPreloadedSource`) when the queue changes significantly (new selection, shuffle toggle).

### 5.3 Buffering / loading state in Zustand

Add `isLoading: boolean` to `PlayerState`. Derive it from `useAudioPlayerStatus`:

```ts
isLoading: status.isBuffering || !status.isLoaded
```

Expose it through the store so the UI can show a spinner or disable the seek bar while loading.

### 5.4 Normalization — actual implementation

The flag already exists, is persisted, and is loaded into the store. The missing piece is applying it to the audio output.

**Approach — volume-based soft normalization:**  
- Firebase Storage audio files may or may not have ReplayGain metadata. Until the backend stores per-track loudness metadata, a simpler approach is a **per-track volume target**: after loading a track, read back its amplitude envelope from the first few seconds using `useAudioSampleListener` (expo-audio) and compute an approximate RMS. Scale the player's `volume` property to target a consistent perceived loudness (e.g., −14 LUFS target → rough equivalent volume multiplier).

**Alternative approach (more reliable, no per-track computation):**  
- Store a `replayGainDb` field on the Firestore song document (populated server-side during upload/transcoding). When `isNormalizationEnabled === true`, apply `player.volume = Math.pow(10, replayGainDb / 20) * masterVolume` when loading each track.

**What must not change:**  
- `isNormalizationEnabled` flag name and type in `PlayerSettings`  
- Zod schema in `player-settings-api.ts`  
- API read/write path (`/api/account/settings`)  
- Default value (`true`)  
- UI toggle and `toggleNormalization` store action

### 5.5 Encrypted audio caching

**Goal:** cache Firebase Storage audio files on device so songs play offline and are not readable as plain media files from the device file system.

**Stack:**
- `expo-file-system` — download and store files (`Paths.document` for persistence, not purged by OS)
- `expo-crypto` — AES-256-GCM encryption of cached file bytes
- `expo-secure-store` — store per-device encryption key in the OS keychain (iOS Keychain / Android Keystore)
- `react-native-mmkv` (MIT) — fast encrypted key-value index mapping `songId → localFilePath + iv + etag`

**Flow:**
1. On first play of a song, download the signed Firebase Storage URL to a temp path.
2. Read bytes, encrypt with AES-256-GCM using a per-device key from `expo-secure-store`.
3. Write encrypted bytes to `Paths.document/audio-cache/<songId>.enc`.
4. Store `{ localPath, iv, etag, cachedAt }` in MMKV under key `audio-cache:${songId}`.
5. On subsequent plays: read MMKV index, if cache hit: decrypt bytes to a temp in-memory buffer or temp file, pass that URI to the player.
6. Expire cache entries by `cachedAt` or when the MMKV etag differs from the current Firebase Storage object metadata.

**MMKV integration with Zustand persist middleware** is documented in the MMKV repo's [WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md](https://github.com/mrousavy/react-native-mmkv/blob/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md).

**Why this prevents copy-paste:**  
The `.enc` files in `Paths.document` contain AES-256-GCM ciphertext. Without the device-specific key in the keychain/keystore, the files are unplayable noise. A rooted device can access the keychain, but that is outside the threat model for normal distribution (App Store / Play Store).

**Note:** `expo-audio`'s built-in `downloadFirst: true` option downloads to the system `tmp` directory and is purged at OS discretion. It does not encrypt. Use it for background buffering; use the custom cache above for persistent encrypted offline storage.

### 5.6 Error recovery

The current error handler:
```ts
if ('error' in status && status.error) {
  usePlayerStore.setState({ isPlaying: false, progressPercent: 0 });
}
```

This silently stops playback. Improvements:
- Expose `playbackError: string | null` in store state.
- On error, attempt one automatic retry after 1.5s (re-call `player.replace(source)`) before surfacing to the UI.
- If the error is a Firebase Storage URL expiry (signed URLs expire), re-fetch the URL from the API before retrying.
- After one failed retry, set `playbackError` and show a non-blocking toast in the UI.

### 5.7 Smooth progress bar (high-frequency updates)

Set `updateInterval: 100` (100ms) on the audio player to get 10 updates/second. The seek bar thumb will animate smoothly at this rate without a custom timer. Ensure the seek-freeze window from §4.2 is also applied to prevent the 100ms updates from fighting against an in-progress seek.

---

## 6. What NOT to Change

- **Normalization API contract** — `PlayerSettings.normalizationEnabled`, Zod schema, default, `/api/account/settings` endpoint
- **Queue / store state shape** — `queue`, `activeIndex`, `activeSong`, `loopMode`, `isShuffleEnabled` — Zustand state keys should stay the same; only internal playback calls change
- **Auth and Firebase config** — bearer token, `firebase.ts`, `env.ts`
- **All UI components** — `SeekBar`, `MiniPlayer`, `PlayerScreen`, `FullPlayerPanel` — only minimal prop/state changes
- **`syncSongInteractionIds`, `setSongLiked`, `setSongVoted`** — interaction sync is unrelated to playback
- **`playSelection` signature** — called from discovery, liked, and playlist screens

---

## 7. Implementation Order

1. **Fix layered audio** — add `pendingPlayId` guard to `playSong` (§4.1) — highest impact, lowest risk
2. **Move `ensureAudioMode` out of `playSong`** (§4.3) — no behavior change, reduces startup latency
3. **Migrate `expo-av` → `expo-audio`** (§3) — swap `Audio.Sound.createAsync` for `createAudioPlayer` + `player.replace()`. Update `handlePlaybackStatus` to use `useAudioPlayerStatus`. Test all playback paths.
4. **Fix seek bar flicker** (§4.2) — add post-seek freeze window in store + extend SeekBar drag guard
5. **Add background playback + lock screen** (§5.1) — config plugin + `setActiveForLockScreen`
6. **Add `isLoading` / buffering state** (§5.3) — expose to UI
7. **Preloading next track** (§5.2) — after confirming stable playback
8. **Implement actual normalization** (§5.4) — needs decision on `replayGainDb` field vs. dynamic analysis
9. **Error recovery** (§5.6)
10. **Encrypted audio cache** (§5.5) — last, after playback is stable

---

## 8. Packages Summary

| Package | Purpose | License | Already in project |
|---|---|---|---|
| `expo-audio` | Replaces `expo-av` for playback | MIT | No (use `expo install`) |
| `expo-file-system` | Audio cache download + file ops | MIT | Likely yes (Expo SDK) |
| `expo-secure-store` | Store encryption key in keychain | MIT | Likely yes (Expo SDK) |
| `expo-crypto` | AES-256-GCM encrypt/decrypt cached audio | MIT | No |
| `react-native-mmkv` | Fast encrypted cache index (Zustand persist) | MIT | No |
| `react-native-track-player` | Reference only — RNTP v4 patterns | Apache-2.0 (v4 only) | No — reference, not installing |
