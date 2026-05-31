import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc } from 'firebase/firestore';

import { ApiClientError } from '../../lib/api/client';
import { auth, firestore } from '../../lib/firebase';
import { Playlist } from '../../types/music';

const PLAYLISTS_READ_LIMIT = 100;

export const userPlaylistsQueryKey = ['user-playlists'] as const;
export const userPlaylistsQueryDefaults = {
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity,
} as const;

type PlaylistEditInput = {
  description: string;
  title: string;
};

type FirestoreTimestampLike = {
  seconds?: unknown;
  toMillis?: unknown;
};

type PlaylistDocument = {
  coverImageUrl?: unknown;
  coverSongId?: unknown;
  createdAt?: unknown;
  description?: unknown;
  isPinned?: unknown;
  name?: unknown;
  songIds?: unknown;
  updatedAt?: unknown;
  visibility?: unknown;
};

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeSongIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((songId) => String(songId || '').trim()).filter(Boolean)));
}

function normalizeCoverImageUrl(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizePinnedState(value: unknown) {
  return value === true;
}

function normalizeVisibility(value: unknown): Playlist['visibility'] {
  return value === 'public' ? 'public' : 'private';
}

function timestampToMillis(value: unknown) {
  if (!value) {
    return 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === 'object') {
    const timestamp = value as FirestoreTimestampLike;

    if (typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }

    if (typeof timestamp.seconds === 'number') {
      return timestamp.seconds * 1000;
    }
  }

  return 0;
}

function sortPlaylists(playlists: Playlist[]) {
  return [...playlists].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    const updatedDifference = timestampToMillis(right.updatedAt) - timestampToMillis(left.updatedAt);
    if (updatedDifference !== 0) {
      return updatedDifference;
    }

    return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
  });
}

function toPlaylist(id: string, data: PlaylistDocument): Playlist {
  const title = normalizeText(data.name, 'Untitled playlist');

  return {
    coverArtUrl: normalizeCoverImageUrl(data.coverImageUrl),
    coverSongId: normalizeText(data.coverSongId) || null,
    description: normalizeText(data.description),
    id,
    isPinned: normalizePinnedState(data.isPinned),
    kind: 'user',
    sourceLabel: 'PLAYLIST',
    title,
    trackIds: normalizeSongIds(data.songIds),
    updatedAt: data.updatedAt,
    visibility: normalizeVisibility(data.visibility),
  };
}

export async function fetchUserPlaylists() {
  if (!firestore || !auth) {
    throw new ApiClientError('Firebase is not configured, so user playlists cannot be loaded.', { code: 'config' });
  }

  await auth.authStateReady();

  const userId = auth.currentUser?.uid;

  if (!userId) {
    return [];
  }

  const snapshot = await getDocs(query(collection(firestore, 'users', userId, 'playlists'), limit(PLAYLISTS_READ_LIMIT)));

  return sortPlaylists(snapshot.docs.map((docSnapshot) => toPlaylist(docSnapshot.id, docSnapshot.data() as PlaylistDocument)));
}

async function getUserPlaylistRef(playlistId: string) {
  if (!firestore || !auth) {
    throw new ApiClientError('Firebase is not configured, so playlists cannot be updated.', { code: 'config' });
  }

  await auth.authStateReady();

  const userId = auth.currentUser?.uid;

  if (!userId) {
    throw new ApiClientError('Sign in to update playlists.', { code: 'auth' });
  }

  return doc(firestore, 'users', userId, 'playlists', playlistId);
}

export async function updateUserPlaylistVisibility(playlistId: string, visibility: Playlist['visibility']) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await updateDoc(playlistRef, {
    updatedAt: serverTimestamp(),
    visibility,
  });
}

export async function updateUserPlaylistPinnedState(playlistId: string, isPinned: boolean) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await updateDoc(playlistRef, {
    isPinned,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPlaylistDetails(playlistId: string, input: PlaylistEditInput) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await updateDoc(playlistRef, {
    description: input.description.trim(),
    name: input.title.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function addSongToUserPlaylist(playlistId: string, songId: string) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await updateDoc(playlistRef, {
    songIds: arrayUnion(songId),
    updatedAt: serverTimestamp(),
  });
}

export async function removeSongFromUserPlaylist(playlistId: string, songId: string) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await updateDoc(playlistRef, {
    songIds: arrayRemove(songId),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserPlaylist(playlistId: string) {
  const playlistRef = await getUserPlaylistRef(playlistId);

  await deleteDoc(playlistRef);
}
