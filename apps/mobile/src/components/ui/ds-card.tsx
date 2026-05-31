/**
 * DsCard — hard-edged card with an offset block shadow.
 *
 * Shadow is a solid black rectangle offset (x, y) behind the card face.
 * The outer wrapper is exactly `(width + shadowX) × (fixedHeight + shadowY)`
 * so that `alignSelf: 'center'` centres the full visual element (card face
 * + shadow together), matching the Figma intent.
 *
 * For cards whose height depends on content (e.g. form cards), omit
 * `fixedHeight`; the shadow then tracks the card face via absolute anchoring.
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { DS, type DsShadowSize } from '../../design/ds';
import { useAppTheme } from '../../design/theme';

type DsCardProps = {
  children?: ReactNode;
  /** Exact pixel height of the card face.  Omit for content-driven height. */
  fixedHeight?: number;
  /** Which shadow preset to use.  Defaults to 'thin' (6 px). */
  shadowSize?: DsShadowSize;
  /** Extra styles applied to the outer wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Exact pixel width of the card face (required for correct centering). */
  width: number;
};

export function DsCard({ children, fixedHeight, shadowSize = 'thin', style, width }: DsCardProps) {
  const theme = useAppTheme();
  const isDark = theme.mode === 'dark';
  const sh = DS.shadow[shadowSize];
  const isFixed = fixedHeight !== undefined;

  return (
    <View
      style={[
        {
          alignSelf: 'center',
          // Outer wrapper = card face + shadow offset so alignSelf:'center' centres
          // the full visual element, not just the card face.
          width: width + sh.x,
          // Fixed cards: wrapper height = face + shadow so nothing clips.
          // Auto cards: wrapper height = face height (shadow extends below via marginBottom).
          height: isFixed ? fixedHeight + sh.y : undefined,
          marginBottom: isFixed ? 0 : sh.y,
        },
        style,
      ]}
    >
      {/* ── Block shadow ─────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          backgroundColor: DS.shadow.color,
          top: sh.y,
          left: sh.x,
          // Fixed: explicit dimensions matching card face.
          // Auto: right:0 aligns shadow's right edge with wrapper's right
          //       (which equals cardW since wrapper = cardW + sh.x and left = sh.x),
          //       bottom:-sh.y extends the shadow sh.y px below the wrapper.
          width: isFixed ? width : undefined,
          right: isFixed ? undefined : 0,
          height: isFixed ? fixedHeight : undefined,
          bottom: isFixed ? undefined : -sh.y,
        }}
      />

      {/* ── Card face ────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: isDark ? '#333333' : DS.color.cardSurface,
          borderColor: isDark ? '#474747' : DS.stroke.color,
          borderWidth: DS.stroke.thick,
          width,
          height: fixedHeight,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}
