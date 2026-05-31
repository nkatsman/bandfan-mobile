import { Redirect, Tabs } from 'expo-router';

import { ThumbTabBar } from '../../src/components/thumb-tab-bar';
import { useSongInteractionBootstrap } from '../../src/features/preferences/use-song-interaction-bootstrap';
import { useSessionStore } from '../../src/state/session-store';

export default function TabsLayout() {
  const status = useSessionStore((state) => state.status);
  useSongInteractionBootstrap();

  if (status === 'signed-out') {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs tabBar={(props) => <ThumbTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarLabel: 'DISCOVER' }} />
      <Tabs.Screen name="liked" options={{ title: 'Favorites', tabBarLabel: 'FAVORITES' }} />
      <Tabs.Screen name="playlists" options={{ title: 'Playlists', tabBarLabel: 'PLAYLISTS' }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarLabel: 'ACCOUNT' }} />
    </Tabs>
  );
}