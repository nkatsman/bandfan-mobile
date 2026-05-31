import { useMemo, useRef } from 'react';
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
import { usePlayerStore } from '../state/player-store';
import { useSongLikeAction } from '../features/preferences/use-song-like-action';
import { useSongReleaseSupportAction } from '../features/release-support/use-song-release-support-action';
import { FullPlayerPanel } from '../features/player/player-screen';
import { SurfaceCard } from './surface-card';
import { SeekBar } from './ui/seek-bar';

const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222220';
const PLAY_ICON_TO_BUTTON_RATIO = 34 / 44;

export function MiniPlayer({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  const activeSong = usePlayerStore((state) => state.activeSong);
  const closeFullPlayer = usePlayerStore((state) => state.closeFullPlayer);
  const isFullPlayerOpen = usePlayerStore((state) => state.isFullPlayerOpen);
  const isMiniPlayerHidden = usePlayerStore((state) => state.isMiniPlayerHidden);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isSongSheetOpen = usePlayerStore((state) => state.isSongSheetOpen);
  const progressPercent = usePlayerStore((state) => state.progressPercent);
  const closeSongSheet = usePlayerStore((state) => state.closeSongSheet);
  const openFullPlayer = usePlayerStore((state) => state.openFullPlayer);
  const seekToPercent = usePlayerStore((state) => state.seekToPercent);
  const setMiniPlayerHidden = usePlayerStore((state) => state.setMiniPlayerHidden);
  const stopPlayback = usePlayerStore((state) => state.stopPlayback);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const { isSongLikePending, toggleSongLike } = useSongLikeAction();
  const { isSongReleaseSupportPending, toggleSongReleaseSupport } = useSongReleaseSupportAction();
  const theme = useAppTheme();
  const isPhoneLayout = compact || width < 600;
  const likeActiveColor = '#CD4B4B';
  const miniPlayButtonSize = isPhoneLayout ? 64 : 92;
  const miniPlayIconSize = Math.round(miniPlayButtonSize * PLAY_ICON_TO_BUTTON_RATIO);
  const styles = useMemo(() => createStyles(theme.ui, isPhoneLayout), [theme, isPhoneLayout]);
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

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
              toValue: { x: 0, y: 72 },
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
      <Modal animationType="fade" onRequestClose={closeSongSheet} transparent visible={isSongSheetOpen}>
        <View style={styles.sheetRoot}>
          <Pressable accessibilityRole="button" onPress={closeSongSheet} style={styles.sheetBackdrop} />
          <View style={styles.sheetWrap}>
            <SurfaceCard style={styles.sheetCard} tone="player">
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                <Pressable accessibilityRole="button" onPress={closeSongSheet} style={({ pressed }) => [styles.sheetClose, pressed && styles.buttonPressed]}>
                  <Text style={styles.sheetCloseLabel}>CLOSE</Text>
                </Pressable>
              </View>

              <View style={styles.sheetHeroRow}>
                {activeSong.coverArtUrl ? (
                  <Image source={{ uri: activeSong.coverArtUrl }} style={styles.sheetArtworkImage} />
                ) : (
                  <View style={styles.sheetArtwork}>
                    <CoverArtPlaceholder height={124} width={124} />
                  </View>
                )}

                <View style={styles.sheetMeta}>
                  <Text numberOfLines={2} style={styles.sheetTitle}>
                    {activeSong.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.sheetArtist}>
                    {activeSong.artist}
                  </Text>
                </View>
              </View>

              <View style={styles.sheetTransportRow}>
                <View style={styles.sheetSmallIconShell}>
                  <SkipBackIcon height={24} width={24} />
                </View>
                <View style={styles.sheetSeekWrap}>
                  <SeekBar onSeek={seekToPercent} value={progressPercent} />
                </View>
                <View style={styles.sheetSmallIconShell}>
                  <SkipForwardIcon height={24} width={24} />
                </View>
              </View>

              <View style={styles.sheetActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSongReleaseSupportPending(activeSong.id)}
                  onPress={() => toggleSongReleaseSupport(activeSong)}
                  style={({ pressed }) => [styles.sheetIconButton, pressed && styles.buttonPressed]}
                >
                  {activeSong.voted ? <TriangleFilledIcon color={theme.ui.buttonVoteActive} height={28} width={28} /> : <TriangleOutlineIcon height={28} width={28} />}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSongLikePending(activeSong.id)}
                  onPress={() => toggleSongLike(activeSong)}
                  style={({ pressed }) => [styles.sheetIconButton, pressed && styles.buttonPressed]}
                >
                  {activeSong.liked ? <HeartFilledIcon color={likeActiveColor} height={28} width={28} /> : <HeartIcon height={28} width={28} />}
                </Pressable>
                <Pressable accessibilityRole="button" onPress={togglePlayback} style={({ pressed }) => [styles.sheetPlayButton, pressed && styles.sheetTransportPressed]}>
                  {isPlaying ? <PauseIcon color={LIGHT_PLAY_CONTROL_STROKE} height={43} width={43} /> : <PlayIcon color={LIGHT_PLAY_CONTROL_STROKE} height={43} width={43} />}
                </Pressable>
              </View>
            </SurfaceCard>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={closeFullPlayer} visible={isFullPlayerOpen}>
        <FullPlayerPanel includeBottomMenu onCollapse={closeFullPlayer} />
      </Modal>

      {isMiniPlayerHidden ? (
        <Animated.View style={[styles.hiddenGestureLayer, { transform: dragOffset.getTranslateTransform() }]} {...miniPlayerPanResponder.panHandlers}>
          <SurfaceCard style={[styles.shell, compact && styles.shellCompact, styles.hiddenShell]} tone="player">
            <Pressable accessibilityLabel="Show mini player" accessibilityRole="button" onPress={() => setMiniPlayerHidden(false)} style={styles.hiddenHandle}>
              <Text numberOfLines={1} style={styles.hiddenHandleText}>Now playing: {activeSong.artist} - {activeSong.title}</Text>
            </Pressable>
          </SurfaceCard>
        </Animated.View>
      ) : (
      <Animated.View style={[styles.gestureLayer, { transform: dragOffset.getTranslateTransform() }]} {...miniPlayerPanResponder.panHandlers}>
        <SurfaceCard style={[styles.shell, compact && styles.shellCompact]} tone="player">
          <View style={styles.row}>
          <View style={styles.leftColumn}>
            <View style={styles.headerRow}>
              {activeSong.coverArtUrl ? (
                <Image source={{ uri: activeSong.coverArtUrl }} style={styles.artworkImage} />
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
                        {activeSong.voted ? <TriangleFilledIcon color={theme.ui.buttonVoteActive} height={36} width={36} /> : <TriangleOutlineIcon height={36} width={36} />}
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
              <View style={styles.smallIconShell}>
                <SkipBackIcon height={20} width={20} />
              </View>
              <View style={styles.seekWrap}>
                <SeekBar onSeek={seekToPercent} value={progressPercent} />
              </View>
              <View style={styles.smallIconShell}>
                <SkipForwardIcon height={20} width={20} />
              </View>
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
                  {activeSong.voted ? <TriangleFilledIcon color={theme.ui.buttonVoteActive} height={22} width={22} /> : <TriangleOutlineIcon height={22} width={22} />}
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
        </SurfaceCard>
      </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], isPhoneLayout: boolean) {
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
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    sheetPlayButton: {
      alignItems: 'center',
      backgroundColor: LIGHT_PLAY_CONTROL_FILL,
      borderColor: LIGHT_PLAY_CONTROL_STROKE,
      borderWidth: 2,
      height: 64,
      justifyContent: 'center',
      width: 64,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    sheetTransportPressed: {
      shadowOpacity: 0,
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
    hiddenGestureLayer: {
      marginBottom: 0,
      width: '100%',
    },
    hiddenShell: {
      marginBottom: -4,
    },
    hiddenHandle: {
      alignItems: 'center',
      minHeight: 30,
      justifyContent: 'center',
      width: '100%',
    },
    hiddenHandleText: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '900',
      lineHeight: 16,
    },
    row: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: isPhoneLayout ? spacing.sm : 40,
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
      borderColor: colors.borderStrong,
      borderRadius: radii.sm,
      borderWidth: 2,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    artworkImage: {
      borderColor: colors.borderStrong,
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
      color: colors.textPrimary,
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
      color: colors.textPrimary,
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
      color: colors.textPrimary,
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
      borderColor: LIGHT_PLAY_CONTROL_STROKE,
      borderWidth: 2,
      height: isPhoneLayout ? 64 : 92,
      justifyContent: 'center',
      marginTop: 0,
      width: isPhoneLayout ? 64 : 92,
      shadowColor: '#000000',
      shadowOffset: { width: isPhoneLayout ? 2 : 6, height: isPhoneLayout ? 2 : 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    rightControlsColumn: {
      alignItems: 'center',
      justifyContent: isPhoneLayout ? 'space-between' : 'flex-start',
      width: isPhoneLayout ? 66 : 92,
    },
    transportButtonPressed: {
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    buttonPressed: {
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}