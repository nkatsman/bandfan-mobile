import { PropsWithChildren, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const LOGO_BUTTON_SIZE = 135;
const LOGO_SIZE = 88;

export function ScreenHeader({ actionsPlacement = 'wrap', children, counter, logoAccessibilityLabel = 'Open menu', onLogoPress, title }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme.ui), [theme]);
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

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    controlsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    headerBlock: {
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    headerRow: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    logoButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      justifyContent: 'center',
      height: LOGO_BUTTON_SIZE,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
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
      shadowOpacity: 0,
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