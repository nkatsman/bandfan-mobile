import { useMutation, useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoDark from '../../assets/BandFan/BandFan - Logo Dark.svg';
import LogoLight from '../../assets/BandFan/BandFan - Logo Light.svg';
import AccountIcon from '../../assets/Icons/user-fill.svg';
import CompassIcon from '../../assets/Icons/compass-3-fill.svg';
import ContrastIcon from '../../assets/Icons/contrast-2-fill.svg';
import FolderMusicIcon from '../../assets/Icons/folder-music-fill.svg';
import HeartIcon from '../../assets/Icons/poker-hearts-fill.svg';
import SunIcon from '../../assets/Icons/sun-line.svg';
import TriangleIcon from '../../assets/Icons/triangle-fill.svg';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { accountProfileQueryDefaults, fetchAccountProfile } from '../features/account/account-api';
import { signOutCurrentSession } from '../features/auth/auth-service';
import { useSessionStore } from '../state/session-store';
import { useThemeStore } from '../state/theme-store';
import { LOGO_BUTTON_SHADOW_SIZE, LOGO_BUTTON_SIZE } from './screen-header';

const menuItems = [
  { icon: CompassIcon, key: 'discover', label: 'Discover', route: '/(tabs)' as Href },
  { icon: FolderMusicIcon, key: 'playlists', label: 'Playlists', route: '/(tabs)/playlists' as Href },
  { icon: TriangleIcon, key: 'votes', label: 'Votes', route: '/playlist/voted' as Href },
  { icon: HeartIcon, key: 'favorites', label: 'Favorites', route: '/(tabs)/liked' as Href },
] as const;

const PANEL_SHADOW_SIZE = 5;
const BOTTOM_MENU_AREA_HEIGHT = 90;
const MAIN_MENU_TOP_GAP = spacing.sm;
const MAIN_MENU_TO_CONTENT_GAP = spacing.xs;
const MENU_BUTTON_BOTTOM_OFFSET = MAIN_MENU_TOP_GAP + LOGO_BUTTON_SIZE + LOGO_BUTTON_SHADOW_SIZE + MAIN_MENU_TO_CONTENT_GAP;
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
  const theme = useAppTheme();
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const session = useSessionStore((state) => state.user);
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
  const Logo = mode === 'light' ? LogoLight : LogoDark;
  const ThemeIcon = mode === 'dark' ? SunIcon : ContrastIcon;
  const themeToggleLabel = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const menuAccent = mode === 'light' ? theme.palette.blueDark : MENU_ACTION_GREEN;
  const panelMaxHeight = Math.max(440, height - MENU_BUTTON_BOTTOM_OFFSET - BOTTOM_MENU_AREA_HEIGHT - spacing.sm - (spacing.sm + PANEL_SHADOW_SIZE) - PANEL_SHADOW_SIZE);
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
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
      <SafeAreaView edges={[ 'top', 'bottom' ]} pointerEvents="box-none" style={styles.panelWrap}>
        <View style={[styles.panel, { maxHeight: panelMaxHeight }]} {...panResponder.panHandlers}> 
          <View style={styles.menuSection}>
            <View style={styles.logoRow}>
              <Pressable accessibilityLabel={themeToggleLabel} accessibilityRole="button" onPress={toggleMode} style={styles.logoButton}>
                <Logo height={112} width={278} />
                <View style={styles.themeIconSlot}>
                  <ThemeIcon color={theme.ui.textPrimary} height={19} width={19} />
                </View>
              </Pressable>
            </View>

            <View style={styles.menuGrid}>
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Pressable key={item.key} accessibilityRole="button" onPress={() => navigate(item.route)} style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
                    <Icon color={getMenuIconColor(item.key)} height={24} width={24} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
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
              <Pressable accessibilityRole="button" onPress={() => navigate('/(tabs)/account' as Href)} style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}>
                <AccountIcon color={menuAccent} height={22} width={22} />
                <Text style={styles.accountButtonLabel}>Account</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" disabled={signOutMutation.isPending} onPress={() => signOutMutation.mutate()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed, signOutMutation.isPending && styles.disabled]}>
              <Text style={styles.signOutLabel}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      </View>
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
      boxShadow: '4px 4px 0px #000000',
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
      boxShadow: '4px 4px 0px #000000',
      flexBasis: '48%',
      flexDirection: 'row',
      flexGrow: 1,
      gap: spacing.sm,
      minHeight: 54,
      paddingHorizontal: spacing.md,
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
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
      boxShadow: '6px 6px 0px #000000',
      gap: spacing.md,
      padding: spacing.lg,
      width: '100%',
    },
    panelWrap: {
      flex: 1,
      justifyContent: 'flex-start',
      paddingBottom: BOTTOM_MENU_AREA_HEIGHT + spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingTop: MENU_BUTTON_BOTTOM_OFFSET,
    },
    pressed: {
      boxShadow: [],
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
      boxShadow: '4px 4px 0px #000000',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      minHeight: 54,
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
