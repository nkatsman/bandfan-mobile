import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppTheme } from '../src/design/theme';

import { useSessionStore } from '../src/state/session-store';

export default function IndexScreen() {
  const status = useSessionStore((state) => state.status);
  const theme = useAppTheme();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: theme.ui.appBackground }} />;
  }

  if (status === 'signed-in' || status === 'preview') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/sign-in" />;
}