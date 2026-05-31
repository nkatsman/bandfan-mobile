import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { radii } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';

type SeekBarProps = {
  interactive?: boolean;
  value?: number | null;
  onSeekChange?: (value: number) => void;
  onSeek?: (value: number) => void;
};

const LIGHT_PLAY_CONTROL_FILL = '#FFFFFF';
const LIGHT_PLAY_CONTROL_STROKE = '#222222';

export function SeekBar({ interactive = true, onSeek, onSeekChange, value = 0 }: SeekBarProps) {
  const theme = useAppTheme();
  const clampedValue = useMemo(() => Math.max(0, Math.min(100, value ?? 0)), [value]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackLeftRef = useRef(0);

  const displayedValue = isDragging && dragValue !== null ? dragValue : clampedValue;
  const thumbSize = isDragging ? 24 : 20;
  const baseRadius = radii.sm;
  const thumbRadiusScale = thumbSize / 16;
  const thumbRadius = Math.min(baseRadius * thumbRadiusScale, thumbSize / 2);
  const thumbOffsetY = -(thumbSize / 2);
  const trackRadius = baseRadius;

  const thumbLeft = trackWidth > 0 ? (displayedValue / 100) * trackWidth : 0;

  function readValueFromPageX(pageX: number) {
    if (trackWidth <= 0) {
      return 0;
    }

    const rawX = pageX - trackLeftRef.current;
    const boundedX = Math.max(0, Math.min(trackWidth, rawX));

    return (boundedX / trackWidth) * 100;
  }

  function emitSeekChangeFromPageX(pageX: number) {
    const nextValue = readValueFromPageX(pageX);
    setDragValue(nextValue);
    onSeekChange?.(nextValue);
  }

  function emitSeekCommitFromPageX(pageX: number) {
    const nextValue = readValueFromPageX(pageX);
    setDragValue(nextValue);
    onSeek?.(nextValue);
  }

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderGrant: (event) => {
          trackLeftRef.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
          setIsDragging(true);
          emitSeekChangeFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderMove: (_event, gestureState) => {
          emitSeekChangeFromPageX(gestureState.moveX);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const releaseX = gestureState.moveX || gestureState.x0;
          emitSeekCommitFromPageX(releaseX);
          setDragValue(null);
          setIsDragging(false);
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const releaseX = gestureState.moveX || gestureState.x0;
          emitSeekCommitFromPageX(releaseX);
          setDragValue(null);
          setIsDragging(false);
        },
      }),
    [interactive, onSeek, onSeekChange, trackWidth],
  );

  return (
    <View
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
      <View style={[styles.track, { backgroundColor: theme.ui.progressTrack, borderRadius: trackRadius, shadowColor: '#000000' }]} />
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
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
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
    borderWidth: 0,
    boxShadow: `inset 0 0 0 2px ${LIGHT_PLAY_CONTROL_STROKE}`,
    overflow: 'hidden',
    position: 'absolute',
  },
  thumbShadow: {
    position: 'absolute',
  },
});
