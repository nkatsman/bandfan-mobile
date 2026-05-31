import type { SongTableFilterMode, SongTableSortMode } from '../../components/song-table';
import type { Song } from '../../types/music';

export const DISCOVER_SORT_MODES: SongTableSortMode[] = ['best-new', 'published-desc', 'plays-desc', 'votes-desc'];
export const LIBRARY_SORT_MODES: SongTableSortMode[] = ['votes-desc', 'published-desc', 'plays-desc'];

function normalizeStatus(status: string | undefined) {
  return status?.trim().toLowerCase().replace(/[_-]+/g, ' ') ?? '';
}

export function matchesSongFilter(song: Song, filterMode: SongTableFilterMode) {
  const status = normalizeStatus(song.sourceLabel);

  if (filterMode === 'released') {
    return status === 'mastered' || status === 'sent to stores' || status === 'released';
  }

  if (filterMode === 'in-progress') {
    return status === 'recorded' || status === 'mixed';
  }

  if (filterMode === 'demo') {
    return status === 'demo';
  }

  return true;
}

export function sortSongs(songs: Song[], sortMode: SongTableSortMode) {
  if (sortMode === 'published-desc' || sortMode === 'published-asc') {
    return sortByNumericValue(songs, sortMode, (song) => song.publishedAt ?? 0);
  }

  if (sortMode === 'plays-desc' || sortMode === 'plays-asc') {
    return sortByNumericValue(songs, sortMode, (song) => song.playCount ?? 0);
  }

  if (sortMode === 'votes-desc' || sortMode === 'votes-asc') {
    return sortByNumericValue(songs, sortMode, (song) => song.voteCount ?? (song.voted ? 1 : 0));
  }

  return songs;
}

function sortByNumericValue(songs: Song[], sortMode: SongTableSortMode, getValue: (song: Song) => number) {
  const direction = sortMode.endsWith('-asc') ? 1 : -1;

  return songs
    .map((song, index) => ({ index, song }))
    .sort((left, right) => {
      const valueDifference = (getValue(left.song) - getValue(right.song)) * direction;

      if (valueDifference !== 0) {
        return valueDifference;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.song);
}