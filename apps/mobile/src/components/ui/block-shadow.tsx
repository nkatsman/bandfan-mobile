import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

type BlockShadowProps = ViewProps & {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  shadowColor?: string;
  shadowOffset?: number;
  shadowRadius?: number;
  shadowVisible?: boolean;
  style?: StyleProp<ViewStyle>;
};

type BlockShadowPressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode | ((state: PressableStateCallbackType) => ReactNode);
  contentStyle?: StyleProp<ViewStyle>;
  pressedContentStyle?: StyleProp<ViewStyle>;
  shadowColor?: string;
  shadowOffset?: number;
  shadowRadius?: number;
  shadowVisible?: boolean;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function BlockShadow({ children, contentStyle, shadowColor = '#000000', shadowOffset = 4, shadowRadius = 0, shadowVisible = true, style, ...viewProps }: BlockShadowProps) {
  const reservedShadowSpace = shadowVisible ? { paddingBottom: shadowOffset, paddingRight: shadowOffset } : undefined;

  return (
    <View {...viewProps} style={[styles.root, reservedShadowSpace, style]}>
      {shadowVisible ? <View pointerEvents="none" style={[styles.shadow, { backgroundColor: shadowColor, borderRadius: shadowRadius, bottom: 0, left: shadowOffset, right: 0, top: shadowOffset }]} /> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

export function BlockShadowPressable({ children, contentStyle, disabled, pressedContentStyle, shadowColor = '#000000', shadowOffset = 4, shadowRadius = 0, shadowVisible = true, style, ...pressableProps }: BlockShadowPressableProps) {
  const reservedShadowSpace = shadowVisible ? { paddingBottom: shadowOffset, paddingRight: shadowOffset } : undefined;

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      style={(state) => [styles.root, reservedShadowSpace, typeof style === 'function' ? style(state) : style]}
    >
      {(state) => {
        const pressed = state.pressed && !disabled;
        const resolvedChildren = typeof children === 'function' ? children(state) : children;

        return (
          <>
            {shadowVisible && !pressed ? <View pointerEvents="none" style={[styles.shadow, { backgroundColor: shadowColor, borderRadius: shadowRadius, bottom: 0, left: shadowOffset, right: 0, top: shadowOffset }]} /> : null}
            <View style={[styles.content, contentStyle, pressed && pressedContentStyle]}>{resolvedChildren}</View>
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'relative',
  },
  root: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
  },
});
