import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import SortAscIcon from '../../../assets/Icons/sort-asc.svg';
import SortDescIcon from '../../../assets/Icons/sort-desc.svg';
import { DS } from '../../design/ds';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import type { SongTableFilterMode, SongTableSortMode } from '../song-table';
import { BlockShadowPressable } from '../ui/block-shadow';
import { PopupMenu, PopupMenuItem } from '../ui/popup-menu';

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
const DARK_CONTROL_BORDER = '#1A1A19';
const DARK_SEARCH_INPUT_FILL = '#1A1A19';
const DARK_CONTROL_TEXT = '#FFFFFF';
const DARK_CONTROL_ICON = '#6EA06E';
const LIGHT_CONTROL_ICON = '#4C79AE';
const LIGHT_SEARCH_PLACEHOLDER = '#5F5F5A';
const SEARCH_FILTER_SORT_Z_INDEX = 4000;
const THREE_DOT_MENU_Z_INDEX = 3000;

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

function FilterIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke={color} strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

function FocusIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={12} r={3} fill={color} />
      <Path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" stroke={color} strokeLinecap="square" strokeWidth={2} />
    </Svg>
  );
}

function CheckDoubleIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M3 12l4 4L15 8" stroke={color} strokeLinecap="square" strokeLinejoin="round" strokeWidth={2} />
      <Path d="M11 15l2 2 8-9" stroke={color} strokeLinecap="square" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

function ToolsIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M14 6l4 4M5 19l7-7M13 5l6 6-2 2-6-6 2-2Z" stroke={color} strokeLinecap="square" strokeLinejoin="round" strokeWidth={2} />
      <Path d="M7 8a4 4 0 0 1 5-5L9 6l2 2 3-3a4 4 0 0 1-5 5l-5 5-2-2 5-5Z" stroke={color} strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

function LightbulbIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M9 18h6M10 22h4" stroke={color} strokeLinecap="square" strokeWidth={2} />
      <Path d="M8 13a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3Z" stroke={color} strokeLinejoin="round" strokeWidth={2} />
      <Line stroke={color} strokeLinecap="square" strokeWidth={2} x1={12} x2={12} y1={1} y2={3} />
    </Svg>
  );
}

function getFilterIcon(mode: SongTableFilterMode, color: string) {
  if (mode === 'released') {
    return <CheckDoubleIcon color={color} />;
  }

  if (mode === 'in-progress') {
    return <ToolsIcon color={color} />;
  }

  if (mode === 'demo') {
    return <LightbulbIcon color={color} />;
  }

  return <FilterIcon color={color} />;
}

function getSortIcon(mode: SongTableSortMode, color: string) {
  if (mode === 'best-new') {
    return <FocusIcon color={color} />;
  }

  const SortIcon = getSortDirection(mode) === 'asc' ? SortAscIcon : SortDescIcon;
  return <SortIcon color={color} height={16} width={16} />;
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

function getNextFilterMode(currentMode: SongTableFilterMode) {
  const currentIndex = FILTER_OPTIONS.indexOf(currentMode);
  return FILTER_OPTIONS[(currentIndex + 1) % FILTER_OPTIONS.length] ?? 'all';
}

function getNextSortMode(currentMode: SongTableSortMode, availableSortModes: SongTableSortMode[]) {
  const currentBase = getSortBase(currentMode);
  const currentIndex = availableSortModes.findIndex((option) => getSortBase(option) === currentBase);
  const nextOption = availableSortModes[(currentIndex + 1) % availableSortModes.length] ?? availableSortModes[0] ?? 'best-new';

  return toggleSortMode(currentMode, nextOption);
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

  const iconColor = isDark ? DARK_CONTROL_ICON : LIGHT_CONTROL_ICON;

  return (
    <View style={styles.controlsRow}>
      {openMenu ? <Pressable accessibilityLabel="Close controls menu" accessibilityRole="button" onPress={() => setOpenMenu(null)} style={styles.dismissLayer} /> : null}
      <View style={[styles.searchShell, isDark && styles.searchShellDark]}>
        <TextInput
          onChangeText={onSearchChange}
          placeholder="Search"
          placeholderTextColor={isDark ? DARK_CONTROL_TEXT : LIGHT_SEARCH_PLACEHOLDER}
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          value={searchQuery}
        />
      </View>
      <View style={styles.controlGroup}>
        <ControlDockButton icon={getFilterIcon(filterMode, iconColor)} label={getFilterLabel(filterMode)} onLongPress={() => setOpenMenu((current) => (current === 'filter' ? null : 'filter'))} onPress={() => setOpenMenu((current) => (current === 'filter' ? null : 'filter'))} styles={styles} />
        {openMenu === 'filter' ? (
          <PopupMenu style={styles.dropdownMenuShadow}>
            {FILTER_OPTIONS.map((option) => (
              <DropdownOption active={option === filterMode} icon={getFilterIcon(option, iconColor)} key={option} label={getFilterLabel(option)} onPress={() => selectFilter(option)} styles={styles} />
            ))}
          </PopupMenu>
        ) : null}
      </View>
      <View style={styles.controlGroup}>
        <ControlDockButton icon={getSortIcon(sortMode, iconColor)} label={getSortLabel(sortMode)} onLongPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))} onPress={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))} styles={styles} wide />
        {openMenu === 'sort' ? (
          <PopupMenu style={[styles.dropdownMenuShadow, styles.sortDropdownMenu]}>
            {availableSortModes.map((option) => {
              const active = getSortBase(option) === getSortBase(sortMode);
              const optionDirection = active ? getSortDirection(sortMode) : getSortDirection(option);
              const optionIconMode = optionDirection ? (`${getSortBase(option)}-${optionDirection}` as SongTableSortMode) : option;

              return (
                <DropdownOption
                  active={active}
                  icon={getSortIcon(optionIconMode, iconColor)}
                  key={option}
                  label={getSortLabel(option)}
                  onPress={() => selectSort(option)}
                  styles={styles}
                />
              );
            })}
          </PopupMenu>
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
  return <PopupMenuItem active={active} icon={icon} label={label} onPress={onPress} />;
}

function ControlDockButton({
  icon,
  label,
  onLongPress,
  onPress,
  styles,
  wide = false,
}: {
  icon?: ReactNode | null;
  label: string;
  onLongPress?: () => void;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  wide?: boolean;
}) {
  const longPressTriggeredRef = useRef(false);

  return (
    <BlockShadowPressable
      accessibilityRole="button"
      contentStyle={styles.controlButton}
      delayLongPress={260}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onLongPress?.();
      }}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }

        onPress();
      }}
      pressedContentStyle={styles.pressed}
      shadowOffset={DS.shadow.fine.x}
      style={wide && styles.sortButton}
    >
      {icon}
      <Text numberOfLines={1} style={styles.controlButtonLabel}>{label}</Text>
    </BlockShadowPressable>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['ui'],
  mode: ReturnType<typeof useAppTheme>['mode'],
) {
  return StyleSheet.create({
    controlsRow: {
      alignItems: 'center',
      backgroundColor: mode === 'dark' ? colors.appBackground : DS.color.background,
      borderTopColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
      borderTopWidth: DS.stroke.fine,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
      position: 'relative',
      zIndex: SEARCH_FILTER_SORT_Z_INDEX,
    },
    searchShell: {
      backgroundColor: colors.surfaceCard,
      borderColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
      borderWidth: DS.stroke.fine,
      flex: 1,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
    },
    searchShellDark: {
      backgroundColor: mode === 'dark' ? DARK_SEARCH_INPUT_FILL : colors.surfaceCard,
      borderColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
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
      color: DARK_CONTROL_TEXT,
    },
    controlButton: {
      alignItems: 'center',
      backgroundColor: mode === 'dark' ? colors.buttonPrimary : colors.surfaceCard,
      borderColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
      borderWidth: DS.stroke.fine,
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'center',
      minHeight: 40,
      minWidth: 84,
      paddingHorizontal: spacing.sm,
    },
    controlGroup: {
      position: 'relative',
      zIndex: 5,
    },
    controlButtonLabel: {
      color: mode === 'dark' ? DARK_CONTROL_TEXT : colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      fontWeight: DS.font.weight.bold,
    },
    dismissLayer: {
      bottom: -1000,
      left: -1000,
      position: 'absolute',
      right: -1000,
      top: -1000,
      zIndex: 4,
    },
    dropdownMenu: {
      backgroundColor: mode === 'dark' ? colors.buttonPrimary : colors.surfaceCard,
      borderColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
      borderWidth: DS.stroke.fine,
    },
    dropdownMenuShadow: {
      bottom: 48,
      minWidth: 148,
      position: 'absolute',
      right: 0,
      zIndex: THREE_DOT_MENU_Z_INDEX,
    },
    dropdownOption: {
      alignItems: 'center',
      borderBottomColor: mode === 'dark' ? DARK_CONTROL_BORDER : colors.borderStrong,
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
      color: mode === 'dark' ? DARK_CONTROL_TEXT : colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.caption,
      flex: 1,
      fontWeight: DS.font.weight.bold,
    },
    dropdownOptionLabelActive: {
      color: mode === 'dark' ? DARK_CONTROL_TEXT : colors.textPrimary,
    },
    sortButton: {
      minWidth: 108,
    },
    sortDropdownMenu: {
      minWidth: 164,
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
  });
}

