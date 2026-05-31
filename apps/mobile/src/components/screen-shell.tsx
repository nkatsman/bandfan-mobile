import { PropsWithChildren, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoDark from '../../assets/BandFan/BandFan - Logo Dark.svg';
import LogoLight from '../../assets/BandFan/BandFan - Logo Light.svg';
import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { useThemeStore } from '../state/theme-store';
import { AppSidebar } from './app-sidebar';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footerInset?: number;
  logoPress?: 'none' | 'toggle-theme';
}>;

export function ScreenShell({ children, footerInset = 196, logoPress = 'none', subtitle, title }: ScreenShellProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const theme = useAppTheme();
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const styles = useMemo(() => createStyles(theme.ui, theme.uiSpacing), [theme]);
  const BrandLogo = theme.mode === 'dark' ? LogoDark : LogoLight;

  const handleLogoPress = () => {
    if (logoPress === 'toggle-theme') {
      toggleMode();
    }
  };

  return (
    <SafeAreaView edges={[ 'top' ]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: footerInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.chromeRow}>
          <Pressable disabled={logoPress === 'none'} onPress={handleLogoPress} style={({ pressed }) => [styles.logoButton, logoPress === 'toggle-theme' && styles.logoButtonInteractive, pressed && styles.buttonPressed]}>
            <BrandLogo height={32} style={styles.logoGraphic} width={172} />
          </Pressable>
          <Pressable onPress={() => setSidebarVisible(true)} style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}>
            <Text style={styles.menuLabel}>MENU</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
      <AppSidebar onClose={() => setSidebarVisible(false)} visible={sidebarVisible} />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], intervals: ReturnType<typeof useAppTheme>['uiSpacing']) {
  return StyleSheet.create({
    buttonPressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    chromeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 72,
    },
    content: {
      gap: intervals.stackGap,
      paddingHorizontal: intervals.screenIndent,
      paddingTop: intervals.contentInsetVertical,
    },
    header: {
      gap: intervals.chipGap,
      marginTop: 2,
    },
    logoButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 3,
      justifyContent: 'center',
      minHeight: 58,
      minWidth: 212,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    logoButtonInteractive: {
      backgroundColor: colors.surfaceAccent,
    },
    logoGraphic: {
      flexShrink: 1,
    },
    menuButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceGrouped,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 3,
      justifyContent: 'center',
      minHeight: 58,
      minWidth: 94,
      paddingHorizontal: intervals.buttonPaddingHorizontal,
    },
    menuLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    safeArea: {
      backgroundColor: colors.appBackground,
      flex: 1,
    },
    subtitle: {
      color: colors.textSecondary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.fine,
      fontWeight: '700',
      lineHeight: 21,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
  });
}
