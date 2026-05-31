import { env, hasApiBaseUrl } from './env';

const FIREBASE_STORAGE_HOSTNAMES = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

export function getCachedImageSrc(src: string | null | undefined) {
  if (!src) {
    return src ?? '';
  }

  const trimmedSrc = src.trim();
  if (!trimmedSrc || trimmedSrc.startsWith('/') || trimmedSrc.startsWith('data:') || trimmedSrc.startsWith('blob:')) {
    return trimmedSrc;
  }

  if (!hasApiBaseUrl) {
    return trimmedSrc;
  }

  try {
    const parsedUrl = new URL(trimmedSrc);
    if (!FIREBASE_STORAGE_HOSTNAMES.has(parsedUrl.hostname)) {
      return trimmedSrc;
    }

    return `${env.apiBaseUrl}/api/image-cache?src=${encodeURIComponent(parsedUrl.toString())}`;
  } catch {
    return trimmedSrc;
  }
}