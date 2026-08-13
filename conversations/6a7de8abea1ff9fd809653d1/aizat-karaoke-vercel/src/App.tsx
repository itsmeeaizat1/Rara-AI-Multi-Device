import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Mic,
  Search,
  Home,
  TrendingUp,
  User,
  Bell,
  Heart,
  MessageCircle,
  Share2,
  PlusCircle,
  Sparkles,
  Music,
  Headphones,
  Volume2,
} from "lucide-react";
import { Song, AudioFX, Recording, UserProfile, LyricLine } from "./types";
import { INITIAL_SONGS } from "./data/songs";
import { audioEngine } from "./lib/audioEngine";
import { Sidebar } from "./components/Sidebar";
import { PerformanceCard } from "./components/PerformanceCard";
import { TopBar } from "./components/TopBar";
import { PlayerBar } from "./components/PlayerBar";
import { FullScreenPlayer } from "./components/FullScreenPlayer";
import { KaraokeStudio } from "./components/KaraokeStudio";
import { EqualizerModal } from "./components/EqualizerModal";
import { ImportMusicModal } from "./components/ImportMusicModal";
import { RecordingsList } from "./components/RecordingsList";
import { UserProfileModal } from "./components/UserProfileModal";

export default function App() {
  // State
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("home");

  // Modals
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [isKaraokeOpen, setIsKaraokeOpen] = useState<boolean>(false);
  const [isEQOpen, setIsEQOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("Semua");

  // Recordings (Smule-style social feed data)
  const [recordings, setRecordings] = useState<Recording[]>([]);

  // Mock social feed — Smule style performances by other users
  const [feedPerformances] = useState<FeedPerformance[]>(MOCK_FEED_PERFORMANCES);

  // User Profile
  const [user, setUser] = useState<UserProfile>({
    name: "Aizat Alamudin",
    username: "aizat_music_studio",
    email: "aizatalamudinindonesia.plus@gmail.com",
    avatar: "",
    rankTitle: "Vokalis Utama Aizat Smule",
    totalSingTimeMinutes: 48,
    totalRecordings: 3,
    followers: 1280,
    isLoggedIn: true,
  });

  // Audio FX state
  const [fx, setFx] = useState<AudioFX>({
    eq12Bands: [0, 1, 2, 4, 5, 6, 5, 4, 3, 2, 1, 0],
    eqPreset: "TikTok Clear",
    reverbRoomSize: 0.5,
    reverbMix: 0.35,
    reverbPreset: "TikTok Reverb",
    echoLevel: 0.25,
    echoDelayTime: 0.18,
    echoFeedback: 0.35,
    echoPreset: "Smule Clean",
    micVolume: 1.2,
    musicVolume: 0.8,
    vocalMonitor: false,
    noiseSuppression: true,
    pitchShift: 0,
    compressionGuard: true,
  });

  useEffect(() => {
    audioEngine.updateFX(fx);
  }, [fx]);

  // === Handlers ===
  const handlePlayPause = (songToPlay?: Song) => {
    const target = songToPlay || currentSong;
    if (!target) return;
    if (currentSong?.id !== target.id) {
      setCurrentSong(target);
      setCurrentTime(0);
      setIsPlaying(true);
      audioEngine.playMusic(target.audioUrl, target.bpm, (t) => setCurrentTime(t));
    } else {
      if (isPlaying) {
        audioEngine.pauseMusic();
        setIsPlaying(false);
      } else {
        audioEngine.resumeMusic();
        setIsPlaying(true);
      }
    }
  };

  const handleNextSong = () => {
    if (songs.length === 0) return;
    if (!currentSong) return;
    const idx = songs.findIndex((s) => s.id === currentSong.id);
    handlePlayPause(songs[(idx + 1) % songs.length]);
  };

  const handlePrevSong = () => {
    if (songs.length === 0) return;
    if (!currentSong) return;
    const idx = songs.findIndex((s) => s.id === currentSong.id);
    handlePlayPause(songs[(idx - 1 + songs.length) % songs.length]);
  };

  const handleSeek = (timeSec: number) => {
    setCurrentTime(timeSec);
    audioEngine.seekMusic(timeSec);
  };

  const handleSaveRecording = (rec: Recording) => {
    setRecordings((prev) => [rec, ...prev]);
  };

  const handleAddSong = (song: Song) => {
    setSongs((prev) => [song, ...prev]);
  };

  const handleUpdateLyrics = (newLines: LyricLine[]) => {
    if (!currentSong) return;
    const updated = { ...currentSong, lyrics: newLines };
    setCurrentSong(updated);
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Filter songs for search
  const filteredSongs = songs.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGenre = selectedGenre === "Semua" || s.genre === selectedGenre;
    return matchSearch && matchGenre;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex font-sans">
      {/* === Smule-style Left Sidebar === */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === "karaoke") setIsKaraokeOpen(true);
          else if (tab === "eq") setIsEQOpen(true);
          else setActiveTab(tab);
        }}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        recordingsCount={recordings.length}
      />

      {/* === Main Content Area === */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64 min-h-screen">
        {/* Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
        />

        {/* === Feed Content === */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-20">
          {activeTab === "home" && (
            <div className="max-w-4xl mx-auto px-4 py-6">
              {/* Hero Banner */}
              <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 md:p-10">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <span className="text-yellow-300 text-sm font-semibold uppercase tracking-wider">
                      Aizat Karaoke Studio
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-bold mb-2">
                    Nyanyi. Kolaborasi. Viral.
                  </h1>
                  <p className="text-white/80 text-sm md:text-base mb-4 max-w-lg">
                    Join komunitas karaoke terbesar. Rekam suara kamu, dapatkan
                    AI feedback, dan bikin duet bareng temen.
                  </p>
                  <button
                    onClick={() => setIsKaraokeOpen(true)}
                    className="inline-flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-full hover:bg-white/90 transition shadow-lg"
                  >
                    <Mic className="w-4 h-4" />
                    Mulai Karaoke
                  </button>
                </div>
              </div>

              {/* Section: Trending Performances (Smule Feed) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-pink-500" />
                  <h2 className="text-lg font-bold">Trending Karaoke</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feedPerformances.map((perf) => (
                    <PerformanceCard
                      key={perf.id}
                      performance={perf}
                      onPlay={() => {
                        const song = songs.find((s) => s.id === perf.songId);
                        if (song) handlePlayPause(song);
                      }}
                      onJoin={() => setIsKaraokeOpen(true)}
                    />
                  ))}
                </div>
              </div>

              {/* Section: Song Library */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Music className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold">Pilih Lagu</h2>
                </div>
                {filteredSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Music className="w-12 h-12 text-neutral-700 mb-3" />
                    <p className="text-neutral-500 text-sm mb-1">Belum ada lagu di pustaka kamu</p>
                    <p className="text-neutral-600 text-xs mb-4">Cari dari YouTube atau upload file audio sendiri</p>
                    <button
                      onClick={() => setIsImportOpen(true)}
                      className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-400 text-black font-bold px-5 py-2.5 rounded-full transition shadow-lg"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Import Musik
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSongs.map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isPlaying={isPlaying && currentSong?.id === song.id}
                        onPlay={() => handlePlayPause(song)}
                        onKaraoke={() => {
                          setCurrentSong(song);
                          setIsKaraokeOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "trending" && (
            <div className="max-w-4xl mx-auto px-4 py-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-500" />
                Trending Hari Ini
              </h2>
              <div className="space-y-4">
                {feedPerformances.map((perf, i) => (
                  <div
                    key={perf.id}
                    className="flex items-center gap-4 bg-neutral-900 rounded-xl p-3 hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <span className="text-2xl font-bold text-neutral-600 w-8 text-center">
                      {i + 1}
                    </span>
                    <div
                      className={`w-14 h-14 rounded-lg bg-gradient-to-br ${perf.coverBg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{perf.songTitle}</p>
                      <p className="text-sm text-neutral-400">
                        {perf.singerName} · {perf.likes} likes
                      </p>
                    </div>
                    <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "library" && (
            <div className="max-w-4xl mx-auto px-4 py-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Rekaman Saya
              </h2>
              <RecordingsList recordings={recordings} />
            </div>
          )}
        </main>

        {/* === Mini Player Bar (Smule-style bottom) === */}
        {currentSong && (
          <PlayerBar
            song={currentSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={() => handlePlayPause()}
            onNext={handleNextSong}
            onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
            onOpenKaraoke={() => setIsKaraokeOpen(true)}
          />
        )}
      </div>

      {/* === Floating Karaoke Button (Smule-style FAB) === */}
      <button
        onClick={() => setIsKaraokeOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/50 flex items-center justify-center hover:scale-110 transition active:scale-95"
        title="Mulai Karaoke"
      >
        <Mic className="w-6 h-6 text-white" />
      </button>

      {/* === Modals === */}
      {isFullPlayerOpen && currentSong && (
        <FullScreenPlayer
          song={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          durationSec={currentSong.durationSec}
          onClose={() => setIsFullPlayerOpen(false)}
          onPlayPause={() => handlePlayPause()}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onSeek={handleSeek}
          onOpenKaraoke={() => {
            setIsFullPlayerOpen(false);
            setIsKaraokeOpen(true);
          }}
          onOpenEQ={() => setIsEQOpen(true)}
          onUpdateLyrics={handleUpdateLyrics}
        />
      )}

      {isKaraokeOpen && currentSong && (
        <KaraokeStudio
          song={currentSong}
          fx={fx}
          onUpdateFX={setFx}
          onClose={() => setIsKaraokeOpen(false)}
          onSaveRecording={handleSaveRecording}
          onOpenEQ={() => setIsEQOpen(true)}
        />
      )}

      <EqualizerModal
        isOpen={isEQOpen}
        onClose={() => setIsEQOpen(false)}
        fx={fx}
        onUpdateFX={setFx}
      />

      <ImportMusicModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onAddSong={handleAddSong}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={setUser}
      />
    </div>
  );
}

// === Song Card Component (Smule-style) ===
function SongCard({
  song,
  isPlaying,
  onPlay,
  onKaraoke,
}: {
  song: Song;
  isPlaying: boolean;
  onPlay: () => void;
  onKaraoke: () => void;
}) {
  return (
    <div className="group bg-neutral-900 rounded-xl overflow-hidden hover:bg-neutral-800 transition cursor-pointer">
      {/* Cover */}
      <div
        className={`relative aspect-square bg-gradient-to-br ${song.coverBg} flex items-center justify-center overflow-hidden`}
      >
        {song.coverImage && (
          <img
            src={song.coverImage}
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Play overlay */}
        <button
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition"
        >
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </div>
        </button>
        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {song.duration}
        </span>
        {/* Karaoke badge */}
        <button
          onClick={onKaraoke}
          className="absolute top-2 left-2 bg-pink-500/90 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 hover:bg-pink-500 transition"
        >
          <Mic className="w-3 h-3" />
          Karaoke
        </button>
      </div>
      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{song.title}</h3>
        <p className="text-neutral-400 text-xs mt-0.5 truncate">
          {song.artist}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {Math.floor(Math.random() * 999) + 100}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {Math.floor(Math.random() * 99) + 10}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-3 h-3" /> {Math.floor(Math.random() * 50) + 5}
          </span>
        </div>
      </div>
    </div>
  );
}

// === Types for Social Feed ===
interface FeedPerformance {
  id: string;
  songId: string;
  songTitle: string;
  originalArtist: string;
  singerName: string;
  singerAvatar: string;
  coverBg: string;
  duration: string;
  likes: number;
  comments: number;
  shares: number;
  isCollab: boolean;
  collabPartner?: string;
  timeAgo: string;
}

// === Mock Social Feed Data (Smule-style) ===
const MOCK_FEED_PERFORMANCES: FeedPerformance[] = [
  {
    id: "p1",
    songId: "1",
    songTitle: "Bunga",
    originalArtist: "Last Child",
    singerName: "RaraKirana",
    singerAvatar: "",
    coverBg: "from-pink-500 to-rose-600",
    duration: "04:12",
    likes: 3420,
    comments: 287,
    shares: 56,
    isCollab: false,
    timeAgo: "2 jam lalu",
  },
  {
    id: "p2",
    songId: "2",
    songTitle: "Dengarkan Wanita",
    originalArtist: "Judika",
    singerName: "AldiVocal",
    singerAvatar: "",
    coverBg: "from-purple-500 to-indigo-600",
    duration: "03:45",
    likes: 1890,
    comments: 156,
    shares: 34,
    isCollab: true,
    collabPartner: "SariDiva",
    timeAgo: "5 jam lalu",
  },
  {
    id: "p3",
    songId: "3",
    songTitle: "Kangen",
    originalArtist: "Dewa 19",
    singerName: "VitoSinger",
    singerAvatar: "",
    coverBg: "from-orange-500 to-amber-600",
    duration: "05:20",
    likes: 5600,
    comments: 423,
    shares: 120,
    isCollab: false,
    timeAgo: "1 hari lalu",
  },
  {
    id: "p4",
    songId: "4",
    songTitle: "Cinta Terakhir",
    originalArtist: "Judika",
    singerName: "NiaKaraoke",
    singerAvatar: "",
    coverBg: "from-emerald-500 to-teal-600",
    duration: "04:30",
    likes: 2100,
    comments: 189,
    shares: 45,
    isCollab: true,
    collabPartner: "RaraKirana",
    timeAgo: "1 hari lalu",
  },
  {
    id: "p5",
    songId: "5",
    songTitle: "Selamanya Cinta",
    originalArtist: "Astrid",
    singerName: "BayuSing",
    singerAvatar: "",
    coverBg: "from-blue-500 to-cyan-600",
    duration: "03:58",
    likes: 890,
    comments: 67,
    shares: 12,
    isCollab: false,
    timeAgo: "2 hari lalu",
  },
  {
    id: "p6",
    songId: "6",
    songTitle: "Mungkin Hari Ini Esok",
    originalArtist: "Sheila On 7",
    singerName: "DaraVoice",
    singerAvatar: "",
    coverBg: "from-red-500 to-pink-600",
    duration: "04:15",
    likes: 4200,
    comments: 312,
    shares: 89,
    isCollab: true,
    collabPartner: "VitoSinger",
    timeAgo: "3 hari lalu",
  },
];
