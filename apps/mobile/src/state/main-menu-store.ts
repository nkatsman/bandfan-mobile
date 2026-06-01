import { create } from 'zustand';

type MainMenuState = {
  isMainMenuVisible: boolean;
  setMainMenuVisible: (isVisible: boolean) => void;
};

export const useMainMenuStore = create<MainMenuState>((set) => ({
  isMainMenuVisible: false,
  setMainMenuVisible: (isVisible) => set({ isMainMenuVisible: isVisible }),
}));
