import React from "react";
import { Play, Pause, SkipForward, Maximize2, Mic, Music } from "lucide-react";
import { Song } from "../types";

interface PlayerBarProps {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
  onNext: () => void;
  onOpenFullPlayer: () => void;
  onOpenKaraoke: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  song,
  isPlaying,
  currentTime,
  onPlayPause,
  onNext,
  onOpenFullPlayer,
  onOpenKaraoke,
}) => {
  if (!song) return null;

  const progressPercent = song.durationSec > 0 ? (currentTime / song.durationSec) * 100 : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-lg border-t border-pink-500/20 shadow-2xl">
      {/* Mini Progress Bar */}
      <div className="w-full bg-neutral-800 h-1 relative">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-500 h-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Song Info & Gradient Cover */}
        <div
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          onClick={onOpenFullPlayer}
        >
          <div
            className={`w-11 h-11 rounded-lg bg-gradient-to-br ${song.coverBg} flex items-center justify-center flex-shrink-0 shadow-md border border-white/10 group-hover:scale-105 transition`}
          >
            <Music className="w-5 h-5 text-white/80" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-white truncate group-hover:text-pink-400 transition">
              {song.title}
            </h4>
            <p className="text-xs text-neutral-400 truncate">
              {song.artist}
            </p>
            <div className="text-[10px] text-neutral-500 font-mono hidden sm:block">
              {formatTime(currentTime)} / {song.duration}
            </div>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* SING Karaoke Button */}
          <button
            onClick={onOpenKaraoke}
            className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-md hover:scale-105 transition active:scale-95"
            title="Mulai Karaoke Studio"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            <span>SING</span>
          </button>

          {/* Play / Pause */}
          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition shadow-md active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          {/* Next Song */}
          <button
            onClick={onNext}
            className="p-2 text-neutral-400 hover:text-white transition rounded-full hover:bg-neutral-800"
            title="Lagu Berikutnya"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Maximize Full Player */}
          <button
            onClick={onOpenFullPlayer}
            className="p-2 text-neutral-400 hover:text-white transition rounded-full hover:bg-neutral-800 hidden sm:flex"
            title="Buka Player Penuh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
