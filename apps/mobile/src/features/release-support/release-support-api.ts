import { z } from 'zod';

import { apiClient } from '../../lib/api/client';
import { ApiClientError } from '../../lib/api/client';
import { env } from '../../lib/env';
import { auth } from '../../lib/firebase';

const releaseSupportRequestSchema = z.object({
  songId: z.string().min(1),
  supported: z.boolean(),
});

const releaseSupportEchoSchema = z
  .object({
    songId: z.union([z.string(), z.number()]).optional(),
    releaseSupported: z.boolean().optional(),
    success: z.boolean().optional(),
    supported: z.boolean().optional(),
    voted: z.boolean().optional(),
  })
  .passthrough();

const releaseSupportResponseSchema = z.union([
  z.null(),
  releaseSupportEchoSchema,
  z.object({ data: z.null() }).passthrough(),
  z.object({ data: releaseSupportEchoSchema }).passthrough(),
]);

const releaseSupportSongIdsResponseSchema = z
  .object({
    releaseSupportSongIds: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .passthrough();

export type ReleaseSupportInput = z.infer<typeof releaseSupportRequestSchema>;

export type ReleaseSupportResult = {
  songId: string;
  supported: boolean;
};

function normalizeReleaseSupportResponse(input: ReleaseSupportInput, response: z.infer<typeof releaseSupportResponseSchema>): ReleaseSupportResult {
  if (response === null) {
    return input;
  }

  const dataEnvelopeMatch = z.object({ data: releaseSupportEchoSchema.nullable() }).safeParse(response);

  if (dataEnvelopeMatch.success) {
    if (dataEnvelopeMatch.data.data === null) {
      return input;
    }

    return {
      songId: String(dataEnvelopeMatch.data.data.songId ?? input.songId),
      supported:
        dataEnvelopeMatch.data.data.supported ??
        dataEnvelopeMatch.data.data.releaseSupported ??
        dataEnvelopeMatch.data.data.voted ??
        input.supported,
    };
  }

  const echoMatch = releaseSupportEchoSchema.parse(response);

  return {
    songId: String(echoMatch.songId ?? input.songId),
    supported: echoMatch.supported ?? echoMatch.releaseSupported ?? echoMatch.voted ?? input.supported,
  };
}

export async function sendReleaseSupport(input: ReleaseSupportInput) {
  const body = releaseSupportRequestSchema.parse(input);

  const response = await apiClient.postAuthed('/api/release-support', {
    body,
    schema: releaseSupportResponseSchema,
  });

  return normalizeReleaseSupportResponse(body, response);
}

export async function fetchReleaseSupportSongIds() {
  const response = await apiClient.getAuthed('/api/release-support', {
    schema: releaseSupportSongIdsResponseSchema,
  });

  return Array.from(new Set((response.releaseSupportSongIds ?? []).map((songId) => String(songId).trim()).filter(Boolean)));
}

export async function fetchSavedSongIds() {
  if (!auth || !auth.currentUser) {
    return [];
  }

  const token = await auth.currentUser.getIdToken();
  const requestUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/users/${auth.currentUser.uid}/savedSongs?pageSize=500`;

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
  });

  if (!response.ok) {
    throw new ApiClientError('Failed to load saved song IDs for the signed-in user.', {
      code: 'http',
      status: response.status,
    });
  }

  const json = (await response.json()) as {
    documents?: Array<{
      fields?: {
        songId?: { stringValue?: string };
      };
      name?: string;
    }>;
  };

  const songIdsFromDocs = (json.documents ?? [])
    .map((doc) => doc.fields?.songId?.stringValue?.trim() || doc.name?.split('/').pop()?.trim() || '')
    .filter(Boolean);

  return Array.from(new Set(songIdsFromDocs));
}