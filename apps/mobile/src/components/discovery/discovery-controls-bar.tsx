import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import SortAscIcon from '../../../assets/Icons/sort-asc.svg';
import SortDescIcon from '../../../assets/Icons/sort-desc.svg';
import { DS } from '../../design/ds';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import type { SongTableFilterMode, SongTableSortMode } from '../song-table';

type DiscoveryControlsBarProps = {
  availableSortModes?: SongTableSortMode[];
  filterMode: SongTableFilterMode;
  onFilterChange: (mode: SongTableFilterMode) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (mode: SongTableSortMode) => void;
  searchQuery: string;
  sortMode: SongTableSortMode;
};

const FILTER_OPTIONS: SongTableFilterMode[] = ['all', 'released', 'in-progress', 'demo'];
const DEFAULT_SORT_OPTIONS: SongTableSortMode[] = ['best-new', 'published-desc', 'plays-desc', 'votes-desc'];
const DARK_GREY_BUTTON_FILL = '#3A3A38';

function getFilterLabel(mode: SongTableFilterMode) {
  if (mode === 'released') {
    return 'Complete';
  }

  if (mode === 'in-progress') {
    return 'In progress';
  }

  if (mode === 'demo') {
    return 'Demo';
  }

  return 'All songs';
}

function getSortLabel(mode: SongTableSortMode) {
  if (mode === 'votes-desc' || mode === 'votes-asc') {
    return 'Votes';
  }

  if (mode === 'published-desc' || mode === 'published-asc') {
    return 'Published';
  }

  if (mode === 'plays-desc' || mode === 'plays-asc') {
    return 'Plays';
  }

  return 'New & Best';
}

function getSortBase(mode: SongTableSortMode) {
  return mode.replace(/-(asc|desc)$/, '');
}

function getSortDirection(mode: SongTableSortMode) {
  if (mode.endsWith('-asc')) {
    return 'asc';
  }

  if (mode.endsWith('-desc')) {
    return 'desc';
  }

  return null;
}

function toggleSortMode(currentMode: SongTableSortMode, selectedMode: SongTableSortMode): SongTableSortMode {
  if (!getSortDirection(selectedMode)) {
    return selectedMode;
  }

  if (getSortBase(currentMode) !== getSortBase(selectedMode)) {
    return `${getSortBase(selectedMode)}-desc` as SongTableSortMode;
  }

  return `${getSortBase(selectedMode)}-${getSortDirection(currentMode) === 'desc' ? 'asc' : 'desc'}` as SongTableSortMode;
}

export function DiscoveryControlsBar({
  availableSortModes = DEFAULT_SORT_OPTIONS,
  filterMode,
  onFilterChange,
  onSearchChange,
  onSortChange,
  searchQuery,
  sortMode,
}: DiscoveryControlsBarProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';
  const [openMenu, setOpenMenu] = useState<'filter' | 'sort' | null>(null);
  const styles = createStyles(theme.ui, theme.mode);

  function selectFilter(nextFilterMode: SongTableFilterMode) {
    setOpenMenu(null);
    onFilterChange(nextFilterMode);
  }

  function selectSort(nextSortMode: SongTableSortMode) {
    setOpenMenu(null);
    onSortChange(toggleSortMode(sortMode, nextSortMode));
  }

  const sortDirection = getSortDirection(sortMode);
  const SortButtonIcon = sortDirection === 'asc' ? SortAscIcon : sortDirection === 'desc' ? SortDescIcon : null;

  return (
    <View style={styles.controlsRow}>
      {openMenu ? <Pressable accessibilityLabel="Close controls menu" accessibilityRole="button" onPress={() => setOpenMenu(null)} style={styles.dismissLayer} /> : null}
      <View style={[styles.searchShell, isDark && styles.searchShellDark]}>
        <TextInput
          onChangeText={onSearchChange}
          placeholder="Search"
          placeholderTextColor={theme.palette.fog}
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          value={searchQuery}
        />
      </View>
      <View style={styles.controlGroup}>
        <ControlDockButton label={getFilterLabel(filterMode)} onPress={() => setOpenMenu((current) => (current === 'filter' ? null : 'filter'))} styles={styles} />
        {openMenu === 'filter' ? (
          <View style={styles.dropdownMenu}>
            {FILTER_OPTIONS.map((option) => (
              <DropdownOption active={option === filterMode} key={option} label={getFilterLabel(option)} onPress={() => selectFilter(option)} styles={styles} />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.controlGroup}>
        <ControlDockButton icon={SortButtonIcon ? <SortButtonIcon color={theme.ui.textPrimary} height={16} width={16} /> : null} label={getSortLabel(sortMode)} onPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))} styles={styles} wide />
        {openMenu === 'sort' ? (
          <View style={[styles.dropdownMenu, styles.sortDropdownMenu]}>
            {availableSortModes.map((option) => {
              const active = getSortBase(option) === getSortBase(sortMode);
              const optionDirection = active ? getSortDirection(sortMode) : getSortDirection(option);
              const OptionIcon = optionDirection === 'asc' ? SortAscIcon : optionDirection === 'desc' ? SortDescIcon : null;

              return (
                <DropdownOption
                  active={active}
                  icon={OptionIcon ? <OptionIcon color={theme.ui.textPrimary} height={16} width={16} /> : null}
                  key={option}
                  label={getSortLabel(option)}
                  onPress={() => selectSort(option)}
                  styles={styles}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DropdownOption({
  active,
  icon,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.dropdownOption, active && styles.dropdownOptionActive, pressed && styles.pressed]}>
      {icon ? <View style={styles.dropdownOptionIcon}>{icon}</View> : <View style={styles.dropdownOptionIcon} />}
      <Text numberOfLines={1} style={[styles.dropdownOptionLabel, active && styles.dropdownOptionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function ControlDockButton({
  icon,
  label,
  onPress,
  styles,
  wide = false,
}: {
  icon?: ReactNode | null;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  wide?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.controlButton, wide && styles.sortButton, pressed && styles.pressed]}>
      {icon}
      <Text numberOfLines={1} style={styles.controlButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['ui'],
  mode: ReturnType<typeof useAppTheme>['mode'],
) {
  return StyleSheet.create({
    controlsRow: {
      alignItems: 'center',
      backgroundColor: DS.color.background,
      borderTopColor: colors.borderStrong,
      borderTopWidth: DS.stroke.fine,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      position: 'relative',
    },
    searchShell: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: DS.stroke.fine,
      flex: 1,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
    },
    searchShellDark: {
      backgroundColor: mode === 'dark' ? '#FFFFFF' : colors.surfaceCard,
      borderColor: colors.borderStrong,
    },
    searchInput: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: DS.font.family,
      fontSize: typeScale.caption,
      fontWeight: DS.font.weight.bold,
      lineHeight: 16,
      paddingVertical: 0,
    },
    searchInputDark: {
      color: colors.textPrimary,
    },
    controlButton: {
      alignItems: 'center',
      backgroundColor: mode === 'dark' ? DARK_GREY_BUTTON_FILL : colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: DS.stroke.fine,
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'center',
      minHeight: 40,
      minWidth: 84,
      paddingHorizontal: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: DS.shadow.fine.x, height: DS.shadow.fine.y },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    controlGroup: {
      position: 'relative',
      zIndex: 5,
    },
    controlButtonLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      fontWeight: DS.font.weight.bold,
    },
    dismissLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: -220,
      zIndex: 4,
    },
    dropdownMenu: {
      backgroundColor: mode === 'dark' ? DARK_GREY_BUTTON_FILL : colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: DS.stroke.fine,
      bottom: 48,
      minWidth: 148,
      position: 'absolute',
      right: 0,
      shadowColor: '#000000',
      shadowOffset: { width: DS.shadow.fine.x, height: DS.shadow.fine.y },
      shadowOpacity: 1,
      shadowRadius: 0,
      zIndex: 20,
    },
    dropdownOption: {
      alignItems: 'center',
      borderBottomColor: colors.borderStrong,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 38,
      paddingHorizontal: spacing.sm,
    },
    dropdownOptionIcon: {
      alignItems: 'center',
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    dropdownOptionActive: {
      backgroundColor: colors.buttonPrimary,
    },
    dropdownOptionLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      flex: 1,
      fontWeight: DS.font.weight.bold,
    },
    dropdownOptionLabelActive: {
      color: colors.textPrimary,
    },
    sortButton: {
      minWidth: 108,
    },
    sortDropdownMenu: {
      minWidth: 164,
    },
    pressed: {
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}

