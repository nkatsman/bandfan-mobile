export type Song = {
  audioUrl?: string;
  artist: string;
  artworkColor: string;
  coverArtUrl?: string;
  durationLabel: string;
  id: string;
  liked: boolean;
  loudnessAnalysis?: LoudnessAnalysis | null;
  playCount?: number;
  publishedAt?: number;
  sourceLabel: string;
  title: string;
  voted: boolean;
  voteCount?: number;
};

export type LoudnessAnalysis = {
  analysisCompletedAt?: string | null;
  analysisVersion?: string | null;
  analyzedAssetStoragePath?: string | null;
  failureReason?: string | null;
  integratedLufs: number | null;
  loudnessRange?: number | null;
  normalizationGainDb: number | null;
  source?: string | null;
  status: 'complete' | 'failed' | 'pending';
  truePeakDb: number | null;
};

export type Playlist = {
  coverArtUrl?: string;
  description: string;
  id: string;
  isPinned: boolean;
  kind: 'favorites' | 'voted' | 'user';
  coverSongId?: string | null;
  sourceLabel: string;
  title: string;
  trackIds: string[];
  updatedAt?: unknown;
  visibility: 'public' | 'private';
};