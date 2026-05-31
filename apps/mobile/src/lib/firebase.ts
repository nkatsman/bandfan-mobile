import AsyncStorage from '@react-native-async-storage/async-storage';
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
type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => AuthDependencies['persistence'];

const getReactNativePersistence = (ReactNativeAuth as { getReactNativePersistence?: ReactNativePersistenceFactory }).getReactNativePersistence;

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  appId: env.firebaseAppId,
  authDomain: env.firebaseAuthDomain,
  messagingSenderId: env.firebaseMessagingSenderId,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
};

export const firebaseApp = hasFirebaseClientConfig ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) : null;

export const authPersistenceMode = Platform.OS !== 'web' && getReactNativePersistence ? 'react-native-async-storage' : 'default';

export const auth: Auth | null = (() => {
  if (!firebaseApp) {
    return null;
  }

  try {
    if (Platform.OS !== 'web' && getReactNativePersistence) {
      return initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
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