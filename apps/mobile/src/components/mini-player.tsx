import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import CoverArtPlaceholder from '../../assets/BandFan/BF Cover Art Placeholder.svg';
import HeartFilledIcon from '../../assets/Icons/poker-hearts-fill.svg';
import HeartIcon from '../../assets/Icons/heart-line.svg';
import PauseIcon from '../../assets/Icons/pause-fill.svg';
import PlayIcon from '../../assets/Icons/play-fill.svg';
import SkipBackIcon from '../../assets/Icons/skip-back-fill.svg';
import SkipForwardIcon from '../../assets/Icons/skip-forward-fill.svg';
import TriangleFilledIcon from '../../assets/Icons/triangle-fill.svg';
import TriangleOutlineIcon from '../../assets/Icons/triangle-line.svg';
import { DS } from '../design/ds';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { getCachedImageSrc } from '../lib/image-cache';
import { usePlayerStore } from '../state/player-store';
import { useSongLikeAction } from '../features/preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../features/release-support/use-song-release-support-action';
import { FullPlayerPanel } from '../features/player/player-screen';
import { SurfaceCard } from './surface-card';
import { SeekBar } from './ui/seek-bar';

const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222222';
const MINI_PLAYER_DARK_TEXT = '#1A1A19';
const DARK_COVER_ART_BORDER = '#1A1A19';
const DARK_VOTE_ICON_COLOR = '#4C79AE';
const PLAY_ICON_TO_BUTTON_RATIO = 34 / 44;
const HIDDEN_MINI_PLAYER_OFFSET = 0;

export function MiniPlayer({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  const activeSong = usePlayerStore((state) => state.activeSong);
  const closeFullPlayer = usePlayerStore((state) => state.closeFullPlayer);
  const isFullPlayerOpen = usePlayerStore((state) => state.isFullPlayerOpen);
  const isMiniPlayerHidden = usePlayerStore((state) => state.isMiniPlayerHidden);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const progressPercent = usePlayerStore((state) => state.progressPercent);
  const openFullPlayer = usePlayerStore((state) => state.openFullPlayer);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seekToPercent = usePlayerStore((state) => state.seekToPercent);
  const setMiniPlayerHidden = usePlayerStore((state) => state.setMiniPlayerHidden);
  const stopPlayback = usePlayerStore((state) => state.stopPlayback);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const { isSongLikePending, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const theme = useAppTheme();
  const isPhoneLayout = compact || width < 600;
  const likeActiveColor = theme.ui.buttonLikeActive;
  const voteIconColor = theme.mode === 'dark' ? DARK_VOTE_ICON_COLOR : theme.ui.buttonVoteActive;
  const miniPlayButtonSize = isPhoneLayout ? 64 : 92;
  const miniPlayIconSize = Math.round(miniPlayButtonSize * PLAY_ICON_TO_BUTTON_RATIO);
  const styles = useMemo(() => createStyles(theme, isPhoneLayout), [theme, isPhoneLayout]);
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hiddenProgress = useRef(new Animated.Value(isMiniPlayerHidden ? 1 : 0)).current;
  const hiddenTranslateY = hiddenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, HIDDEN_MINI_PLAYER_OFFSET],
  });
  const miniPlayerTranslateY = Animated.add(hiddenTranslateY, dragOffset.y);

  useEffect(() => {
    Animated.timing(hiddenProgress, {
      duration: isMiniPlayerHidden ? 210 : 170,
      toValue: isMiniPlayerHidden ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [hiddenProgress, isMiniPlayerHidden]);

  const miniPlayerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12 || Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {
          dragOffset.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          dragOffset.setValue({
            x: Math.max(-90, Math.min(90, gestureState.dx)),
            y: Math.max(-96, Math.min(96, gestureState.dy)),
          });
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > 54) {
            Animated.timing(dragOffset, {
              duration: 120,
              toValue: { x: gestureState.dx > 0 ? 160 : -160, y: 0 },
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue({ x: 0, y: 0 });
              stopPlayback();
            });
            return;
          }

          if (isMiniPlayerHidden) {
            if (gestureState.dy < -96) {
              Animated.timing(dragOffset, {
                duration: 120,
                toValue: { x: 0, y: -88 },
                useNativeDriver: true,
              }).start(() => {
                dragOffset.setValue({ x: 0, y: 0 });
                openFullPlayer();
              });
              return;
            }

            if (gestureState.dy < -24) {
              Animated.timing(dragOffset, {
                duration: 90,
                toValue: { x: 0, y: -34 },
                useNativeDriver: true,
              }).start(() => {
                dragOffset.setValue({ x: 0, y: 0 });
                setMiniPlayerHidden(false);
              });
              return;
            }

            Animated.spring(dragOffset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            return;
          }

          if (gestureState.dy < -96) {
            Animated.timing(dragOffset, {
              duration: 120,
              toValue: { x: 0, y: -88 },
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue({ x: 0, y: 0 });
              openFullPlayer();
            });
            return;
          }

          if (gestureState.dy > 34) {
            Animated.timing(dragOffset, {
              duration: 120,
              toValue: { x: 0, y: HIDDEN_MINI_PLAYER_OFFSET },
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue({ x: 0, y: 0 });
              setMiniPlayerHidden(true);
            });
            return;
          }

          Animated.spring(dragOffset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
      }),
    [dragOffset, isMiniPlayerHidden, openFullPlayer, setMiniPlayerHidden, stopPlayback],
  );

  if (!activeSong) {
    return null;
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact, isMiniPlayerHidden && styles.containerHidden]}>
      <Modal animationType="slide" onRequestClose={closeFullPlayer} visible={isFullPlayerOpen}>
        <FullPlayerPanel includeBottomMenu onCollapse={closeFullPlayer} onNavigate={closeFullPlayer} />
      </Modal>

      <Animated.View
        style={[
          styles.gestureLayer,
          { transform: [{ translateX: dragOffset.x }, { translateY: miniPlayerTranslateY }] },
        ]}
        {...miniPlayerPanResponder.panHandlers}
      >
        <SurfaceCard style={[styles.shell, compact && styles.shellCompact, isMiniPlayerHidden && styles.hiddenShell]} tone="player">
          {isMiniPlayerHidden ? (
            <Pressable accessibilityRole="button" onPress={() => setMiniPlayerHidden(false)} style={styles.hiddenPeekRow}>
              {activeSong.coverArtUrl ? (
                <Image source={{ uri: getCachedImageSrc(activeSong.coverArtUrl) }} style={styles.hiddenArtworkImage} />
              ) : (
                <View style={styles.hiddenArtwork}>
                  <CoverArtPlaceholder height={44} width={44} />
                </View>
              )}
              <View style={styles.hiddenMetaColumn}>
                <Text style={styles.nowPlayingLabel}>Now playing</Text>
                <Text numberOfLines={1} style={styles.hiddenTitle}>{activeSong.title}</Text>
                <Text numberOfLines={1} style={styles.hiddenArtist}>{activeSong.artist}</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.row}>
          <View style={styles.leftColumn}>
            <View style={styles.headerRow}>
              {activeSong.coverArtUrl ? (
                <Image source={{ uri: getCachedImageSrc(activeSong.coverArtUrl) }} style={styles.artworkImage} />
              ) : (
                <View style={styles.artwork}>
                  <CoverArtPlaceholder height={64} width={64} />
                </View>
              )}
              <View style={styles.metaColumn}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={styles.title}>
                    {activeSong.title}
                  </Text>
                </View>

                <View style={styles.subRow}>
                  <Text numberOfLines={1} style={styles.artist}>
                    {activeSong.artist}
                  </Text>

                  {!isPhoneLayout ? <View style={styles.iconStrip}>
                    <View style={styles.iconLabelColumn}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSongReleaseSupportPending(activeSong.id)}
                        onPress={() => toggleSongReleaseSupport(activeSong)}
                        style={({ pressed }) => [styles.utilityIconShell, pressed && styles.buttonPressed]}
                      >
                        {activeSong.voted ? <TriangleFilledIcon color={voteIconColor} height={36} width={36} /> : <TriangleOutlineIcon color={voteIconColor} height={36} width={36} />}
                      </Pressable>
                      <Text style={styles.iconLabel}>Vote</Text>
                    </View>
                    <View style={styles.iconLabelColumn}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSongLikePending(activeSong.id)}
                        onPress={() => toggleSongLike(activeSong)}
                        style={({ pressed }) => [styles.utilityIconShell, pressed && styles.buttonPressed]}
                      >
                        {activeSong.liked ? <HeartFilledIcon color={likeActiveColor} height={36} width={36} /> : <HeartIcon height={36} width={36} />}
                      </Pressable>
                      <Text style={styles.iconLabel}>Like</Text>
                    </View>
                  </View> : null}
                </View>
              </View>
            </View>

            <View style={styles.transportRow}>
              <Pressable accessibilityLabel="Previous track" accessibilityRole="button" onPress={previousTrack} style={({ pressed }) => [styles.smallIconShell, pressed && styles.buttonPressed]}>
                <SkipBackIcon color={theme.mode === 'dark' ? MINI_PLAYER_DARK_TEXT : theme.ui.textPrimary} height={20} width={20} />
              </Pressable>
              <View style={styles.seekWrap}>
                <SeekBar onSeek={seekToPercent} value={progressPercent} />
              </View>
              <Pressable accessibilityLabel="Next track" accessibilityRole="button" onPress={nextTrack} style={({ pressed }) => [styles.smallIconShell, pressed && styles.buttonPressed]}>
                <SkipForwardIcon color={theme.mode === 'dark' ? MINI_PLAYER_DARK_TEXT : theme.ui.textPrimary} height={20} width={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.rightControlsColumn}>
            <Pressable accessibilityRole="button" onPress={togglePlayback} style={({ pressed }) => [styles.button, pressed && styles.transportButtonPressed]}>
              {isPlaying ? <PauseIcon color={LIGHT_PLAY_CONTROL_STROKE} height={miniPlayIconSize} width={miniPlayIconSize} /> : <PlayIcon color={LIGHT_PLAY_CONTROL_STROKE} height={miniPlayIconSize} width={miniPlayIconSize} />}
            </Pressable>
            {isPhoneLayout ? (
              <View style={styles.compactActionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSongReleaseSupportPending(activeSong.id)}
                  onPress={() => toggleSongReleaseSupport(activeSong)}
                  style={({ pressed }) => [styles.compactUtilityIconShell, pressed && styles.buttonPressed]}
                >
                  {activeSong.voted ? <TriangleFilledIcon color={voteIconColor} height={22} width={22} /> : <TriangleOutlineIcon color={voteIconColor} height={22} width={22} />}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSongLikePending(activeSong.id)}
                  onPress={() => toggleSongLike(activeSong)}
                  style={({ pressed }) => [styles.compactUtilityIconShell, pressed && styles.buttonPressed]}
                >
                  {activeSong.liked ? <HeartFilledIcon color={likeActiveColor} height={22} width={22} /> : <HeartIcon height={22} width={22} />}
                </Pressable>
              </View>
            ) : null}
          </View>
            </View>
          )}
        </SurfaceCard>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>, isPhoneLayout: boolean) {
  const colors = theme.ui;
  const isDark = theme.mode === 'dark';
  const playerTextColor = isDark ? MINI_PLAYER_DARK_TEXT : colors.textPrimary;

  return StyleSheet.create({
    container: {
      marginHorizontal: spacing.sm,
      marginTop: spacing.xs,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    sheetWrap: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
    },
    sheetCard: {
      gap: spacing.md,
    },
    sheetHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sheetHandle: {
      backgroundColor: colors.borderStrong,
      borderRadius: 999,
      height: 6,
      width: 66,
    },
    sheetClose: {
      alignItems: 'center',
      backgroundColor: colors.buttonMuted,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 34,
      paddingHorizontal: spacing.sm,
    },
    sheetCloseLabel: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    sheetHeroRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
    },
    sheetArtwork: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      height: 126,
      justifyContent: 'center',
      width: 126,
    },
    sheetArtworkImage: {
      borderColor: colors.borderStrong,
      borderWidth: 2,
      height: 126,
      width: 126,
    },
    sheetMeta: {
      flex: 1,
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 126,
    },
    sheetTitle: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.heading,
      fontWeight: '900',
      lineHeight: 28,
    },
    sheetArtist: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.subheading,
      fontWeight: '700',
    },
    sheetTransportRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    sheetSeekWrap: {
      flex: 1,
    },
    sheetSmallIconShell: {
      alignItems: 'center',
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    sheetActionsRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    sheetIconButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      boxShadow: '4px 4px 0px #000000',
      justifyContent: 'center',
      minHeight: 52,
      minWidth: 52,
    },
    sheetPlayButton: {
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderColor: LIGHT_PLAY_CONTROL_STROKE,
      borderWidth: 2,
      boxShadow: '4px 4px 0px #000000',
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    sheetTransportPressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    containerCompact: {
      marginTop: 0,
    },
    containerHidden: {
      zIndex: 0,
    },
    shell: {
      marginBottom: spacing.sm,
    },
    shellCompact: {
      marginBottom: spacing.sm,
    },
    gestureLayer: {
      width: '100%',
    },
    row: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: isPhoneLayout ? spacing.sm : 40,
    },
    hiddenShell: {
      marginBottom: spacing.sm,
      minHeight: 82,
    },
    hiddenPeekRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 70,
    },
    hiddenArtwork: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: isDark ? DARK_COVER_ART_BORDER : colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },
    hiddenArtworkImage: {
      borderColor: isDark ? DARK_COVER_ART_BORDER : colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      height: 52,
      width: 52,
    },
    hiddenMetaColumn: {
      flex: 1,
      minWidth: 0,
    },
    nowPlayingLabel: {
      color: '#FFFFFF',
      fontFamily: DS.font.family,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.6,
      lineHeight: 14,
      textTransform: 'uppercase',
    },
    hiddenTitle: {
      color: playerTextColor,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
      lineHeight: 20,
    },
    hiddenArtist: {
      color: playerTextColor,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '400',
      lineHeight: 16,
    },
    leftColumn: {
      flex: 1,
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      minWidth: 0,
    },
    artwork: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: isDark ? DARK_COVER_ART_BORDER : colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    artworkImage: {
      borderColor: isDark ? DARK_COVER_ART_BORDER : colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      height: 64,
      width: 64,
    },
    metaColumn: {
      flex: 1,
    },
    titleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minWidth: 0,
    },
    title: {
      color: playerTextColor,
      flexShrink: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.body,
      fontWeight: '900',
      lineHeight: 18,
      maxWidth: '88%',
    },
    subRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
      marginTop: -2,
    },
    artist: {
      color: playerTextColor,
      flex: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '400',
    },
    iconStrip: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 40,
    },
    compactActionRow: {
      flexDirection: 'row',
      gap: 0,
      justifyContent: 'space-between',
      width: 66,
    },
    compactUtilityIconShell: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      width: 28,
    },
    iconLabelColumn: {
      alignItems: 'center',
      gap: 1,
    },
    utilityIconShell: {
      alignItems: 'center',
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    iconLabel: {
      color: playerTextColor,
      fontFamily: DS.font.family,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.1,
      lineHeight: 10,
      textAlign: 'center',
    },
    transportRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.lg,
    },
    seekWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    smallIconShell: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      width: 24,
    },
    button: {
      alignSelf: 'flex-start',
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderWidth: 0,
      boxShadow: isPhoneLayout ? `inset 0 0 0 2px ${LIGHT_PLAY_CONTROL_STROKE}, 4px 4px 0px #000000` : `inset 0 0 0 2px ${LIGHT_PLAY_CONTROL_STROKE}, 6px 6px 0px #000000`,
      height: isPhoneLayout ? 64 : 92,
      justifyContent: 'center',
      marginTop: 0,
      overflow: 'hidden',
      width: isPhoneLayout ? 64 : 92,
    },
    rightControlsColumn: {
      alignItems: 'center',
      justifyContent: isPhoneLayout ? 'space-between' : 'flex-start',
      width: isPhoneLayout ? 66 : 92,
    },
    transportButtonPressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    buttonPressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}