import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type PullToRefreshOptions = {
  enabled?: boolean;
  onRefresh: () => Promise<unknown> | void;
  onScrollBeginDrag?: () => void;
  refreshing: boolean;
};

export function usePullToRefresh({ enabled = true, onRefresh, onScrollBeginDrag, refreshing }: PullToRefreshOptions) {
  void enabled;
  void onRefresh;
  void refreshing;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    void event;
  }

  return {
    onScroll: handleScroll,
    onScrollBeginDrag,
    overScrollMode: 'never' as const,
    refreshIndicator: null,
    scrollEventThrottle: 16,
  };
}
