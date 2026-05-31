import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Alert, Image, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CoverArtPlaceholder from '../../../assets/BandFan/BF Cover Art Placeholder.svg';
import LogoDark from '../../../assets/BandFan/BandFan - Logo Dark.svg';
import LogoLight from '../../../assets/BandFan/BandFan - Logo Light.svg';
import CheckIcon from '../../../assets/Icons/check-line.svg';
import HeartFilledIcon from '../../../assets/Icons/poker-hearts-fill.svg';
import HeartIcon from '../../../assets/Icons/heart-line.svg';
import PauseIcon from '../../../assets/Icons/pause-fill.svg';
import PlayIcon from '../../../assets/Icons/play-fill.svg';
import PlaylistIcon from '../../../assets/Icons/play-list-2-line.svg';
import RepeatOneIcon from '../../../assets/Icons/repeat-one-fill.svg';
import RepeatIcon from '../../../assets/Icons/repeat-2-fill.svg';
import ShuffleIcon from '../../../assets/Icons/shuffle-fill.svg';
import SkipBackIcon from '../../../assets/Icons/skip-back-fill.svg';
import SkipForwardIcon from '../../../assets/Icons/skip-forward-fill.svg';
import SparklingIcon from '../../../assets/Icons/sparkling-line.svg';
import TriangleFilledIcon from '../../../assets/Icons/triangle-fill.svg';
import TriangleOutlineIcon from '../../../assets/Icons/triangle-line.svg';
import { BottomMenu } from '../../components/ui/bottom-menu';
import { SeekBar } from '../../components/ui/seek-bar';
import { DS } from '../../design/ds';
import getStatusBadgeStyle, { getStatusDisplayLabel } from '../../design/status-badges';
import { useAppTheme } from '../../design/theme';
import { spacing, typeScale } from '../../design/tokens';
import { getCachedImageSrc } from '../../lib/image-cache';
import { addSongToUserPlaylist, fetchUserPlaylists, removeSongFromUserPlaylist, userPlaylistsQueryDefaults, userPlaylistsQueryKey } from '../playlists/playlists-api';
import { useMusicStore } from '../../state/music-store';
import { usePlayerStore } from '../../state/player-store';
import { Playlist } from '../../types/music';
import { useSongLikeAction } from '../preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../release-support/use-song-release-support-action';

const BOTTOM_MENU_ITEMS = [
  { key: 'index', label: 'DISCOVER' },
  { key: 'liked', label: 'FAVORITES' },
  { key: 'playlists', label: 'PLAYLISTS' },
  { key: 'account', label: 'ACCOUNT' },
];

const ROUTE_BY_KEY = {
  account: '/(tabs)/account',
  index: '/(tabs)',
  liked: '/(tabs)/liked',
  playlists: '/(tabs)/playlists',
} as const;

const LIGHT_PLAY_CONTROL_STROKE = '#222222';
const MISSING_COVER_COPY = 'No cover art yet.';
const DARK_VOTE_ICON_COLOR = '#4C79AE';
const BIG_PLAYER_Z_INDEX = 5000;

type FullPlayerPanelProps = {
  includeBottomMenu?: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
};

export function PlayerScreen() {
  const router = useRouter();

  return (
    <FullPlayerPanel
      includeBottomMenu
      onCollapse={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/(tabs)');
      }}
    />
  );
}

export function FullPlayerPanel({ includeBottomMenu = false, onCollapse, onNavigate }: FullPlayerPanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const activeSong = usePlayerStore((state) => state.activeSong);
  const isNormalizationEnabled = usePlayerStore((state) => state.isNormalizationEnabled);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled);
  const loopMode = usePlayerStore((state) => state.loopMode);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const progressPercent = usePlayerStore((state) => state.progressPercent);
  const seekToPercent = usePlayerStore((state) => state.seekToPercent);
  const toggleNormalization = usePlayerStore((state) => state.toggleNormalization);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const toggleRepeatMode = usePlayerStore((state) => state.toggleRepeatMode);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const addSongToPlaylistLocal = useMusicStore((state) => state.addSongToUserPlaylist);
  const removeSongFromPlaylistLocal = useMusicStore((state) => state.removeSongFromUserPlaylist);
  const replaceUserPlaylists = useMusicStore((state) => state.replaceUserPlaylists);
  const storedUserPlaylists = useMusicStore((state) => state.playlists).filter((playlist) => playlist.kind === 'user');
  const { isSongLikePending, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const [isPlaylistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const styles = useMemo(() => createStyles(theme.ui, theme.mode, screenWidth, screenHeight, insets.top), [insets.top, screenHeight, screenWidth, theme]);
  const badgeStyle = activeSong ? getStatusBadgeStyle(activeSong.sourceLabel) : null;
  const elapsedLabel = activeSong ? getElapsedLabel(activeSong.durationLabel, progressPercent) : '00:00';
  const Logo = theme.mode === 'light' ? LogoLight : LogoDark;
  const voteIconColor = theme.mode === 'dark' ? DARK_VOTE_ICON_COLOR : theme.ui.buttonVoteActive;
  const playlistsQuery = useQuery({
    enabled: Boolean(isPlaylistMenuOpen && activeSong),
    queryFn: fetchUserPlaylists,
    queryKey: userPlaylistsQueryKey,
    ...userPlaylistsQueryDefaults,
  });
  const userPlaylists = playlistsQuery.data ?? storedUserPlaylists;
  const playlistMutation = useMutation({
    mutationFn: ({ action, playlistId, songId }: { action: 'add' | 'remove'; playlistId: string; songId: string }) => (
      action === 'add' ? addSongToUserPlaylist(playlistId, songId) : removeSongFromUserPlaylist(playlistId, songId)
    ),
    onMutate: ({ action, playlistId, songId }) => {
      if (action === 'add') {
        addSongToPlaylistLocal(playlistId, songId);
      } else {
        removeSongFromPlaylistLocal(playlistId, songId);
      }

      queryClient.setQueryData<Playlist[]>(userPlaylistsQueryKey, (current = []) => current.map((playlist) => (
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: action === 'add'
                ? Array.from(new Set([...playlist.trackIds, songId]))
                : playlist.trackIds.filter((trackId) => trackId !== songId),
            }
          : playlist
      )));
    },
    onError: (error) => {
      Alert.alert('Playlist Error', error instanceof Error ? error.message : 'Playlist could not be updated.');
    },
  });
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gestureState) => gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 42 || gestureState.vy > 0.85) {
        onCollapse?.();
      }
    },
  }), [onCollapse]);

  useEffect(() => {
    if (playlistsQuery.data) {
      replaceUserPlaylists(playlistsQuery.data);
    }
  }, [playlistsQuery.data, replaceUserPlaylists]);

  const RepeatStateIcon = loopMode === 'track' ? RepeatOneIcon : RepeatIcon;

  return (
    <View style={styles.page} {...panResponder.panHandlers}>
      {isPlaylistMenuOpen ? <Pressable accessibilityLabel="Close playlist menu" accessibilityRole="button" onPress={() => setPlaylistMenuOpen(false)} style={styles.dismissLayer} /> : null}

      <View style={styles.playerArea}>
        {activeSong ? (
          <>
            <View style={styles.coverWrap}>
              {activeSong.coverArtUrl ? (
                <Image resizeMode="cover" source={{ uri: getCachedImageSrc(activeSong.coverArtUrl) }} style={styles.coverArt} />
              ) : (
                <View style={styles.coverFallback}>
                  <Text style={styles.coverFallbackText}>{MISSING_COVER_COPY}</Text>
                  <CoverArtPlaceholder height="100%" width="100%" />
                </View>
              )}
            </View>

            <View style={styles.metaActionRow}>
              <View style={styles.metaBlock}>
                <Text numberOfLines={1} style={styles.artist}>{activeSong.artist.toUpperCase()}</Text>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={styles.title}>{activeSong.title}</Text>
                  {badgeStyle ? (
                    <View style={[styles.badge, { backgroundColor: badgeStyle.fillColor }]}> 
                      <Text style={[styles.badgeText, { color: badgeStyle.textColor }]}>{getStatusDisplayLabel(activeSong.sourceLabel)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.songActions}>
                <Pressable accessibilityRole="button" disabled={isSongReleaseSupportPending(activeSong.id)} onPress={() => toggleSongReleaseSupport(activeSong)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  {activeSong.voted ? <TriangleFilledIcon color={voteIconColor} height={28} width={28} /> : <TriangleOutlineIcon color={voteIconColor} height={28} width={28} />}
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSongLikePending(activeSong.id)} onPress={() => toggleSongLike(activeSong)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  {activeSong.liked ? <HeartFilledIcon color={theme.ui.buttonLikeActive} height={28} width={28} /> : <HeartIcon color={theme.ui.textPrimary} height={28} width={28} />}
                </Pressable>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <SeekBar onSeek={seekToPercent} value={progressPercent} />
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{elapsedLabel}</Text>
                <Text style={styles.timeText}>{activeSong.durationLabel}</Text>
              </View>
            </View>

            <View style={styles.transportRow}>
              <SmallIconButton icon={<PlaylistIcon color={theme.ui.textPrimary} height={24} width={24} />} onPress={() => setPlaylistMenuOpen((current) => !current)} styles={styles} />
              <SmallIconButton active={isNormalizationEnabled} icon={<SparklingIcon color={theme.ui.textPrimary} height={24} width={24} />} onPress={toggleNormalization} styles={styles} />
              <SmallIconButton icon={<SkipBackIcon color={theme.ui.textPrimary} height={40} width={40} />} onPress={previousTrack} styles={styles} />
              <Pressable accessibilityRole="button" onPress={togglePlayback} style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}>
                {isPlaying ? <PauseIcon color={LIGHT_PLAY_CONTROL_STROKE} height={48} width={48} /> : <PlayIcon color={LIGHT_PLAY_CONTROL_STROKE} height={48} width={48} />}
              </Pressable>
              <SmallIconButton icon={<SkipForwardIcon color={theme.ui.textPrimary} height={40} width={40} />} onPress={nextTrack} styles={styles} />
              <SmallIconButton active={loopMode !== 'off'} icon={<RepeatStateIcon color={theme.ui.textPrimary} height={24} width={24} />} onPress={toggleRepeatMode} styles={styles} />
              <SmallIconButton active={isShuffleEnabled} icon={<ShuffleIcon color={theme.ui.textPrimary} height={24} width={24} />} onPress={toggleShuffle} styles={styles} />
            </View>

            {isPlaylistMenuOpen ? (
              <View style={styles.playlistMenu}>
                {playlistsQuery.isFetching ? <Text style={styles.playlistMenuEmpty}>Loading...</Text> : null}
                {!playlistsQuery.isFetching && userPlaylists.length === 0 ? <Text style={styles.playlistMenuEmpty}>No playlists yet.</Text> : null}
                {!playlistsQuery.isFetching && userPlaylists.map((playlist) => {
                  const isAdded = playlist.trackIds.includes(activeSong.id);

                  return (
                    <Pressable
                      key={playlist.id}
                      accessibilityRole="button"
                      disabled={playlistMutation.isPending}
                      onPress={() => playlistMutation.mutate({ action: isAdded ? 'remove' : 'add', playlistId: playlist.id, songId: activeSong.id })}
                      style={({ pressed }) => [styles.playlistMenuAction, pressed && styles.pressed, playlistMutation.isPending && styles.disabled]}
                    >
                      {isAdded ? <CheckIcon color={theme.ui.textPrimary} height={16} width={16} /> : <PlaylistIcon color={theme.ui.textPrimary} height={16} width={16} />}
                      <Text numberOfLines={1} style={styles.playlistMenuLabel}>{isAdded ? `Remove from ${playlist.title}` : playlist.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Logo height={104} width={260} />
            <Text style={styles.title}>No song selected</Text>
          </View>
        )}
      </View>

      {includeBottomMenu ? (
        <BottomMenu
          activeKey=""
          items={BOTTOM_MENU_ITEMS}
          onSelect={(key) => {
            const route = ROUTE_BY_KEY[key as keyof typeof ROUTE_BY_KEY];

            if (route) {
              onNavigate?.();
              router.replace(route);
            }
          }}
        />
      ) : null}
    </View>
  );
}

function SmallIconButton({ active = false, icon, onPress, styles }: { active?: boolean; icon: ReactNode; onPress?: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.smallIconButton, active && styles.smallIconButtonActive, pressed && styles.pressed]}>
      {icon}
    </Pressable>
  );
}

function parseDurationLabel(label: string) {
  const parts = label.split(':').map((part) => Number(part));
  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    return 0;
  }

  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function formatSeconds(seconds: number) {
  const clampedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getElapsedLabel(durationLabel: string, progressPercent: number) {
  const totalSeconds = parseDurationLabel(durationLabel);
  if (totalSeconds <= 0) {
    return '00:00';
  }

  return formatSeconds((Math.max(0, Math.min(100, progressPercent)) / 100) * totalSeconds);
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], mode: ReturnType<typeof useAppTheme>['mode'], screenWidth: number, screenHeight: number, safeTopInset: number) {
  const isDark = mode === 'dark';
  const coverArtBorder = isDark ? '#1A1A19' : '#222222';
  const coverSize = Math.round(Math.min(screenWidth - spacing.md * 2, Math.max(260, screenHeight * 0.42), 480));
  const transportWidth = Math.min(coverSize, 376);

  return StyleSheet.create({
    page: {
      backgroundColor: isDark ? '#222222' : '#FFF9EF',
      flex: 1,
      justifyContent: 'flex-end',
      zIndex: BIG_PLAYER_Z_INDEX,
    },
    playerArea: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: Math.max(spacing.md, safeTopInset),
    },
    coverWrap: {
      alignSelf: 'center',
      height: coverSize,
      marginBottom: spacing.xl,
      width: coverSize,
    },
    coverArt: {
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: '100%',
      width: '100%',
    },
    coverFallback: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: '100%',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
    },
    coverFallbackText: {
      color: isDark ? '#F4F4F4' : '#222222',
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '900',
      left: spacing.sm,
      lineHeight: 16,
      position: 'absolute',
      right: spacing.sm,
      textAlign: 'center',
      top: spacing.sm,
      zIndex: 2,
    },
    metaActionRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      zIndex: 2,
    },
    metaBlock: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    artist: {
      color: '#6EA06E',
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    titleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      minWidth: 0,
    },
    title: {
      color: isDark ? '#F4F4F4' : '#222222',
      flexShrink: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    badge: {
      borderColor: '#222222',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    badgeText: {
      color: '#FFF9EF',
      fontFamily: DS.font.family,
      fontSize: 8,
      fontWeight: '900',
      lineHeight: 10,
    },
    songActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    iconButton: {
      alignItems: 'center',
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    progressBlock: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
      zIndex: 2,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timeText: {
      color: '#8F8F8F',
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '500',
    },
    transportRow: {
      alignSelf: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: transportWidth,
      zIndex: 3,
    },
    smallIconButton: {
      alignItems: 'center',
      borderColor: 'transparent',
      borderWidth: 2,
      height: 42,
      justifyContent: 'center',
      width: 34,
    },
    smallIconButtonActive: {
      backgroundColor: '#FFFFFF',
      borderColor: isDark ? '#F4F4F4' : '#222222',
    },
    playButton: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 0,
      boxShadow: 'inset 0 0 0 4px #222222, 5px 5px 0px #000000',
      height: 72,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 72,
    },
    playPressed: {
      boxShadow: [],
      transform: [{ translateX: 2 }, { translateY: 2 }],
    },
    pressed: {
      opacity: 0.62,
    },
    disabled: {
      opacity: 0.55,
    },
    emptyState: {
      alignItems: 'center',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    dismissLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 4,
    },
    playlistMenu: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceCard,
      borderColor: isDark ? '#1A1A19' : colors.borderStrong,
      borderWidth: 2,
      bottom: 84,
      boxShadow: '4px 4px 0px #000000',
      left: spacing.xl,
      minWidth: 230,
      position: 'absolute',
      zIndex: 5,
    },
    playlistMenuAction: {
      alignItems: 'center',
      borderBottomColor: isDark ? '#1A1A19' : colors.borderStrong,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      minHeight: 38,
      paddingHorizontal: spacing.sm,
    },
    playlistMenuLabel: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
    },
    playlistMenuEmpty: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
      padding: spacing.sm,
    },
  });
}