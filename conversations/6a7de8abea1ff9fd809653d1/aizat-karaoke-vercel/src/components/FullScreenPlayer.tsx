import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic,
  Sliders,
  Youtube,
  Music,
  AlignLeft,
  Disc,
} from "lucide-react";
import { Song, LyricLine } from "../types";
import { LyricsViewer } from "./LyricsViewer";

interface FullScreenPlayerProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  durationSec: number;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onOpenKaraoke: () => void;
  onOpenEQ: () => void;
  onUpdateLyrics: (newLines: LyricLine[]) => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  song,
  isPlaying,
  currentTime,
  durationSec,
  onClose,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onOpenKaraoke,
  onOpenEQ,
  onUpdateLyrics,
}) => {
  const [activeTab, setActiveTab] = useState<"cover" | "lyrics" | "youtube">("cover");

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between overflow-hidden">
      {/* Background Gradient & Blur */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${song.coverBg} opacity-30 blur-3xl scale-125 pointer-events-none`}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-full border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("cover")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              activeTab === "cover" ? "bg-pink-500 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            Cover
          </button>
          <button
            onClick={() => setActiveTab("lyrics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              activeTab === "lyrics" ? "bg-pink-500 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Lirik
          </button>
          <button
            onClick={() => setActiveTab("youtube")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              activeTab === "youtube" ? "bg-pink-500 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-400" />
            YouTube
          </button>
        </div>

        {/* EQ Button */}
        <button
          onClick={onOpenEQ}
          className="p-2 text-pink-400 hover:text-pink-300 rounded-full bg-pink-500/10 border border-pink-500/20 transition flex items-center gap-1 text-xs font-semibold"
          title="Equalizer & FX"
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">EQ</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        {activeTab === "cover" && (
          <div className="flex flex-col items-center text-center max-w-md w-full my-auto">
            <div
              className={`w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-gradient-to-br ${song.coverBg} flex items-center justify-center shadow-2xl border border-white/20 mb-8 relative group overflow-hidden`}
            >
              <Music className="w-24 h-24 text-white/40 group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-left border border-white/10">
                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                  {song.genre} • {song.key} • {song.bpm} BPM
                </span>
                <p className="text-xs text-white/80 font-medium truncate">
                  {song.album || "Aizat Karaoke Selection"}
                </p>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate w-full">
              {song.title}
            </h2>
            <p className="text-base text-pink-400 font-medium mb-4">
              {song.artist}
            </p>
          </div>
        )}

        {activeTab === "lyrics" && (
          <div className="w-full max-w-2xl h-full flex flex-col">
            <LyricsViewer
              song={song}
              currentTime={currentTime}
              onSeek={onSeek}
              onUpdateLyrics={onUpdateLyrics}
            />
          </div>
        )}

        {activeTab === "youtube" && (
          <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-black">
            {song.youtubeVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${song.youtubeVideoId}?enablejsapi=1src={`https://www.youtube.com/embed/${song.youtubeVideoId}?autoplay=1&enablejsapi=1`}mute=1`}
                title={song.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <Youtube className="w-16 h-16 text-neutral-600 mb-4" />
                <p className="text-neutral-400">Video YouTube belum tersedia untuk lagu ini.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="relative z-10 px-6 py-6 bg-black/60 backdrop-blur-xl border-t border-white/10 flex flex-col gap-4 max-w-3xl mx-auto w-full rounded-t-3xl">
        {/* Timeline Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={durationSec || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex justify-between text-xs text-neutral-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(durationSec)}</span>
          </div>
        </div>

        {/* Playback & Sing Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={onOpenEQ}
            className="p-3 text-neutral-400 hover:text-white rounded-full bg-white/5 transition"
            title="FX Equalizer"
          >
            <Sliders className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={onPrev}
              className="p-3 text-white hover:text-pink-400 transition"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={onPlayPause}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-white" />
              ) : (
                <Play className="w-8 h-8 fill-white ml-1" />
              )}
            </button>

            <button
              onClick={onNext}
              className="p-3 text-white hover:text-pink-400 transition"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={onOpenKaraoke}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-4 py-2.5 rounded-full shadow-lg shadow-pink-500/40 transition active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>SING</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
