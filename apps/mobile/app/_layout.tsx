import { Stack, useRouter } from 'expo-router';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppContentProtection } from '../src/components/core/app-content-protection';
import { ThumbZoneDebugOverlayStatic } from '../src/components/thumb-zone-debug-overlay';
import { DEBUG_THUMB_ZONES_HAND, DEBUG_THUMB_ZONES_OPACITY } from '../src/config/debug-mode';
import { useAppTheme } from '../src/design/theme';
import { useBootstrapAuth } from '../src/features/auth/use-bootstrap-auth';
import { AppProviders } from '../src/providers/app-providers';
import { useDebugStore } from '../src/state/debug-store';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexMonoRegular: IBMPlexMono_400Regular,
    IBMPlexMono: IBMPlexMono_500Medium,
    IBMPlexMonoBold: IBMPlexMono_700Bold,
  });
  useBootstrapAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const debugModeEnabled = useDebugStore((state) => state.debugModeEnabled);
  const thumbOverlayVisible = useDebugStore((state) => state.thumbOverlayVisible);
  const toggleThumbOverlay = useDebugStore((state) => state.toggleThumbOverlay);

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
      <StatusBar style={theme.statusBarStyle} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.ui.appBackground } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" />
        <Stack.Screen name="playlist/[playlistId]" />
      </Stack>
      {debugModeEnabled && thumbOverlayVisible ? <ThumbZoneDebugOverlayStatic hand={DEBUG_THUMB_ZONES_HAND} opacity={DEBUG_THUMB_ZONES_OPACITY} /> : null}
      {__DEV__ && debugModeEnabled ? (
        <View style={styles.debugButtonLayer}>
          <View style={styles.debugButtonRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.debugButton, pressed && styles.debugButtonPressed]}
            >
              <Text style={styles.debugButtonLabel}>Back</Text>
            </Pressable>
            <Pressable
              onPress={toggleThumbOverlay}
              style={({ pressed }) => [styles.debugButton, pressed && styles.debugButtonPressed]}
            >
              <Text style={styles.debugButtonLabel}>{thumbOverlayVisible ? 'Overlay: ON' : 'Overlay: OFF'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  debugButtonLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    pointerEvents: 'box-none',
    paddingRight: 12,
    paddingTop: 12,
    zIndex: 10000,
  },
  debugButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    backgroundColor: '#1A1A19',
    borderColor: '#000000',
    borderWidth: 2,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  debugButtonLabel: {
    color: '#FFF9EF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  debugButtonPressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
