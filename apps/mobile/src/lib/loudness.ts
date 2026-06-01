import type { LoudnessAnalysis } from '../types/music';

const NORMALIZATION_MAX_UPWARD_GAIN_DB = 8;
const NORMALIZATION_MAX_DOWNWARD_GAIN_DB = 12;
const NORMALIZATION_PLAYBACK_TARGET_LUFS = -14;
const NORMALIZATION_TRUE_PEAK_LIMIT_DB = -1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function deriveNormalizationGainDb(integratedLufs: number) {
  return clamp(NORMALIZATION_PLAYBACK_TARGET_LUFS - integratedLufs, -NORMALIZATION_MAX_DOWNWARD_GAIN_DB, NORMALIZATION_MAX_UPWARD_GAIN_DB);
}

function derivePeakSafeUpwardGainDb(truePeakDb: number) {
  return clamp(NORMALIZATION_TRUE_PEAK_LIMIT_DB - truePeakDb, 0, NORMALIZATION_MAX_UPWARD_GAIN_DB);
}

export function deriveEffectivePlaybackNormalizationGainDb(analysis: LoudnessAnalysis | null | undefined) {
  if (analysis?.status !== 'complete') {
    return null;
  }

  const legacyGainDb = isFiniteNumber(analysis.normalizationGainDb)
    ? clamp(analysis.normalizationGainDb, -NORMALIZATION_MAX_DOWNWARD_GAIN_DB, NORMALIZATION_MAX_UPWARD_GAIN_DB)
    : null;

  if (!isFiniteNumber(analysis.integratedLufs)) {
    return legacyGainDb;
  }

  const desiredGainDb = deriveNormalizationGainDb(analysis.integratedLufs);

  if (desiredGainDb <= 0) {
    return desiredGainDb;
  }

  if (isFiniteNumber(analysis.truePeakDb)) {
    return Math.min(desiredGainDb, derivePeakSafeUpwardGainDb(analysis.truePeakDb));
  }

  return legacyGainDb;
}

export function dbToNativeVolume(gainDb: number | null) {
  if (gainDb === null) {
    return 1;
  }

  return clamp(10 ** (gainDb / 20), 0, 1);
}