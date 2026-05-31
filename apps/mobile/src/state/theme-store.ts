import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'bandfan-mobile-theme';

type ThemeState = {
  hasHydrated: boolean;
  hydrateTheme: () => Promise<void>;
  mode: ThemeMode;
  setHasHydrated: (hasHydrated: boolean) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  hasHydrated: false,
  hydrateTheme: async () => {
    try {
      const storedMode = await AsyncStorage.getItem(themeStorageKey);

      if (storedMode === 'light' || storedMode === 'dark') {
        set(() => ({ mode: storedMode }));
      }
    } finally {
      set(() => ({ hasHydrated: true }));
    }
  },
  mode: 'light',
  setHasHydrated: (hasHydrated) => set(() => ({ hasHydrated })),
  setMode: (mode) => {
    set(() => ({ mode }));
    void AsyncStorage.setItem(themeStorageKey, mode);
  },
  toggleMode: () => {
    const nextMode = get().mode === 'light' ? 'dark' : 'light';
    set(() => ({ mode: nextMode }));
    void AsyncStorage.setItem(themeStorageKey, nextMode);
  },
}));