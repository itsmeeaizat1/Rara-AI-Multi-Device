export interface LyricLine {
  time: number;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverBg: string;
  coverImage?: string;
  audioUrl?: string;
  youtubeVideoId?: string;
  lyrics: LyricLine[];
  genre: string;
  duration: string;
  durationSec: number;
  bpm: number;
  key: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  isPopular?: boolean;
}

export interface AudioFX {
  eq12Bands: number[];
  eqPreset: string;
  reverbRoomSize: number;
  reverbMix: number;
  reverbPreset: string;
  echoLevel: number;
  echoDelayTime: number;
  echoFeedback: number;
  echoPreset: string;
  micVolume: number;
  musicVolume: number;
  vocalMonitor: boolean;
  noiseSuppression: boolean;
  pitchShift: number;
  compressionGuard: boolean;
}

export interface Recording {
  id: string;
  songId: string;
  songTitle: string;
  artist: string;
  recordedAt: string;
  audioBlobUrl: string;
  durationSec: number;
  score: number;
  coverBg: string;
  vocalTips?: string[];
  aiFeedback?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatar: string;
  rankTitle: string;
  totalSingTimeMinutes: number;
  totalRecordings: number;
  followers: number;
  isLoggedIn: boolean;
}
