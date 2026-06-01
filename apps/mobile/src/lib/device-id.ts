import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_STORAGE_KEY = 'bandfan.mobile.deviceId';

function createDeviceId() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `mobile-${Date.now().toString(36)}-${randomPart}`;
}

export async function getMobileDeviceId() {
  const storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const nextDeviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}