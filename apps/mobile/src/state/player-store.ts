import { create } from 'zustand';
import { Audio, type AVPlaybackStatus } from 'expo-av';

import { Song } from '../types/music';

let playbackSound: Audio.Sound | null = null;
let playbackSongId: string | null = null;

function handlePlaybackStatus(status: AVPlaybackStatus) {
  if (!status.isLoaded) {
    if ('error' in status && status.error) {
      usePlayerStore.setState({ isPlaying: false, progressPercent: 0 });
    }

    return;
  }

  const progressPercent =
    typeof status.durationMillis === 'number' && status.durationMillis > 0
      ? Math.max(0, Math.min(100, (status.positionMillis / status.durationMillis) * 100))
      : 0;

  usePlayerStore.setState({ isPlaying: status.isPlaying, progressPercent });

  if (status.didJustFinish) {
    advanceAfterTrackFinish();
  }
}

async function ensureAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: true,
  });
}

function getNextQueueIndex(state: Pick<PlayerState, 'activeIndex' | 'isShuffleEnabled' | 'loopMode' | 'queue'>, automatic: boolean) {
  if (state.queue.length === 0) {
    return -1;
  }

  if (state.loopMode === 'track') {
    return state.activeIndex;
  }

  if (state.isShuffleEnabled && state.queue.length > 1) {
    return getRandomQueueIndex(state.queue.length, state.activeIndex);
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
        isPlaying: false,
        progressPercent: 100,
      };
    }

    const nextSong = state.queue[nextIndex] ?? null;
    void playSong(nextSong);

    return {
      activeIndex: nextIndex,
      activeSong: nextSong,
      isMiniPlayerHidden: false,
      isPlaying: Boolean(nextSong?.audioUrl),
      progressPercent: 0,
    };
  });
}

async function unloadPlaybackSound() {
  if (!playbackSound) {
    return;
  }

  const soundToUnload = playbackSound;
  playbackSound = null;
  playbackSongId = null;

  try {
    soundToUnload.setOnPlaybackStatusUpdate(null);
    await soundToUnload.unloadAsync();
  } catch {
    // Ignore unload failures so the next request can continue.
  }
}

async function playSong(song: Song | null) {
  if (!song?.audioUrl) {
    usePlayerStore.setState({ isPlaying: false });
    return;
  }

  if (playbackSound && playbackSongId === song.id) {
    const status = await playbackSound.getStatusAsync();

    if (status.isLoaded && typeof status.durationMillis === 'number' && status.durationMillis - status.positionMillis < 250) {
      await playbackSound.setPositionAsync(0);
    }

    await playbackSound.playAsync();
    return;
  }

  await unloadPlaybackSound();
  await ensureAudioMode();

  const { sound } = await Audio.Sound.createAsync({ uri: song.audioUrl }, { shouldPlay: true }, handlePlaybackStatus);

  playbackSound = sound;
  playbackSongId = song.id;
}

async function pauseSong() {
  if (!playbackSound) {
    usePlayerStore.setState({ isPlaying: false });
    return;
  }

  await playbackSound.pauseAsync();
}

type PlayerState = {
  activeIndex: number;
  activeSong: Song | null;
  addToQueue: (song: Song) => void;
  closeFullPlayer: () => void;
  isFullPlayerOpen: boolean;
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
  stopPlayback: () => void;
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
  closeFullPlayer: () => set({ isFullPlayerOpen: false }),
  isFullPlayerOpen: false,
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
        isMiniPlayerHidden: false,
        isPlaying: true,
        progressPercent: 0,
      };
    }),
  openFullPlayer: () => set({ isFullPlayerOpen: true, isMiniPlayerHidden: false }),
  playSelection: (queue, songId, sourceLabel) =>
    set(() => {
      const nextQueue = queue.map((song) => ({ ...song, sourceLabel }));
      const nextIndex = Math.max(
        nextQueue.findIndex((song) => song.id === songId),
        0,
      );
      const nextSong = nextQueue[nextIndex] ?? null;

      void playSong(nextSong);

      return {
        activeIndex: nextIndex,
        activeSong: nextSong,
        isMiniPlayerHidden: false,
        isPlaying: true,
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
        isMiniPlayerHidden: false,
        isPlaying: true,
        progressPercent: 0,
      };
    }),
  queue: [],
  seekToPercent: (percent) => {
    const clamped = Math.max(0, Math.min(100, percent));

    set({ progressPercent: clamped });

    void (async () => {
      if (!playbackSound) {
        return;
      }

      try {
        const status = await playbackSound.getStatusAsync();

        if (!status.isLoaded || typeof status.durationMillis !== 'number' || status.durationMillis <= 0) {
          return;
        }

        const targetMillis = Math.round((clamped / 100) * status.durationMillis);
        await playbackSound.setPositionAsync(targetMillis);
      } catch {
        // Ignore seek failures to avoid crashing playback controls.
      }
    })();
  },
  setMiniPlayerHidden: (isHidden) => set({ isMiniPlayerHidden: isHidden }),
  stopPlayback: () => {
    void unloadPlaybackSound();
    set({ activeIndex: -1, activeSong: null, isFullPlayerOpen: false, isMiniPlayerHidden: false, isPlaying: false, progressPercent: 0, queue: [] });
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
        void pauseSong();
        return { isMiniPlayerHidden: false, isPlaying: false };
      }

      void playSong(state.activeSong);
      return { isMiniPlayerHidden: false, isPlaying: true };
    }),
  toggleNormalization: () => set((state) => ({ isNormalizationEnabled: !state.isNormalizationEnabled })),
  toggleRepeatMode: () => set((state) => ({ loopMode: state.loopMode === 'off' ? 'queue' : state.loopMode === 'queue' ? 'track' : 'off' })),
  toggleShuffle: () => set((state) => ({ isShuffleEnabled: !state.isShuffleEnabled })),
}));

function getRandomQueueIndex(queueLength: number, activeIndex: number) {
  if (queueLength <= 1) {
    return activeIndex;
  }

  let nextIndex = Math.floor(Math.random() * queueLength);

  if (nextIndex === activeIndex) {
    nextIndex = (nextIndex + 1) % queueLength;
  }

  return nextIndex;
}