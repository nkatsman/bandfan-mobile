import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import * as ReactNativeAuth from '@firebase/auth';
import { Platform } from 'react-native';

import { env, hasFirebaseClientConfig } from './env';

type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;
type ReactNativePersistenceStorage = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};
type ReactNativePersistenceFactory = (storage: ReactNativePersistenceStorage) => AuthDependencies['persistence'];

const getReactNativePersistence = (ReactNativeAuth as { getReactNativePersistence?: ReactNativePersistenceFactory }).getReactNativePersistence;

const secureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

const secureAuthStorage: ReactNativePersistenceStorage = {
  async getItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key, secureStoreOptions);
      if (value !== null) {
        return value;
      }
    } catch {
      // Fall through to AsyncStorage for compatibility with existing sessions.
    }

    return AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key, secureStoreOptions);
    } catch {
      // Keep going to AsyncStorage cleanup.
    }

    await AsyncStorage.removeItem(key);
  },
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOptions);
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      // Fallback so auth persistence still works if SecureStore is unavailable.
    }

    await AsyncStorage.setItem(key, value);
  },
};

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  appId: env.firebaseAppId,
  authDomain: env.firebaseAuthDomain,
  messagingSenderId: env.firebaseMessagingSenderId,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
};

export const firebaseApp = hasFirebaseClientConfig ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) : null;

export const authPersistenceMode = Platform.OS !== 'web' && getReactNativePersistence ? 'expo-secure-store' : 'default';

export const auth: Auth | null = (() => {
  if (!firebaseApp) {
    return null;
  }

  try {
    if (Platform.OS !== 'web' && getReactNativePersistence) {
      return initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(secureAuthStorage),
      });
    }

    if (Platform.OS === 'web') {
      return initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    }

    return initializeAuth(firebaseApp);
  } catch {
    return getAuth(firebaseApp);
  }
})();

export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;