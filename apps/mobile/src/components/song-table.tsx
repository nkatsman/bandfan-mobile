import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import HeartFilledIcon from '../../assets/Icons/poker-hearts-fill.svg';
import HeartOutlineIcon from '../../assets/Icons/heart-line.svg';
import CoverArtPlaceholder from '../../assets/BandFan/BF Cover Art Placeholder.svg';
import CheckIcon from '../../assets/Icons/check-line.svg';
import FileTextIcon from '../../assets/Icons/file-text-line.svg';
import PlaylistIcon from '../../assets/Icons/play-list-2-line.svg';
import PauseIcon from '../../assets/Icons/pause-fill.svg';
import PlayIcon from '../../assets/Icons/play-fill.svg';
import ReturnIcon from '../../assets/Icons/skip-back-fill.svg';
import TriangleFilledIcon from '../../assets/Icons/triangle-fill.svg';
import TriangleOutlineIcon from '../../assets/Icons/triangle-line.svg';
import SearchIcon from '../../assets/Icons/search-line.svg';
import getStatusBadgeStyle, { getStatusDescription, getStatusDisplayLabel } from '../design/status-badges';
import { DS } from '../design/ds';
import { spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { addSongToUserPlaylist, fetchUserPlaylists, userPlaylistsQueryDefaults, userPlaylistsQueryKey } from '../features/playlists/playlists-api';
import { getCachedImageSrc } from '../lib/image-cache';
import { useMusicStore } from '../state/music-store';
import { usePlayerStore } from '../state/player-store';
import { Playlist, Song } from '../types/music';
import { MoreVerticalIcon } from './ui/more-vertical-icon';
import { formatLoadingText, useLoadingDots } from './use-loading-dots';

type SongTableProps = {
  controlsEnabled?: boolean;
  filterMode?: SongTableFilterMode;
  isLoading?: boolean;
  loadingDotCount?: number;
  hideLikeColumn?: boolean;
  hideVoteColumn?: boolean;
  menuContext?: 'default' | 'favorites' | 'voted';
  likePendingForSong?: (songId: string) => boolean;
  onFilterModeChange?: (mode: SongTableFilterMode) => void;
  songs: Song[];
  onSearchQueryChange?: (query: string) => void;
  votePendingForSong?: (songId: string) => boolean;
  searchQuery?: string;
  sortMode?: SongTableSortMode;
  onSortModeChange?: (mode: SongTableSortMode) => void;
  onPlaySong: (song: Song) => void;
  onToggleLikeSong?: (song: Song) => void;
  onToggleVoteSong?: (song: Song) => void;
};

export type SongTableFilterMode = 'all' | 'released' | 'in-progress' | 'demo';
export type SongTableSortMode = 'best-new' | 'published-desc' | 'published-asc' | 'plays-desc' | 'plays-asc' | 'votes-desc' | 'votes-asc';

const FILTER_CYCLE: SongTableFilterMode[] = ['all', 'released', 'in-progress', 'demo'];
const SORT_CYCLE: SongTableSortMode[] = ['best-new', 'published-desc', 'plays-desc', 'votes-desc'];
const SONG_IDENTITY_BLOCK_HEIGHT = 38;
const TABLE_INLINE_GAP = 4;
const MORE_CELL_WIDTH = 40;
const ROW_SIDE_GAP = 8;
const SHOW_REPORT_ACTION = false;
const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222222';
const LIGHT_PLAY_CONTROL_SHADOW = '#000000';
const DARK_CONTROL_TEXT = '#FFFFFF';
const DARK_SEARCH_INPUT_FILL = '#1A1A19';
const DARK_COVER_ART_BORDER = '#1A1A19';
const DARK_BORDER_COLOR = '#1A1A19';
const DARK_VOTE_ICON_COLOR = '#4C79AE';
const THREE_DOT_MENU_Z_INDEX = 3000;

function getNextFilterMode(current: SongTableFilterMode) {
  const currentIndex = FILTER_CYCLE.indexOf(current);
  return FILTER_CYCLE[(currentIndex + 1) % FILTER_CYCLE.length] ?? 'all';
}

function getNextSortMode(current: SongTableSortMode) {
  const currentIndex = SORT_CYCLE.indexOf(current);
  return SORT_CYCLE[(currentIndex + 1) % SORT_CYCLE.length] ?? 'best-new';
}

function getFilterLabel(mode: SongTableFilterMode) {
  if (mode === 'released') {
    return 'Complete';
  }

  if (mode === 'in-progress') {
    return 'In progress';
  }

  if (mode === 'demo') {
    return 'Demo';
  }

  return 'All songs';
}

function getSortLabel(mode: SongTableSortMode) {
  if (mode === 'votes-desc' || mode === 'votes-asc') {
    return 'Votes';
  }

  if (mode === 'published-desc' || mode === 'published-asc') {
    return 'Published';
  }

  if (mode === 'plays-desc' || mode === 'plays-asc') {
    return 'Plays';
  }

  return 'New & Best';
}

export function SongTable({
  controlsEnabled = false,
  filterMode = 'all',
  hideLikeColumn = false,
  hideVoteColumn = false,
  isLoading = false,
  loadingDotCount,
  menuContext = 'default',
  likePendingForSong,
  onFilterModeChange,
  onPlaySong,
  onSearchQueryChange,
  onSortModeChange,
  onToggleLikeSong,
  onToggleVoteSong,
  searchQuery = '',
  songs,
  sortMode = 'best-new',
  votePendingForSong,
}: SongTableProps) {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDark = theme.mode === 'dark';
  const voteIconColor = isDark ? DARK_VOTE_ICON_COLOR : theme.ui.buttonVoteActive;
  const addSongToPlaylistLocal = useMusicStore((state) => state.addSongToUserPlaylist);
  const replaceUserPlaylists = useMusicStore((state) => state.replaceUserPlaylists);
  const activeSong = usePlayerStore((state) => state.activeSong);
  const addSongToQueue = usePlayerStore((state) => state.addToQueue);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const openFullPlayer = usePlayerStore((state) => state.openFullPlayer);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const storedUserPlaylists = useMusicStore((state) => state.playlists).filter((playlist) => playlist.kind === 'user');
  const [menuSongId, setMenuSongId] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<'actions' | 'playlists'>('actions');
  const [statusInfo, setStatusInfo] = useState<{ description: string; label: string } | null>(null);
  const internalLoadingDotCount = useLoadingDots(isLoading && loadingDotCount === undefined);
  const playlistsQuery = useQuery({
    enabled: Boolean(menuSongId && menuView === 'playlists'),
    queryFn: fetchUserPlaylists,
    queryKey: userPlaylistsQueryKey,
    ...userPlaylistsQueryDefaults,
  });
  const playlistLoadingDotCount = useLoadingDots(Boolean(menuSongId && menuView === 'playlists' && playlistsQuery.isFetching));
  const userPlaylists = playlistsQuery.data ?? storedUserPlaylists;
  const isPlaylistMenuLoading = menuView === 'playlists' && playlistsQuery.isFetching;

  useEffect(() => {
    if (playlistsQuery.data) {
      replaceUserPlaylists(playlistsQuery.data);
    }
  }, [playlistsQuery.data, replaceUserPlaylists]);

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, songId }: { playlistId: string; songId: string }) => addSongToUserPlaylist(playlistId, songId),
    onMutate: ({ playlistId, songId }) => {
      addSongToPlaylistLocal(playlistId, songId);
      queryClient.setQueryData<Playlist[]>(userPlaylistsQueryKey, (current = []) => current.map((playlist) => (
        playlist.id === playlistId ? { ...playlist, trackIds: Array.from(new Set([...playlist.trackIds, songId])) } : playlist
      )));
    },
    onError: (error) => {
      Alert.alert('Playlist Error', error instanceof Error ? error.message : 'Song could not be added to playlist.');
    },
  });

  function openMenu(songId: string) {
    setMenuView('actions');
    setMenuSongId((current) => (current === songId ? null : songId));
  }

  function closeMenu() {
    setMenuSongId(null);
    setMenuView('actions');
  }

  const loadingText = formatLoadingText('L O A D I N G', loadingDotCount ?? internalLoadingDotCount);

  return (
    <View style={styles.table}>
      {controlsEnabled ? (
        <View style={styles.controlsRow}>
          <View style={styles.searchShell}>
            <SearchIcon color={theme.mode === 'dark' ? DARK_CONTROL_TEXT : theme.ui.textPrimary} height={16} width={16} />
            <TextInput
              onChangeText={onSearchQueryChange}
              placeholder="Search"
              placeholderTextColor={theme.ui.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onFilterModeChange?.(getNextFilterMode(filterMode))}
            style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          >
            <Text style={styles.controlButtonLabel}>{getFilterLabel(filterMode)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSortModeChange?.(getNextSortMode(sortMode))}
            style={({ pressed }) => [styles.controlButton, styles.sortButton, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={styles.controlButtonLabel}>{getSortLabel(sortMode)}</Text>
          </Pressable>
        </View>
      ) : null}

      {menuSongId ? <Pressable accessibilityLabel="Close song menu" accessibilityRole="button" onPress={closeMenu} style={styles.menuDismissLayer} /> : null}

      <View style={styles.headerRow}>
        <View style={styles.moreHeader} />
        <View style={styles.artHeaderSpacer} />
        <Text style={[styles.headerLabel, styles.songHeader]}>Song</Text>
        {!hideVoteColumn ? <Text style={[styles.headerLabel, styles.voteHeader]}>Vote</Text> : null}
        {!hideLikeColumn ? <Text style={[styles.headerLabel, styles.likeHeader]}>Like</Text> : null}
        <Text style={[styles.headerLabel, styles.playHeader]}>Play</Text>
      </View>

      {isLoading ? (
        <View style={[styles.row, styles.rowFirst, styles.loadingRow]}>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      ) : null}

      {!isLoading && songs.map((song, index) => {
        const likePending = likePendingForSong?.(song.id) ?? false;
        const votePending = votePendingForSong?.(song.id) ?? false;
        const badgeStyle = getStatusBadgeStyle(song.sourceLabel);
        const isActiveSong = activeSong?.id === song.id;

        return (
          <View key={song.id} style={[styles.row, index === 0 ? styles.rowFirst : styles.rowAfterFirst, menuSongId === song.id && styles.rowMenuOpen]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openMenu(song.id)}
              style={({ pressed }) => [styles.moreCell, pressed && styles.pressed]}
            >
              <MoreVerticalIcon color={theme.ui.textPrimary} size={16} />
            </Pressable>

            <View style={styles.songPressArea}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuSongId(null);
                  onPlaySong(song);
                  openFullPlayer();
                }}
                style={({ pressed }) => [styles.songPressContent, pressed && styles.pressed]}
              >
                {song.coverArtUrl ? (
                  <Image source={{ uri: getCachedImageSrc(song.coverArtUrl) }} style={styles.artworkImage} />
                ) : (
                  <View style={styles.artworkFallback}>
                    <CoverArtPlaceholder height={42} width={42} />
                  </View>
                )}

                <View style={styles.songCell}>
                  <View style={styles.songTitleRow}>
                    <View
                      accessibilityLabel={`${getStatusDisplayLabel(song.sourceLabel)} status. ${getStatusDescription(song.sourceLabel)}`}
                      style={[styles.statusDot, { backgroundColor: badgeStyle.fillColor }]}
                    />
                    <HoldToMarqueeText containerStyle={styles.songTitleSlot} text={song.title} textStyle={styles.songTitle} />
                  </View>
                  <HoldToMarqueeText containerStyle={styles.songArtistSlot} text={song.artist} textStyle={styles.songArtist} />
                </View>
              </Pressable>
            </View>

            {!hideVoteColumn ? (
              <Pressable
                accessibilityRole="button"
                disabled={!onToggleVoteSong || votePending}
                onPress={() => onToggleVoteSong?.(song)}
                style={({ pressed }) => [styles.iconCell, styles.voteCell, pressed && styles.pressed, votePending && styles.disabled]}
              >
                {song.voted ? <TriangleFilledIcon color={voteIconColor} height={20} width={20} /> : <TriangleOutlineIcon color={voteIconColor} height={20} width={20} />}
              </Pressable>
            ) : null}

            {!hideLikeColumn ? (
              <Pressable
                accessibilityRole="button"
                disabled={!onToggleLikeSong || likePending}
                onPress={() => onToggleLikeSong?.(song)}
                style={({ pressed }) => [styles.iconCell, styles.likeCell, pressed && styles.pressed, likePending && styles.disabled]}
              >
                {song.liked ? <HeartFilledIcon color={theme.ui.buttonLikeActive} height={22} width={22} /> : <HeartOutlineIcon height={22} width={22} />}
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isActiveSong) {
                  togglePlayback();
                  return;
                }

                onPlaySong(song);
              }}
              style={({ pressed }) => [styles.playCell, pressed && styles.pressed]}
            >
              {isActiveSong && isPlaying ? <PauseIcon color={LIGHT_PLAY_CONTROL_STROKE} height={30} width={30} /> : <PlayIcon color={LIGHT_PLAY_CONTROL_STROKE} height={34} width={34} />}
            </Pressable>

            {menuSongId === song.id ? (
              <View style={styles.rowMenu}>
                {menuView === 'playlists' ? (
                  <>
                    <MenuAction icon={<ReturnIcon height={16} width={16} />} label="Go Back" onPress={() => setMenuView('actions')} styles={styles} />
                    {isPlaylistMenuLoading ? <Text style={styles.rowMenuEmpty}>{formatLoadingText('Loading', playlistLoadingDotCount)}</Text> : null}
                    {!isPlaylistMenuLoading && userPlaylists.length === 0 ? <Text style={styles.rowMenuEmpty}>No playlists yet.</Text> : null}
                    {!isPlaylistMenuLoading && userPlaylists.map((playlist) => {
                      const alreadyAdded = playlist.trackIds.includes(song.id);

                      return (
                        <MenuAction
                          key={playlist.id}
                          disabled={alreadyAdded || addToPlaylistMutation.isPending}
                          icon={alreadyAdded ? <CheckIcon height={16} width={16} /> : <PlaylistIcon height={16} width={16} />}
                          label={playlist.title}
                          onPress={() => {
                            addToPlaylistMutation.mutate({ playlistId: playlist.id, songId: song.id });
                            closeMenu();
                          }}
                          styles={styles}
                        />
                      );
                    })}
                  </>
                ) : (
                  <>
                    <MenuAction icon={<PlaylistIcon height={16} width={16} />} label="Add to playlist" onPress={() => setMenuView('playlists')} styles={styles} />
                    <MenuAction icon={<PlayIcon height={16} width={16} />} label="Add to queue" onPress={() => { addSongToQueue(song); closeMenu(); }} styles={styles} />
                    {menuContext === 'favorites' ? (
                      <MenuAction icon={<HeartFilledIcon color={theme.ui.buttonLikeActive} height={16} width={16} />} label="Remove from favorites" onPress={() => { onToggleLikeSong?.(song); closeMenu(); }} styles={styles} />
                    ) : (
                      <MenuAction icon={song.liked ? <HeartFilledIcon color={theme.ui.buttonLikeActive} height={16} width={16} /> : <HeartOutlineIcon height={16} width={16} />} label={song.liked ? 'Remove from favorites' : 'Add to favorites'} onPress={() => { onToggleLikeSong?.(song); closeMenu(); }} styles={styles} />
                    )}
                    {menuContext !== 'voted' ? (
                      <MenuAction icon={song.voted ? <TriangleFilledIcon color={voteIconColor} height={16} width={16} /> : <TriangleOutlineIcon color={voteIconColor} height={16} width={16} />} label={song.voted ? 'Unvote' : 'Vote for release'} onPress={() => { onToggleVoteSong?.(song); closeMenu(); }} styles={styles} />
                    ) : null}
                    {SHOW_REPORT_ACTION ? <MenuAction icon={<FileTextIcon height={16} width={16} />} label="Report song" onPress={() => { closeMenu(); }} styles={styles} /> : null}
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <Modal animationType="fade" onRequestClose={() => setStatusInfo(null)} transparent visible={Boolean(statusInfo)}>
        <View style={styles.statusModalRoot}>
          <Pressable accessibilityRole="button" onPress={() => setStatusInfo(null)} style={styles.statusModalBackdrop} />
          <View style={styles.statusModalPanel}>
            <Text style={styles.statusModalTitle}>{statusInfo?.label}</Text>
            <Text style={styles.statusModalText}>{statusInfo?.description}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuAction({ disabled = false, icon, label, onPress, styles }: { disabled?: boolean; icon: ReactNode; label: string; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.rowMenuAction, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      {icon}
      <Text numberOfLines={1} style={styles.rowMenuActionLabel}>{label}</Text>
    </Pressable>
  );
}

function HoldToMarqueeText({ containerStyle, text, textStyle }: { containerStyle?: object; text: string; textStyle: object }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const estimatedTextWidth = text.length * 8.5;
  const overflowWidth = containerWidth > 0 ? Math.max(0, estimatedTextWidth - containerWidth) : 0;
  const translateX = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (overflowWidth <= 0) {
      loopRef.current?.stop();
      loopRef.current = null;
      translateX.stopAnimation();
      translateX.setValue(0);
      return;
    }

    const duration = Math.max(1300, overflowWidth * 28);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          duration,
          easing: Easing.linear,
          toValue: -overflowWidth,
          useNativeDriver: true,
        }),
        Animated.delay(220),
      ]),
    );

    loopRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
      loopRef.current = null;
      translateX.setValue(0);
    };
  }, [overflowWidth, translateX]);

  return (
    <View style={[sharedStyles.marqueePressArea, containerStyle]}>
      <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={sharedStyles.marqueeViewport}>
        <Animated.Text numberOfLines={1} style={[textStyle, sharedStyles.marqueeText, { transform: [{ translateX }] }]}> 
          {text}
        </Animated.Text>
      </View>
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  marqueePressArea: {
    flexShrink: 1,
    minWidth: 0,
  },
  marqueeText: {
    flexShrink: 0,
  },
  marqueeViewport: {
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
});

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { semantic, ui } = theme;
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    artworkFallback: {
      alignItems: 'center',
      backgroundColor: ui.surfaceCard,
      borderColor: isDark ? DARK_COVER_ART_BORDER : ui.borderStrong,
      borderWidth: 2,
      height: SONG_IDENTITY_BLOCK_HEIGHT,
      justifyContent: 'center',
      width: SONG_IDENTITY_BLOCK_HEIGHT,
    },
    artworkImage: {
      borderColor: isDark ? DARK_COVER_ART_BORDER : ui.borderStrong,
      borderWidth: 2,
      height: SONG_IDENTITY_BLOCK_HEIGHT,
      width: SONG_IDENTITY_BLOCK_HEIGHT,
    },
    disabled: {
      opacity: 0.55,
    },
    controlsRow: {
      alignItems: 'center',
      backgroundColor: ui.appBackground,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    controlButton: {
      alignItems: 'center',
      backgroundColor: ui.buttonPrimary,
      borderColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      minHeight: 40,
      minWidth: 84,
      paddingHorizontal: spacing.sm,
    },
    controlButtonLabel: {
      color: isDark ? DARK_CONTROL_TEXT : ui.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '900',
      textAlign: 'left',
    },
    headerLabel: {
      color: ui.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.fine,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    headerRow: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      flexDirection: 'row',
      minHeight: 40,
      paddingHorizontal: spacing.sm,
    },
    moreHeader: {
      width: MORE_CELL_WIDTH,
    },
    artHeaderSpacer: {
      width: SONG_IDENTITY_BLOCK_HEIGHT,
    },
    iconCell: {
      alignItems: 'center',
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    likeCell: {
      marginLeft: TABLE_INLINE_GAP,
    },
    playCell: {
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderWidth: 0,
      boxShadow: `inset 0 0 0 ${DS.stroke.fine}px ${LIGHT_PLAY_CONTROL_STROKE}, 2px 2px 0px ${LIGHT_PLAY_CONTROL_SHADOW}`,
      height: 44,
      justifyContent: 'center',
      marginLeft: TABLE_INLINE_GAP,
      overflow: 'hidden',
      width: 44,
    },
    moreCell: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      height: 44,
      justifyContent: 'center',
      marginRight: 0,
      width: MORE_CELL_WIDTH,
    },
    pressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    row: {
      alignItems: 'center',
      backgroundColor: semantic.colors.tableRowFill,
      borderColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      minHeight: 64,
      paddingHorizontal: ROW_SIDE_GAP,
      paddingVertical: spacing.xs,
      position: 'relative',
    },
    rowFirst: {
      borderTopWidth: 2,
    },
    rowAfterFirst: {
      borderTopWidth: 0,
    },
    rowMenu: {
      backgroundColor: ui.surfaceCard,
      borderColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderWidth: 2,
      boxShadow: '4px 4px 0px #000000',
      minWidth: 196,
      position: 'absolute',
      left: ROW_SIDE_GAP + 2,
      top: 46,
      zIndex: THREE_DOT_MENU_Z_INDEX,
    },
    rowMenuOpen: {
      zIndex: THREE_DOT_MENU_Z_INDEX,
    },
    rowMenuAction: {
      borderBottomColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderBottomWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      gap: TABLE_INLINE_GAP,
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    rowMenuActionLabel: {
      color: ui.textPrimary,
      fontSize: typeScale.small,
      fontWeight: '500',
      fontFamily: 'IBMPlexMono',
      flex: 1,
    },
    rowMenuEmpty: {
      color: ui.textSecondary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '700',
      padding: spacing.sm,
    },
    searchShell: {
      alignItems: 'center',
      backgroundColor: isDark ? DARK_SEARCH_INPUT_FILL : ui.surfaceCard,
      borderColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderWidth: 2,
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
    },
    searchInput: {
      color: isDark ? DARK_CONTROL_TEXT : ui.textPrimary,
      flex: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '700',
      paddingVertical: 0,
    },
    sortButton: {
      minWidth: 92,
    },
    songCell: {
      flex: 1,
      gap: 1,
      justifyContent: 'center',
      minHeight: SONG_IDENTITY_BLOCK_HEIGHT,
      minWidth: 0,
    },
    songPressArea: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: TABLE_INLINE_GAP,
      marginRight: 0,
      minWidth: 0,
    },
    songPressContent: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      minWidth: 0,
    },
    songHeader: {
      flex: 1,
      marginLeft: TABLE_INLINE_GAP,
      minWidth: 0,
    },
    voteHeader: {
      marginLeft: TABLE_INLINE_GAP,
      textAlign: 'center',
      width: 32,
    },
    likeHeader: {
      marginLeft: TABLE_INLINE_GAP,
      textAlign: 'center',
      width: 32,
    },
    playHeader: {
      marginLeft: TABLE_INLINE_GAP,
      textAlign: 'center',
      width: 44,
    },
    loadingRow: {
      justifyContent: 'center',
      minHeight: 96,
    },
    loadingText: {
      color: ui.textSecondary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
      textAlign: 'center',
    },
    songArtist: {
      color: ui.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
    },
    songArtistSlot: {
      flexShrink: 1,
      minWidth: 0,
    },
    songTitleSlot: {
      flexShrink: 1,
      minWidth: 0,
    },
    songTitle: {
      color: ui.textPrimary,
      flexShrink: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    statusDot: {
      borderColor: isDark ? DARK_BORDER_COLOR : ui.borderStrong,
      borderWidth: 1,
      borderRadius: 999,
      flexShrink: 0,
      height: 10,
      marginRight: TABLE_INLINE_GAP,
      width: 10,
    },
    songTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minWidth: 0,
    },
    voteCell: {
      marginLeft: TABLE_INLINE_GAP,
    },
    table: {
      paddingHorizontal: spacing.sm,
      overflow: 'visible',
      position: 'relative',
    },
    menuDismissLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: THREE_DOT_MENU_Z_INDEX - 1,
    },
    statusModalRoot: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    statusModalBackdrop: {
      backgroundColor: ui.overlayScrim,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    statusModalPanel: {
      backgroundColor: ui.surfaceCard,
      borderColor: ui.borderStrong,
      borderWidth: 3,
      maxWidth: 320,
      padding: spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      width: '82%',
    },
    statusModalTitle: {
      color: ui.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    statusModalText: {
      color: ui.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
      lineHeight: 20,
    },
  });
}
