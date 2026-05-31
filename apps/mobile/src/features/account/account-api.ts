import { z } from 'zod';

import { apiClient } from '../../lib/api/client';

const accountProfileSchema = z.object({
  displayName: z.string().optional().default(''),
  email: z.string().optional().default(''),
  roles: z.record(z.string(), z.boolean()).optional().default({}),
  uid: z.string(),
  username: z.string().nullable().optional().default(null),
  usernameNormalized: z.string().nullable().optional().default(null),
});

const accountSettingsSchema = z.object({
  profile: accountProfileSchema,
});

const usernameResponseSchema = z.object({
  username: z.string().nullable(),
});

const displayNameResponseSchema = z.object({
  displayName: z.string(),
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;

export const accountProfileQueryDefaults = {
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
};

export async function fetchAccountProfile() {
  const response = await apiClient.getAuthed('/api/account/settings', {
    schema: accountSettingsSchema,
  });

  return response.profile;
}

export async function updateAccountUsername(username: string) {
  return apiClient.postAuthed('/api/account/username', {
    body: { username },
    schema: usernameResponseSchema,
  });
}

export async function updateAccountDisplayName(displayName: string) {
  return apiClient.patchAuthed('/api/account/settings', {
    body: {
      action: 'update-profile',
      displayName,
    },
    schema: displayNameResponseSchema,
  });
}