import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect } from 'react';
import { AppState, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '../lib/query-client';
import { useDebugStore } from '../state/debug-store';
import { usePlayerStore } from '../state/player-store';
import { useThemeStore } from '../state/theme-store';

export function AppProviders({ children }: PropsWithChildren) {
  const hydrateDebugMode = useDebugStore((state) => state.hydrateDebugMode);
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);

  useEffect(() => {
    void hydrateDebugMode();
    void hydrateTheme();
  }, [hydrateDebugMode, hydrateTheme]);

  useEffect(() => {
    const baseText = Text as typeof Text & { defaultProps?: { selectable?: boolean; style?: unknown } };
    const baseInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

    baseText.defaultProps = {
      ...(baseText.defaultProps ?? {}),
      selectable: false,
      style: [baseText.defaultProps?.style, { fontFamily: 'IBMPlexMono' }],
    };

    baseInput.defaultProps = {
      ...(baseInput.defaultProps ?? {}),
      style: [baseInput.defaultProps?.style, { fontFamily: 'IBMPlexMono' }],
    };
  }, []);

  useEffect(() => {
    const checkLease = () => {
      void usePlayerStore.getState().checkRemotePlaybackLease();
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkLease();
      }
    });
    const interval = setInterval(checkLease, 12_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
