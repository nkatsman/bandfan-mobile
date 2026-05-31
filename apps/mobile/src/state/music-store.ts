import { create } from 'zustand';

import { seedPlaylists, seedSongs } from '../data/music-seed';
import { Playlist, Song } from '../types/music';

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

type MusicState = {
  likedSongIds: string[];
  addSongToUserPlaylist: (playlistId: string, songId: string) => void;
  playlists: Playlist[];
  removeSongFromUserPlaylist: (playlistId: string, songId: string) => void;
  removeUserPlaylist: (playlistId: string) => void;
  replaceDiscoverySongs: (songs: Song[]) => void;
  replaceUserPlaylists: (playlists: Playlist[]) => void;
  setSongLiked: (songId: string, liked: boolean) => void;
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
  likedSongIds: seedSongs.filter((song) => song.liked).map((song) => song.id),
  playlists: seedPlaylists,
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
        liked: likedIds.has(song.id) || song.liked,
        voted: votedIds.has(song.id) || song.voted,
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
        liked: likedIds.has(song.id),
        voted: votedIds.has(song.id),
      }));

      return {
        likedSongIds: Array.from(likedIds),
        playlists: updatePlaylistTrackIds(state.playlists, nextSongs),
        songs: nextSongs,
        votedSongIds: Array.from(votedIds),
      };
    }),
  songs: seedSongs,
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
  votedSongIds: seedSongs.filter((song) => song.voted).map((song) => song.id),
}));