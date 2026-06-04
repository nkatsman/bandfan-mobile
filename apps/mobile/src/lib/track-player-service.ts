import TrackPlayer, { Event } from 'react-native-track-player';

import { usePlayerStore } from '../state/player-store';
import { remoteToggleLike, remoteToggleVote } from '../state/player-store';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => { void TrackPlayer.play(); });
  TrackPlayer.addEventListener(Event.RemotePause, () => { void TrackPlayer.pause(); });
  TrackPlayer.addEventListener(Event.RemoteStop, () => { usePlayerStore.getState().stopPlayback(); });
  TrackPlayer.addEventListener(Event.RemoteNext, () => { usePlayerStore.getState().nextTrack(); });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => { usePlayerStore.getState().previousTrack(); });
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => { void TrackPlayer.seekTo(position); });
  TrackPlayer.addEventListener(Event.RemoteLike, () => { void remoteToggleLike(); });
  TrackPlayer.addEventListener(Event.RemoteDislike, () => { void remoteToggleVote(); });
}
