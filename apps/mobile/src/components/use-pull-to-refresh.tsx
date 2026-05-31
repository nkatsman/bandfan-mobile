import { useEffect, useMemo, useRef, useState } from 'react';
import { type WheelEvent } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, PanResponder, Platform, RefreshControl, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../design/theme';

type PullToRefreshOptions = {
  enabled?: boolean;
  onRefresh: () => void;
  onScrollBeginDrag?: () => void;
  refreshing: boolean;
};

const WEB_PULL_START_THRESHOLD = 6;
const WEB_PULL_REFRESH_THRESHOLD = 42;
const WEB_REFRESH_AREA_HEIGHT = 56;
const WEB_WHEEL_PULL_THRESHOLD = -48;
const REFRESH_COOLDOWN_MS = 1000;

export function usePullToRefresh({ enabled = true, onRefresh, onScrollBeginDrag, refreshing }: PullToRefreshOptions) {
  const theme = useAppTheme();
  const enabledRef = useRef(enabled);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(refreshing);
  const lastRefreshAtRef = useRef(0);
  const scrollOffsetYRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  enabledRef.current = enabled;
  onRefreshRef.current = onRefresh;
  refreshingRef.current = refreshing;

  useEffect(() => {
    if (refreshing) {
      pullDistanceRef.current = WEB_REFRESH_AREA_HEIGHT;
      setPullDistance(WEB_REFRESH_AREA_HEIGHT);
      return;
    }

    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, [refreshing]);

  function setVisiblePullDistance(value: number) {
    const nextDistance = Math.min(WEB_REFRESH_AREA_HEIGHT, Math.max(0, value));
    pullDistanceRef.current = nextDistance;
    setPullDistance(nextDistance);
  }

  function triggerRefresh() {
    if (!enabledRef.current || refreshingRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) {
      return;
    }

    lastRefreshAtRef.current = now;
    setVisiblePullDistance(WEB_REFRESH_AREA_HEIGHT);
    onRefreshRef.current();
  }

  function shouldStartWebPull(gestureState: { dx: number; dy: number }) {
    return (
      enabledRef.current
      && !refreshingRef.current
      && scrollOffsetYRef.current <= 0
      && gestureState.dy > WEB_PULL_START_THRESHOLD
      && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
    );
  }

  const webPullResponder = useMemo(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) => shouldStartWebPull(gestureState),
      onMoveShouldSetPanResponderCapture: (_event, gestureState) => shouldStartWebPull(gestureState),
      onPanResponderMove: (_event, gestureState) => {
        setVisiblePullDistance(gestureState.dy * 0.72);
      },
      onPanResponderRelease: (_event, gestureState) => {
        if (gestureState.dy >= WEB_PULL_REFRESH_THRESHOLD || pullDistanceRef.current >= WEB_PULL_REFRESH_THRESHOLD) {
          triggerRefresh();
          return;
        }

        setVisiblePullDistance(0);
      },
      onPanResponderTerminate: () => {
        if (!refreshingRef.current) {
          setVisiblePullDistance(0);
        }
      },
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  }

  function handleWheel(event: WheelEvent) {
    if (Platform.OS === 'web' && scrollOffsetYRef.current <= 0 && event.deltaY <= WEB_WHEEL_PULL_THRESHOLD) {
      triggerRefresh();
    }
  }

  const refreshIndicator = enabled && pullDistance > 0 ? (
    <View style={[styles.refreshIndicator, { backgroundColor: theme.ui.appBackground, height: pullDistance }]}>
      <ActivityIndicator color={theme.ui.textPrimary} size="small" />
    </View>
  ) : null;

  return {
    ...webPullResponder?.panHandlers,
    onScroll: handleScroll,
    onScrollBeginDrag,
    onWheel: handleWheel,
    refreshControl: enabled ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} /> : undefined,
    refreshIndicator,
    scrollEventThrottle: 16,
  };
}

const styles = StyleSheet.create({
  refreshIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});