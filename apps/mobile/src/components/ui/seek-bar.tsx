import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { radii } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';

type SeekBarProps = {
  interactive?: boolean;
  layoutMemoryKey?: string;
  value?: number | null;
  onSeekChange?: (value: number) => void;
  onSeek?: (value: number) => void;
};

const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222222';
const rememberedTrackWidths = new Map<string, number>();

export function SeekBar({ interactive = true, layoutMemoryKey, onSeek, onSeekChange, value = 0 }: SeekBarProps) {
  const theme = useAppTheme();
  const clampedValue = useMemo(() => Math.max(0, Math.min(100, value ?? 0)), [value]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(() => (layoutMemoryKey ? rememberedTrackWidths.get(layoutMemoryKey) ?? 0 : 0));
  const trackLeftRef = useRef(0);
  const trackWidthRef = useRef(trackWidth);
  const shellRef = useRef<View | null>(null);

  const displayedValue = isDragging && dragValue !== null ? dragValue : clampedValue;
  const thumbSize = isDragging ? 24 : 20;
  const baseRadius = radii.sm;
  const thumbRadiusScale = thumbSize / 16;
  const thumbRadius = Math.min(baseRadius * thumbRadiusScale, thumbSize / 2);
  const thumbOffsetY = -(thumbSize / 2);
  const trackRadius = baseRadius;

  const thumbLeft = trackWidth > 0 ? (displayedValue / 100) * trackWidth : 0;

  function handleLayout(event: LayoutChangeEvent) {
    const nextTrackWidth = event.nativeEvent.layout.width;

    trackWidthRef.current = nextTrackWidth;
    setTrackWidth(nextTrackWidth);

    if (layoutMemoryKey && nextTrackWidth > 0) {
      rememberedTrackWidths.set(layoutMemoryKey, nextTrackWidth);
    }
  }

  function readValueFromPageX(pageX: number) {
    const measuredTrackWidth = trackWidthRef.current;

    if (measuredTrackWidth <= 0) {
      return clampedValue;
    }

    const rawX = pageX - trackLeftRef.current;
    const boundedX = Math.max(0, Math.min(measuredTrackWidth, rawX));

    return (boundedX / measuredTrackWidth) * 100;
  }

  function updateDragFromPageX(pageX: number, commit = false) {
    if (!Number.isFinite(pageX)) {
      return;
    }

    const nextValue = readValueFromPageX(pageX);
    setDragValue(nextValue);

    if (commit) {
      onSeek?.(nextValue);
    } else {
      onSeekChange?.(nextValue);
    }
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          setIsDragging(true);
          setDragValue(clampedValue);
          const grantPageX = event.nativeEvent?.pageX;

          shellRef.current?.measureInWindow((x, _y, width) => {
            trackLeftRef.current = x;

            if (width > 0) {
              trackWidthRef.current = width;
              setTrackWidth(width);
              if (layoutMemoryKey) {
                rememberedTrackWidths.set(layoutMemoryKey, width);
              }
            }

            if (typeof grantPageX === 'number') {
              updateDragFromPageX(grantPageX);
            }
          });
        },
        onPanResponderMove: (_event, gestureState) => {
          updateDragFromPageX(gestureState.moveX);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const releaseX = gestureState.moveX || gestureState.x0;
          updateDragFromPageX(releaseX, true);
          setDragValue(null);
          setIsDragging(false);
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const releaseX = gestureState.moveX || gestureState.x0;
          updateDragFromPageX(releaseX, true);
          setDragValue(null);
          setIsDragging(false);
        },
      }),
    [clampedValue, interactive, layoutMemoryKey, onSeek, onSeekChange, trackWidth],
  );

  return (
    <View
      ref={shellRef}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
      style={styles.shell}
    >
      <View
        style={[
          styles.trackShadow,
          {
            backgroundColor: '#000000',
            borderRadius: trackRadius,
            width: trackWidth,
          },
        ]}
      />
      <View style={[styles.track, { backgroundColor: theme.ui.progressTrack, borderRadius: trackRadius }]} />
      <View style={[styles.fill, { backgroundColor: theme.ui.progressFill, borderRadius: trackRadius, width: `${displayedValue}%` }]} />
      {interactive ? (
        <>
          <View
            style={[
              styles.thumbShadow,
              {
                backgroundColor: '#000000',
                borderRadius: thumbRadius,
                height: thumbSize,
                left: thumbLeft,
                marginLeft: -(thumbSize / 2) + 2,
                marginTop: thumbOffsetY + 2,
                top: '50%',
                width: thumbSize,
              },
            ]}
          />
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: LIGHT_PLAY_CONTROL_FILL,
                borderRadius: thumbRadius,
                height: thumbSize,
                left: thumbLeft,
                marginLeft: -(thumbSize / 2),
                marginTop: thumbOffsetY,
                top: '50%',
                width: thumbSize,
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 24,
    overflow: 'visible',
    position: 'relative',
    width: '100%',
  },
  trackShadow: {
    height: 6,
    left: 2,
    marginTop: -1,
    position: 'absolute',
    top: '50%',
  },
  track: {
    height: 6,
    left: 0,
    marginTop: -3,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  fill: {
    height: 6,
    left: 0,
    marginTop: -3,
    position: 'absolute',
    top: '50%',
  },
  thumb: {
    borderColor: LIGHT_PLAY_CONTROL_STROKE,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'absolute',
  },
  thumbShadow: {
    position: 'absolute',
  },
});
