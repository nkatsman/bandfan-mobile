import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEBUG_THUMB_ZONES_ENABLED } from '../config/debug-mode';

const debugModeStorageKey = 'bandfan-mobile-debug-mode';

type ColorOverlayMode = 'off' | 'left' | 'right';

type DebugState = {
  colorOverlayMode: ColorOverlayMode;
  debugModeEnabled: boolean;
  hydrateDebugMode: () => Promise<void>;
  setDebugModeEnabled: (enabled: boolean) => void;
  thumbOverlayVisible: boolean;
  toggleColorOverlay: () => void;
  toggleThumbOverlay: () => void;
};

export const useDebugStore = create<DebugState>((set) => ({
  colorOverlayMode: 'off',
  debugModeEnabled: false,
  hydrateDebugMode: async () => {
    if (!__DEV__) {
      set(() => ({ debugModeEnabled: false, thumbOverlayVisible: false }));
      return;
    }

    try {
      const storedMode = await AsyncStorage.getItem(debugModeStorageKey);
      const enabled = storedMode === 'on';

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
      colorOverlayMode: nextEnabled ? 'off' : 'off',
      thumbOverlayVisible: nextEnabled ? DEBUG_THUMB_ZONES_ENABLED : false,
    }));
    void AsyncStorage.setItem(debugModeStorageKey, nextEnabled ? 'on' : 'off');
  },
  thumbOverlayVisible: false,
  toggleColorOverlay: () => set((state) => ({
    colorOverlayMode: state.colorOverlayMode === 'off' ? 'left' : state.colorOverlayMode === 'left' ? 'right' : 'off',
  })),
  toggleThumbOverlay: () => set((state) => ({ thumbOverlayVisible: !state.thumbOverlayVisible })),
}));