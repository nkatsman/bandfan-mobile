import { z } from 'zod';

import { getArtworkPalette } from '../../design/theme';
import { apiClient, ApiClientError } from '../../lib/api/client';
import { useSessionStore } from '../../state/session-store';
import { Song, type LoudnessAnalysis } from '../../types/music';
import { useThemeStore } from '../../state/theme-store';

export const discoverySongsQueryKey = ['discovery-songs'] as const;
export const discoverySongsQueryDefaults = {
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity,
} as const;
const DISCOVERY_PAGE_LIMIT = 50;
const DISCOVERY_MAX_PAGES = 4;
const discoveryRequestPromises = new Map<string, Promise<Song[]>>();

const discoveryItemSchema = z
  .object({
    artist: z.string().optional(),
    artistName: z.string().optional(),
    artworkColor: z.string().optional(),
    coverColor: z.string().optional(),
    duration: z.union([z.number(), z.string()]).optional(),
    durationLabel: z.string().optional(),
    hasVoted: z.boolean().optional(),
    id: z.union([z.string(), z.number()]).optional(),
    isLiked: z.boolean().optional(),
    liked: z.boolean().optional(),
      playCount: z.number().optional(),
      plays: z.number().optional(),
      publishedAt: z.union([z.number(), z.string()]).optional(),
      publishedAtMillis: z.number().optional(),
      releaseSupportCount: z.number().optional(),
    saved: z.boolean().optional(),
    songId: z.union([z.string(), z.number()]).optional(),
    songTitle: z.string().optional(),
    sourceLabel: z.string().optional(),
    supported: z.boolean().optional(),
    title: z.string().optional(),
      voteCount: z.number().optional(),
      votes: z.number().optional(),
    voted: z.boolean().optional(),
  })
  .passthrough();

const discoveryListSchema = z.array(discoveryItemSchema);
const discoveryItemsEnvelopeSchema = z.object({ items: discoveryListSchema }).passthrough();
const discoverySongsEnvelopeSchema = z.object({ songs: discoveryListSchema }).passthrough();
const discoveryDataListEnvelopeSchema = z.object({ data: discoveryListSchema }).passthrough();
const discoveryDataItemsEnvelopeSchema = z.object({ data: discoveryItemsEnvelopeSchema }).passthrough();
const discoveryDataSongsEnvelopeSchema = z.object({ data: discoverySongsEnvelopeSchema }).passthrough();

const rawDiscoverySongTitleSchema = z.object({ title: z.string().optional() }).passthrough();
const rawDiscoveryBandSchema = z
  .object({
    bandName: z.string().optional(),
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
  })
  .passthrough();
const rawDiscoverySongSchema = z
  .object({
    bandId: z.string().optional(),
    cover: z.array(z.object({ url: z.string().optional() }).passthrough()).optional(),
    song: z.array(z.object({ url: z.string().optional() }).passthrough()).optional(),
    id: z.union([z.string(), z.number()]),
    managementQuery: z.object({ status: z.string().optional() }).passthrough().optional(),
    title: z.array(rawDiscoverySongTitleSchema).optional(),
    variants: z.array(z.object({ status: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();
const rawDiscoveryEnvelopeSchema = z
  .object({
    bands: z.array(rawDiscoveryBandSchema).optional(),
    songs: z.array(rawDiscoverySongSchema),
  })
  .passthrough();

type DiscoveryItem = z.infer<typeof discoveryItemSchema>;
type RawDiscoveryBand = z.infer<typeof rawDiscoveryBandSchema>;
type RawDiscoveryEnvelope = z.infer<typeof rawDiscoveryEnvelopeSchema>;
type RawDiscoverySong = z.infer<typeof rawDiscoverySongSchema>;

function pickArtworkColor(rawColor: string | undefined, index: number) {
  if (rawColor && /^#[0-9a-f]{6}$/i.test(rawColor)) {
    return rawColor;
  }

  const artworkPalette = getArtworkPalette(useThemeStore.getState().mode);

  return artworkPalette[index % artworkPalette.length] ?? artworkPalette[0] ?? '#E7BF7B';
}

function toDurationLabel(value: string | number | undefined) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    const totalSeconds = value > 999 ? Math.round(value / 1000) : Math.round(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return '0:00';
}

function toSourceLabel(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return 'DISCOVERY';
  }

  return trimmed.toUpperCase();
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toTimestampMillis(value: unknown) {
  const numeric = toFiniteNumber(value);

  if (numeric !== undefined) {
    return numeric > 9999999999 ? numeric : numeric * 1000;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (value && typeof value === 'object') {
    const record = value as { seconds?: unknown; toMillis?: unknown };

    if (typeof record.toMillis === 'function') {
      const millis = record.toMillis();
      return typeof millis === 'number' && Number.isFinite(millis) ? millis : undefined;
    }

    const seconds = toFiniteNumber(record.seconds);
    return seconds === undefined ? undefined : seconds * 1000;
  }

  return undefined;
}

function readLoudnessAnalysis(value: unknown): LoudnessAnalysis | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const status = record.status;

  if (status !== 'complete' && status !== 'pending' && status !== 'failed') {
    return null;
  }

  return {
    analysisCompletedAt: readString(record.analysisCompletedAt) ?? null,
    analysisVersion: readString(record.analysisVersion) ?? null,
    analyzedAssetStoragePath: readString(record.analyzedAssetStoragePath) ?? null,
    failureReason: readString(record.failureReason) ?? null,
    integratedLufs: toFiniteNumber(record.integratedLufs) ?? null,
    loudnessRange: toFiniteNumber(record.loudnessRange) ?? null,
    normalizationGainDb: toFiniteNumber(record.normalizationGainDb) ?? null,
    source: readString(record.source) ?? null,
    status,
    truePeakDb: toFiniteNumber(record.truePeakDb) ?? null,
  };
}

function readLoudnessFromVariants(value: unknown): LoudnessAnalysis | null {
  return readVersionEntries(value)
    .map((entry) => readLoudnessAnalysis((entry as Record<string, unknown>).loudnessAnalysis))
    .find((analysis): analysis is LoudnessAnalysis => Boolean(analysis)) ?? null;
}

function extractItems(response: unknown): DiscoveryItem[] {
  const listMatch = discoveryListSchema.safeParse(response);

  if (listMatch.success) {
    return listMatch.data;
  }

  const directSongsMatch = discoverySongsEnvelopeSchema.safeParse(response);

  if (directSongsMatch.success) {
    return directSongsMatch.data.songs;
  }

  const directItemsMatch = discoveryItemsEnvelopeSchema.safeParse(response);

  if (directItemsMatch.success) {
    return directItemsMatch.data.items;
  }

  const dataListMatch = discoveryDataListEnvelopeSchema.safeParse(response);

  if (dataListMatch.success) {
    return dataListMatch.data.data;
  }

  const dataSongsMatch = discoveryDataSongsEnvelopeSchema.safeParse(response);

  if (dataSongsMatch.success) {
    return dataSongsMatch.data.data.songs;
  }

  return discoveryDataItemsEnvelopeSchema.parse(response).data.items;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readIdentifier(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return readString(value);
}

function readNestedString(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  return keys.map((key) => readString(record[key])).find(Boolean);
}

function readUrlFromList(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((entry) => (typeof entry === 'string' ? readString(entry) : readNestedString(entry, ['url', 'src', 'href']))).find(Boolean);
}

function readVersionEntries(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value as Record<string, unknown>)
    .filter(([key, entry]) => /^\d+$/.test(key) && Boolean(entry) && typeof entry === 'object')
    .sort(([leftKey], [rightKey]) => Number(leftKey) - Number(rightKey))
    .map(([, entry]) => entry);
}

function readUrlFromVersionCollection(value: unknown): string | undefined {
  return readVersionEntries(value)
    .map((entry) => {
      const record = entry as Record<string, unknown>;

      return {
        createdAt: toTimestampMillis(record.createdAt),
        url: readUrl(record.url) ?? readUrl(record.src) ?? readUrl(record.href) ?? readUrl(record.downloadUrl) ?? readUrl(record.downloadURL),
      };
    })
    .filter((entry): entry is { createdAt: number | undefined; url: string } => Boolean(entry.url))
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))[0]?.url;
}

function readUrlFromVariants(value: unknown, field: 'audio' | 'cover'): string | undefined {
  return readVersionEntries(value)
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      const fieldRecord = record[field];

      return {
        createdAt: toTimestampMillis(record.updatedAt ?? record.createdAt) ?? toTimestampMillis(readNestedValue(fieldRecord, 'createdAt')),
        isDefaultPublic: record.isDefaultPublic === true,
        url: readUrl(fieldRecord),
        visibility: readString(record.visibility),
      };
    })
    .filter((entry): entry is { createdAt: number | undefined; isDefaultPublic: boolean; url: string; visibility: string | undefined } => Boolean(entry.url))
    .filter((entry) => entry.visibility !== 'private')
    .sort((left, right) => {
      if (left.isDefaultPublic !== right.isDefaultPublic) {
        return left.isDefaultPublic ? -1 : 1;
      }

      return (right.createdAt ?? 0) - (left.createdAt ?? 0);
    })[0]?.url;
}

function readUrl(value: unknown): string | undefined {
  return readString(value) ?? readUrlFromList(value) ?? readNestedString(value, ['url', 'src', 'href', 'downloadUrl', 'downloadURL']) ?? readUrlFromVersionCollection(value);
}

function readRawSongTitle(song: RawDiscoverySong) {
  const record = song as Record<string, unknown>;

  return (
    (Array.isArray(record.title)
      ? record.title.map((entry) => (typeof entry === 'string' ? readString(entry) : readNestedString(entry, ['title', 'name']))).find(Boolean)
      : readString(record.title)) ??
    readString(record.songTitle) ??
    readString(record.name) ??
    readNestedString(record.song, ['title', 'name'])
  );
}

function readRawSongArtist(song: RawDiscoverySong, bandsById: Map<string, RawDiscoveryBand>) {
  const record = song as Record<string, unknown>;
  const bandId = readIdentifier(record.bandId) ?? readIdentifier(readNestedValue(record.band, 'id'));
  const band = bandId ? bandsById.get(bandId) : undefined;
  const artistName = band?.bandName ?? band?.name;

  return (
    readString(artistName) ??
    readString(record.artist) ??
    readString(record.artistName) ??
    readString(record.bandName) ??
    readNestedString(record.band, ['bandName', 'name', 'title'])
  );
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function readRawSongLiked(song: RawDiscoverySong) {
  const record = song as Record<string, unknown>;

  return (
    readBoolean(record.liked) ??
    readBoolean(record.isLiked) ??
    readBoolean(record.saved) ??
    readBoolean(record.favorite) ??
    readBoolean(record.favorited) ??
    readBoolean(record.userLiked) ??
    readBoolean(record.likedByCurrentUser) ??
    false
  );
}

function readRawSongVoted(song: RawDiscoverySong) {
  const record = song as Record<string, unknown>;

  return (
    readBoolean(record.voted) ??
    readBoolean(record.hasVoted) ??
    readBoolean(record.supported) ??
    readBoolean(record.releaseSupported) ??
    readBoolean(record.userVoted) ??
    readBoolean(record.votedByCurrentUser) ??
    false
  );
}

function normalizeRawDiscoverySong(song: RawDiscoverySong, bandsById: Map<string, RawDiscoveryBand>, index: number): Song | null {
  const title = readRawSongTitle(song);
  const artist = readRawSongArtist(song, bandsById);
  const record = song as Record<string, unknown>;
  const audioUrl = readUrlFromVariants(record.variants, 'audio') ?? readUrl(record.song) ?? readUrl(record.audio) ?? readUrl(record.audioUrl) ?? readUrl(record.songUrl) ?? readUrl(record.mediaUrl);
  const coverArtUrl = readUrlFromVariants(record.variants, 'cover') ?? readUrl(record.cover) ?? readUrl(record.artwork) ?? readUrl(record.coverArtUrl) ?? readUrl(record.coverUrl) ?? readUrl(record.artworkUrl) ?? readUrl(record.imageUrl) ?? readUrl(record.thumbnailUrl);

  if (!title || !artist) {
    return null;
  }

  return {
    audioUrl,
    artist,
    artworkColor: pickArtworkColor(undefined, index),
    coverArtUrl,
    durationLabel: '0:00',
    id: String(song.id),
    liked: readRawSongLiked(song),
    loudnessAnalysis: readLoudnessAnalysis(record.loudnessAnalysis) ?? readLoudnessFromVariants(record.variants),
      playCount: toFiniteNumber(record.playCount ?? record.plays ?? record.listenCount),
      publishedAt: toTimestampMillis(record.publishedAtMillis ?? record.publishedAt ?? record.releasedAt ?? record.createdAt),
    sourceLabel: toSourceLabel(song.managementQuery?.status ?? song.variants?.[0]?.status ?? 'DISCOVERY'),
    title,
    voted: readRawSongVoted(song),
      voteCount: toFiniteNumber(record.voteCount ?? record.votes ?? record.releaseSupportCount ?? record.supportCount),
  };
}

function normalizeRawDiscoveryEnvelope(response: RawDiscoveryEnvelope) {
  const bandsById = new Map(response.bands?.map((band) => [String(band.id), band]) ?? []);

  return response.songs
    .map((song, index) => normalizeRawDiscoverySong(song, bandsById, index))
    .filter((song): song is Song => song !== null);
}

function normalizeDiscoveryResponse(response: unknown) {
  const rawEnvelopeMatch = rawDiscoveryEnvelopeSchema.safeParse(response);

  if (rawEnvelopeMatch.success) {
    return normalizeRawDiscoveryEnvelope(rawEnvelopeMatch.data);
  }

  return extractItems(response).map(normalizeDiscoverySong);
}

function readCursor(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.cursor === 'string' && record.cursor.trim().length > 0) {
    return record.cursor;
  }

  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    if (typeof nested.cursor === 'string' && nested.cursor.trim().length > 0) {
      return nested.cursor;
    }
  }

  return null;
}

function readHasMore(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.hasMore === 'boolean') {
    return record.hasMore;
  }

  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    return nested.hasMore === true;
  }

  return false;
}

async function fetchDiscoverPage(requestPath: string, status: ReturnType<typeof useSessionStore.getState>['status']) {
  if (status === 'signed-in') {
    try {
      return await apiClient.getAuthed(requestPath);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'auth') {
        return apiClient.getPublic(requestPath);
      }

      throw error;
    }
  }

  return apiClient.getPublic(requestPath);
}

function normalizeDiscoverySong(item: DiscoveryItem, index: number): Song {
  const id = item.id ?? item.songId;
  const title = item.title ?? item.songTitle;
  const artist = item.artist ?? item.artistName;
  const record = item as Record<string, unknown>;

  if (!id || !title || !artist) {
    throw new ApiClientError('Discovery response is missing one of the required song fields: id, title, or artist.', {
      code: 'validation',
      details: item,
    });
  }

  return {
    artist,
    audioUrl: readUrl(record.audioUrl) ?? readUrl(record.songUrl) ?? readUrl(record.mediaUrl) ?? readUrl(record.audio) ?? readUrl(record.song),
    artworkColor: pickArtworkColor(item.artworkColor ?? item.coverColor, index),
    coverArtUrl: readUrlFromVariants(record.variants, 'cover') ?? readUrl(record.coverArtUrl) ?? readUrl(record.coverUrl) ?? readUrl(record.artworkUrl) ?? readUrl(record.imageUrl) ?? readUrl(record.thumbnailUrl) ?? readUrl(record.cover) ?? readUrl(record.artwork),
    durationLabel: toDurationLabel(item.durationLabel ?? item.duration),
    id: String(id),
    liked: item.liked ?? item.saved ?? item.isLiked ?? false,
    loudnessAnalysis: readLoudnessAnalysis(record.loudnessAnalysis) ?? readLoudnessFromVariants(record.variants),
      playCount: toFiniteNumber(item.playCount ?? item.plays),
      publishedAt: toTimestampMillis(item.publishedAtMillis ?? item.publishedAt),
    sourceLabel: toSourceLabel(item.sourceLabel),
    title,
    voted: item.voted ?? item.hasVoted ?? item.supported ?? false,
      voteCount: toFiniteNumber(item.voteCount ?? item.votes ?? item.releaseSupportCount),
  };
}

async function fetchDiscoverySongsWithOptions(options?: { includeAiAssisted?: boolean }) {
  const requestPath = '/api/fan/discover/songs';
  const { status } = useSessionStore.getState();

  const requestKey = `${status}:${options?.includeAiAssisted === true ? 'ai' : 'human'}`;
  const currentRequest = discoveryRequestPromises.get(requestKey);

  if (currentRequest) {
    return currentRequest;
  }

  const requestPromise = fetchDiscoverySongsPages(requestPath, status, options).finally(() => {
    discoveryRequestPromises.delete(requestKey);
  });

  discoveryRequestPromises.set(requestKey, requestPromise);

  return requestPromise;
}

async function fetchDiscoverySongsPages(requestPath: string, status: ReturnType<typeof useSessionStore.getState>['status'], options?: { includeAiAssisted?: boolean }) {
  const aggregatedSongs: Song[] = [];
  const seenSongIds = new Set<string>();

  let cursor: string | null = null;

  for (let pageIndex = 0; pageIndex < DISCOVERY_MAX_PAGES; pageIndex += 1) {
    const params = new URLSearchParams({ limit: String(DISCOVERY_PAGE_LIMIT) });

    if (cursor) {
      params.set('cursor', cursor);
    }

    if (options?.includeAiAssisted) {
      params.set('includeAiAssisted', '1');
    }

    const pagePath = `${requestPath}?${params.toString()}`;
    const response = await fetchDiscoverPage(pagePath, status);
    const pageSongs = normalizeDiscoveryResponse(response);

    pageSongs.forEach((song) => {
      if (seenSongIds.has(song.id)) {
        return;
      }

      seenSongIds.add(song.id);
      aggregatedSongs.push(song);
    });

    const hasMore = readHasMore(response);
    const nextCursor = readCursor(response);

    if (!hasMore || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return aggregatedSongs;
}

export function fetchDiscoverySongs() {
  return fetchDiscoverySongsWithOptions();
}

export function fetchDiscoverySongsForPreferences(options: { includeAiAssisted?: boolean }) {
  return fetchDiscoverySongsWithOptions(options);
}

function readNestedValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}