import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSidebar } from '../../components/app-sidebar';
import { DiscoveryControlsBar } from '../../components/discovery/discovery-controls-bar';
import { MusicPreferenceControls } from '../../components/music-preference-controls';
import { ScreenHeader } from '../../components/screen-header';
import { SongTable, type SongTableFilterMode, type SongTableSortMode } from '../../components/song-table';
import { BottomMenu } from '../../components/ui/bottom-menu';
import { formatLoadingText, useLoadingDots } from '../../components/use-loading-dots';
import { usePullToRefresh } from '../../components/use-pull-to-refresh';
import { DS } from '../../design/ds';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { hasApiBaseUrl } from '../../lib/env';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { Song } from '../../types/music';
import { discoverySongsQueryDefaults, discoverySongsQueryKey, fetchDiscoverySongs } from '../discovery/discovery-api';
import { LIBRARY_SORT_MODES, matchesSongFilter, sortSongs } from '../preferences/song-view-options';
import { useSongLikeAction } from '../preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../release-support/use-song-release-support-action';
import { fetchUserPlaylists, userPlaylistsQueryDefaults, userPlaylistsQueryKey } from './playlists-api';

type PlaylistDetailScreenProps = {
  playlistId: string;
};

const BOTTOM_MENU_ITEMS = [
  { key: 'index', label: 'DISCOVER' },
  { key: 'liked', label: 'FAVORITES' },
  { key: 'playlists', label: 'PLAYLISTS' },
  { key: 'account', label: 'ACCOUNT' },
];
const SEARCH_FILTER_SORT_Z_INDEX = 4000;

export function PlaylistDetailScreen({ playlistId }: PlaylistDetailScreenProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const playlists = useMusicStore((state) => state.playlists);
  const replaceDiscoverySongs = useMusicStore((state) => state.replaceDiscoverySongs);
  const replaceUserPlaylists = useMusicStore((state) => state.replaceUserPlaylists);
  const songs = useMusicStore((state) => state.songs);
  const playSelection = usePlayerStore((state) => state.playSelection);
  const { isSongLikePending, likeErrorMessage, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, releaseSupportErrorMessage, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SongTableFilterMode>('all');
  const [sortMode, setSortMode] = useState<SongTableSortMode>('votes-desc');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const styles = useMemo(() => createStyles(theme.ui), [theme.ui]);

  const discoveryQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: fetchDiscoverySongs,
    queryKey: discoverySongsQueryKey,
    ...discoverySongsQueryDefaults,
  });
  const playlistsQuery = useQuery({
    queryFn: fetchUserPlaylists,
    queryKey: userPlaylistsQueryKey,
    ...userPlaylistsQueryDefaults,
  });
  const { refreshIndicator, ...pullToRefreshProps } = usePullToRefresh({
    onRefresh: () => {
      void playlistsQuery.refetch();

      if (hasApiBaseUrl) {
        void discoveryQuery.refetch();
      }
    },
    refreshing: playlistsQuery.isRefetching || discoveryQuery.isRefetching,
  });

  useEffect(() => {
    if (playlistsQuery.data) {
      replaceUserPlaylists(playlistsQuery.data);
    }
  }, [playlistsQuery.data, replaceUserPlaylists]);

  useEffect(() => {
    if (discoveryQuery.data) {
      replaceDiscoverySongs(discoveryQuery.data);
    }
  }, [discoveryQuery.data, replaceDiscoverySongs]);

  const playlist = playlists.find((entry) => entry.id === playlistId);
  const playlistSongs = useMemo(() => {
    if (!playlist) {
      return [];
    }

    if (playlist.id === 'favorites') {
      return songs.filter((song) => song.liked).map((song) => ({ ...song }));
    }

    if (playlist.id === 'voted') {
      return songs.filter((song) => song.voted).map((song) => ({ ...song }));
    }

    const songById = new Map(songs.map((song) => [song.id, song]));

    return playlist.trackIds
      .map((songId) => songById.get(songId))
      .filter((song): song is Song => Boolean(song))
      .map((song) => ({ ...song }));
  }, [playlist, songs]);

  function handleBottomMenuSelect(key: string) {
    if (key === 'index') {
      router.push('/');
      return;
    }

    router.push(`/${key}`);
  }

  const viewSongs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filtered = playlistSongs.filter((song) => {
      if (!matchesSongFilter(song, filterMode)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return song.title.toLowerCase().includes(normalizedSearch) || song.artist.toLowerCase().includes(normalizedSearch);
    });

    return sortSongs(filtered, sortMode);
  }, [filterMode, playlistSongs, searchQuery, sortMode]);

  const isSongsLoading = hasApiBaseUrl && discoveryQuery.isLoading;
  const loadingDotCount = useLoadingDots(isSongsLoading || playlistsQuery.isLoading);

  if (!playlist) {
    return (
      <View style={styles.root}>
        <ScrollView {...pullToRefreshProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scrollArea}>
          {refreshIndicator}
          <ScreenHeader counter={playlistsQuery.isLoading ? formatLoadingText('Loading', loadingDotCount) : 'Playlist not found.'} onLogoPress={() => setSidebarVisible(true)} title="Playlist">
            <MusicPreferenceControls />
          </ScreenHeader>
        </ScrollView>
        <AppSidebar onClose={() => setSidebarVisible(false)} visible={sidebarVisible} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView {...pullToRefreshProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        {refreshIndicator}
        <ScreenHeader counter={isSongsLoading ? formatLoadingText('Loading', loadingDotCount) : `${playlistSongs.length} songs in this playlist`} onLogoPress={() => setSidebarVisible(true)} title={playlist.title}>
          <MusicPreferenceControls />
        </ScreenHeader>
        {playlist.description ? <Text style={styles.description}>{playlist.description}</Text> : null}

        {likeErrorMessage ? (
          <>
            <Text style={styles.sectionTitle}>Save Error</Text>
            <Text style={styles.copy}>{likeErrorMessage}</Text>
          </>
        ) : null}

        {releaseSupportErrorMessage ? (
          <>
            <Text style={styles.sectionTitle}>Release Support Error</Text>
            <Text style={styles.copy}>{releaseSupportErrorMessage}</Text>
          </>
        ) : null}

        {isSongsLoading ? (
          <SongTable
            hideVoteColumn={playlist.id === 'voted'}
            isLoading
            loadingDotCount={loadingDotCount}
            likePendingForSong={isSongLikePending}
            menuContext={playlist.id === 'voted' ? 'voted' : 'default'}
            onPlaySong={(song) => playSelection(viewSongs, song.id, playlist.title.toUpperCase())}
            onToggleLikeSong={toggleSongLike}
            onToggleVoteSong={toggleSongReleaseSupport}
            songs={[]}
            votePendingForSong={isSongReleaseSupportPending}
          />
        ) : viewSongs.length > 0 ? (
          <SongTable
            hideVoteColumn={playlist.id === 'voted'}
            likePendingForSong={isSongLikePending}
            menuContext={playlist.id === 'voted' ? 'voted' : 'default'}
            onPlaySong={(song) => playSelection(viewSongs, song.id, playlist.title.toUpperCase())}
            onToggleLikeSong={toggleSongLike}
            onToggleVoteSong={toggleSongReleaseSupport}
            songs={viewSongs}
            votePendingForSong={isSongReleaseSupportPending}
          />
        ) : !discoveryQuery.isLoading ? (
          <Text style={styles.sectionTitle}>No Songs Here</Text>
        ) : null}
      </ScrollView>

      <View style={styles.bottomControlsDock}>
        <DiscoveryControlsBar
          filterMode={filterMode}
          availableSortModes={LIBRARY_SORT_MODES}
          onFilterChange={setFilterMode}
          onSearchChange={setSearchQuery}
          onSortChange={setSortMode}
          searchQuery={searchQuery}
          sortMode={sortMode}
        />
        <BottomMenu activeKey="playlists" items={BOTTOM_MENU_ITEMS} onSelect={handleBottomMenuSelect} />
      </View>
      <AppSidebar onClose={() => setSidebarVisible(false)} visible={sidebarVisible} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.appBackground,
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    content: {
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
    },
    description: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
      lineHeight: 18,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
    },
    bottomControlsDock: {
      backgroundColor: colors.appBackground,
      position: 'relative',
      zIndex: SEARCH_FILTER_SORT_Z_INDEX,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.title,
      fontWeight: '900',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
    },
    copy: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 21,
      paddingHorizontal: spacing.sm,
    },
  });
}