import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radii, spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { useThemeStore } from '../state/theme-store';
import { ThemeSelector } from './theme-selector';

type AppSidebarProps = {
  onClose: () => void;
  visible: boolean;
};

export function AppSidebar({ onClose, visible }: AppSidebarProps) {
  const theme = useAppTheme();
  const mode = useThemeStore((state) => state.mode);
  const styles = useMemo(() => createStyles(theme.ui, theme.uiSpacing), [theme]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <SafeAreaView edges={[ 'top', 'bottom' ]} style={styles.panelWrap}>
          <View style={styles.panel}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.kicker}>SIDEBAR</Text>
                <Text style={styles.title}>Theme Control</Text>
              </View>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Text style={styles.closeLabel}>CLOSE</Text>
              </Pressable>
            </View>

            <Text style={styles.copy}>Palette values live in one place, semantic slots point at those palette colors, and the UI reads only the semantic layer.</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CURRENT MODE</Text>
              <Text style={styles.modeValue}>{mode.toUpperCase()}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>APPEARANCE</Text>
              <ThemeSelector showToggleAction />
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Quick Rule</Text>
              <Text style={styles.noteCopy}>Change the palette hex values in the theme file, not component props. Add new semantic slots when a new UI pattern needs its own surface behavior.</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], intervals: ReturnType<typeof useAppTheme>['uiSpacing']) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: colors.overlayScrim,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.buttonMuted,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 2,
      justifyContent: 'center',
      minHeight: 40,
      minWidth: 78,
      paddingHorizontal: intervals.buttonPaddingHorizontal,
    },
    closeLabel: {
      color: colors.textPrimary,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    copy: {
      color: colors.textSecondary,
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 21,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    kicker: {
      color: colors.textSecondary,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: intervals.chipGap,
    },
    modeValue: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
    },
    noteBox: {
      backgroundColor: colors.surfaceAccent,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 2,
      gap: intervals.chipGap,
      padding: intervals.cardPadding,
    },
    noteCopy: {
      color: colors.textSecondary,
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 21,
    },
    noteTitle: {
      color: colors.textPrimary,
      fontSize: typeScale.button,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    panel: {
      backgroundColor: colors.sidebarBackground,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 2,
      gap: intervals.stackGap,
      marginLeft: 'auto',
      minHeight: '100%',
      padding: intervals.menuPanelPadding,
      width: '82%',
    },
    panelWrap: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: intervals.sectionGap,
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    root: {
      flex: 1,
    },
    section: {
      gap: intervals.sectionGap,
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: typeScale.caption,
      fontWeight: '900',
      letterSpacing: 1,
    },
    title: {
      color: colors.textPrimary,
      fontSize: typeScale.hero,
      fontWeight: '900',
      lineHeight: 34,
    },
  });
}