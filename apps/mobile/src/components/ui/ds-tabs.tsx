import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DS } from '../../design/ds';
import { useAppTheme } from '../../design/theme';

type TabsOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type DsTabsProps = {
  onChange: (value: string) => void;
  options: TabsOption[];
  style?: StyleProp<ViewStyle>;
  value: string;
};

/**
 * Variant 1: connected square tabs.
 *
 * Adjacent buttons intentionally overlap by border width so seams collide into a
 * single stroke instead of rendering double-thick separators.
 */
export function DsTabs({ onChange, options, style, value }: DsTabsProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';

  return (
    <View style={[styles.row, style]}>
      {options.map((option, index) => {
        const active = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            disabled={option.disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.tab,
              index > 0 && styles.collideLeft,
              isDark && styles.tabDark,
              {
                backgroundColor: active ? DS.color.border : (isDark ? '#222220' : DS.color.background),
              },
              pressed && styles.pressed,
              option.disabled && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? (isDark ? '#6EA06E' : DS.color.cardSurface) : (isDark ? '#8F8F8F' : '#4A4A44'),
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 0,
    flexDirection: 'row',
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    borderColor: DS.stroke.color,
    borderRadius: 0,
    borderWidth: DS.stroke.fine,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  tabDark: {
    borderColor: '#474747',
  },
  // Collapse adjacent borders into one seam.
  collideLeft: {
    marginLeft: -DS.stroke.fine,
  },
  label: {
    fontFamily: DS.font.family,
    fontSize: DS.font.size.body,
    fontWeight: DS.font.weight.bold,
    letterSpacing: 0,
  },
  pressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
