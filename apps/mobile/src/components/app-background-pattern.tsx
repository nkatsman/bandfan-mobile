import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useAppTheme } from '../design/theme';

export function AppBackgroundPattern() {
  const theme = useAppTheme();

  return (
    <AppBackgroundPatternTile isDark={theme.mode === 'dark'} />
  );
}

export function AppBackgroundPatternTile({ isDark }: { isDark: boolean }) {
  const patternId = isDark ? 'bandfan-dark-dot-pattern' : 'bandfan-light-stripe-pattern';

  return (
    <View pointerEvents="none" style={styles.patternLayer}>
      <Svg height="100%" style={styles.patternSvg} width="100%">
        <Defs>
          {isDark ? (
            <Pattern height={20} id={patternId} patternUnits="userSpaceOnUse" width={20} x={0} y={0}>
              <Rect fill="rgba(255, 249, 239, 0.12)" height={2} rx={1} width={2} x={1} y={1} />
            </Pattern>
          ) : (
            <Pattern height={4} id={patternId} patternUnits="userSpaceOnUse" width={4} x={0} y={0}>
              <Rect fill="rgba(34, 34, 32, 0.02)" height={2} width={4} x={0} y={0} />
            </Pattern>
          )}
        </Defs>
        <Rect fill={`url(#${patternId})`} height="100%" width="100%" x={0} y={0} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
    zIndex: 0,
  },
  patternSvg: {
    ...StyleSheet.absoluteFillObject,
  },
});