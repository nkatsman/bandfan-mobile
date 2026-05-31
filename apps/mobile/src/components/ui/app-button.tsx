import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';

const DESTRUCTIVE_TEXT_COLOR = '#FFFFFF';
const DARK_GREY_BUTTON_FILL = '#3A3A38';

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

  return (
    <Pressable
      accessibilityLabel={iconOnly ? label : undefined}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, square && styles.square, styles[tone], (active || pressed) && !disabled && styles.pressed, disabled && styles.disabled, style]}
    >
      {icon}
      {iconOnly ? null : <Text style={[styles.label, tone === 'danger' && styles.dangerLabel]}>{label}</Text>}
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], mode: ReturnType<typeof useAppTheme>['mode']) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      borderColor: colors.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    danger: {
      backgroundColor: colors.buttonDanger,
    },
    dangerLabel: {
      color: DESTRUCTIVE_TEXT_COLOR,
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
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    primary: {
      backgroundColor: colors.buttonPrimary,
    },
    secondary: {
      backgroundColor: mode === 'dark' ? DARK_GREY_BUTTON_FILL : colors.buttonSecondary,
    },
    square: {
      height: 56,
      minHeight: 56,
      paddingHorizontal: 0,
      width: 56,
    },
  });
}