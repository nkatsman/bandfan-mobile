import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { hasApiBaseUrl } from '../../lib/env';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { Song } from '../../types/music';
import { sendReleaseSupport } from './release-support-api';

export function useSongReleaseSupportAction() {
  const setSongVoted = useMusicStore((state) => state.setSongVoted);
  const syncPlayerVotedState = usePlayerStore((state) => state.setSongVoted);
  const [pendingSongIds, setPendingSongIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: sendReleaseSupport,
    onError: (_error, variables) => {
      setSongVoted(variables.songId, !variables.supported);
      syncPlayerVotedState(variables.songId, !variables.supported);
    },
    onMutate: async (variables) => {
      setPendingSongIds((current) => Array.from(new Set([...current, variables.songId])));
      setSongVoted(variables.songId, variables.supported);
      syncPlayerVotedState(variables.songId, variables.supported);
    },
    onSettled: (_data, _error, variables) => {
      setPendingSongIds((current) => current.filter((songId) => songId !== variables.songId));
    },
    onSuccess: (result) => {
      setSongVoted(result.songId, result.supported);
      syncPlayerVotedState(result.songId, result.supported);
    },
  });

  const releaseSupportErrorMessage = useMemo(() => {
    if (!mutation.error) {
      return null;
    }

    if (mutation.error instanceof ApiClientError) {
      return mutation.error.message;
    }

    if (mutation.error instanceof Error) {
      return mutation.error.message;
    }

    return 'Release support could not be updated.';
  }, [mutation.error]);

  function toggleSongReleaseSupport(song: Song) {
    const nextSupported = !song.voted;

    if (!hasApiBaseUrl) {
      setSongVoted(song.id, nextSupported);
      syncPlayerVotedState(song.id, nextSupported);
      return;
    }

    mutation.mutate({ songId: song.id, supported: nextSupported });
  }

  return {
    isSongReleaseSupportPending: (songId: string) => pendingSongIds.includes(songId),
    releaseSupportErrorMessage,
    toggleSongReleaseSupport,
  };
}