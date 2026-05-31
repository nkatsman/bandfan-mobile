import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '../../state/session-store';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { fetchReleaseSupportSongIds, fetchSavedSongIds } from '../release-support/release-support-api';

const savedSongIdsQueryKey = ['saved-song-ids'] as const;
const votedSongIdsQueryKey = ['voted-song-ids'] as const;

export function useSongInteractionBootstrap() {
  const status = useSessionStore((state) => state.status);
  const syncSongInteractionIds = useMusicStore((state) => state.syncSongInteractionIds);
  const syncPlayerInteractionIds = usePlayerStore((state) => state.syncSongInteractionIds);

  const savedSongIdsQuery = useQuery({
    enabled: status === 'signed-in',
    queryFn: fetchSavedSongIds,
    queryKey: savedSongIdsQueryKey,
    staleTime: 60_000,
  });

  const votedSongIdsQuery = useQuery({
    enabled: status === 'signed-in',
    queryFn: fetchReleaseSupportSongIds,
    queryKey: votedSongIdsQueryKey,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (status !== 'signed-in') {
      return;
    }

    const likedSongIds = savedSongIdsQuery.data ?? [];
    const votedSongIds = votedSongIdsQuery.data ?? [];

    syncSongInteractionIds({
      likedSongIds,
      votedSongIds,
    });

    syncPlayerInteractionIds({
      likedSongIds,
      votedSongIds,
    });
  }, [savedSongIdsQuery.data, status, syncPlayerInteractionIds, syncSongInteractionIds, votedSongIdsQuery.data]);
}
