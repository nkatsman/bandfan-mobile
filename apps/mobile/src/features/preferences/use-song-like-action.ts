import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { hasApiBaseUrl } from '../../lib/env';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { Song } from '../../types/music';
import { saveSongPreference } from './preferences-api';

export function useSongLikeAction() {
  const setSongLiked = useMusicStore((state) => state.setSongLiked);
  const syncPlayerLikedState = usePlayerStore((state) => state.setSongLiked);
  const [pendingSongIds, setPendingSongIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: saveSongPreference,
    onError: (_error, variables) => {
      setSongLiked(variables.songId, !variables.liked);
      syncPlayerLikedState(variables.songId, !variables.liked);
    },
    onMutate: async (variables) => {
      setPendingSongIds((current) => Array.from(new Set([...current, variables.songId])));
      setSongLiked(variables.songId, variables.liked);
      syncPlayerLikedState(variables.songId, variables.liked);
    },
    onSettled: (_data, _error, variables) => {
      setPendingSongIds((current) => current.filter((songId) => songId !== variables.songId));
    },
    onSuccess: (result) => {
      setSongLiked(result.songId, result.liked);
      syncPlayerLikedState(result.songId, result.liked);
    },
  });

  const likeErrorMessage = useMemo(() => {
    if (!mutation.error) {
      return null;
    }

    if (mutation.error instanceof ApiClientError) {
      return mutation.error.message;
    }

    if (mutation.error instanceof Error) {
      return mutation.error.message;
    }

    return 'Save could not be updated.';
  }, [mutation.error]);

  function toggleSongLike(song: Song) {
    const nextLiked = !song.liked;

    if (!hasApiBaseUrl) {
      setSongLiked(song.id, nextLiked);
      syncPlayerLikedState(song.id, nextLiked);
      return;
    }

    mutation.mutate({ liked: nextLiked, songId: song.id });
  }

  return {
    isSongLikePending: (songId: string) => pendingSongIds.includes(songId),
    likeErrorMessage,
    toggleSongLike,
  };
}