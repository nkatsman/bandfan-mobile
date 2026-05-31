import { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { UI_MODULES } from '../src/config/ui-modules';
import { BottomMenu } from '../src/components/ui/bottom-menu';

const MENU_ITEMS = [
  { key: 'index', label: 'DISCOVER' },
  { key: 'liked', label: 'FAVORITES' },
  { key: 'playlists', label: 'PLAYLISTS' },
  { key: 'account', label: 'ACCOUNT' },
] as const;

export default function MenuPreviewScreen() {
  const [activeKey, setActiveKey] = useState<string>('index');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content} />

      {UI_MODULES.bottomMenu ? <BottomMenu activeKey={activeKey} items={[...MENU_ITEMS]} onSelect={setActiveKey} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFF9EF',
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
