/**
 * DsInput — labeled input field following BandFan DS conventions.
 *
 * Label:       bold uppercase, DS body size (16px), ink colour
 * Placeholder: bold, DS body size, progressFill colour (#E7BF7B)
 * Typed text:  regular, DS body size, ink colour
 * Background:  DS background (#FFF9EF)
 * Border:      DS fine stroke (2px, #222222)
 * Gap below label: DS.layout.fieldLabelGap (7px)
 */

import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { DS } from '../../design/ds';
import { useAppTheme } from '../../design/theme';

type DsInputProps = TextInputProps & {
  /** Label text — displayed uppercase above the field */
  label: string;
  /** Extra bottom margin below the entire block (label + input).  Defaults to 0. */
  stackGap?: number;
};

export function DsInput({ label, stackGap = 0, style, ...inputProps }: DsInputProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';
  const placeholderTextColor = inputProps.placeholderTextColor ?? (isDark ? '#6EA06E' : '#8F8F8F');

  return (
    <View style={[styles.wrap, stackGap ? { marginBottom: stackGap } : undefined]}>
      <Text style={[styles.label, isDark && styles.labelDark]}>{label.toUpperCase()}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={placeholderTextColor}
        {...inputProps}
        style={[styles.input, isDark && styles.inputDark, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},

  label: {
    color: '#8F8F8F',
    fontFamily: DS.font.family,
    fontSize: DS.font.size.body,
    fontWeight: DS.font.weight.bold,
    marginBottom: DS.layout.fieldLabelGap,
  },
  labelDark: {
    color: '#8F8F8F',
  },

  input: {
    backgroundColor: DS.color.background,
    borderColor: DS.stroke.color,
    borderRadius: 0,
    borderWidth: DS.stroke.fine,
    color: DS.color.ink,
    fontFamily: DS.font.family,
    fontSize: DS.font.size.body,
    fontWeight: DS.font.weight.bold,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputDark: {
    backgroundColor: '#222222',
    borderColor: '#1A1A19',
    color: '#6EA06E',
  },
});
