import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppContentProtection } from '../src/components/core/app-content-protection';
import { DebugControlsOverlay, ThemeColorDebugOverlayStatic, ThumbZoneDebugOverlayStatic } from '../src/components/thumb-zone-debug-overlay';
import { DEBUG_THUMB_ZONES_HAND, DEBUG_THUMB_ZONES_OPACITY } from '../src/config/debug-mode';
import { useAppTheme } from '../src/design/theme';
import { useBootstrapAuth } from '../src/features/auth/use-bootstrap-auth';
import { AppProviders } from '../src/providers/app-providers';
import { useDebugStore } from '../src/state/debug-store';

const NOTIFICATION_BAR_LIGHT_FILL = '#E7BF7B';
const NOTIFICATION_BAR_DARK_FILL = '#1A1A19';
const NOTIFICATION_BAR_SHADOW_HEIGHT = 3;

export default function RootLayout() {
  const fontsLoaded = true;
  useBootstrapAuth();
  const theme = useAppTheme();
  const debugModeEnabled = useDebugStore((state) => state.debugModeEnabled);
  const colorOverlayMode = useDebugStore((state) => state.colorOverlayMode);
  const thumbOverlayVisible = useDebugStore((state) => state.thumbOverlayVisible);
  const notificationBarFill = theme.mode === 'dark' ? NOTIFICATION_BAR_DARK_FILL : NOTIFICATION_BAR_LIGHT_FILL;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.ui.appBackground);
  }, [theme.ui.appBackground]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const styleId = 'bandfan-hide-scrollbars';
    if (document.getElementById(styleId)) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      html, body, #root, * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }

      *::-webkit-scrollbar {
        display: none !important;
        height: 0 !important;
        width: 0 !important;
      }
    `;
    document.head.appendChild(styleElement);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <AppContentProtection />
      <StatusBar backgroundColor={notificationBarFill} style={theme.statusBarStyle} />
      <NotificationBarChrome borderColor={theme.mode === 'dark' ? theme.palette.fog : theme.ui.borderStrong} fillColor={notificationBarFill} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.ui.appBackground } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" />
        <Stack.Screen name="playlist/[playlistId]" />
      </Stack>
      {__DEV__ && debugModeEnabled && thumbOverlayVisible ? <ThumbZoneDebugOverlayStatic hand={DEBUG_THUMB_ZONES_HAND} opacity={DEBUG_THUMB_ZONES_OPACITY} /> : null}
      {__DEV__ && debugModeEnabled && colorOverlayMode !== 'off' ? <ThemeColorDebugOverlayStatic side={colorOverlayMode} /> : null}
      {__DEV__ ? <DebugControlsOverlay /> : null}
    </AppProviders>
  );
}

function NotificationBarChrome({ borderColor, fillColor }: { borderColor: string; fillColor: string }) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web' || insets.top <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.notificationBarChrome, { backgroundColor: fillColor, height: insets.top + NOTIFICATION_BAR_SHADOW_HEIGHT }]}>
      <View style={[styles.notificationBarShadow, { backgroundColor: borderColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  notificationBarChrome: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2147482000,
  },
  notificationBarShadow: {
    bottom: 0,
    height: NOTIFICATION_BAR_SHADOW_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
