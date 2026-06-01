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
import XLineIcon from '../../assets/Icons/x-line.svg';
import { DEBUG_THUMB_ZONES_HAND, DEBUG_THUMB_ZONES_OPACITY } from '../config/debug-mode';
import { DS } from '../design/ds';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { getCachedImageSrc } from '../lib/image-cache';
import { usePlayerStore } from '../state/player-store';
import { useDebugStore } from '../state/debug-store';
import { useSongLikeAction } from '../features/preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../features/release-support/use-song-release-support-action';
import { FullPlayerPanel } from '../features/player/player-screen';
import { SurfaceCard } from './surface-card';
import { BlockShadowPressable } from './ui/block-shadow';
import { SeekBar } from './ui/seek-bar';
import { ThemeColorDebugOverlayStatic, ThumbZoneDebugOverlayStatic } from './thumb-zone-debug-overlay';

const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222222';
const MINI_PLAYER_DARK_TEXT = '#1A1A19';
const MINI_PLAYER_ACTION_ICON_COLOR = '#000000';
const DARK_COVER_ART_BORDER = '#1A1A19';
const PENDING_ACTION_FILL = '#D0D0CB';
const PLAY_ICON_TO_BUTTON_RATIO = 34 / 44;
const HIDDEN_MINI_PLAYER_OFFSET = 0;
const STAR_GATE_DEAD_ZONE = 6;
const STAR_GATE_SWITCH_WINDOW = 18;
const STAR_GATE_POWER = 4;
const STAR_GATE_MAX_CROSS_AXIS = 32;

type DragAxis = 'horizontal' | 'vertical';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothStep(edgeStart: number, edgeEnd: number, value: number) {
  const amount = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function getStarGateDrag(deltaX: number, deltaY: number, currentAxis: DragAxis | null) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const distance = Math.hypot(deltaX, deltaY);

  if (distance < STAR_GATE_DEAD_ZONE) {
    return { axis: currentAxis, x: 0, y: 0 };
  }

  const poweredX = absX ** STAR_GATE_POWER;
  const poweredY = absY ** STAR_GATE_POWER;
  const totalPower = poweredX + poweredY || 1;
  const horizontalWeight = poweredX / totalPower;
  const verticalWeight = poweredY / totalPower;
  const nearCenterSwitch = distance < 48 ? 0.02 : 0.16;
  let axis: DragAxis = currentAxis ?? (horizontalWeight >= verticalWeight ? 'horizontal' : 'vertical');

  if (axis === 'horizontal') {
    if (absX < STAR_GATE_SWITCH_WINDOW && absY > absX + STAR_GATE_DEAD_ZONE) {
      axis = 'vertical';
    } else if (verticalWeight > horizontalWeight + nearCenterSwitch) {
      axis = 'vertical';
    }
  } else if (absY < STAR_GATE_SWITCH_WINDOW && absX > absY + STAR_GATE_DEAD_ZONE) {
    axis = 'horizontal';
  } else if (horizontalWeight > verticalWeight + nearCenterSwitch) {
    axis = 'horizontal';
  }

  const axisWeight = axis === 'horizontal' ? horizontalWeight : verticalWeight;
  const magnetStrength = smoothStep(0.5, 0.96, axisWeight);
  const mainAxisFactor = 0.88 + magnetStrength * 0.12;
  const crossAxisFactor = (1 - magnetStrength) * 0.42;

  if (axis === 'horizontal') {
    return {
      axis,
      x: clamp(deltaX * mainAxisFactor, -90, 90),
      y: clamp(deltaY * crossAxisFactor, -STAR_GATE_MAX_CROSS_AXIS, STAR_GATE_MAX_CROSS_AXIS),
    };
  }

  return {
    axis,
    x: clamp(deltaX * crossAxisFactor, -STAR_GATE_MAX_CROSS_AXIS, STAR_GATE_MAX_CROSS_AXIS),
    y: clamp(deltaY * mainAxisFactor, -96, 96),
  };
}

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
  const debugModeEnabled = useDebugStore((state) => state.debugModeEnabled);
  const colorOverlayMode = useDebugStore((state) => state.colorOverlayMode);
  const thumbOverlayVisible = useDebugStore((state) => state.thumbOverlayVisible);
  const { isSongLikePending, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const theme = useAppTheme();
  const isPhoneLayout = compact || width < 600;
  const actionIconColor = MINI_PLAYER_ACTION_ICON_COLOR;
  const miniPlayerLikeFill = theme.palette.red;
  const miniPlayerVoteFill = theme.mode === 'dark' ? theme.palette.blueDark : theme.palette.green;
  const filledIconStrokeColor = MINI_PLAYER_ACTION_ICON_COLOR;
  const filledIconStrokeWidth = 1.2;
  const miniPlayButtonSize = isPhoneLayout ? 64 : 92;
  const miniPlayIconSize = Math.round(miniPlayButtonSize * PLAY_ICON_TO_BUTTON_RATIO);
  const likePending = isSongLikePending(activeSong?.id ?? '');
  const votePending = isSongReleaseSupportPending(activeSong?.id ?? '');
  const styles = useMemo(() => createStyles(theme, isPhoneLayout), [theme, isPhoneLayout]);
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragAxisRef = useRef<DragAxis | null>(null);
  const hiddenProgress = useRef(new Animated.Value(isMiniPlayerHidden ? 1 : 0)).current;
  const hiddenTranslateY = hiddenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, HIDDEN_MINI_PLAYER_OFFSET],
  });
  const miniPlayerTranslateY = Animated.add(hiddenTranslateY, dragOffset.y);
  const leftDismissHintOpacity = dragOffset.x.interpolate({
    inputRange: [0, 24, 70],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });
  const rightDismissHintOpacity = dragOffset.x.interpolate({
    inputRange: [-70, -24, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });
  const expandHintOpacity = dragOffset.y.interpolate({
    inputRange: [-70, -24, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });
  const minimizeHintOpacity = dragOffset.y.interpolate({
    inputRange: [0, 24, 70],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.timing(hiddenProgress, {
      duration: isMiniPlayerHidden ? 130 : 100,
      toValue: isMiniPlayerHidden ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [hiddenProgress, isMiniPlayerHidden]);

  const miniPlayerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 7 || Math.abs(gestureState.dy) > 5,
        onPanResponderGrant: () => {
          dragAxisRef.current = null;
          dragOffset.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          const gatedDrag = getStarGateDrag(gestureState.dx, gestureState.dy, dragAxisRef.current);
          dragAxisRef.current = gatedDrag.axis;
          dragOffset.setValue({ x: gatedDrag.x, y: gatedDrag.y });
        },
        onPanResponderRelease: (_, gestureState) => {
          const dragAxis = dragAxisRef.current;
          dragAxisRef.current = null;

          if (dragAxis === 'horizontal') {
            Animated.timing(dragOffset, {
              duration: 80,
              toValue: { x: gestureState.dx >= 0 ? 160 : -160, y: 0 },
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue({ x: 0, y: 0 });
              stopPlayback();
            });
            return;
          }

          if (dragAxis !== 'vertical') {
            Animated.spring(dragOffset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            return;
          }

          const isDraggingUp = gestureState.dy <= 0;

          if (isMiniPlayerHidden) {
            if (isDraggingUp) {
              Animated.timing(dragOffset, {
                duration: 70,
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

          if (isDraggingUp) {
            Animated.timing(dragOffset, {
              duration: 80,
              toValue: { x: 0, y: -88 },
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue({ x: 0, y: 0 });
              openFullPlayer();
            });
            return;
          }

          Animated.timing(dragOffset, {
            duration: 80,
            toValue: { x: 0, y: HIDDEN_MINI_PLAYER_OFFSET },
            useNativeDriver: true,
          }).start(() => {
            dragOffset.setValue({ x: 0, y: 0 });
            setMiniPlayerHidden(true);
          });
        },
      }),
    [dragOffset, isMiniPlayerHidden, openFullPlayer, setMiniPlayerHidden, stopPlayback],
  );

  if (!activeSong) {
    return null;
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact, isMiniPlayerHidden && styles.containerHidden]}>
      <Modal animationType="none" onRequestClose={closeFullPlayer} visible={isFullPlayerOpen}>
        <FullPlayerPanel includeBottomMenu onCollapse={closeFullPlayer} onNavigate={closeFullPlayer} />
        {debugModeEnabled && thumbOverlayVisible ? <ThumbZoneDebugOverlayStatic hand={DEBUG_THUMB_ZONES_HAND} opacity={DEBUG_THUMB_ZONES_OPACITY} /> : null}
        {debugModeEnabled && colorOverlayMode !== 'off' ? <ThemeColorDebugOverlayStatic side={colorOverlayMode} /> : null}
      </Modal>

      <View style={styles.gestureShell} {...miniPlayerPanResponder.panHandlers}>
        <View pointerEvents="none" style={styles.hintLayer}>
          <Animated.View style={[styles.dismissHint, styles.dismissHintLeft, { opacity: leftDismissHintOpacity }]}> 
            <XLineIcon color={theme.ui.buttonDanger} height={30} width={30} />
          </Animated.View>
          <Animated.View style={[styles.dismissHint, styles.dismissHintRight, { opacity: rightDismissHintOpacity }]}> 
            <XLineIcon color={theme.ui.buttonDanger} height={30} width={30} />
          </Animated.View>
          <Animated.View style={[styles.verticalHint, styles.expandHint, { opacity: expandHintOpacity }]}> 
            <Text style={styles.hintText}>Expand</Text>
          </Animated.View>
          <Animated.View style={[styles.verticalHint, styles.minimizeHint, { opacity: minimizeHintOpacity }]}> 
            <Text style={styles.hintText}>Minimize</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.gestureLayer,
            { transform: [{ translateX: dragOffset.x }, { translateY: miniPlayerTranslateY }] },
          ]}
        >
          <SurfaceCard style={[styles.shell, compact && styles.shellCompact, isMiniPlayerHidden && styles.hiddenShell]} tone="player">
          {isMiniPlayerHidden ? (
            <Pressable accessibilityRole="button" onPress={() => setMiniPlayerHidden(false)} style={styles.hiddenPeekRow}>
              {activeSong.coverArtUrl ? (
                <Image source={{ uri: getCachedImageSrc(activeSong.coverArtUrl) }} style={styles.hiddenArtworkImage} />
              ) : (
                <View style={styles.hiddenArtwork}>
                  <CoverArtPlaceholder height="100%" width="100%" />
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
                  <CoverArtPlaceholder height="100%" width="100%" />
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
                        disabled={votePending}
                        onPress={() => toggleSongReleaseSupport(activeSong)}
                        style={({ pressed }) => [styles.utilityIconShell, votePending && styles.actionPending, pressed && styles.buttonPressed]}
                      >
                        {activeSong.voted ? <TriangleFilledIcon color={miniPlayerVoteFill} height={36} stroke={filledIconStrokeColor} strokeWidth={filledIconStrokeWidth} width={36} /> : <TriangleOutlineIcon color={actionIconColor} height={36} width={36} />}
                      </Pressable>
                      <Text style={styles.iconLabel}>Vote</Text>
                    </View>
                    <View style={styles.iconLabelColumn}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={likePending}
                        onPress={() => toggleSongLike(activeSong)}
                        style={({ pressed }) => [styles.utilityIconShell, likePending && styles.actionPending, pressed && styles.buttonPressed]}
                      >
                        {activeSong.liked ? <HeartFilledIcon color={miniPlayerLikeFill} height={36} stroke={filledIconStrokeColor} strokeWidth={filledIconStrokeWidth} width={36} /> : <HeartIcon color={actionIconColor} height={36} width={36} />}
                      </Pressable>
                      <Text style={styles.iconLabel}>Like</Text>
                    </View>
                  </View> : null}
                </View>
              </View>
            </View>

            <View style={styles.transportRow}>
              {isPhoneLayout ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={likePending}
                  onPress={() => toggleSongLike(activeSong)}
                  style={({ pressed }) => [styles.smallIconShell, likePending && styles.actionPending, pressed && styles.buttonPressed]}
                >
                  {activeSong.liked ? <HeartFilledIcon color={miniPlayerLikeFill} height={20} stroke={filledIconStrokeColor} strokeWidth={filledIconStrokeWidth} width={20} /> : <HeartIcon color={actionIconColor} height={20} width={20} />}
                </Pressable>
              ) : null}
              <Pressable accessibilityLabel="Previous track" accessibilityRole="button" onPress={previousTrack} style={({ pressed }) => [styles.smallIconShell, pressed && styles.buttonPressed]}>
                <SkipBackIcon color={theme.mode === 'dark' ? MINI_PLAYER_DARK_TEXT : theme.ui.textPrimary} height={20} width={20} />
              </Pressable>
              <View style={styles.seekWrap}>
                <SeekBar onSeek={seekToPercent} value={progressPercent} />
              </View>
              <Pressable accessibilityLabel="Next track" accessibilityRole="button" onPress={nextTrack} style={({ pressed }) => [styles.smallIconShell, pressed && styles.buttonPressed]}>
                <SkipForwardIcon color={theme.mode === 'dark' ? MINI_PLAYER_DARK_TEXT : theme.ui.textPrimary} height={20} width={20} />
              </Pressable>
              {isPhoneLayout ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={votePending}
                  onPress={() => toggleSongReleaseSupport(activeSong)}
                  style={({ pressed }) => [styles.smallIconShell, votePending && styles.actionPending, pressed && styles.buttonPressed]}
                >
                  {activeSong.voted ? <TriangleFilledIcon color={miniPlayerVoteFill} height={20} stroke={filledIconStrokeColor} strokeWidth={filledIconStrokeWidth} width={20} /> : <TriangleOutlineIcon color={actionIconColor} height={20} width={20} />}
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.rightControlsColumn}>
            <BlockShadowPressable accessibilityRole="button" contentStyle={styles.button} onPress={togglePlayback} pressedContentStyle={styles.transportButtonPressed} shadowOffset={isPhoneLayout ? 4 : 6} style={styles.buttonShadow}>
              {isPlaying ? <PauseIcon color={LIGHT_PLAY_CONTROL_STROKE} height={miniPlayIconSize} width={miniPlayIconSize} /> : <PlayIcon color={LIGHT_PLAY_CONTROL_STROKE} height={miniPlayIconSize} width={miniPlayIconSize} />}
            </BlockShadowPressable>
          </View>
            </View>
          )}
          </SurfaceCard>
        </Animated.View>
      </View>
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
      justifyContent: 'center',
      minHeight: 52,
      minWidth: 52,
    },
    sheetPlayButton: {
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderColor: LIGHT_PLAY_CONTROL_STROKE,
      borderWidth: 2,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    sheetTransportPressed: {
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
    gestureShell: {
      position: 'relative',
    },
    gestureLayer: {
      width: '100%',
    },
    hintLayer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    dismissHint: {
      alignItems: 'center',
      bottom: spacing.sm,
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      width: 78,
    },
    dismissHintLeft: {
      left: 0,
    },
    dismissHintRight: {
      right: 0,
    },
    verticalHint: {
      alignItems: 'center',
      height: 34,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
    },
    expandHint: {
      bottom: spacing.sm,
    },
    minimizeHint: {
      top: 0,
    },
    hintText: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    row: {
      alignItems: 'flex-start',
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
      overflow: 'hidden',
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
      minHeight: isPhoneLayout ? 64 : undefined,
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
      overflow: 'hidden',
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
      fontSize: typeScale.subheading,
      fontWeight: '900',
      lineHeight: 22,
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
      fontSize: typeScale.body,
      fontWeight: '400',
      lineHeight: 20,
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
      marginBottom: spacing.xs,
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
      backgroundColor: 'transparent',
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
      gap: isPhoneLayout ? spacing.xs : spacing.lg,
      marginRight: isPhoneLayout ? -66 - spacing.sm : 0,
    },
    seekWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    smallIconShell: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      height: 24,
      justifyContent: 'center',
      width: 24,
    },
    actionPending: {
      backgroundColor: PENDING_ACTION_FILL,
      opacity: 0.55,
    },
    button: {
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderColor: LIGHT_PLAY_CONTROL_STROKE,
      borderWidth: 2,
      height: isPhoneLayout ? 64 : 92,
      justifyContent: 'center',
      marginTop: 0,
      overflow: 'hidden',
      width: isPhoneLayout ? 64 : 92,
    },
    buttonShadow: {
      alignSelf: 'flex-start',
      transform: [{ translateX: -2 }, { translateY: -2 }],
    },
    rightControlsColumn: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: isPhoneLayout ? 66 : 92,
    },
    transportButtonPressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    buttonPressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}