import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import ContrastIcon from '../../assets/Icons/contrast-2-fill.svg';
import SunIcon from '../../assets/Icons/sun-line.svg';
import { useAppTheme } from '../design/theme';
import { ThemeMode, useThemeStore } from '../state/theme-store';
import { AppButton } from './ui/app-button';

type ThemeSelectorProps = {
  showToggleAction?: boolean;
};

const modes: ThemeMode[] = ['light', 'dark'];

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
          const icon = themeMode === 'light'
            ? <SunIcon color={theme.ui.textPrimary} height={18} width={18} />
            : <ContrastIcon color={theme.ui.textPrimary} height={18} width={18} />;

          return (
            <AppButton active={active} key={themeMode} icon={icon} label={themeMode.toUpperCase()} onPress={() => setMode(themeMode)} style={styles.option} tone={active ? 'primary' : 'secondary'} />
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
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      gap: intervals.inlineGap,
    },
  });
}
