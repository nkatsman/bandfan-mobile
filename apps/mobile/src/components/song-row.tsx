import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import CoverArtPlaceholder from '../../assets/BandFan/BF Cover Art Placeholder.svg';
import { getActiveButtonColors } from '../design/button-active-colors';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { getCachedImageSrc } from '../lib/image-cache';
import { Song } from '../types/music';
import { SurfaceCard } from './surface-card';

type SongRowProps = {
  likePending?: boolean;
  votePending?: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  onToggleVote: () => void;
  song: Song;
};

export function SongRow({ likePending = false, onPlay, onToggleLike, onToggleVote, song, votePending = false }: SongRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SurfaceCard>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={onPlay} style={styles.artworkPressable}>
          {song.coverArtUrl ? (
            <Image source={{ uri: getCachedImageSrc(song.coverArtUrl) }} style={styles.artworkImage} />
          ) : (
            <View style={styles.artwork}>
              <CoverArtPlaceholder height={84} width={84} />
            </View>
          )}
        </Pressable>

        <View style={styles.metaColumn}>
          <Text numberOfLines={2} style={styles.title}>
            {song.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {song.artist}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaTag}>{song.durationLabel}</Text>
            <Text style={styles.metaTag}>{song.sourceLabel}</Text>
          </View>
        </View>

        <View style={styles.actionsColumn}>
          <ActionButton active={song.liked} disabled={likePending} label={likePending ? 'SAVING' : song.liked ? 'SAVED' : 'SAVE'} onPress={onToggleLike} tone="liked" />
          <ActionButton active={song.voted} disabled={votePending} label={votePending ? 'SENDING' : song.voted ? 'VOTED' : 'VOTE'} onPress={onToggleVote} tone="vote" />
        </View>
      </View>
    </SurfaceCard>
  );
}

type ActionButtonProps = {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone: 'liked' | 'vote';
};

function ActionButton({ active, disabled = false, label, onPress, tone }: ActionButtonProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeButtonColors = useMemo(() => getActiveButtonColors(theme), [theme]);
  const backgroundColor = active ? (tone === 'liked' ? activeButtonColors.activeRed : activeButtonColors.activeGreen) : theme.ui.buttonMuted;

  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionButton, { backgroundColor }, disabled && styles.buttonDisabled, pressed && styles.buttonPressed]}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const colors = theme.ui;
  const coverArtBorder = theme.mode === 'dark' ? '#1A1A19' : colors.borderStrong;

  return StyleSheet.create({
    row: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: spacing.md,
    },
    artwork: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: coverArtBorder,
      borderRadius: radii.md,
      borderWidth: 2,
      height: 84,
      justifyContent: 'center',
      width: 84,
    },
    artworkPressable: {
      height: 84,
      width: 84,
    },
    artworkImage: {
      borderColor: coverArtBorder,
      borderRadius: radii.md,
      borderWidth: 2,
      height: 84,
      width: 84,
    },
    metaColumn: {
      flex: 1,
      justifyContent: 'space-between',
    },
    title: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
      lineHeight: 23,
    },
    artist: {
      color: colors.textSecondary,
      fontSize: typeScale.body,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    metaTag: {
      backgroundColor: colors.tagBackground,
      borderColor: colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      color: colors.textPrimary,
      fontSize: typeScale.caption,
      fontWeight: '800',
      overflow: 'hidden',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    actionsColumn: {
      gap: spacing.sm,
      justifyContent: 'center',
      width: 76,
    },
    actionButton: {
      alignItems: 'center',
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: spacing.xs,
    },
    actionButtonText: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonPressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}
