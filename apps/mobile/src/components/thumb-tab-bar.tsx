import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { UI_MODULES } from '../config/ui-modules';
import { MiniPlayer } from './mini-player';
import { BottomMenuModule } from '../modules/bottom-menu';
import { useAppTheme } from '../design/theme';
import { usePlayerStore } from '../state/player-store';

const MINI_PLAYER_Z_INDEX = 6000;

export function ThumbTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const theme = useAppTheme();
  const isMiniPlayerHidden = usePlayerStore((state) => state.isMiniPlayerHidden);
  const styles = useMemo(() => createStyles(theme.ui, theme.uiSpacing), [theme]);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.playerWrap, isMiniPlayerHidden && styles.playerWrapHidden]}>
        <MiniPlayer compact />
      </View>

      {UI_MODULES.bottomMenu ? <BottomMenuModule descriptors={descriptors} navigation={navigation} state={state} /> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui'], intervals: ReturnType<typeof useAppTheme>['uiSpacing']) {
  void intervals;

  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.appBackground,
      paddingBottom: 0,
      paddingHorizontal: 0,
      paddingTop: 0,
      position: 'relative',
    },
    playerWrap: {
      backgroundColor: colors.appBackground,
      elevation: MINI_PLAYER_Z_INDEX,
      marginBottom: 0,
      position: 'relative',
      zIndex: MINI_PLAYER_Z_INDEX,
    },
    playerWrapHidden: {
      height: 68,
      overflow: 'visible',
    },
  });
}