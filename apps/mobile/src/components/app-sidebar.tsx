import { useMutation, useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { BackHandler, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccountIcon from '../../assets/Icons/user-fill.svg';
import CompassIcon from '../../assets/Icons/compass-3-fill.svg';
import FolderMusicIcon from '../../assets/Icons/folder-music-fill.svg';
import HeartIcon from '../../assets/Icons/poker-hearts-fill.svg';
import TriangleIcon from '../../assets/Icons/triangle-fill.svg';
import { DEBUG_THUMB_ZONES_HAND, DEBUG_THUMB_ZONES_OPACITY } from '../config/debug-mode';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { accountProfileQueryDefaults, fetchAccountProfile } from '../features/account/account-api';
import { signOutCurrentSession } from '../features/auth/auth-service';
import { useDebugStore } from '../state/debug-store';
import { useSessionStore } from '../state/session-store';
import { useMainMenuStore } from '../state/main-menu-store';
import { useThemeStore } from '../state/theme-store';
import { BrandLogoMark } from './brand-logo-mark';
import { LOGO_BUTTON_SHADOW_SIZE, LOGO_BUTTON_SIZE } from './screen-header';
import { DebugControlsOverlay, ThemeColorDebugOverlayStatic, ThumbZoneDebugOverlayStatic } from './thumb-zone-debug-overlay';
import { BlockShadow, BlockShadowPressable } from './ui/block-shadow';

const menuItems = [
  { icon: CompassIcon, key: 'discover', label: 'Discover', route: '/(tabs)' as Href },
  { icon: FolderMusicIcon, key: 'playlists', label: 'Playlists', route: '/(tabs)/playlists' as Href },
  { icon: TriangleIcon, key: 'votes', label: 'Votes', route: '/playlist/voted' as Href },
  { icon: HeartIcon, key: 'favorites', label: 'Favorites', route: '/(tabs)/liked' as Href },
] as const;

const PANEL_SHADOW_SIZE = 5;
const BOTTOM_MENU_AREA_HEIGHT = 90;
const MAIN_MENU_TOP_GAP = spacing.xs;
const MAIN_MENU_TO_CONTENT_GAP = spacing.xs;
const MIN_PANEL_HEIGHT = 440;
const MENU_ACTION_GREEN = '#6EA06E';
const SIDEBAR_BUTTON_FILL = '#333333';
const SIDEBAR_BUTTON_TEXT = '#FFFFFF';
const SIDEBAR_DANGER_TEXT = '#FFFFFF';
const DARK_BORDER_COLOR = '#1A1A19';
const DARK_VOTE_ICON_COLOR = '#4C79AE';
const MAIN_MENU_BACKDROP = 'rgba(0, 0, 0, 0.56)';
const MAIN_MENU_Z_INDEX = 9000;

type AppSidebarProps = {
  onClose: () => void;
  visible: boolean;
};

export function AppSidebar({ onClose, visible }: AppSidebarProps) {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const debugModeEnabled = useDebugStore((state) => state.debugModeEnabled);
  const colorOverlayMode = useDebugStore((state) => state.colorOverlayMode);
  const thumbOverlayVisible = useDebugStore((state) => state.thumbOverlayVisible);
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const session = useSessionStore((state) => state.user);
  const setMainMenuVisible = useMainMenuStore((state) => state.setMainMenuVisible);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profileQuery = useQuery({
    ...accountProfileQueryDefaults,
    enabled: visible,
    queryFn: fetchAccountProfile,
    queryKey: ['account-profile'],
  });
  const signOutMutation = useMutation({
    mutationFn: signOutCurrentSession,
    onSuccess: () => {
      onClose();
      router.replace('/sign-in');
    },
  });
  const profile = profileQuery.data;
  const displayName = profile?.displayName || session?.displayName || 'BandFan Listener';
  const username = profile?.username || null;
  const email = profile?.email || session?.email || '';
  const themeToggleLabel = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const menuAccent = mode === 'light' ? theme.palette.blueDark : MENU_ACTION_GREEN;
  const menuRows = [[menuItems[0], menuItems[1]], [menuItems[2], menuItems[3]]];
  const anchorTop = insets.top + MAIN_MENU_TOP_GAP + LOGO_BUTTON_SIZE + LOGO_BUTTON_SHADOW_SIZE + MAIN_MENU_TO_CONTENT_GAP + insets.top;
  const bottomReserve = insets.bottom + BOTTOM_MENU_AREA_HEIGHT + spacing.sm + PANEL_SHADOW_SIZE;
  const panelTop = height - anchorTop - bottomReserve >= MIN_PANEL_HEIGHT
    ? anchorTop
    : Math.max(spacing.sm, height - MIN_PANEL_HEIGHT - bottomReserve);
  const panelMaxHeight = Math.max(320, height - panelTop - bottomReserve);
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dx < -16 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -48 || gestureState.vx < -0.45) {
          onClose();
        }
      },
    }),
    [onClose],
  );

  useEffect(() => {
    setMainMenuVisible(visible);

    return () => setMainMenuVisible(false);
  }, [setMainMenuVisible, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();

      return true;
    });

    return () => backSubscription.remove();
  }, [onClose, visible]);

  function navigate(route: Href) {
    onClose();
    router.push(route);
  }

  function getMenuIconColor(key: typeof menuItems[number]['key']) {
    if (key === 'discover' || key === 'playlists') {
      return mode === 'light' ? theme.ui.textPrimary : SIDEBAR_BUTTON_TEXT;
    }

    if (key === 'favorites') {
      return theme.ui.buttonLikeActive;
    }

    if (key === 'votes') {
      return mode === 'dark' ? DARK_VOTE_ICON_COLOR : theme.ui.buttonVoteActive;
    }

    return menuAccent;
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View pointerEvents="box-none" style={[styles.panelWrap, { paddingTop: panelTop, paddingBottom: bottomReserve }]}>
          <BlockShadow contentStyle={styles.panel} shadowOffset={6} style={[styles.panelShadow, { maxHeight: panelMaxHeight }]} {...panResponder.panHandlers}> 
            <View style={styles.menuSection}>
              <View style={styles.logoRow}>
                <Pressable accessibilityLabel={themeToggleLabel} accessibilityRole="button" onPress={toggleMode} style={styles.logoButton}>
                  <BrandLogoMark height={106} width={322} />
                </Pressable>
              </View>

              <View style={styles.menuGrid}>
                {menuRows.map((row, rowIndex) => (
                  <View key={row.map((item) => item.key).join('-')} style={[styles.menuRow, rowIndex === 0 && styles.menuRowGap]}>
                    {row.map((item, itemIndex) => {
                      const Icon = item.icon;

                      return (
                        <BlockShadowPressable key={item.key} accessibilityRole="button" contentStyle={styles.menuButton} onPress={() => navigate(item.route)} pressedContentStyle={styles.pressed} shadowOffset={4} style={[styles.menuButtonShadow, itemIndex === 0 && styles.menuButtonShadowFirst]}>
                          <Icon color={getMenuIconColor(item.key)} height={24} width={24} />
                          <Text style={styles.menuLabel}>{item.label}</Text>
                        </BlockShadowPressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.accountBlock}>
                <View style={styles.accountInfoRows}>
                  <View>
                    <Text style={styles.accountFieldLabel}>Name</Text>
                    <Text numberOfLines={1} style={styles.accountName}>{displayName}</Text>
                  </View>
                  {username ? (
                    <View>
                      <Text style={styles.accountFieldLabel}>Username</Text>
                      <Text numberOfLines={1} style={styles.accountMeta}>@{username}</Text>
                    </View>
                  ) : null}
                  {email ? (
                    <View>
                      <Text style={styles.accountFieldLabel}>Email</Text>
                      <Text numberOfLines={1} style={styles.accountMeta}>{email}</Text>
                    </View>
                  ) : null}
                </View>
                <BlockShadowPressable accessibilityRole="button" contentStyle={styles.accountButton} onPress={() => navigate('/(tabs)/account' as Href)} pressedContentStyle={styles.pressed} shadowOffset={4}>
                  <AccountIcon color={menuAccent} height={22} width={22} />
                  <Text style={styles.accountButtonLabel}>Account</Text>
                </BlockShadowPressable>
              </View>
              <BlockShadowPressable accessibilityRole="button" contentStyle={[styles.signOutButton, signOutMutation.isPending && styles.disabled]} disabled={signOutMutation.isPending} onPress={() => signOutMutation.mutate()} pressedContentStyle={styles.pressed} shadowOffset={4} shadowVisible={!signOutMutation.isPending} style={styles.signOutButtonShadow}>
                <Text style={styles.signOutLabel}>Sign Out</Text>
              </BlockShadowPressable>
            </View>
          </BlockShadow>
        </View>
      </View>
      {__DEV__ && debugModeEnabled && thumbOverlayVisible ? <ThumbZoneDebugOverlayStatic hand={DEBUG_THUMB_ZONES_HAND} opacity={DEBUG_THUMB_ZONES_OPACITY} /> : null}
      {__DEV__ && debugModeEnabled && colorOverlayMode !== 'off' ? <ThemeColorDebugOverlayStatic side={colorOverlayMode} /> : null}
      {__DEV__ ? <DebugControlsOverlay /> : null}
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const colors = theme.ui;
  const isLight = theme.mode === 'light';
  const menuAccent = isLight ? theme.palette.blueDark : MENU_ACTION_GREEN;
  const menuButtonFill = isLight ? colors.surfaceCard : SIDEBAR_BUTTON_FILL;
  const menuButtonText = isLight ? colors.textPrimary : SIDEBAR_BUTTON_TEXT;
  const buttonBorder = isLight ? colors.borderStrong : DARK_BORDER_COLOR;

  return StyleSheet.create({
    accountBlock: {
      borderColor: buttonBorder,
      borderWidth: 2,
      gap: 4,
      padding: spacing.md,
    },
    accountButton: {
      alignItems: 'center',
      backgroundColor: menuButtonFill,
      borderColor: buttonBorder,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    accountButtonLabel: {
      color: menuButtonText,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    accountFieldLabel: {
      color: colors.textSecondary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    accountInfoRows: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    accountMeta: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '700',
    },
    accountName: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.heading,
      fontWeight: '900',
    },
    backdrop: {
      backgroundColor: MAIN_MENU_BACKDROP,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    disabled: {
      opacity: 0.55,
    },
    footer: {
      gap: spacing.md,
      marginTop: 0,
    },
    logoButton: {
      alignItems: 'flex-start',
      alignSelf: 'flex-start',
      justifyContent: 'flex-start',
      minHeight: 106,
      paddingRight: 42,
      position: 'relative',
      width: 322,
    },
    logoRow: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      minHeight: 106,
      position: 'relative',
    },
    menuButton: {
      alignItems: 'center',
      backgroundColor: menuButtonFill,
      borderColor: buttonBorder,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      minHeight: 54,
      paddingHorizontal: spacing.md,
    },
    menuButtonShadow: {
      flex: 1,
    },
    menuButtonShadowFirst: {
      marginRight: spacing.sm,
    },
    menuGrid: {
      alignSelf: 'stretch',
    },
    menuRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
    },
    menuRowGap: {
      marginBottom: spacing.sm,
    },
    menuSection: {
      gap: 0,
      marginTop: 0,
    },
    menuLabel: {
      color: menuButtonText,
      flexShrink: 1,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    panel: {
      backgroundColor: colors.sidebarBackground,
      borderColor: buttonBorder,
      borderRadius: radii.md,
      borderWidth: 3,
      gap: spacing.md,
      padding: spacing.lg,
      width: '100%',
    },
    panelShadow: {
      width: '100%',
    },
    panelWrap: {
      flex: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.sm,
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    root: {
      ...StyleSheet.absoluteFillObject,
      elevation: MAIN_MENU_Z_INDEX,
      zIndex: MAIN_MENU_Z_INDEX,
    },
    signOutButton: {
      alignItems: 'center',
      backgroundColor: colors.buttonDanger,
      borderColor: buttonBorder,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 54,
    },
    signOutButtonShadow: {
      alignSelf: 'stretch',
      marginBottom: spacing.lg,
    },
    signOutLabel: {
      color: SIDEBAR_DANGER_TEXT,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    themeIconSlot: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      height: 36,
      justifyContent: 'center',
      position: 'absolute',
      right: 16,
      top: 21,
      width: 44,
    },
  });
}
