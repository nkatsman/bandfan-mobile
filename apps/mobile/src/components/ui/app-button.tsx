import { cloneElement, isValidElement, useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { BlockShadowPressable } from './block-shadow';

const DESTRUCTIVE_TEXT_COLOR = '#FFFFFF';
const DARK_BUTTON_FILL = '#333333';
const DARK_BUTTON_TEXT_COLOR = '#FFFFFF';
const DARK_BUTTON_BORDER = '#1A1A19';

type AppButtonTone = 'primary' | 'secondary' | 'danger';

type AppButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
  label: string;
  onPress: () => void;
  square?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: AppButtonTone;
};

export function AppButton({ active = false, disabled = false, icon, iconOnly = false, label, onPress, square = false, style, tone = 'primary' }: AppButtonProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme.ui, theme.mode), [theme]);
  const labelStyle = tone === 'danger' ? styles.dangerLabel : theme.mode === 'dark' ? styles.darkLabel : styles.label;
  const iconColor = tone === 'danger' ? DESTRUCTIVE_TEXT_COLOR : theme.mode === 'dark' ? DARK_BUTTON_TEXT_COLOR : theme.ui.textPrimary;
  const renderedIcon = isValidElement<{ color?: string }>(icon) ? cloneElement(icon, { color: iconColor }) : icon;

  return (
    <BlockShadowPressable
      accessibilityLabel={iconOnly ? label : undefined}
      accessibilityRole="button"
      contentStyle={[styles.button, square && styles.square, styles[tone], active && !disabled && styles.pressedActive, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      pressedContentStyle={styles.pressed}
      shadowOffset={4}
      shadowVisible={!active && !disabled}
      style={style}
    >
      {renderedIcon}
      {iconOnly ? null : <Text style={labelStyle}>{label}</Text>}
    </BlockShadowPressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], mode: ReturnType<typeof useAppTheme>['mode']) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      borderColor: mode === 'dark' ? DARK_BUTTON_BORDER : colors.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: spacing.md,
    },
    danger: {
      backgroundColor: colors.buttonDanger,
    },
    dangerLabel: {
      color: DESTRUCTIVE_TEXT_COLOR,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.button,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    darkLabel: {
      color: DARK_BUTTON_TEXT_COLOR,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.button,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    disabled: {
      opacity: 0.45,
    },
    label: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.button,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    pressedActive: {
      transform: [{ translateX: 4 }, { translateY: 4 }],
    },
    primary: {
      backgroundColor: mode === 'dark' ? DARK_BUTTON_FILL : colors.buttonPrimary,
    },
    secondary: {
      backgroundColor: mode === 'dark' ? DARK_BUTTON_FILL : colors.buttonSecondary,
    },
    square: {
      height: 56,
      minHeight: 56,
      paddingHorizontal: 0,
      width: 56,
    },
  });
}