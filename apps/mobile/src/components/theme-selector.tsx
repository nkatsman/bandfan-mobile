import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ContrastIcon from '../../assets/Icons/contrast-2-fill.svg';
import SunIcon from '../../assets/Icons/sun-line.svg';
import { useAppTheme } from '../design/theme';
import { ThemeMode, useThemeStore } from '../state/theme-store';
import { spacing, typeScale } from '../design/tokens';
import { AppButton } from './ui/app-button';

type ThemeSelectorProps = {
  showToggleAction?: boolean;
};

const modes: ThemeMode[] = ['light', 'dark'];
const LIGHT_BUTTON_FILL = '#E7BF7B';
const LIGHT_BUTTON_BORDER = '#222222';
const LIGHT_BUTTON_TEXT = '#222222';
const DARK_BUTTON_FILL = '#333333';
const DARK_BUTTON_BORDER = '#1A1A19';
const DARK_BUTTON_TEXT = '#FFFFFF';

export function ThemeSelector({ showToggleAction = false }: ThemeSelectorProps) {
  const theme = useAppTheme();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const styles = useMemo(() => createStyles(theme.uiSpacing), [theme]);

  return (
    <View style={styles.group}>
      <View style={styles.row}>
        {modes.map((themeMode) => {
          const active = themeMode === mode;
          const previewIconColor = themeMode === 'light' ? LIGHT_BUTTON_TEXT : DARK_BUTTON_TEXT;
          const icon = themeMode === 'light'
            ? <SunIcon color={previewIconColor} height={18} width={18} />
            : <ContrastIcon color={previewIconColor} height={18} width={18} />;

          return (
            <Pressable
              accessibilityRole="button"
              key={themeMode}
              onPress={() => setMode(themeMode)}
              style={({ pressed }) => [
                styles.option,
                themeMode === 'light' ? styles.lightOption : styles.darkOption,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              {icon}
              <Text style={[styles.optionLabel, themeMode === 'light' ? styles.lightOptionLabel : styles.darkOptionLabel]}>{themeMode.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      {showToggleAction ? (
        <AppButton label="TOGGLE QUICK SWITCH" onPress={toggleMode} tone="secondary" />
      ) : null}
    </View>
  );
}

function createStyles(intervals: ReturnType<typeof useAppTheme>['uiSpacing']) {
  return StyleSheet.create({
    group: {
      gap: intervals.sectionGap,
    },
    option: {
      alignItems: 'center',
      borderWidth: 2,
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: spacing.md,
      boxShadow: '4px 4px 0px #000000',
    },
    lightOption: {
      backgroundColor: LIGHT_BUTTON_FILL,
      borderColor: LIGHT_BUTTON_BORDER,
    },
    darkOption: {
      backgroundColor: DARK_BUTTON_FILL,
      borderColor: DARK_BUTTON_BORDER,
    },
    optionActive: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    optionLabel: {
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.button,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    lightOptionLabel: {
      color: LIGHT_BUTTON_TEXT,
    },
    darkOptionLabel: {
      color: DARK_BUTTON_TEXT,
    },
    pressed: {
      boxShadow: [],
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    row: {
      flexDirection: 'row',
      gap: intervals.inlineGap,
    },
  });
}
