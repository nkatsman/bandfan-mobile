import { z } from 'zod';

import { apiClient } from '../../lib/api/client';
import { getMobileDeviceId } from '../../lib/device-id';

const playbackLeaseSchema = z.object({
  lease: z.object({
    deviceId: z.string().nullable(),
    expiresAt: z.number().nullable(),
    leaseId: z.string().nullable(),
    songId: z.string().nullable(),
    updatedAt: z.number().nullable(),
  }).passthrough(),
}).passthrough();

export type PlaybackLease = z.infer<typeof playbackLeaseSchema>['lease'];

export async function claimPlaybackLease(songId: string) {
  const deviceId = await getMobileDeviceId();
  const response = await apiClient.postAuthed('/api/mobile/playback-lease', {
    body: {
      action: 'claim',
      deviceId,
      songId,
    },
    schema: playbackLeaseSchema,
  });

  return response.lease;
}

export async function releasePlaybackLease(leaseId: string | null) {
  const deviceId = await getMobileDeviceId();
  const response = await apiClient.postAuthed('/api/mobile/playback-lease', {
    body: {
      action: 'release',
      deviceId,
      leaseId,
    },
    schema: playbackLeaseSchema,
  });

  return response.lease;
}

export async function fetchPlaybackLease() {
  const response = await apiClient.getAuthed('/api/mobile/playback-lease', { schema: playbackLeaseSchema });
  return response.lease;
}

export async function isPlaybackLeaseOwnedByThisDevice(lease: PlaybackLease) {
  const deviceId = await getMobileDeviceId();
  return lease.deviceId === null || lease.deviceId === deviceId;
}