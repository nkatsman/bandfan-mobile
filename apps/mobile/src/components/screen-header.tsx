import { PropsWithChildren, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BFDarkLogo from '../../assets/BandFan/BF Dark - No Card.svg';
import BFLightLogo from '../../assets/BandFan/BF Light - No Card.svg';
import { DS } from '../design/ds';
import { spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { BlockShadowPressable } from './ui/block-shadow';

type ScreenHeaderProps = PropsWithChildren<{
  actionsPlacement?: 'wrap' | 'bottom';
  counter?: string;
  description?: string;
  logoAccessibilityLabel?: string;
  onLogoPress?: () => void;
  onRefresh?: () => void;
  refreshLabel?: string;
  title: string;
  verticalOffset?: number;
}>;

export const LOGO_BUTTON_SIZE = 135;
export const LOGO_BUTTON_SHADOW_SIZE = 4;
const LOGO_SIZE = 94;

export function ScreenHeader({ actionsPlacement = 'wrap', children, counter, description, logoAccessibilityLabel = 'Open menu', onLogoPress, onRefresh, refreshLabel = 'Refresh songs', title, verticalOffset = 0 }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top, verticalOffset), [insets.top, theme, verticalOffset]);
  const BFLogo = theme.mode === 'dark' ? BFDarkLogo : BFLightLogo;
  const hasControls = Boolean(children);

  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        <BlockShadowPressable
          accessibilityLabel={logoAccessibilityLabel}
          accessibilityRole="button"
          contentStyle={styles.logoButton}
          disabled={!onLogoPress}
          onPress={onLogoPress}
          pressedContentStyle={styles.pressed}
          shadowOffset={LOGO_BUTTON_SHADOW_SIZE}
          style={styles.logoButtonShadow}
        >
          <BFLogo height={LOGO_SIZE} width={LOGO_SIZE} />
        </BlockShadowPressable>

        <View style={[styles.mainColumn, !hasControls && styles.mainColumnNoControls, hasControls && actionsPlacement === 'bottom' && styles.mainColumnBottomActions]}>
          <View style={[styles.titleStack, hasControls && actionsPlacement === 'bottom' && styles.titleStackCentered]}>
            <Text numberOfLines={1} style={styles.pageTitle}>{title}</Text>
            {description ? <Text numberOfLines={2} style={styles.pageDescription}>{description}</Text> : null}
            {counter ? <Text numberOfLines={1} style={styles.pageSubtitle}>{counter}</Text> : null}
            {onRefresh ? (
              <Pressable accessibilityRole="button" onPress={onRefresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
                <Text numberOfLines={1} style={styles.refreshLabel}>{refreshLabel}</Text>
              </Pressable>
            ) : null}
          </View>

          {children ? <View style={[styles.controlsWrap, actionsPlacement === 'bottom' && styles.controlsWrapBottom]}>{children}</View> : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>, safeTopInset: number, verticalOffset: number) {
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
      paddingTop: Math.max(spacing.xs, safeTopInset) + verticalOffset,
    },
    headerRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    logoButton: {
      alignItems: 'center',
      backgroundColor: isDark ? colors.buttonPrimary : colors.surfaceCard,
      borderColor: buttonBorder,
      borderWidth: 2,
      justifyContent: 'center',
      height: LOGO_BUTTON_SIZE,
      width: LOGO_BUTTON_SIZE,
    },
    logoButtonShadow: {
      flexShrink: 0,
      height: LOGO_BUTTON_SIZE + LOGO_BUTTON_SHADOW_SIZE,
      width: LOGO_BUTTON_SIZE + LOGO_BUTTON_SHADOW_SIZE,
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
    pageDescription: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '700',
      lineHeight: 17,
      marginTop: 2,
    },
    pageTitle: {
      color: colors.textPrimary,
      fontFamily: DS.font.family,
      fontSize: typeScale.heading,
      fontWeight: '900',
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    refreshButton: {
      alignSelf: 'flex-start',
      marginTop: 1,
      paddingRight: spacing.sm,
      paddingVertical: 1,
    },
    refreshLabel: {
      color: colors.textSecondary,
      fontFamily: DS.font.family,
      fontSize: typeScale.small,
      fontWeight: '400',
      textDecorationLine: 'underline',
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