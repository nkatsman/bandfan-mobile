import { ImageBackground, Platform, StyleSheet, View } from 'react-native';

type HandPreference = 'left' | 'right';

const OVERLAY_IMAGE = require('../../assets/Debug/overlay.png');

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

export function ThumbZoneDebugOverlayStatic({ hand, opacity = 0.3 }: ThumbZoneDebugOverlayProps) {
  const overlaySource = Platform.OS === 'web'
    ? { uri: '/overlay-debug.png' }
    : OVERLAY_IMAGE;

  return (
    <View style={[styles.root, styles.pointerBoxNone]}>
      <View style={[styles.overlay, styles.pointerNone]}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
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
});
