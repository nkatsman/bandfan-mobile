import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import CoverArtPlaceholder from '../../../assets/BandFan/BF Cover Art Placeholder.svg';
import EyeOffIcon from '../../../assets/Icons/eye-off-line.svg';
import EyeIcon from '../../../assets/Icons/eye-line.svg';
import HeartFilledIcon from '../../../assets/Icons/poker-hearts-fill.svg';
import PencilIcon from '../../../assets/Icons/pencil-line.svg';
import PinIcon from '../../../assets/Icons/pin-line.svg';
import TrashIcon from '../../../assets/Icons/trash-2-line.svg';
import TriangleFilledIcon from '../../../assets/Icons/triangle-fill.svg';
import { AppSidebar } from '../../components/app-sidebar';
import { ScreenHeader } from '../../components/screen-header';
import { usePullToRefresh } from '../../components/use-pull-to-refresh';
import { DS } from '../../design/ds';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { getCachedImageSrc } from '../../lib/image-cache';
import { queryClient } from '../../lib/query-client';
import { useMusicStore } from '../../state/music-store';
import { Playlist, Song } from '../../types/music';
import {
  deleteUserPlaylist,
  fetchUserPlaylists,
  userPlaylistsQueryDefaults,
  updateUserPlaylistDetails,
  updateUserPlaylistPinnedState,
  updateUserPlaylistVisibility,
  userPlaylistsQueryKey,
} from './playlists-api';

const STATUS_RELEASED = '#6EA06E';
const STATUS_PRIVATE = '#474747';
const STATUS_FOREGROUND = '#222222';
const STATUS_PRIVATE_FOREGROUND = '#FFF9EF';
const DARK_VOTE_ICON_COLOR = '#4C79AE';
const DARK_PLACEHOLDER_COVER_FILL = '#333333';

export function PlaylistsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const playlists = useMusicStore((state) => state.playlists);
  const likedSongIds = useMusicStore((state) => state.likedSongIds);
  const removeUserPlaylist = useMusicStore((state) => state.removeUserPlaylist);
  const replaceUserPlaylists = useMusicStore((state) => state.replaceUserPlaylists);
  const songs = useMusicStore((state) => state.songs);
  const updateUserPlaylist = useMusicStore((state) => state.updateUserPlaylist);
  const votedSongIds = useMusicStore((state) => state.votedSongIds);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const playlistsQuery = useQuery({
    queryFn: fetchUserPlaylists,
    queryKey: userPlaylistsQueryKey,
    ...userPlaylistsQueryDefaults,
  });
  const { refreshIndicator, ...pullToRefreshProps } = usePullToRefresh({
    onRefresh: () => void playlistsQuery.refetch(),
    onScrollBeginDrag: () => setActiveMenuId(null),
    refreshing: playlistsQuery.isRefetching,
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ playlistId, visibility }: { playlistId: string; visibility: Playlist['visibility'] }) => updateUserPlaylistVisibility(playlistId, visibility),
    onError: (error) => Alert.alert('Playlist Error', getErrorMessage(error)),
    onSuccess: (_data, variables) => {
      updateUserPlaylist(variables.playlistId, { visibility: variables.visibility });
      updateCachedPlaylist(variables.playlistId, { visibility: variables.visibility });
    },
  });

  const pinnedMutation = useMutation({
    mutationFn: ({ isPinned, playlistId }: { isPinned: boolean; playlistId: string }) => updateUserPlaylistPinnedState(playlistId, isPinned),
    onError: (error) => Alert.alert('Playlist Error', getErrorMessage(error)),
    onSuccess: (_data, variables) => {
      updateUserPlaylist(variables.playlistId, { isPinned: variables.isPinned });
      updateCachedPlaylist(variables.playlistId, { isPinned: variables.isPinned });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ description, playlistId, title }: { description: string; playlistId: string; title: string }) => updateUserPlaylistDetails(playlistId, { description, title }),
    onError: (error) => Alert.alert('Playlist Error', getErrorMessage(error)),
    onSuccess: (_data, variables) => {
      updateUserPlaylist(variables.playlistId, { description: variables.description.trim(), title: variables.title.trim() });
      setEditingPlaylist(null);
      updateCachedPlaylist(variables.playlistId, { description: variables.description.trim(), title: variables.title.trim() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserPlaylist,
    onError: (error) => Alert.alert('Playlist Error', getErrorMessage(error)),
    onSuccess: (_data, playlistId) => {
      removeUserPlaylist(playlistId);
      queryClient.setQueryData<Playlist[]>(userPlaylistsQueryKey, (current = []) => current.filter((playlist) => playlist.id !== playlistId));
    },
  });

  function updateCachedPlaylist(playlistId: string, updates: Partial<Pick<Playlist, 'description' | 'isPinned' | 'title' | 'visibility'>>) {
    queryClient.setQueryData<Playlist[]>(userPlaylistsQueryKey, (current = []) => current.map((playlist) => (playlist.id === playlistId ? { ...playlist, ...updates } : playlist)));
  }

  useEffect(() => {
    if (playlistsQuery.data) {
      replaceUserPlaylists(playlistsQuery.data);
    }
  }, [playlistsQuery.data, replaceUserPlaylists]);

  const favoritesPlaylist = playlists.find((playlist) => playlist.kind === 'favorites');
  const votedPlaylist = playlists.find((playlist) => playlist.kind === 'voted');
  const pinnedPlaylists = playlists.filter((playlist) => playlist.kind === 'user' && playlist.isPinned);
  const unpinnedPlaylists = playlists.filter((playlist) => playlist.kind === 'user' && !playlist.isPinned);
  const hasUserPlaylists = pinnedPlaylists.length > 0 || unpinnedPlaylists.length > 0;

  function openPlaylist(playlist: Playlist) {
    if (activeMenuId) {
      setActiveMenuId(null);
      return;
    }

    if (playlist.kind === 'favorites') {
      router.push('/liked');
      return;
    }

    router.push({ pathname: '/playlist/[playlistId]', params: { playlistId: playlist.id } });
  }

  function openEditModal(playlist: Playlist) {
    setActiveMenuId(null);
    setEditDescription(playlist.description);
    setEditTitle(playlist.title);
    setEditingPlaylist(playlist);
  }

  function submitEdit() {
    const title = editTitle.trim();

    if (!editingPlaylist || !title) {
      Alert.alert('Playlist Error', 'Playlist title is required.');
      return;
    }

    editMutation.mutate({
      description: editDescription,
      playlistId: editingPlaylist.id,
      title,
    });
  }

  function confirmDelete(playlist: Playlist) {
    setActiveMenuId(null);
    Alert.alert('Delete Playlist?', `Delete ${playlist.title}? This cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => deleteMutation.mutate(playlist.id), style: 'destructive', text: 'Delete' },
    ]);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        {...pullToRefreshProps}
        contentContainerStyle={styles.content}
        onTouchStart={activeMenuId ? () => setActiveMenuId(null) : undefined}
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        {refreshIndicator}
        <ScreenHeader counter={`${playlists.length} playlists`} onLogoPress={() => setSidebarVisible(true)} title="Playlists" />

        <View style={styles.grid}>
          {favoritesPlaylist ? <PlaylistCard displayTrackCount={likedSongIds.length} onOpen={() => openPlaylist(favoritesPlaylist)} playlist={favoritesPlaylist} songs={songs} styles={styles} /> : null}
          {votedPlaylist ? <PlaylistCard displayTrackCount={votedSongIds.length} onOpen={() => openPlaylist(votedPlaylist)} playlist={votedPlaylist} songs={songs} styles={styles} /> : null}

          <View style={styles.divider} />

          {playlistsQuery.isLoading ? <Text style={styles.statusText}>Loading playlists...</Text> : null}
          {playlistsQuery.isError ? <Text style={styles.statusText}>Could not load playlists.</Text> : null}
          {!playlistsQuery.isLoading && !playlistsQuery.isError && !hasUserPlaylists ? <Text style={styles.statusText}>No playlists yet.</Text> : null}

          {pinnedPlaylists.length > 0 ? (
            <View style={[styles.sectionBlock, pinnedPlaylists.some((playlist) => playlist.id === activeMenuId) && styles.sectionBlockMenuOpen]}>
              <Text style={styles.sectionLabel}>Pinned Playlists</Text>
              {pinnedPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  menuOpen={activeMenuId === playlist.id}
                  onDelete={() => confirmDelete(playlist)}
                  onEdit={() => openEditModal(playlist)}
                  onOpen={() => openPlaylist(playlist)}
                  onToggleMenu={() => setActiveMenuId((current) => (current === playlist.id ? null : playlist.id))}
                  onTogglePin={() => {
                    setActiveMenuId(null);
                    pinnedMutation.mutate({ isPinned: !playlist.isPinned, playlistId: playlist.id });
                  }}
                  onToggleVisibility={() => {
                    setActiveMenuId(null);
                    visibilityMutation.mutate({ playlistId: playlist.id, visibility: playlist.visibility === 'public' ? 'private' : 'public' });
                  }}
                  playlist={playlist}
                  songs={songs}
                  styles={styles}
                />
              ))}
            </View>
          ) : null}

          {unpinnedPlaylists.length > 0 ? (
            <View style={[styles.sectionBlock, unpinnedPlaylists.some((playlist) => playlist.id === activeMenuId) && styles.sectionBlockMenuOpen]}>
              <Text style={styles.sectionLabel}>Playlists</Text>
              {unpinnedPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  menuOpen={activeMenuId === playlist.id}
                  onDelete={() => confirmDelete(playlist)}
                  onEdit={() => openEditModal(playlist)}
                  onOpen={() => openPlaylist(playlist)}
                  onToggleMenu={() => setActiveMenuId((current) => (current === playlist.id ? null : playlist.id))}
                  onTogglePin={() => {
                    setActiveMenuId(null);
                    pinnedMutation.mutate({ isPinned: !playlist.isPinned, playlistId: playlist.id });
                  }}
                  onToggleVisibility={() => {
                    setActiveMenuId(null);
                    visibilityMutation.mutate({ playlistId: playlist.id, visibility: playlist.visibility === 'public' ? 'private' : 'public' });
                  }}
                  playlist={playlist}
                  songs={songs}
                  styles={styles}
                />
              ))}
            </View>
          ) : null}

          {activeMenuId ? <Pressable accessibilityRole="button" onPress={() => setActiveMenuId(null)} style={styles.menuDismissFiller} /> : null}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setEditingPlaylist(null)} transparent visible={Boolean(editingPlaylist)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editPanel}>
            <Text style={styles.editTitle}>Edit Playlist</Text>
            <TextInput
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={theme.ui.textSecondary}
              style={styles.editInput}
              value={editTitle}
            />
            <TextInput
              multiline
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={theme.ui.textSecondary}
              style={[styles.editInput, styles.editTextArea]}
              value={editDescription}
            />
            <View style={styles.editActionsRow}>
              <Pressable accessibilityRole="button" onPress={() => setEditingPlaylist(null)} style={({ pressed }) => [styles.editButton, pressed && styles.itemPressed]}>
                <Text style={styles.editButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={editMutation.isPending}
                onPress={submitEdit}
                style={({ pressed }) => [styles.editButton, styles.editSaveButton, pressed && styles.itemPressed, editMutation.isPending && styles.disabled]}
              >
                <Text style={styles.editButtonLabel}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <AppSidebar onClose={() => setSidebarVisible(false)} visible={sidebarVisible} />
    </View>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Playlist action failed.';
}

function PlaylistCard({
  displayTrackCount,
  menuOpen = false,
  onDelete,
  onEdit,
  onOpen,
  onToggleMenu,
  onTogglePin,
  onToggleVisibility,
  playlist,
  songs,
  styles,
}: {
  displayTrackCount?: number;
  menuOpen?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onOpen: () => void;
  onToggleMenu?: () => void;
  onTogglePin?: () => void;
  onToggleVisibility?: () => void;
  playlist: Playlist;
  songs: Song[];
  styles: ReturnType<typeof createStyles>;
}) {
  const firstSong = songs.find((song) => song.id === playlist.trackIds[0]);
  const coverArtUrl = playlist.coverArtUrl ?? firstSong?.coverArtUrl;
  const badgeStyle = playlist.visibility === 'public' ? styles.publicBadge : styles.privateBadge;
  const badgeLabelStyle = playlist.visibility === 'public' ? styles.publicBadgeLabel : styles.privateBadgeLabel;
  const trackCount = displayTrackCount ?? playlist.trackIds.length;
  const voteIconColor = styles.voteIconColor.color;

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={playlist.kind === 'user' ? onToggleMenu : undefined}
      style={({ pressed }) => [styles.card, menuOpen && styles.cardMenuOpen, pressed && styles.itemPressed]}
    >
      {playlist.kind === 'favorites' ? (
        <View style={styles.builtInCoverFallback}>
          <HeartFilledIcon color="#EF4343" height={46} width={46} />
        </View>
      ) : playlist.kind === 'voted' ? (
        <View style={styles.builtInCoverFallback}>
          <TriangleFilledIcon color={voteIconColor} height={48} width={48} />
        </View>
      ) : coverArtUrl ? (
        <Image source={{ uri: getCachedImageSrc(coverArtUrl) }} style={styles.coverImage} />
      ) : playlist.kind === 'user' ? (
        <View style={styles.mixCoverFallback}>
          <Text style={styles.mixCoverLabel}>Mix</Text>
        </View>
      ) : (
        <View style={styles.coverFallback}>
          <CoverArtPlaceholder height={76} width={76} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{playlist.title}</Text>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeLabel, badgeLabelStyle]}>{playlist.visibility === 'public' ? 'Public' : 'Private'}</Text>
          </View>
        </View>

        <Text numberOfLines={2} style={styles.description}>{playlist.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>by You</Text>
          <Text style={styles.meta}>{trackCount} songs</Text>
        </View>
      </View>

      {menuOpen && playlist.kind === 'user' ? (
        <View onTouchStart={(event) => event.stopPropagation()} style={styles.cardMenu}>
          <PlaylistMenuAction
            icon={playlist.visibility === 'public'
              ? <EyeOffIcon color={styles.iconColor.color} height={16} width={16} />
              : <EyeIcon color={styles.iconColor.color} height={16} width={16} />}
            label={playlist.visibility === 'public' ? 'Make Private' : 'Make Public'}
            onPress={onToggleVisibility}
            styles={styles}
          />
          <PlaylistMenuAction icon={<PencilIcon color={styles.iconColor.color} height={16} width={16} />} label="Edit" onPress={onEdit} styles={styles} />
          <PlaylistMenuAction icon={<PinIcon color={styles.iconColor.color} height={16} width={16} />} label={playlist.isPinned ? 'Unpin' : 'Pin'} onPress={onTogglePin} styles={styles} />
          <PlaylistMenuAction destructive icon={<TrashIcon color={styles.deleteIconColor.color} height={16} width={16} />} label="Delete" onPress={onDelete} styles={styles} />
        </View>
      ) : null}
    </Pressable>
  );
}

function PlaylistMenuAction({
  destructive = false,
  icon,
  label,
  onPress,
  styles,
}: {
  destructive?: boolean;
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.cardMenuAction, pressed && styles.itemPressed]}>
      {icon}
      <Text style={[styles.cardMenuActionLabel, destructive && styles.cardMenuActionLabelDestructive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const colors = theme.ui;
  const isDark = theme.mode === 'dark';
  const coverArtBorder = theme.mode === 'dark' ? '#1A1A19' : colors.borderStrong;
  const darkBorder = isDark ? '#1A1A19' : colors.borderStrong;

  return StyleSheet.create({
    root: {
      backgroundColor: colors.appBackground,
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    content: {
      paddingBottom: 196,
      paddingTop: spacing.sm,
    },
    grid: {
      gap: spacing.sm,
      overflow: 'visible',
      paddingHorizontal: spacing.sm,
      position: 'relative',
    },
    sectionBlock: {
      gap: spacing.sm,
      overflow: 'visible',
      zIndex: 1,
    },
    sectionBlockMenuOpen: {
      zIndex: 2000,
    },
    menuDismissFiller: {
      minHeight: 420,
      width: '100%',
      zIndex: 500,
    },
    divider: {
      backgroundColor: colors.borderStrong,
      height: 2,
      marginVertical: spacing.xs,
      width: '100%',
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.caption,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    statusText: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 104,
      padding: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      position: 'relative',
      zIndex: 1,
    },
    cardMenuOpen: {
      zIndex: 1000,
    },
    itemPressed: {
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    coverFallback: {
      alignItems: 'center',
      backgroundColor: isDark ? DARK_PLACEHOLDER_COVER_FILL : colors.surfaceGrouped,
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    builtInCoverFallback: {
      alignItems: 'center',
      backgroundColor: isDark ? DARK_PLACEHOLDER_COVER_FILL : colors.surfaceGrouped,
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    mixCoverFallback: {
      alignItems: 'center',
      backgroundColor: isDark ? DARK_PLACEHOLDER_COVER_FILL : colors.surfaceGrouped,
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    mixCoverLabel: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    coverImage: {
      borderColor: coverArtBorder,
      borderWidth: 2,
      height: 80,
      width: 80,
    },
    cardBody: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    titleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      minWidth: 0,
    },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.title,
      fontWeight: '900',
    },
    description: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 'auto',
    },
    meta: {
      color: colors.textSecondary,
      fontSize: typeScale.caption,
      fontWeight: '900',
    },
    badge: {
      borderColor: colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      paddingBottom: 2,
      paddingHorizontal: 10,
      paddingTop: 1,
    },
    publicBadge: {
      backgroundColor: STATUS_RELEASED,
    },
    privateBadge: {
      backgroundColor: STATUS_PRIVATE,
    },
    badgeLabel: {
      fontFamily: DS.font.family,
      fontSize: typeScale.fine,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    publicBadgeLabel: {
      color: STATUS_FOREGROUND,
    },
    privateBadgeLabel: {
      color: STATUS_PRIVATE_FOREGROUND,
    },
    cardMenu: {
      backgroundColor: colors.surfaceCard,
      borderColor: darkBorder,
      borderWidth: 2,
      minWidth: 172,
      position: 'absolute',
      right: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      top: 56,
      zIndex: 1001,
    },
    cardMenuAction: {
      alignItems: 'center',
      borderBottomColor: darkBorder,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 38,
      paddingHorizontal: spacing.sm,
    },
    cardMenuActionLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '700',
    },
    cardMenuActionLabelDestructive: {
      color: colors.buttonDanger,
    },
    deleteIconColor: {
      color: colors.buttonDanger,
    },
    disabled: {
      opacity: 0.55,
    },
    editActionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
    editButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: darkBorder,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 42,
      minWidth: 92,
      paddingHorizontal: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    editButtonLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '900',
    },
    editInput: {
      backgroundColor: colors.surfaceCard,
      borderColor: darkBorder,
      borderWidth: 2,
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '700',
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    editPanel: {
      backgroundColor: colors.surfaceGrouped,
      borderColor: colors.borderStrong,
      borderWidth: 3,
      gap: spacing.sm,
      padding: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      width: '92%',
    },
    editSaveButton: {
      backgroundColor: colors.buttonPrimary,
    },
    editTextArea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    editTitle: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.title,
      fontWeight: '900',
    },
    modalBackdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(34, 34, 32, 0.42)',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.sm,
    },
    iconColor: {
      color: colors.textPrimary,
    },
    voteIconColor: {
      color: isDark ? DARK_VOTE_ICON_COLOR : colors.buttonVoteActive,
    },
  });
}
