import { StyleSheet, View } from 'react-native';

type MoreVerticalIconProps = {
  color?: string;
  size?: number;
};

export function MoreVerticalIcon({ color = '#222220', size = 16 }: MoreVerticalIconProps) {
  const dotSize = Math.max(3, Math.round(size * 0.22));

  return (
    <View style={[styles.root, { height: size, width: size }]}>
      <View style={[styles.dot, { backgroundColor: color, height: dotSize, width: dotSize }]} />
      <View style={[styles.dot, { backgroundColor: color, height: dotSize, width: dotSize }]} />
      <View style={[styles.dot, { backgroundColor: color, height: dotSize, width: dotSize }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  dot: {
    borderRadius: 999,
  },
});
