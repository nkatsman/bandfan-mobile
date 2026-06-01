import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DS } from '../../design/ds';
import { AppBackgroundPattern } from '../../components/app-background-pattern';
import { AppSidebar } from '../../components/app-sidebar';
import { DiscoveryControlsBar } from '../../components/discovery/discovery-controls-bar';
import { MusicPreferenceControls } from '../../components/music-preference-controls';
import { ScreenHeader } from '../../components/screen-header';
import { SongTable, type SongTableFilterMode, type SongTableSortMode } from '../../components/song-table';
import { formatLoadingText, useLoadingDots } from '../../components/use-loading-dots';
import { usePullToRefresh } from '../../components/use-pull-to-refresh';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { ApiClientError } from '../../lib/api/client';
import { hasApiBaseUrl } from '../../lib/env';
import { useSongLikeAction } from '../preferences/use-song-like-action';
import { DEFAULT_PLAYER_SETTINGS, fetchPlayerSettings, playerSettingsQueryDefaults, playerSettingsQueryKey } from '../preferences/player-settings-api';
import { DISCOVER_SORT_MODES, matchesSongFilter, sortSongs } from '../preferences/song-view-options';
import { useSongReleaseSupportAction } from '../release-support/use-song-release-support-action';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { discoverySongsQueryDefaults, discoverySongsQueryKey, fetchDiscoverySongsForPreferences } from './discovery-api';

const SEARCH_FILTER_SORT_Z_INDEX = 4000;
const SONG_REACH_OFFSET = 48;
const HEADER_CENTER_OFFSET = 24;

export function DiscoveryScreen() {
  const theme = useAppTheme();
  const songs = useMusicStore((state) => state.songs);
  const replaceDiscoverySongs = useMusicStore((state) => state.replaceDiscoverySongs);
  const playSelection = usePlayerStore((state) => state.playSelection);
  const setNormalizationEnabled = usePlayerStore((state) => state.setNormalizationEnabled);
  const { isSongLikePending, likeErrorMessage, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, releaseSupportErrorMessage, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SongTableFilterMode>('all');
  const [sortMode, setSortMode] = useState<SongTableSortMode>('best-new');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const styles = useMemo(() => createStyles(theme.ui), [theme]);

  const playerSettingsQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: fetchPlayerSettings,
    queryKey: playerSettingsQueryKey,
    ...playerSettingsQueryDefaults,
  });

  const playerSettings = playerSettingsQuery.data ?? DEFAULT_PLAYER_SETTINGS;

  const discoveryQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: () => fetchDiscoverySongsForPreferences({ includeAiAssisted: playerSettings.showAiAssistedDiscoverSongs }),
    queryKey: [...discoverySongsQueryKey, { includeAiAssisted: playerSettings.showAiAssistedDiscoverSongs }],
    ...discoverySongsQueryDefaults,
  });
  const { refreshIndicator, ...pullToRefreshProps } = usePullToRefresh({
    enabled: hasApiBaseUrl,
    onRefresh: () => void discoveryQuery.refetch(),
    refreshing: discoveryQuery.isRefetching,
  });

  const viewSongs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = songs.filter((song) => {
      if (!matchesSongFilter(song, filterMode)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        song.title.toLowerCase().includes(normalizedSearch)
        || song.artist.toLowerCase().includes(normalizedSearch)
      );
    });

    return sortSongs(filtered, sortMode);
  }, [filterMode, searchQuery, songs, sortMode]);

  useEffect(() => {
    if (discoveryQuery.data) {
      replaceDiscoverySongs(discoveryQuery.data);
    }
  }, [discoveryQuery.data, replaceDiscoverySongs]);

  useEffect(() => {
    setNormalizationEnabled(playerSettings.normalizationEnabled);
  }, [playerSettings.normalizationEnabled, setNormalizationEnabled]);

  const errorMessage =
    discoveryQuery.error instanceof ApiClientError
      ? discoveryQuery.error.message
      : discoveryQuery.error instanceof Error
        ? discoveryQuery.error.message
        : 'Discover could not load from the backend.';

  const shouldRenderSongs = hasApiBaseUrl ? discoveryQuery.isSuccess : songs.length > 0;
  const isDiscoverLoading = hasApiBaseUrl && discoveryQuery.isLoading;
  const loadingDotCount = useLoadingDots(isDiscoverLoading);

  return (
    <View style={styles.root}>
      <AppBackgroundPattern />
      <ScrollView
        {...pullToRefreshProps}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        {refreshIndicator}
        <ScreenHeader counter={isDiscoverLoading ? formatLoadingText('Loading', loadingDotCount) : `${viewSongs.length} songs ready to play`} onLogoPress={() => setSidebarVisible(true)} title="Discover" verticalOffset={HEADER_CENTER_OFFSET} />

        <View style={styles.musicControlsShelf}>
          <MusicPreferenceControls layout="fill" showNormalization={false} />
        </View>

        {hasApiBaseUrl && discoveryQuery.isError ? (
          <>
            <Text style={styles.sectionTitle}>Discover Error</Text>
            <Text style={styles.copy}>{errorMessage}</Text>
          </>
        ) : null}

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

        {!hasApiBaseUrl ? (
          <Text style={styles.sectionTitle}>No songs found.</Text>
        ) : discoveryQuery.isSuccess && viewSongs.length === 0 ? (
          <Text style={styles.sectionTitle}>No songs found.</Text>
        ) : null}

        {isDiscoverLoading || (shouldRenderSongs && viewSongs.length > 0) ? (
          <SongTable
            isLoading={isDiscoverLoading}
            loadingDotCount={loadingDotCount}
            likePendingForSong={isSongLikePending}
            onPlaySong={(song) => {
              playSelection(viewSongs, song.id, song.sourceLabel);
            }}
            onToggleLikeSong={toggleSongLike}
            onToggleVoteSong={toggleSongReleaseSupport}
            songs={isDiscoverLoading ? [] : viewSongs}
            votePendingForSong={isSongReleaseSupportPending}
          />
        ) : null}
      </ScrollView>

      <View style={styles.bottomControlsDock}>
        <DiscoveryControlsBar
          filterMode={filterMode}
          availableSortModes={DISCOVER_SORT_MODES}
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
      position: 'relative',
      zIndex: 1,
    },
    content: {
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
    },
    bottomControlsDock: {
      backgroundColor: colors.appBackground,
      position: 'relative',
      zIndex: SEARCH_FILTER_SORT_Z_INDEX,
    },
    musicControlsShelf: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: SONG_REACH_OFFSET - HEADER_CENTER_OFFSET,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
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
