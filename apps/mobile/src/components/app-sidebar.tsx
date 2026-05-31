import { useMutation, useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import XIcon from '../../assets/Icons/x-line.svg';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { accountProfileQueryDefaults, fetchAccountProfile } from '../features/account/account-api';
import { signOutCurrentSession } from '../features/auth/auth-service';
import { useSessionStore } from '../state/session-store';
import { useThemeStore } from '../state/theme-store';

const menuItems = [
  { icon: CompassIcon, key: 'discover', label: 'Discover', route: '/(tabs)' as Href },
  { icon: HeartIcon, key: 'favorites', label: 'Favorites', route: '/(tabs)/liked' as Href },
  { icon: TriangleIcon, key: 'votes', label: 'Votes', route: '/playlist/voted' as Href },
  { icon: FolderMusicIcon, key: 'playlists', label: 'Playlists', route: '/(tabs)/playlists' as Href },
] as const;

const PANEL_SHADOW_SIZE = 5;
const BOTTOM_MENU_AREA_HEIGHT = 90;
const MENU_ACTION_GREEN = '#6EA06E';
const SIDEBAR_BUTTON_FILL = '#3A3A38';
const SIDEBAR_BUTTON_TEXT = '#FFFFFF';

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
  const styles = useMemo(() => createStyles(theme.ui), [theme]);
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
  const panelHeight = Math.max(440, height - BOTTOM_MENU_AREA_HEIGHT - spacing.sm - (spacing.sm + PANEL_SHADOW_SIZE) - PANEL_SHADOW_SIZE);

  function navigate(route: Href) {
    onClose();
    router.push(route);
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <SafeAreaView edges={[ 'top', 'bottom' ]} style={styles.panelWrap}>
          <View style={[styles.panel, { height: panelHeight }]}> 
            <View style={styles.logoRow}>
              <Pressable accessibilityLabel={themeToggleLabel} accessibilityRole="button" onPress={toggleMode} style={styles.logoButton}>
                <Logo height={112} width={278} />
                <View style={styles.themeIconSlot}>
                  <ThemeIcon color={theme.ui.textPrimary} height={19} width={19} />
                </View>
              </Pressable>
              <Pressable accessibilityLabel="Close menu" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <XIcon color={MENU_ACTION_GREEN} height={20} width={20} />
              </Pressable>
            </View>

            <View style={styles.menuGrid}>
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Pressable key={item.key} accessibilityRole="button" onPress={() => navigate(item.route)} style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
                    <Icon color={MENU_ACTION_GREEN} height={24} width={24} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
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
                  <AccountIcon color={MENU_ACTION_GREEN} height={22} width={22} />
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
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    accountBlock: {
      borderColor: colors.borderStrong,
      borderWidth: 2,
      gap: 4,
      padding: spacing.md,
    },
    accountButton: {
      alignItems: 'center',
      backgroundColor: SIDEBAR_BUTTON_FILL,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    accountButtonLabel: {
      color: SIDEBAR_BUTTON_TEXT,
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
      color: MENU_ACTION_GREEN,
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
      backgroundColor: colors.overlayScrim,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderWidth: 0,
      height: 40,
      justifyContent: 'center',
      position: 'absolute',
      right: 0,
      top: 0,
      width: 40,
    },
    disabled: {
      opacity: 0.55,
    },
    footer: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    logoButton: {
      alignItems: 'flex-start',
      alignSelf: 'flex-start',
      justifyContent: 'flex-start',
      minHeight: 120,
      paddingRight: 42,
      position: 'relative',
      width: 322,
    },
    logoRow: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      minHeight: 128,
      position: 'relative',
    },
    menuButton: {
      alignItems: 'center',
      backgroundColor: SIDEBAR_BUTTON_FILL,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      flexBasis: '48%',
      flexDirection: 'row',
      flexGrow: 1,
      gap: spacing.sm,
      minHeight: 54,
      paddingHorizontal: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: 'auto',
    },
    menuLabel: {
      color: SIDEBAR_BUTTON_TEXT,
      flexShrink: 1,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '900',
    },
    panel: {
      backgroundColor: colors.sidebarBackground,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 3,
      gap: spacing.lg,
      padding: spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      width: '100%',
    },
    panelWrap: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: spacing.sm,
    },
    pressed: {
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    root: {
      flex: 1,
    },
    signOutButton: {
      alignItems: 'center',
      backgroundColor: colors.buttonDanger,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 54,
      shadowColor: '#000000',
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    signOutLabel: {
      color: SIDEBAR_BUTTON_TEXT,
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
