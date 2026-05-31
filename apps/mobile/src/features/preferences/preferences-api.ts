import { z } from 'zod';

import { apiClient } from '../../lib/api/client';

const saveSongPreferenceInputSchema = z.object({
  liked: z.boolean(),
  songId: z.string().min(1),
});

const preferenceRequestSchema = z.object({
  kind: z.literal('save-song'),
  targetId: z.string().min(1),
  value: z.boolean(),
});

const preferenceEchoSchema = z
  .object({
    liked: z.boolean().optional(),
    songId: z.union([z.string(), z.number()]).optional(),
    success: z.boolean().optional(),
  })
  .passthrough();

const preferenceResponseSchema = z.union([
  z.null(),
  preferenceEchoSchema,
  z.object({ data: z.null() }).passthrough(),
  z.object({ data: preferenceEchoSchema }).passthrough(),
]);

export type SaveSongPreferenceInput = z.infer<typeof saveSongPreferenceInputSchema>;

export type SaveSongPreferenceResult = {
  liked: boolean;
  songId: string;
};

function normalizePreferenceResponse(input: SaveSongPreferenceInput, response: z.infer<typeof preferenceResponseSchema>): SaveSongPreferenceResult {
  if (response === null) {
    return input;
  }

  const dataEnvelopeMatch = z.object({ data: preferenceEchoSchema.nullable() }).safeParse(response);

  if (dataEnvelopeMatch.success) {
    if (dataEnvelopeMatch.data.data === null) {
      return input;
    }

    return {
      liked: dataEnvelopeMatch.data.data.liked ?? input.liked,
      songId: String(dataEnvelopeMatch.data.data.songId ?? input.songId),
    };
  }

  const echoMatch = preferenceEchoSchema.parse(response);

  return {
    liked: echoMatch.liked ?? input.liked,
    songId: String(echoMatch.songId ?? input.songId),
  };
}

export async function saveSongPreference(input: SaveSongPreferenceInput) {
  const request = saveSongPreferenceInputSchema.parse(input);
  const body = preferenceRequestSchema.parse({
    kind: 'save-song',
    targetId: request.songId,
    value: request.liked,
  });

  const response = await apiClient.postAuthed('/api/fan/preferences', {
    body,
    schema: preferenceResponseSchema,
  });

  return normalizePreferenceResponse(request, response);
}