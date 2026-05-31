import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSidebar } from '../../components/app-sidebar';
import { DiscoveryControlsBar } from '../../components/discovery/discovery-controls-bar';
import { MusicPreferenceControls } from '../../components/music-preference-controls';
import { ScreenHeader } from '../../components/screen-header';
import { SongTable, type SongTableFilterMode, type SongTableSortMode } from '../../components/song-table';
import { formatLoadingText, useLoadingDots } from '../../components/use-loading-dots';
import { usePullToRefresh } from '../../components/use-pull-to-refresh';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { hasApiBaseUrl } from '../../lib/env';
import { LIBRARY_SORT_MODES, matchesSongFilter, sortSongs } from '../preferences/song-view-options';
import { useSongLikeAction } from '../preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../release-support/use-song-release-support-action';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { discoverySongsQueryDefaults, discoverySongsQueryKey, fetchDiscoverySongs } from '../discovery/discovery-api';

export function LikedScreen() {
  const theme = useAppTheme();
  const songs = useMusicStore((state) => state.songs);
  const replaceDiscoverySongs = useMusicStore((state) => state.replaceDiscoverySongs);
  const likedSongs = useMemo(() => songs.filter((song) => song.liked), [songs]);
  const playSelection = usePlayerStore((state) => state.playSelection);
  const { isSongLikePending, likeErrorMessage, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, releaseSupportErrorMessage, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SongTableFilterMode>('all');
  const [sortMode, setSortMode] = useState<SongTableSortMode>('votes-desc');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const styles = useMemo(() => createStyles(theme.ui), [theme]);

  const viewSongs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = likedSongs.filter((song) => {
      if (!matchesSongFilter(song, filterMode)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return song.title.toLowerCase().includes(normalizedSearch) || song.artist.toLowerCase().includes(normalizedSearch);
    });

    return sortSongs(filtered, sortMode);
  }, [filterMode, likedSongs, searchQuery, sortMode]);

  const discoveryQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: fetchDiscoverySongs,
    queryKey: discoverySongsQueryKey,
    ...discoverySongsQueryDefaults,
  });
  const { refreshIndicator, ...pullToRefreshProps } = usePullToRefresh({
    enabled: hasApiBaseUrl,
    onRefresh: () => void discoveryQuery.refetch(),
    refreshing: discoveryQuery.isRefetching,
  });

  useEffect(() => {
    if (discoveryQuery.data) {
      replaceDiscoverySongs(discoveryQuery.data);
    }
  }, [discoveryQuery.data, replaceDiscoverySongs]);

  const isFavoritesLoading = hasApiBaseUrl && discoveryQuery.isLoading;
  const loadingDotCount = useLoadingDots(isFavoritesLoading);

  return (
    <View style={styles.root}>
      <ScrollView
        {...pullToRefreshProps}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        {refreshIndicator}
        <ScreenHeader counter={isFavoritesLoading ? formatLoadingText('Loading', loadingDotCount) : `${viewSongs.length} favorite songs`} onLogoPress={() => setSidebarVisible(true)} title="Favorites">
          <MusicPreferenceControls />
        </ScreenHeader>

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

        {isFavoritesLoading ? (
          <SongTable
            isLoading
            loadingDotCount={loadingDotCount}
            likePendingForSong={isSongLikePending}
            menuContext="favorites"
            onPlaySong={(song) => {
              playSelection(viewSongs, song.id, song.sourceLabel);
            }}
            onSongRowPress={() => usePlayerStore.getState().openSongSheet()}
            onToggleLikeSong={toggleSongLike}
            onToggleVoteSong={toggleSongReleaseSupport}
            songs={[]}
            votePendingForSong={isSongReleaseSupportPending}
          />
        ) : likedSongs.length === 0 ? (
          <Text style={styles.emptyTitle}>No favorites.</Text>
        ) : viewSongs.length === 0 ? (
          <Text style={styles.emptyTitle}>No favorites match.</Text>
        ) : (
          <SongTable
            likePendingForSong={isSongLikePending}
            menuContext="favorites"
            onPlaySong={(song) => {
              playSelection(viewSongs, song.id, song.sourceLabel);
            }}
            onSongRowPress={() => usePlayerStore.getState().openSongSheet()}
            onToggleLikeSong={toggleSongLike}
            onToggleVoteSong={toggleSongReleaseSupport}
            songs={viewSongs}
            votePendingForSong={isSongReleaseSupportPending}
          />
        )}
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
    bottomControlsDock: {
      backgroundColor: colors.appBackground,
    },
    content: {
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
    },
    copy: {
      color: colors.textSecondary,
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 21,
      paddingHorizontal: spacing.sm,
    },
  });
}