import { create } from 'zustand';
import TrackPlayer, { Event, State, Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

import { claimPlaybackLease, fetchPlaybackLease, isPlaybackLeaseOwnedByThisDevice, releasePlaybackLease } from '../features/player/playback-lease-api';
import { saveSongPreference } from '../features/preferences/preferences-api';
import { sendReleaseSupport } from '../features/release-support/release-support-api';
import { hasApiBaseUrl } from '../lib/env';
import { dbToNativeVolume, deriveEffectivePlaybackNormalizationGainDb } from '../lib/loudness';
import { Song } from '../types/music';

let pendingPlayId = 0;
let playbackSongId: string | null = null;
let finishedSongId: string | null = null;
let seekingUntil: number | null = null;
let activePlaybackLeaseId: string | null = null;

const PREVIOUS_TRACK_RESTART_THRESHOLD_S = 3;

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

function syncVolume(song: Song | null, isNormalizationEnabled: boolean) {
  const volume = isNormalizationEnabled
    ? dbToNativeVolume(deriveEffectivePlaybackNormalizationGainDb(song?.loudnessAnalysis))
    : 1;
  void TrackPlayer.setVolume(volume);
}

async function updateNotificationLikedVotedState(song: Song | null) {
  try {
    await TrackPlayer.updateOptions({
      likeOptions: { isActive: Boolean(song?.liked), title: 'Like' },
      dislikeOptions: { isActive: Boolean(song?.voted), title: 'Vote' },
    });
  } catch {
    // Non-fatal — notification state update failure does not affect playback.
  }
}

export async function setupTrackPlayer() {
  try {
    await TrackPlayer.setupPlayer({
      minBuffer: 15,
      maxBuffer: 60,
      playBuffer: 2,
      backBuffer: 10,
    });
  } catch {
    // Already set up (e.g. Metro Fast Refresh) — safe to continue.
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    // Notification button order: Like · Prev · Play/Pause · Next · Vote
    capabilities: [
      Capability.Like,
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.Dislike,
      Capability.SeekTo,
      Capability.Stop,
    ],
    // Compact notification (3 buttons): Prev · Play/Pause · Next
    compactCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.SkipToNext,
    ],
    likeOptions: { isActive: false, title: 'Like' },
    dislikeOptions: { isActive: false, title: 'Vote' },
    progressUpdateEventInterval: 1,
  });

  // Playback state → Zustand
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    switch (state) {
      case State.Playing:
        usePlayerStore.setState({ isLoading: false, isPlaying: true });
        break;
      case State.Paused:
      case State.Stopped: {
        // During a new-track load isLoading=true — skip transient paused states from source swap.
        const { isLoading } = usePlayerStore.getState();
        if (!isLoading) {
          usePlayerStore.setState({ isLoading: false, isPlaying: false });
        }
        break;
      }
      case State.Loading:
      case State.Buffering:
        usePlayerStore.setState({ isLoading: true });
        break;
      case State.Error:
        usePlayerStore.setState({ isLoading: false, isPlaying: false });
        break;
      default:
        break;
    }
  });

  // Progress → Zustand
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
    if (seekingUntil !== null && Date.now() < seekingUntil) {
      return;
    }
    seekingUntil = null;
    const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0;
    usePlayerStore.setState({ currentSeconds: position, durationSeconds: duration, progressPercent });
  });

  // Track finished → advance queue
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    if (playbackSongId !== null && finishedSongId !== playbackSongId) {
      finishedSongId = playbackSongId;
      advanceAfterTrackFinish();
    }
  });
}

function getNextQueueIndex(state: Pick<PlayerState, 'activeIndex' | 'isShuffleEnabled' | 'loopMode' | 'queue'>, automatic: boolean) {
  if (state.queue.length === 0) {
    return -1;
  }

  // Repeat-one only applies to automatic advance (track finishing).
  // Manual next always skips to the next song.
  if (state.loopMode === 'track' && automatic) {
    return state.activeIndex;
  }

  if (state.activeIndex >= state.queue.length - 1) {
    return state.loopMode === 'queue' ? 0 : automatic ? -1 : state.activeIndex;
  }

  return state.activeIndex + 1;
}

function advanceAfterTrackFinish() {
  const state = usePlayerStore.getState();
  const nextIndex = getNextQueueIndex(state, true);

  if (nextIndex < 0) {
    usePlayerStore.setState({ isLoading: false, isPlaying: false, progressPercent: 100 });
    return;
  }

  const nextSong = state.queue[nextIndex] ?? null;
  usePlayerStore.setState({
    activeIndex: nextIndex,
    activeSong: nextSong,
    isLoading: Boolean(nextSong?.audioUrl),
    isMiniPlayerHidden: false,
    isPlaying: Boolean(nextSong?.audioUrl),
    progressPercent: 0,
  });
  void playSong(nextSong);
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
    playbackSongId = null;
    finishedSongId = null;
    activePlaybackLeaseId = null;
    void TrackPlayer.reset();
    usePlayerStore.setState({ isLoading: false, isPlaying: false });
    return;
  }

  playbackSongId = song.id;
  finishedSongId = null;
  activePlaybackLeaseId = null;
  usePlayerStore.setState({ currentSeconds: 0, durationSeconds: 0, isLoading: true, isPlaying: true, progressPercent: 0 });

  try {
    await TrackPlayer.load({
      id: song.id,
      url: song.audioUrl,
      title: song.title,
      artist: song.artist ?? undefined,
      artwork: song.coverArtUrl ?? undefined,
    });

    if (pendingPlayId !== thisId) return;

    syncVolume(song, usePlayerStore.getState().isNormalizationEnabled);
    await TrackPlayer.play();

    if (pendingPlayId !== thisId) return;

    void updateNotificationLikedVotedState(song);
    void claimCurrentPlaybackLease(song.id);
  } catch {
    if (pendingPlayId === thisId) {
      playbackSongId = null;
      usePlayerStore.setState({ isLoading: false, isPlaying: false });
    }
  }
}

function pauseSong() {
  void TrackPlayer.pause();
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

      // If past the restart threshold, seek to beginning instead of going to previous track.
      if (state.currentSeconds > PREVIOUS_TRACK_RESTART_THRESHOLD_S && state.activeSong) {
        seekingUntil = Date.now() + 500;
        void TrackPlayer.seekTo(0).then(() => {
          seekingUntil = null;
          return TrackPlayer.play();
        });
        return {
          currentSeconds: 0,
          progressPercent: 0,
          isLoading: false,
          isPlaying: true,
        };
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
    const { durationSeconds } = usePlayerStore.getState();

    if (durationSeconds <= 0) {
      set({ progressPercent: clamped });
      return;
    }

    seekingUntil = Date.now() + 500;
    set({ progressPercent: clamped });

    const targetSeconds = (clamped / 100) * durationSeconds;
    void TrackPlayer.seekTo(targetSeconds).finally(() => {
      seekingUntil = null;
    });
  },
  setMiniPlayerHidden: (isHidden) => set({ isFullPlayerOpen: false, isMiniPlayerHidden: isHidden }),
  setNormalizationEnabled: (isEnabled) => set((state) => {
    syncVolume(state.activeSong, isEnabled);
    return { isNormalizationEnabled: isEnabled };
  }),
  setPlaybackSettings: (settings) => set((state) => {
    if (typeof settings.isNormalizationEnabled === 'boolean') {
      syncVolume(state.activeSong, settings.isNormalizationEnabled);
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
    playbackSongId = null;
    finishedSongId = null;
    void TrackPlayer.reset();
    set({ activeIndex: -1, activeSong: null, currentSeconds: 0, durationSeconds: 0, isFullPlayerOpen: false, isLoading: false, isMiniPlayerHidden: false, isPlaying: false, progressPercent: 0, queue: [] });
  },
  stopForRemotePlayback: () => {
    ++pendingPlayId;
    activePlaybackLeaseId = null;
    playbackSongId = null;
    finishedSongId = null;
    void TrackPlayer.reset();
    set({ activeIndex: -1, activeSong: null, currentSeconds: 0, durationSeconds: 0, isFullPlayerOpen: false, isLoading: false, isMiniPlayerHidden: false, isPlaying: false, progressPercent: 0, queue: [] });
  },
  checkRemotePlaybackLease: async () => {
    const state = usePlayerStore.getState();

    if (!state.activeSong || !state.isPlaying) {
      return;
    }

    // WEAK-6: skip if a song transition is in progress.
    if (playbackSongId !== state.activeSong.id) {
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
    set((state) => {
      const nextActiveSong = state.activeSong?.id === songId ? { ...state.activeSong, liked } : state.activeSong;
      if (state.activeSong?.id === songId) {
        void updateNotificationLikedVotedState(nextActiveSong);
      }
      return {
        activeSong: nextActiveSong,
        queue: state.queue.map((song) => (song.id === songId ? { ...song, liked } : song)),
      };
    }),
  setSongVoted: (songId, voted) =>
    set((state) => {
      const nextActiveSong = state.activeSong?.id === songId ? { ...state.activeSong, voted } : state.activeSong;
      if (state.activeSong?.id === songId) {
        void updateNotificationLikedVotedState(nextActiveSong);
      }
      return {
        activeSong: nextActiveSong,
        queue: state.queue.map((song) => (song.id === songId ? { ...song, voted } : song)),
      };
    }),
  togglePlayback: () =>
    set((state) => {
      if (!state.activeSong?.audioUrl) {
        return { isPlaying: false, progressPercent: 0 };
      }

      if (state.isPlaying && !state.isLoading) {
        pauseSong();
        return { isLoading: false, isMiniPlayerHidden: false, isPlaying: false };
      }

      if (state.isPlaying && state.isLoading) {
        // Source is still buffering — tap is a no-op to prevent accidental pause/restart.
        return state;
      }

      // Resume — track is already loaded in RNTP, just call play().
      void TrackPlayer.play();
      return { isLoading: false, isMiniPlayerHidden: false, isPlaying: true };
    }),
  toggleNormalization: () => set((state) => {
    const nextEnabled = !state.isNormalizationEnabled;
    syncVolume(state.activeSong, nextEnabled);
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

export async function remoteToggleLike() {
  const { activeSong } = usePlayerStore.getState();
  if (!activeSong) return;
  const nextLiked = !activeSong.liked;
  usePlayerStore.getState().setSongLiked(activeSong.id, nextLiked);
  if (!hasApiBaseUrl) return;
  try {
    const result = await saveSongPreference({ songId: activeSong.id, liked: nextLiked });
    usePlayerStore.getState().setSongLiked(result.songId, result.liked);
  } catch {
    usePlayerStore.getState().setSongLiked(activeSong.id, !nextLiked);
  }
}

export async function remoteToggleVote() {
  const { activeSong } = usePlayerStore.getState();
  if (!activeSong) return;
  const nextVoted = !activeSong.voted;
  usePlayerStore.getState().setSongVoted(activeSong.id, nextVoted);
  if (!hasApiBaseUrl) return;
  try {
    const result = await sendReleaseSupport({ songId: activeSong.id, supported: nextVoted });
    usePlayerStore.getState().setSongVoted(result.songId, result.supported);
  } catch {
    usePlayerStore.getState().setSongVoted(activeSong.id, !nextVoted);
  }
}