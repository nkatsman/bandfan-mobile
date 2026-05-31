import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UI_MODULES } from '../config/ui-modules';
import { MiniPlayer } from './mini-player';
import { BottomMenuModule } from '../modules/bottom-menu';
import { useAppTheme } from '../design/theme';
import { usePlayerStore } from '../state/player-store';

export function ThumbTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const theme = useAppTheme();
  const isMiniPlayerHidden = usePlayerStore((state) => state.isMiniPlayerHidden);
  const styles = useMemo(() => createStyles(theme.ui, theme.uiSpacing), [theme]);

  return (
    <SafeAreaView edges={[ 'bottom' ]} style={styles.safeArea}>
      <View style={[styles.playerWrap, isMiniPlayerHidden && styles.playerWrapHidden]}>
        <MiniPlayer compact />
      </View>

      {UI_MODULES.bottomMenu ? <BottomMenuModule descriptors={descriptors} navigation={navigation} state={state} /> : null}
    </SafeAreaView>
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
    },
    playerWrap: {
      backgroundColor: colors.appBackground,
      marginBottom: 0,
    },
    playerWrapHidden: {
      height: 68,
      overflow: 'visible',
    },
  });
}