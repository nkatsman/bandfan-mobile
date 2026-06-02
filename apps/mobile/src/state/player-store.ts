import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { EventSubscription } from 'expo-modules-core';

import { claimPlaybackLease, fetchPlaybackLease, isPlaybackLeaseOwnedByThisDevice, releasePlaybackLease } from '../features/player/playback-lease-api';
import { dbToNativeVolume, deriveEffectivePlaybackNormalizationGainDb } from '../lib/loudness';
import { Song } from '../types/music';

let pendingPlayId = 0;
let player: AudioPlayer | null = null;
let playerSubscription: EventSubscription | null = null;
let playbackSongId: string | null = null;
let finishedSongId: string | null = null;
let seekingUntil: number | null = null;
let audioModeInitialized = false;
let playIntentUntil: number | null = null;
let playbackStateOverride: { isPlaying: boolean; until: number } | null = null;
let activePlaybackLeaseId: string | null = null;
let lastPlaybackProgressUpdateAt = 0;
let ignoreNativeStatusUntil = 0;

const PLAYBACK_PROGRESS_UPDATE_MS = 500;
const PLAYBACK_STATE_OVERRIDE_MS = 900;
const SOURCE_CHANGE_STATUS_IGNORE_MS = 900;

function setPlaybackStateOverride(isPlaying: boolean) {
  playbackStateOverride = { isPlaying, until: Date.now() + PLAYBACK_STATE_OVERRIDE_MS };
}

function readPlaybackStateOverride() {
  if (!playbackStateOverride) {
    return null;
  }

  if (Date.now() >= playbackStateOverride.until) {
    playbackStateOverride = null;
    return null;
  }

  return playbackStateOverride.isPlaying;
}

async function claimCurrentPlaybackLease(songId: string) {
  try {
    const lease = await claimPlaybackLease(songId);
    activePlaybackLeaseId = lease.leaseId;
  } catch {
    activePlaybackLeaseId = null;
  }
}

async function releaseCurrentPlaybackLease() {
  const leaseId = activePlaybackLeaseId;
  activePlaybackLeaseId = null;

  if (!leaseId) {
    return;
  }

  try {
    await releasePlaybackLease(leaseId);
  } catch {
    // Lease release is best-effort; the server TTL clears stale owners.
  }
}

function hasFreshPlayIntent() {
  return playIntentUntil !== null && Date.now() < playIntentUntil;
}

function clearCurrentPlayback() {
  playIntentUntil = null;
  playbackStateOverride = null;
  player?.pause();
  player?.clearLockScreenControls();
  playbackSongId = null;
  finishedSongId = null;
}

function syncNativePlayerVolume(song: Song | null, isNormalizationEnabled: boolean) {
  if (!player) {
    return;
  }

  player.volume = isNormalizationEnabled
    ? dbToNativeVolume(deriveEffectivePlaybackNormalizationGainDb(song?.loudnessAnalysis))
    : 1;
}

function releaseCurrentPlayer() {
  playerSubscription?.remove();
  playerSubscription = null;

  if (!player) {
    return;
  }

  try {
    player.pause();
    player.clearLockScreenControls();
    player.remove();
  } finally {
    player = null;
  }
}

async function prepareNativeAudioBeforeNewSource() {
  player?.pause();
  player?.clearLockScreenControls();
  await setIsAudioActiveAsync(true);
}

function handlePlaybackStatus(status: AudioStatus) {
  const now = Date.now();

  if (now < ignoreNativeStatusUntil) {
    return;
  }

  const currentState = usePlayerStore.getState();

  if (!status.isLoaded) {
    const localPlaybackOverride = readPlaybackStateOverride();
    const shouldKeepShowingPlaying = currentState.isPlaying && Boolean(currentState.activeSong);
    usePlayerStore.setState({ currentSeconds: 0, durationSeconds: 0, isLoading: Boolean(playbackSongId) || hasFreshPlayIntent(), isPlaying: localPlaybackOverride ?? (hasFreshPlayIntent() || shouldKeepShowingPlaying) });
    return;
  }

  if (status.didJustFinish && playbackSongId !== null && finishedSongId !== playbackSongId) {
    finishedSongId = playbackSongId;
    advanceAfterTrackFinish();
    return;
  }

  if (status.playing) {
    playIntentUntil = null;
  }

  const localPlaybackOverride = readPlaybackStateOverride();
  const shouldKeepShowingPlaying = currentState.isPlaying && Boolean(currentState.activeSong);
  const shouldShowPlaying = localPlaybackOverride ?? (status.playing || hasFreshPlayIntent() || shouldKeepShowingPlaying);

  // Suppress progress updates while a programmatic seek is in-flight.
  if (seekingUntil !== null) {
    if (Date.now() < seekingUntil) {
      usePlayerStore.setState({ isLoading: status.isBuffering, isPlaying: shouldShowPlaying });
      return;
    }
    seekingUntil = null;
  }

  const progressPercent =
    status.duration > 0
      ? Math.max(0, Math.min(100, (status.currentTime / status.duration) * 100))
      : 0;

  const shouldUpdateProgress = now - lastPlaybackProgressUpdateAt >= PLAYBACK_PROGRESS_UPDATE_MS || status.didJustFinish;
  const shouldUpdatePlaybackState = currentState.isLoading !== status.isBuffering || currentState.isPlaying !== shouldShowPlaying;

  if (shouldUpdateProgress || shouldUpdatePlaybackState) {
    lastPlaybackProgressUpdateAt = shouldUpdateProgress ? now : lastPlaybackProgressUpdateAt;
    usePlayerStore.setState({
      currentSeconds: shouldUpdateProgress ? status.currentTime : currentState.currentSeconds,
      durationSeconds: shouldUpdateProgress ? status.duration : currentState.durationSeconds,
      isLoading: status.isBuffering,
      isPlaying: shouldShowPlaying,
      progressPercent: shouldUpdateProgress ? progressPercent : currentState.progressPercent,
    });
  }
}

async function ensureAudioMode() {
  if (audioModeInitialized) return;

  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  });

  audioModeInitialized = true;
}

function getOrCreatePlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 250 });
  playerSubscription = player.addListener('playbackStatusUpdate', handlePlaybackStatus);
  return player;
}

function getNextQueueIndex(state: Pick<PlayerState, 'activeIndex' | 'isShuffleEnabled' | 'loopMode' | 'queue'>, automatic: boolean) {
  if (state.queue.length === 0) {
    return -1;
  }

  if (state.loopMode === 'track') {
    return state.activeIndex;
  }

  if (state.activeIndex >= state.queue.length - 1) {
    return state.loopMode === 'queue' ? 0 : automatic ? -1 : state.activeIndex;
  }

  return state.activeIndex + 1;
}

function advanceAfterTrackFinish() {
  usePlayerStore.setState((state) => {
    const nextIndex = getNextQueueIndex(state, true);

    if (nextIndex < 0) {
      return {
        isLoading: false,
        isPlaying: false,
        progressPercent: 100,
      };
    }

    const nextSong = state.queue[nextIndex] ?? null;
    void playSong(nextSong);

    return {
      activeIndex: nextIndex,
      activeSong: nextSong,
      isLoading: Boolean(nextSong?.audioUrl),
      isMiniPlayerHidden: false,
      isPlaying: Boolean(nextSong?.audioUrl),
      progressPercent: 0,
    };
  });
}

function shuffleSongs(songs: Song[]) {
  const shuffledSongs = [...songs];

  for (let index = shuffledSongs.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledSongs[index], shuffledSongs[swapIndex]] = [shuffledSongs[swapIndex]!, shuffledSongs[index]!];
  }

  return shuffledSongs;
}

function buildPlaybackQueue(queue: Song[], songId: string, sourceLabel: string, shouldShuffle: boolean) {
  const nextQueue = queue.map((song) => ({ ...song, sourceLabel }));
  const selectedIndex = Math.max(
    nextQueue.findIndex((song) => song.id === songId),
    0,
  );
  const selectedSong = nextQueue[selectedIndex] ?? null;
  const remainingSongs = nextQueue.filter((_, index) => index !== selectedIndex);

  return selectedSong ? [selectedSong, ...(shouldShuffle ? shuffleSongs(remainingSongs) : remainingSongs)] : nextQueue;
}

async function playSong(song: Song | null) {
  const thisId = ++pendingPlayId;

  if (!song?.audioUrl) {
    clearCurrentPlayback();
    usePlayerStore.setState({ isLoading: false, isPlaying: false });
    return;
  }

  // Same song — restart if near end, otherwise just play.
  if (playbackSongId === song.id && player) {
    try {
      if (player.isLoaded && player.duration > 0 && player.duration - player.currentTime < 0.25) {
        await player.seekTo(0);
      }
      if (pendingPlayId !== thisId) return;
      setPlaybackStateOverride(true);
      usePlayerStore.setState({ isLoading: false, isPlaying: true });
      player.play();
    } catch {
      usePlayerStore.setState({ isLoading: false, isPlaying: false });
    }
    return;
  }

  try {
    playIntentUntil = Date.now() + 1200;
    await prepareNativeAudioBeforeNewSource();
    if (pendingPlayId !== thisId) return;

    await ensureAudioMode();
    if (pendingPlayId !== thisId) return;

    const p = getOrCreatePlayer();
    ignoreNativeStatusUntil = Date.now() + SOURCE_CHANGE_STATUS_IGNORE_MS;
    lastPlaybackProgressUpdateAt = 0;
    setPlaybackStateOverride(true);
    usePlayerStore.setState({ currentSeconds: 0, durationSeconds: 0, isLoading: false, isPlaying: true, progressPercent: 0 });
    p.replace({ uri: song.audioUrl });
    if (pendingPlayId !== thisId) return;

    syncNativePlayerVolume(song, usePlayerStore.getState().isNormalizationEnabled);

    p.play();
    playbackSongId = song.id;
    finishedSongId = null;
    void claimCurrentPlaybackLease(song.id);

    p.setActiveForLockScreen(true, {
      title: song.title,
      artist: song.artist,
      artworkUrl: song.coverArtUrl,
    }, {
      showSeekBackward: true,
      showSeekForward: true,
    });
  } catch {
    if (pendingPlayId === thisId) {
      playIntentUntil = null;
      usePlayerStore.setState({ isLoading: false, isPlaying: false });
    }
  }
}

function pauseSong() {
  playIntentUntil = null;
  setPlaybackStateOverride(false);
  player?.pause();
}

type PlayerState = {
  activeIndex: number;
  activeSong: Song | null;
  addToQueue: (song: Song) => void;
  closeFullPlayer: () => void;
  currentSeconds: number;
  durationSeconds: number;
  isFullPlayerOpen: boolean;
  isLoading: boolean;
  isMiniPlayerHidden: boolean;
  isNormalizationEnabled: boolean;
  isPlaying: boolean;
  isShuffleEnabled: boolean;
  loopMode: 'off' | 'queue' | 'track';
  progressPercent: number;
  nextTrack: () => void;
  openFullPlayer: () => void;
  playSelection: (queue: Song[], songId: string, sourceLabel: string) => void;
  previousTrack: () => void;
  queue: Song[];
  seekToPercent: (percent: number) => void;
  setMiniPlayerHidden: (isHidden: boolean) => void;
  setNormalizationEnabled: (isEnabled: boolean) => void;
  setPlaybackSettings: (settings: { isNormalizationEnabled?: boolean; isShuffleEnabled?: boolean; loopMode?: 'off' | 'queue' | 'track' }) => void;
  stopPlayback: () => void;
  stopForRemotePlayback: () => void;
  checkRemotePlaybackLease: () => Promise<void>;
  syncSongInteractionIds: (input: { likedSongIds: string[]; votedSongIds: string[] }) => void;
  setSongLiked: (songId: string, liked: boolean) => void;
  setSongVoted: (songId: string, voted: boolean) => void;
  toggleNormalization: () => void;
  togglePlayback: () => void;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  activeIndex: -1,
  activeSong: null,
  addToQueue: (song) =>
    set((state) => {
      if (state.queue.some((queuedSong) => queuedSong.id === song.id)) {
        return state;
      }

      return { queue: [...state.queue, song] };
    }),
  closeFullPlayer: () => set({ isFullPlayerOpen: false, isMiniPlayerHidden: false }),
  currentSeconds: 0,
  durationSeconds: 0,
  isFullPlayerOpen: false,
  isLoading: false,
  isMiniPlayerHidden: false,
  isNormalizationEnabled: false,
  isPlaying: false,
  isShuffleEnabled: false,
  loopMode: 'off',
  progressPercent: 0,
  nextTrack: () =>
    set((state) => {
      if (state.queue.length === 0) {
        return state;
      }

      const nextIndex = getNextQueueIndex(state, false);
      const nextSong = state.queue[nextIndex] ?? null;
      void playSong(nextSong);

      return {
        activeIndex: nextIndex,
        activeSong: nextSong,
        isLoading: Boolean(nextSong?.audioUrl),
        isMiniPlayerHidden: false,
        isPlaying: true,
        currentSeconds: 0,
        durationSeconds: 0,
        progressPercent: 0,
      };
    }),
  openFullPlayer: () => set({ isFullPlayerOpen: true, isMiniPlayerHidden: false }),
  playSelection: (queue, songId, sourceLabel) =>
    set((state) => {
      const nextQueue = buildPlaybackQueue(queue, songId, sourceLabel, state.isShuffleEnabled);
      const nextSong = nextQueue[0] ?? null;

      void playSong(nextSong);

      return {
        activeIndex: nextSong ? 0 : -1,
        activeSong: nextSong,
        isLoading: Boolean(nextSong?.audioUrl),
        isMiniPlayerHidden: false,
        isPlaying: true,
        currentSeconds: 0,
        durationSeconds: 0,
        progressPercent: 0,
        queue: nextQueue,
      };
    }),
  previousTrack: () =>
    set((state) => {
      if (state.queue.length === 0) {
        return state;
      }

      const previousIndex = state.activeIndex <= 0 ? state.queue.length - 1 : state.activeIndex - 1;
      const previousSong = state.queue[previousIndex] ?? null;
      void playSong(previousSong);

      return {
        activeIndex: previousIndex,
        activeSong: previousSong,
        isLoading: Boolean(previousSong?.audioUrl),
        isMiniPlayerHidden: false,
        isPlaying: true,
        currentSeconds: 0,
        durationSeconds: 0,
        progressPercent: 0,
      };
    }),
  queue: [],
  seekToPercent: (percent) => {
    const clamped = Math.max(0, Math.min(100, percent));

    if (!player || !player.isLoaded || player.duration <= 0) {
      set({ progressPercent: clamped });
      return;
    }

    seekingUntil = Date.now() + 500;
    set({ progressPercent: clamped });

    const targetSeconds = (clamped / 100) * player.duration;
    void player.seekTo(targetSeconds).finally(() => {
      seekingUntil = null;
    });
  },
  setMiniPlayerHidden: (isHidden) => set({ isFullPlayerOpen: false, isMiniPlayerHidden: isHidden }),
  setNormalizationEnabled: (isEnabled) => set((state) => {
    syncNativePlayerVolume(state.activeSong, isEnabled);
    return { isNormalizationEnabled: isEnabled };
  }),
  setPlaybackSettings: (settings) => set((state) => {
    if (typeof settings.isNormalizationEnabled === 'boolean') {
      syncNativePlayerVolume(state.activeSong, settings.isNormalizationEnabled);
    }

    return {
      isNormalizationEnabled: settings.isNormalizationEnabled ?? state.isNormalizationEnabled,
      isShuffleEnabled: settings.isShuffleEnabled ?? state.isShuffleEnabled,
      loopMode: settings.loopMode ?? state.loopMode,
    };
  }),
  stopPlayback: () => {
    ++pendingPlayId;
    void releaseCurrentPlaybackLease();
    clearCurrentPlayback();
    releaseCurrentPlayer();
    set({ activeIndex: -1, activeSong: null, currentSeconds: 0, durationSeconds: 0, isFullPlayerOpen: false, isLoading: false, isMiniPlayerHidden: false, isPlaying: false, progressPercent: 0, queue: [] });
  },
  stopForRemotePlayback: () => {
    ++pendingPlayId;
    activePlaybackLeaseId = null;
    clearCurrentPlayback();
    releaseCurrentPlayer();
    set({ activeIndex: -1, activeSong: null, currentSeconds: 0, durationSeconds: 0, isFullPlayerOpen: false, isLoading: false, isMiniPlayerHidden: false, isPlaying: false, progressPercent: 0, queue: [] });
  },
  checkRemotePlaybackLease: async () => {
    const state = usePlayerStore.getState();

    if (!state.activeSong || !state.isPlaying) {
      return;
    }

    try {
      const lease = await fetchPlaybackLease();
      const ownedByThisDevice = await isPlaybackLeaseOwnedByThisDevice(lease);

      if (!ownedByThisDevice) {
        usePlayerStore.getState().stopForRemotePlayback();
      }
    } catch {
      // Keep local playback if the lease check cannot reach the backend.
    }
  },
  syncSongInteractionIds: ({ likedSongIds, votedSongIds }) =>
    set((state) => {
      const likedIds = new Set(likedSongIds.map((songId) => songId.trim()).filter(Boolean));
      const votedIds = new Set(votedSongIds.map((songId) => songId.trim()).filter(Boolean));

      return {
        activeSong: state.activeSong
          ? {
              ...state.activeSong,
              liked: likedIds.has(state.activeSong.id),
              voted: votedIds.has(state.activeSong.id),
            }
          : state.activeSong,
        queue: state.queue.map((song) => ({
          ...song,
          liked: likedIds.has(song.id),
          voted: votedIds.has(song.id),
        })),
      };
    }),
  setSongLiked: (songId, liked) =>
    set((state) => ({
      activeSong: state.activeSong?.id === songId ? { ...state.activeSong, liked } : state.activeSong,
      queue: state.queue.map((song) => (song.id === songId ? { ...song, liked } : song)),
    })),
  setSongVoted: (songId, voted) =>
    set((state) => ({
      activeSong: state.activeSong?.id === songId ? { ...state.activeSong, voted } : state.activeSong,
      queue: state.queue.map((song) => (song.id === songId ? { ...song, voted } : song)),
    })),
  togglePlayback: () =>
    set((state) => {
      if (!state.activeSong?.audioUrl) {
        return { isPlaying: false, progressPercent: 0 };
      }

      if (state.isPlaying) {
        pauseSong();
        return { isLoading: false, isMiniPlayerHidden: false, isPlaying: false };
      }

      playIntentUntil = Date.now() + 1200;
      setPlaybackStateOverride(true);
      void playSong(state.activeSong);
      return { isLoading: false, isMiniPlayerHidden: false, isPlaying: true };
    }),
  toggleNormalization: () => set((state) => {
    const nextEnabled = !state.isNormalizationEnabled;
    syncNativePlayerVolume(state.activeSong, nextEnabled);
    return { isNormalizationEnabled: nextEnabled };
  }),
  toggleRepeatMode: () => set((state) => ({ loopMode: state.loopMode === 'off' ? 'queue' : state.loopMode === 'queue' ? 'track' : 'off' })),
  toggleShuffle: () => set((state) => {
    const shouldEnableShuffle = !state.isShuffleEnabled;

    if (!shouldEnableShuffle || state.activeIndex < 0 || state.queue.length <= 2) {
      return { isShuffleEnabled: shouldEnableShuffle };
    }

    const activeSong = state.queue[state.activeIndex];

    if (!activeSong) {
      return { isShuffleEnabled: shouldEnableShuffle };
    }

    const remainingSongs = state.queue.filter((_, index) => index !== state.activeIndex);

    return {
      activeIndex: 0,
      isShuffleEnabled: shouldEnableShuffle,
      queue: [activeSong, ...shuffleSongs(remainingSongs)],
    };
  }),
}));