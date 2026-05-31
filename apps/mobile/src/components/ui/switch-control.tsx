import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../design/theme';

type SwitchControlProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

export function SwitchControl({ checked, disabled = false, label, onCheckedChange }: SwitchControlProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={({ pressed }) => [styles.switchRoot, checked ? styles.switchOn : styles.switchOff, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={[styles.stateLabelSlot, checked ? styles.stateLabelSlotOn : styles.stateLabelSlotOff]}>
        <Text aria-hidden style={[styles.stateLabel, checked ? styles.stateLabelOn : styles.stateLabelOff]}>{checked ? 'ON' : 'OFF'}</Text>
      </View>
      <View style={[styles.thumb, checked ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const colors = theme.ui;
  const switchBorderColor = theme.mode === 'dark' ? theme.palette.black : colors.borderStrong;
  const switchTrackColor = theme.mode === 'dark' ? theme.palette.black : colors.appBackground;

  return StyleSheet.create({
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    switchRoot: {
      borderColor: switchBorderColor,
      borderWidth: 2,
      height: 38,
      flexShrink: 0,
      marginHorizontal: 2,
      marginVertical: 2,
      overflow: 'visible',
      position: 'relative',
      width: 76,
    },
    switchOff: {
      backgroundColor: switchTrackColor,
    },
    switchOn: {
      backgroundColor: switchTrackColor,
    },
    stateLabel: {
      fontFamily: 'IBMPlexMono',
      fontSize: 12,
      fontWeight: '600',
      height: 24,
      includeFontPadding: false,
      lineHeight: 24,
      textAlign: 'center',
    },
    stateLabelSlot: {
      alignItems: 'center',
      height: 34,
      justifyContent: 'center',
      position: 'absolute',
      zIndex: 0,
    },
    stateLabelSlotOff: {
      left: 37,
      width: 34,
    },
    stateLabelSlotOn: {
      left: 2,
      width: 30,
    },
    stateLabelOff: {
      color: colors.buttonDanger,
    },
    stateLabelOn: {
      color: colors.buttonVoteActive,
    },
    thumb: {
      backgroundColor: colors.surfaceCard,
      borderColor: switchBorderColor,
      borderWidth: 2,
      height: 38,
      position: 'absolute',
      top: '50%',
      transform: [{ translateY: -19 }],
      width: 38,
      zIndex: 1,
    },
    thumbOff: {
      left: -3,
    },
    thumbOn: {
      left: 39,
    },
  });
}