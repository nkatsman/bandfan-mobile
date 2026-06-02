import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_STORAGE_KEY = 'bandfan.mobile.deviceId';

function createRandomPart() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

function createDeviceId() {
  const randomPart = createRandomPart();
  return `mobile-${Date.now().toString(36)}-${randomPart}`;
}

export async function getMobileDeviceId() {
  const storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_STORAGE_KEY);

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const nextDeviceId = createDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}