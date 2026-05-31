import { Playlist, Song } from '../types/music';

export const seedSongs: Song[] = [
  {
    artist: 'Glass Harbor',
    artworkColor: '#E7BF7B',
    durationLabel: '3:24',
    id: 'song-glass-harbor-satellite',
    liked: true,
    sourceLabel: 'DISCOVER',
    title: 'Satellite Hearts',
    voted: true,
  },
  {
    artist: 'North Parade',
    artworkColor: '#E3A0A0',
    durationLabel: '2:58',
    id: 'song-north-parade-afterglow',
    liked: false,
    sourceLabel: 'DISCOVER',
    title: 'Afterglow District',
    voted: false,
  },
  {
    artist: 'The Echo Union',
    artworkColor: '#A2BAA2',
    durationLabel: '4:06',
    id: 'song-echo-union-battery-street',
    liked: true,
    sourceLabel: 'DISCOVER',
    title: 'Battery Street',
    voted: false,
  },
  {
    artist: 'Pine Static',
    artworkColor: '#8FACCE',
    durationLabel: '3:41',
    id: 'song-pine-static-loud-enough',
    liked: false,
    sourceLabel: 'DISCOVER',
    title: 'Loud Enough For Summer',
    voted: true,
  },
];

export const seedPlaylists: Playlist[] = [
  {
    description: 'Songs you marked as favorites for fast personal listening.',
    id: 'favorites',
    isPinned: true,
    kind: 'favorites',
    sourceLabel: 'BUILT IN',
    title: 'Favorites',
    trackIds: seedSongs.filter((song) => song.liked).map((song) => song.id),
    visibility: 'private',
  },
  {
    description: 'Songs you voted for and want to keep close.',
    id: 'voted',
    isPinned: true,
    kind: 'voted',
    sourceLabel: 'BUILT IN',
    title: 'Voted',
    trackIds: seedSongs.filter((song) => song.voted).map((song) => song.id),
    visibility: 'private',
  },
];