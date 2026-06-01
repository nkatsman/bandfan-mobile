import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '../design/theme';

export function AppBackgroundPattern() {
  const { height, width } = useWindowDimensions();
  const theme = useAppTheme();
  const items = useMemo(() => buildPatternItems(width, height, theme.mode === 'dark'), [height, theme.mode, width]);

  return (
    <View pointerEvents="none" style={styles.patternLayer}>
      {items.map((itemStyle, index) => <View key={index} style={itemStyle} />)}
    </View>
  );
}

function buildPatternItems(screenWidth: number, screenHeight: number, isDark: boolean): ViewStyle[] {
  if (isDark) {
    const gap = 20;
    const columns = Math.ceil(screenWidth / gap) + 1;
    const rows = Math.ceil(screenHeight / gap) + 1;

    return Array.from({ length: columns * rows }, (_, index) => ({
      backgroundColor: 'rgba(255, 249, 239, 0.12)',
      borderRadius: 1,
      height: 2,
      left: (index % columns) * gap + 1,
      position: 'absolute',
      top: Math.floor(index / columns) * gap + 1,
      width: 2,
    }));
  }

  const stripeCycle = 4;
  const rows = Math.ceil(screenHeight / stripeCycle) + 1;

  return Array.from({ length: rows }, (_, index) => ({
    backgroundColor: 'rgba(34, 34, 32, 0.02)',
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: index * stripeCycle,
  }));
}

const styles = StyleSheet.create({
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
    zIndex: 0,
  },
});