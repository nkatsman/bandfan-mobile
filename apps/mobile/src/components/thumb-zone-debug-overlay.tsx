import { ImageBackground, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';

type HandPreference = 'left' | 'right';

const OVERLAY_IMAGE = require('../../assets/Debug/overlay.png');
const DEBUG_OVERLAY_Z_INDEX = 2147483000;

/**
 * Global debug overlay for thumb reach zones.
 *
 * Uses a static overlay image:
 * - right hand: original image
 * - left hand: mirrored horizontally
 */
export function ThumbZoneDebugOverlay() {
  return <ThumbZoneDebugOverlayStatic hand="right" opacity={0.3} />;
}

type ThumbZoneDebugOverlayProps = {
  hand: HandPreference;
  opacity?: number;
};

type ColorOverlaySide = 'left' | 'right';
const COLOR_DEBUG_CELL_SIZE = 24;

function formatColorValue(value: string) {
  const trimmed = value.trim();

  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

export function ThumbZoneDebugOverlayStatic({ hand, opacity = 0.3 }: ThumbZoneDebugOverlayProps) {
  const insets = useSafeAreaInsets();
  const overlaySource = Platform.OS === 'web'
    ? { uri: '/overlay-debug.png' }
    : OVERLAY_IMAGE;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View pointerEvents="none" style={styles.overlay}>
        <ImageBackground
          resizeMode="stretch"
          source={overlaySource}
          style={styles.overlayImageFrame}
          imageStyle={[
            styles.overlayImage,
            hand === 'left' && styles.overlayImageMirrored,
            { opacity },
          ]}
        />
        <View style={[styles.safeTopGuide, { top: insets.top }]} />
      </View>
    </View>
  );
}

export function ThemeColorDebugOverlayStatic({ side }: { side: ColorOverlaySide }) {
  const theme = useAppTheme();
  const entries = [
    ...Object.entries(theme.palette).map(([name, value]) => ({ name: `palette.${name}`, value })),
    ...Object.entries(theme.ui).filter(([, value]) => typeof value === 'string').map(([name, value]) => ({ name: `ui.${name}`, value: value as string })),
  ];
  const isLeft = side === 'left';

  return (
    <View pointerEvents="box-none" style={styles.colorRoot}>
      <ScrollView
        pointerEvents="auto"
        contentContainerStyle={[styles.colorColumnContent, !isLeft && styles.colorColumnContentRight]}
        showsVerticalScrollIndicator={false}
        style={[styles.colorColumn, isLeft ? styles.colorColumnLeft : styles.colorColumnRight]}
      >
        {entries.map((entry) => (
          <View key={`${entry.name}-${entry.value}`} style={[styles.colorRow, !isLeft && styles.colorRowRight]}>
            <View style={[styles.colorSwatch, { backgroundColor: entry.value }]} />
            <Text numberOfLines={2} style={[styles.colorLabel, { backgroundColor: theme.ui.appBackground, color: theme.ui.textPrimary }]}>{`${entry.name}\n${formatColorValue(entry.value)}`}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: DEBUG_OVERLAY_Z_INDEX,
  },
  pointerBoxNone: {
    pointerEvents: 'box-none',
  },
  pointerAuto: {
    pointerEvents: 'auto',
  },
  pointerNone: {
    pointerEvents: 'none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayImageFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayImage: {
    height: '100%',
    width: '100%',
  },
  overlayImageMirrored: {
    transform: [{ scaleX: -1 }],
  },
  safeTopGuide: {
    borderColor: '#000000',
    borderStyle: 'dashed',
    borderTopWidth: 1,
    left: 0,
    opacity: 0.75,
    position: 'absolute',
    right: 0,
  },
  colorRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: DEBUG_OVERLAY_Z_INDEX,
  },
  colorColumn: {
    bottom: 12,
    maxWidth: '82%',
    position: 'absolute',
    top: 72,
  },
  colorColumnContent: {
    alignItems: 'flex-start',
  },
  colorColumnContentRight: {
    alignItems: 'flex-end',
  },
  colorColumnLeft: {
    left: 0,
  },
  colorColumnRight: {
    right: 0,
  },
  colorRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  colorRowRight: {
    flexDirection: 'row-reverse',
  },
  colorSwatch: {
    borderColor: '#000000',
    borderWidth: 1,
    height: COLOR_DEBUG_CELL_SIZE,
    width: COLOR_DEBUG_CELL_SIZE,
  },
  colorLabel: {
    borderColor: '#000000',
    borderWidth: 1,
    fontFamily: 'IBMPlexMono',
    fontSize: 8,
    fontWeight: '900',
    height: COLOR_DEBUG_CELL_SIZE,
    lineHeight: 10,
    maxWidth: 190,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
});
