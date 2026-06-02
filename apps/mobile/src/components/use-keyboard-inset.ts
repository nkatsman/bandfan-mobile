import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, useWindowDimensions } from 'react-native';

type KeyboardFrame = {
  height: number;
  screenY: number | null;
};

export const KEYBOARD_INSET_EXTRA_OFFSET = -36;

export function useKeyboardInset() {
  const { height: windowHeight } = useWindowDimensions();
  const screenHeight = Dimensions.get('screen').height;
  const [keyboardFrame, setKeyboardFrame] = useState<KeyboardFrame>({ height: 0, screenY: null });

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const screenY = typeof event.endCoordinates.screenY === 'number' ? event.endCoordinates.screenY : null;

      setKeyboardFrame({
        height: event.endCoordinates.height,
        screenY,
      });
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardFrame({ height: 0, screenY: null });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (keyboardFrame.height <= 0) {
    return 0;
  }

  if (keyboardFrame.screenY === null) {
    return keyboardFrame.height;
  }

  const windowOverlap = windowHeight - keyboardFrame.screenY;
  const screenOverlap = screenHeight - keyboardFrame.screenY;

  const overlap = windowOverlap > 0 ? windowOverlap : screenOverlap;

  return Math.max(0, Math.ceil(overlap + KEYBOARD_INSET_EXTRA_OFFSET));
}
