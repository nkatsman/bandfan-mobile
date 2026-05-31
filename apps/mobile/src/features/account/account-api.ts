import { z } from 'zod';

import { apiClient } from '../../lib/api/client';

function normalizeRoleMap(...values: unknown[]) {
  const roles: Record<string, boolean> = {};

  values.forEach((value) => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      roles[value] = true;
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          roles[entry.trim()] = true;
        }
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, roleValue]) => {
        if (!key.trim()) {
          return;
        }

        roles[key] = roleValue === true || roleValue === 'true' || roleValue === 1;
      });
    }
  });

  return roles;
}

const accountProfileSchema = z
  .object({
    admin: z.boolean().optional(),
    displayName: z.string().optional().default(''),
    email: z.string().optional().default(''),
    isAdmin: z.boolean().optional(),
    role: z.unknown().optional(),
    roles: z.unknown().optional(),
    uid: z.string(),
    username: z.string().nullable().optional().default(null),
    usernameNormalized: z.string().nullable().optional().default(null),
  })
  .passthrough()
  .transform((profile) => ({
    ...profile,
    roles: {
      ...normalizeRoleMap(profile.roles, profile.role),
      ...(profile.admin || profile.isAdmin ? { admin: true } : {}),
    },
  }));

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