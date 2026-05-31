import { useLocalSearchParams } from 'expo-router';

import { PlaylistDetailScreen } from '../../src/features/playlists/playlist-detail-screen';

export default function PlaylistDetailRoute() {
  const params = useLocalSearchParams<{ playlistId?: string }>();

  return <PlaylistDetailScreen playlistId={typeof params.playlistId === 'string' ? params.playlistId : ''} />;
}