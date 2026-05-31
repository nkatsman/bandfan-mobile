import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEBUG_THUMB_ZONES_ENABLED } from '../config/debug-mode';

const debugModeStorageKey = 'bandfan-mobile-debug-mode';

type DebugState = {
  debugModeEnabled: boolean;
  hydrateDebugMode: () => Promise<void>;
  setDebugModeEnabled: (enabled: boolean) => void;
  thumbOverlayVisible: boolean;
  toggleThumbOverlay: () => void;
};

export const useDebugStore = create<DebugState>((set) => ({
  debugModeEnabled: false,
  hydrateDebugMode: async () => {
    try {
      const storedMode = await AsyncStorage.getItem(debugModeStorageKey);
      const enabled = __DEV__ && storedMode === 'on';

      set(() => ({
        debugModeEnabled: enabled,
        thumbOverlayVisible: enabled ? DEBUG_THUMB_ZONES_ENABLED : false,
      }));
    } catch {
      set(() => ({ debugModeEnabled: false, thumbOverlayVisible: false }));
    }
  },
  setDebugModeEnabled: (enabled) => {
    const nextEnabled = __DEV__ && enabled;
    set(() => ({
      debugModeEnabled: nextEnabled,
      thumbOverlayVisible: nextEnabled ? DEBUG_THUMB_ZONES_ENABLED : false,
    }));
    void AsyncStorage.setItem(debugModeStorageKey, nextEnabled ? 'on' : 'off');
  },
  thumbOverlayVisible: false,
  toggleThumbOverlay: () => set((state) => ({ thumbOverlayVisible: !state.thumbOverlayVisible })),
}));