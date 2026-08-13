import React, { useState, useEffect, useRef } from "react";
import { Search, Upload, Edit3, Sparkles, Check, RefreshCw } from "lucide-react";
import { Song, LyricLine } from "../types";

interface LyricsViewerProps {
  song: Song;
  currentTime: number;
  onSeek?: (time: number) => void;
  onUpdateLyrics?: (newLines: LyricLine[]) => void;
}

export const LyricsViewer: React.FC<LyricsViewerProps> = ({
  song,
  currentTime,
  onSeek,
  onUpdateLyrics,
}) => {
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lrcInput, setLrcInput] = useState<string>("");
  const [loadingFetch, setLoadingFetch] = useState<boolean>(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Determine current active lyric line
  useEffect(() => {
    if (!song.lyrics || song.lyrics.length === 0) return;
    let idx = 0;
    for (let i = 0; i < song.lyrics.length; i++) {
      if (currentTime >= song.lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    setActiveLineIndex(idx);
  }, [currentTime, song.lyrics]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLineIndex]);

  // Parse LRC text format: [mm:ss.xx] Lyric text
  const parseLRC = (lrcText: string): LyricLine[] => {
    const lines = lrcText.split("\n");
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = parseInt(match[3], 10);
        const totalSecs = mins * 60 + secs + ms / (match[3].length === 3 ? 1000 : 100);
        const text = match[4].trim();
        if (text) {
          result.push({ time: totalSecs, text });
        }
      } else {
        const textOnly = line.trim();
        if (textOnly && !textOnly.startsWith("[")) {
          result.push({ time: result.length * 5, text: textOnly });
        }
      }
    }

    return result.sort((a, b) => a.time - b.time);
  };

  const handleLrcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && onUpdateLyrics) {
        const parsed = parseLRC(content);
        if (parsed.length > 0) {
          onUpdateLyrics(parsed);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFetchOnlineLyrics = async () => {
    setLoadingFetch(true);
    try {
      const res = await fetch("/api/lyrics/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: song.title, artist: song.artist }),
      });
      const data = await res.json();
      if (data.lrcText && onUpdateLyrics) {
        const parsed = parseLRC(data.lrcText);
        if (parsed.length > 0) {
          onUpdateLyrics(parsed);
        }
      }
    } catch (err) {
      console.error("Fetch lyrics failed:", err);
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleSaveManualEdit = () => {
    if (lrcInput && onUpdateLyrics) {
      const parsed = parseLRC(lrcInput);
      if (parsed.length > 0) {
        onUpdateLyrics(parsed);
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 rounded-2xl border border-white/10 overflow-hidden">
      {/* Action Header */}
      <div className="px-4 py-3 bg-neutral-900 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
        <span className="font-bold text-pink-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Lirik Synced LRC
        </span>

        <div className="flex items-center gap-2">
          {/* Fetch AI Lyrics */}
          <button
            onClick={handleFetchOnlineLyrics}
            disabled={loadingFetch}
            className="flex items-center gap-1 bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 text-purple-200 px-2.5 py-1 rounded-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFetch ? "animate-spin" : ""}`} />
            <span>{loadingFetch ? "Mencari..." : "Cari Online"}</span>
          </button>

          {/* LRC Upload */}
          <label className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded-md cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload .LRC</span>
            <input
              type="file"
              accept=".lrc,.txt"
              className="hidden"
              onChange={handleLrcUpload}
            />
          </label>

          {/* Edit Manually */}
          <button
            onClick={() => {
              if (!isEditing) {
                const initialText = song.lyrics
                  .map((l) => {
                    const mins = Math.floor(l.time / 60);
                    const secs = Math.floor(l.time % 60);
                    return `[${mins.toString().padStart(2, "0")}:${secs
                      .toString()
                      .padStart(2, "0")}.00] ${l.text}`;
                  })
                  .join("\n");
                setLrcInput(initialText);
              }
              setIsEditing(!isEditing);
            }}
            className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded-md transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? "Batal" : "Edit"}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isEditing ? (
        <div className="p-4 flex-1 flex flex-col gap-3">
          <p className="text-xs text-neutral-400">
            Format LRC: <code className="text-pink-400">[00:12.50] Baris lirik lagu</code>
          </p>
          <textarea
            value={lrcInput}
            onChange={(e) => setLrcInput(e.target.value)}
            placeholder="[00:00.00] Baris lirik..."
            className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-pink-500/50 resize-none min-h-[200px]"
          />
          <button
            onClick={handleSaveManualEdit}
            className="flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-xl text-xs transition"
          >
            <Check className="w-4 h-4" />
            Simpan Lirik
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-center scrollbar-thin scrollbar-thumb-neutral-800">
          {song.lyrics && song.lyrics.length > 0 ? (
            song.lyrics.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek && onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-xl ${
                    isActive
                      ? "text-pink-400 font-bold text-xl md:text-2xl scale-105 bg-pink-500/10 border border-pink-500/20 shadow-lg"
                      : "text-neutral-400 hover:text-white text-base md:text-lg opacity-60 hover:opacity-100"
                  }`}
                >
                  {line.text}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-sm">
              <p>Belum ada lirik untuk lagu ini.</p>
              <p className="text-xs mt-1">Gunakan tombol 'Cari Online' atau 'Upload .LRC' di atas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
