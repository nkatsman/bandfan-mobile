export type Song = {
  audioUrl?: string;
  artist: string;
  artworkColor: string;
  coverArtUrl?: string;
  durationLabel: string;
  id: string;
  liked: boolean;
  playCount?: number;
  publishedAt?: number;
  sourceLabel: string;
  title: string;
  voted: boolean;
  voteCount?: number;
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