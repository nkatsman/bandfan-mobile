import { z } from 'zod';

import { apiClient } from '../../lib/api/client';

const loopModeSchema = z.enum(['off', 'list', 'track']);

const playerSettingsSchema = z
  .object({
    volume: z.number().optional(),
    isMuted: z.boolean().optional(),
    shuffle: z.boolean().optional(),
    loopMode: loopModeSchema.optional(),
    normalizationEnabled: z.boolean().optional(),
    showExplicitSongs: z.boolean().optional(),
    showAiAssistedDiscoverSongs: z.boolean().optional(),
    showPolkaDotBackground: z.boolean().optional(),
  })
  .passthrough();

const accountSettingsSchema = z
  .object({
    playerSettings: playerSettingsSchema.optional(),
    profile: z
      .object({
        playerSettings: playerSettingsSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const updatePlayerSettingsSchema = z
  .object({
    playerSettings: playerSettingsSchema,
  })
  .passthrough();

export type PlayerSettings = {
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  loopMode: 'off' | 'list' | 'track';
  normalizationEnabled: boolean;
  showExplicitSongs: boolean;
  showAiAssistedDiscoverSongs: boolean;
  showPolkaDotBackground: boolean;
};

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  volume: 1,
  isMuted: false,
  shuffle: false,
  loopMode: 'list',
  normalizationEnabled: true,
  showExplicitSongs: false,
  showAiAssistedDiscoverSongs: false,
  showPolkaDotBackground: true,
};

export const playerSettingsQueryKey = ['player-settings'] as const;
export const playerSettingsQueryDefaults = {
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
} as const;

export function normalizePlayerSettings(settings?: Partial<PlayerSettings> | null): PlayerSettings {
  return {
    volume: typeof settings?.volume === 'number' ? Math.max(0, Math.min(1, settings.volume)) : DEFAULT_PLAYER_SETTINGS.volume,
    isMuted: Boolean(settings?.isMuted),
    shuffle: Boolean(settings?.shuffle),
    loopMode: settings?.loopMode === 'off' || settings?.loopMode === 'track' || settings?.loopMode === 'list'
      ? settings.loopMode
      : DEFAULT_PLAYER_SETTINGS.loopMode,
    normalizationEnabled: typeof settings?.normalizationEnabled === 'boolean' ? settings.normalizationEnabled : DEFAULT_PLAYER_SETTINGS.normalizationEnabled,
    showExplicitSongs: typeof settings?.showExplicitSongs === 'boolean' ? settings.showExplicitSongs : DEFAULT_PLAYER_SETTINGS.showExplicitSongs,
    showAiAssistedDiscoverSongs: typeof settings?.showAiAssistedDiscoverSongs === 'boolean'
      ? settings.showAiAssistedDiscoverSongs
      : DEFAULT_PLAYER_SETTINGS.showAiAssistedDiscoverSongs,
    showPolkaDotBackground: typeof settings?.showPolkaDotBackground === 'boolean'
      ? settings.showPolkaDotBackground
      : DEFAULT_PLAYER_SETTINGS.showPolkaDotBackground,
  };
}

export async function fetchPlayerSettings() {
  const response = await apiClient.getAuthed('/api/account/settings?include=audio-preferences', { schema: accountSettingsSchema });

  return normalizePlayerSettings(response.playerSettings ?? response.profile?.playerSettings);
}

export async function updatePlayerSettings(playerSettings: PlayerSettings) {
  const response = await apiClient.patchAuthed('/api/account/settings', {
    body: {
      action: 'update-player-settings',
      playerSettings: normalizePlayerSettings(playerSettings),
    },
    schema: updatePlayerSettingsSchema,
  });

  return normalizePlayerSettings(response.playerSettings);
}