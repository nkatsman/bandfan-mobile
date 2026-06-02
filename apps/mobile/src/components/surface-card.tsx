import { PropsWithChildren, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radii, spacing } from '../design/tokens';
import { useAppTheme } from '../design/theme';

type SurfaceTone = 'card' | 'grouped' | 'accent' | 'player';

type SurfaceCardProps = PropsWithChildren<{
  backgroundColor?: string;
  shadowVisible?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: SurfaceTone;
}>;

export function SurfaceCard({ backgroundColor, children, shadowVisible = true, style, tone = 'card' }: SurfaceCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme.ui, theme.mode, tone), [theme, tone]);
  const backgrounds: Record<SurfaceTone, string> = {
    accent: theme.ui.surfaceAccent,
    card: theme.ui.surfaceCard,
    grouped: theme.ui.surfaceGrouped,
    player: theme.ui.surfacePlayer,
  };

  return (
    <View style={style}>
      {shadowVisible ? <View style={styles.shadow} /> : null}
      <View style={[styles.card, { backgroundColor: backgroundColor ?? backgrounds[tone] }]}>{children}</View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], mode: ReturnType<typeof useAppTheme>['mode'], tone: SurfaceTone) {
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