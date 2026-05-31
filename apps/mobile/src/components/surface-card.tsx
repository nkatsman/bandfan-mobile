import { PropsWithChildren, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radii, spacing } from '../design/tokens';
import { useAppTheme } from '../design/theme';

type SurfaceTone = 'card' | 'grouped' | 'accent' | 'player';

type SurfaceCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: SurfaceTone;
}>;

export function SurfaceCard({ children, style, tone = 'card' }: SurfaceCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme.ui), [theme]);
  const backgrounds: Record<SurfaceTone, string> = {
    accent: theme.ui.surfaceAccent,
    card: theme.ui.surfaceCard,
    grouped: theme.ui.surfaceGrouped,
    player: theme.ui.surfacePlayer,
  };

  return (
    <View style={style}>
      <View style={styles.shadow} />
      <View style={[styles.card, { backgroundColor: backgrounds[tone] }]}>{children}</View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    shadow: {
      backgroundColor: '#000000',
      borderRadius: radii.md,
      bottom: -6,
      left: 6,
      position: 'absolute',
      right: -6,
      top: 6,
    },
    card: {
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 3,
      padding: spacing.lg,
      position: 'relative',
    },
  });
}