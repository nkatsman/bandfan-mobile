import { PropsWithChildren, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BFDarkLogo from '../../assets/BandFan/BF Dark - No Card.svg';
import BFLightLogo from '../../assets/BandFan/BF Light - No Card.svg';
import { DS } from '../design/ds';
import { spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';

type ScreenHeaderProps = PropsWithChildren<{
  actionsPlacement?: 'wrap' | 'bottom';
  counter?: string;
  logoAccessibilityLabel?: string;
  onLogoPress?: () => void;
  title: string;
}>;

export const LOGO_BUTTON_SIZE = 135;
export const LOGO_BUTTON_SHADOW_SIZE = 4;
const LOGO_SIZE = 88;

export function ScreenHeader({ actionsPlacement = 'wrap', children, counter, logoAccessibilityLabel = 'Open menu', onLogoPress, title }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [insets.top, theme]);
  const BFLogo = theme.mode === 'dark' ? BFDarkLogo : BFLightLogo;
  const hasControls = Boolean(children);

  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel={logoAccessibilityLabel}
          accessibilityRole="button"
          disabled={!onLogoPress}
          onPress={onLogoPress}
          style={({ pressed }) => [styles.logoButton, pressed && styles.pressed]}
        >
          <BFLogo height={LOGO_SIZE} width={LOGO_SIZE} />
        </Pressable>

        <View style={[styles.mainColumn, !hasControls && styles.mainColumnNoControls, hasControls && actionsPlacement === 'bottom' && styles.mainColumnBottomActions]}>
          <View style={[styles.titleStack, hasControls && actionsPlacement === 'bottom' && styles.titleStackCentered]}>
            <Text numberOfLines={1} style={styles.pageTitle}>{title}</Text>
            {counter ? <Text numberOfLines={1} style={styles.pageSubtitle}>{counter}</Text> : null}
          </View>

          {children ? <View style={[styles.controlsWrap, actionsPlacement === 'bottom' && styles.controlsWrapBottom]}>{children}</View> : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>, safeTopInset: number) {
  const colors = theme.ui;
  const isDark = theme.mode === 'dark';
  const buttonBorder = isDark ? '#1A1A19' : colors.borderStrong;

  return StyleSheet.create({
    controlsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    headerBlock: {
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingTop: Math.max(spacing.xs, safeTopInset),
    },
    headerRow: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    logoButton: {
      alignItems: 'center',
      backgroundColor: isDark ? colors.buttonPrimary : colors.surfaceCard,
      borderColor: buttonBorder,
      borderWidth: 2,
      boxShadow: `${LOGO_BUTTON_SHADOW_SIZE}px ${LOGO_BUTTON_SHADOW_SIZE}px 0px #000000`,
      justifyContent: 'center',
      height: LOGO_BUTTON_SIZE,
      width: LOGO_BUTTON_SIZE,
    },
    mainColumn: {
      flex: 1,
      gap: spacing.xs,
      minHeight: LOGO_BUTTON_SIZE,
      minWidth: 0,
    },
    mainColumnNoControls: {
      justifyContent: 'center',
    },
    mainColumnBottomActions: {
      justifyContent: 'space-between',
    },
    pageSubtitle: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '400',
    },
    pageTitle: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.heading,
      fontWeight: '900',
    },
    pressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    titleStack: {
      minWidth: 0,
    },
    titleStackCentered: {
      flex: 1,
      justifyContent: 'center',
    },
    controlsWrapBottom: {
      alignItems: 'flex-end',
    },
  });
}