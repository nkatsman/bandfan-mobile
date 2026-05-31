import { z } from 'zod';
import { Platform } from 'react-native';

const envSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().optional(),
  EXPO_PUBLIC_APP_ENV: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  EXPO_PUBLIC_WEB_API_PROXY_URL: z.string().optional(),
});

const rawEnv = envSchema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_WEB_API_PROXY_URL: process.env.EXPO_PUBLIC_WEB_API_PROXY_URL,
});

const directApiBaseUrl = rawEnv.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
const configuredWebApiProxyUrl = rawEnv.EXPO_PUBLIC_WEB_API_PROXY_URL?.replace(/\/$/, '') ?? '';
const apiBaseUrl = Platform.OS === 'web'
  ? configuredWebApiProxyUrl || directApiBaseUrl
  : directApiBaseUrl || configuredWebApiProxyUrl;

export const env = {
  apiBaseUrl,
  appEnv: rawEnv.EXPO_PUBLIC_APP_ENV ?? 'development',
  directApiBaseUrl,
  firebaseApiKey: rawEnv.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseAppId: rawEnv.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  firebaseAuthDomain: rawEnv.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseMessagingSenderId: rawEnv.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseProjectId: rawEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket: rawEnv.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  webApiProxyUrl: configuredWebApiProxyUrl,
};

export const hasApiBaseUrl = env.apiBaseUrl.length > 0;
export const hasFirebaseClientConfig = [
  env.firebaseApiKey,
  env.firebaseAppId,
  env.firebaseAuthDomain,
  env.firebaseMessagingSenderId,
  env.firebaseProjectId,
  env.firebaseStorageBucket,
].every((value) => value.length > 0);

export function getEnvReport() {
  return [
    { label: 'API BASE URL', ready: hasApiBaseUrl },
    { label: 'WEB API PROXY', ready: env.webApiProxyUrl.length > 0 },
    { label: 'FIREBASE CLIENT CONFIG', ready: hasFirebaseClientConfig },
    { label: 'APP ENV', ready: env.appEnv.length > 0 },
  ];
}