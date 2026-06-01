import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { DS } from '../../design/ds';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { BlockShadow } from './block-shadow';

const POPUP_SHADOW_OFFSET = 4;
const POPUP_ROW_HEIGHT = 40;
const POPUP_ICON_SLOT = 22;

type PopupMenuProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  shadowOffset?: number;
  style?: StyleProp<ViewStyle>;
};

type PopupMenuItemProps = {
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onPress: () => void;
};

export function PopupMenu({ children, contentStyle, shadowOffset = POPUP_SHADOW_OFFSET, style }: PopupMenuProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';

  return (
    <BlockShadow
      contentStyle={[
        styles.menu,
        {
          backgroundColor: theme.ui.surfaceCard,
          borderColor: isDark ? '#1A1A19' : theme.ui.borderStrong,
        },
        contentStyle,
      ]}
      shadowOffset={shadowOffset}
      style={style}
    >
      {children}
    </BlockShadow>
  );
}

export function PopupMenuItem({ active = false, destructive = false, disabled = false, icon, label, labelStyle, onPress }: PopupMenuItemProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';
  const borderColor = isDark ? '#1A1A19' : theme.ui.borderStrong;
  const textColor = destructive ? theme.ui.buttonDanger : theme.ui.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { borderBottomColor: borderColor },
        active && { backgroundColor: theme.ui.buttonPrimary },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.iconSlot}>{icon}</View>
      <Text numberOfLines={1} style={[styles.label, { color: textColor }, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

export function PopupMenuEmpty({ children }: { children: ReactNode }) {
  const theme = useAppTheme();

  return <Text style={[styles.empty, { color: theme.ui.textSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55,
  },
  empty: {
    fontFamily: DS.font.family,
    fontSize: typeScale.small,
    fontWeight: '700',
    padding: spacing.sm,
    textAlign: 'left',
  },
  iconSlot: {
    alignItems: 'center',
    height: POPUP_ICON_SLOT,
    justifyContent: 'center',
    width: POPUP_ICON_SLOT,
  },
  item: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-start',
    minHeight: POPUP_ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
  },
  label: {
    flex: 1,
    fontFamily: DS.font.family,
    fontSize: typeScale.small,
    fontWeight: '700',
    minWidth: 0,
    textAlign: 'left',
  },
  menu: {
    borderWidth: 2,
  },
  pressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
