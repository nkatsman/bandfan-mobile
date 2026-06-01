import { create } from 'zustand';

import { Playlist, Song } from '../types/music';

const builtInPlaylists: Playlist[] = [
  {
    description: 'Songs you marked as favorites for fast personal listening.',
    id: 'favorites',
    isPinned: true,
    kind: 'favorites',
    sourceLabel: 'BUILT IN',
    title: 'Favorites',
    trackIds: [],
    visibility: 'private',
  },
  {
    description: 'Songs you voted for and want to keep close.',
    id: 'voted',
    isPinned: true,
    kind: 'voted',
    sourceLabel: 'BUILT IN',
    title: 'Voted',
    trackIds: [],
    visibility: 'private',
  },
];

function updatePlaylistTrackIds(playlists: Playlist[], songs: Song[]) {
  const favoriteTrackIds = songs.filter((song) => song.liked).map((song) => song.id);
  const votedTrackIds = songs.filter((song) => song.voted).map((song) => song.id);

  return playlists.map((playlist) => {
    if (playlist.kind === 'favorites') {
      return { ...playlist, trackIds: favoriteTrackIds };
    }

    if (playlist.kind === 'voted') {
      return { ...playlist, trackIds: votedTrackIds };
    }

    return playlist;
  });
}

function hasOverride(overrides: Record<string, boolean>, songId: string) {
  return Object.prototype.hasOwnProperty.call(overrides, songId);
}

function getOverrideValue(overrides: Record<string, boolean>, songId: string, fallback: boolean) {
  return hasOverride(overrides, songId) ? Boolean(overrides[songId]) : fallback;
}

type MusicState = {
  likedSongIds: string[];
  addSongToUserPlaylist: (playlistId: string, songId: string) => void;
  pendingLikedBySongId: Record<string, boolean>;
  pendingVotedBySongId: Record<string, boolean>;
  playlists: Playlist[];
  removeSongFromUserPlaylist: (playlistId: string, songId: string) => void;
  removeUserPlaylist: (playlistId: string) => void;
  replaceDiscoverySongs: (songs: Song[]) => void;
  replaceUserPlaylists: (playlists: Playlist[]) => void;
  setSongLiked: (songId: string, liked: boolean) => void;
  setPendingSongLiked: (songId: string, liked: boolean | null) => void;
  setPendingSongVoted: (songId: string, voted: boolean | null) => void;
  setSongVoted: (songId: string, voted: boolean) => void;
  syncSongInteractionIds: (input: { likedSongIds: string[]; votedSongIds: string[] }) => void;
  songs: Song[];
  toggleLike: (songId: string) => void;
  toggleVote: (songId: string) => void;
  updateUserPlaylist: (playlistId: string, updates: Partial<Pick<Playlist, 'description' | 'isPinned' | 'title' | 'visibility'>>) => void;
  votedSongIds: string[];
};

export const useMusicStore = create<MusicState>((set) => ({
  addSongToUserPlaylist: (playlistId, songId) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) => (
        playlist.id === playlistId && playlist.kind === 'user'
          ? { ...playlist, trackIds: Array.from(new Set([...playlist.trackIds, songId])) }
          : playlist
      )),
    })),
  likedSongIds: [],
  pendingLikedBySongId: {},
  pendingVotedBySongId: {},
  playlists: builtInPlaylists,
  removeSongFromUserPlaylist: (playlistId, songId) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) => (
        playlist.id === playlistId && playlist.kind === 'user'
          ? { ...playlist, trackIds: playlist.trackIds.filter((trackId) => trackId !== songId) }
          : playlist
      )),
    })),
  removeUserPlaylist: (playlistId) =>
    set((state) => ({
      playlists: state.playlists.filter((playlist) => playlist.id !== playlistId || playlist.kind !== 'user'),
    })),
  replaceUserPlaylists: (playlists) =>
    set((state) => ({
      playlists: updatePlaylistTrackIds([
        ...state.playlists.filter((playlist) => playlist.kind !== 'user'),
        ...playlists.filter((playlist) => playlist.kind === 'user'),
      ], state.songs),
    })),
  replaceDiscoverySongs: (songs) =>
    set((state) => {
      const likedIds = new Set(state.likedSongIds);
      const votedIds = new Set(state.votedSongIds);
      const nextSongs = songs.map((song) => ({
        ...song,
        liked: getOverrideValue(state.pendingLikedBySongId, song.id, likedIds.has(song.id) || song.liked),
        voted: getOverrideValue(state.pendingVotedBySongId, song.id, votedIds.has(song.id) || song.voted),
      }));

      return {
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
      };
    }),
  setSongLiked: (songId, liked) =>
    set((state) => {
      const nextSongs = state.songs.map((song) => (song.id === songId ? { ...song, liked } : song));
      const nextLikedSongIds = Array.from(new Set(nextSongs.filter((song) => song.liked).map((song) => song.id)));

      return {
        likedSongIds: nextLikedSongIds,
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
      };
    }),
  setPendingSongLiked: (songId, liked) =>
    set((state) => {
      const rest = { ...state.pendingLikedBySongId };
      delete rest[songId];

      return {
        pendingLikedBySongId: liked === null ? rest : { ...state.pendingLikedBySongId, [songId]: liked },
      };
    }),
  setPendingSongVoted: (songId, voted) =>
    set((state) => {
      const rest = { ...state.pendingVotedBySongId };
      delete rest[songId];

      return {
        pendingVotedBySongId: voted === null ? rest : { ...state.pendingVotedBySongId, [songId]: voted },
      };
    }),
  setSongVoted: (songId, voted) =>
    set((state) => {
      const nextSongs = state.songs.map((song) => (song.id === songId ? { ...song, voted } : song));

      return {
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
        votedSongIds: Array.from(new Set(nextSongs.filter((song) => song.voted).map((song) => song.id))),
      };
    }),
  syncSongInteractionIds: ({ likedSongIds, votedSongIds }) =>
    set((state) => {
      const likedIds = new Set(likedSongIds.map((songId) => songId.trim()).filter(Boolean));
      const votedIds = new Set(votedSongIds.map((songId) => songId.trim()).filter(Boolean));
      const nextSongs = state.songs.map((song) => ({
        ...song,
        liked: getOverrideValue(state.pendingLikedBySongId, song.id, likedIds.has(song.id)),
        voted: getOverrideValue(state.pendingVotedBySongId, song.id, votedIds.has(song.id)),
      }));

      return {
        likedSongIds: Array.from(likedIds),
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
        votedSongIds: Array.from(votedIds),
      };
    }),
  songs: [],
  toggleLike: (songId) =>
    set((state) => {
      const currentSong = state.songs.find((song) => song.id === songId);
      const nextLiked = currentSong ? !currentSong.liked : false;
      const nextSongs = state.songs.map((song) => (song.id === songId ? { ...song, liked: nextLiked } : song));

      return {
        likedSongIds: Array.from(new Set(nextSongs.filter((song) => song.liked).map((song) => song.id))),
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
      };
    }),
  toggleVote: (songId) =>
    set((state) => {
      const nextSongs = state.songs.map((song) => (song.id === songId ? { ...song, voted: !song.voted } : song));

      return {
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
        votedSongIds: Array.from(new Set(nextSongs.filter((song) => song.voted).map((song) => song.id))),
      };
    }),
  updateUserPlaylist: (playlistId, updates) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) => (
        playlist.id === playlistId && playlist.kind === 'user'
          ? { ...playlist, ...updates }
          : playlist
      )),
    })),
  votedSongIds: [],
}));