import React, { useState } from "react";
import { X, Search, Youtube, Upload, Check, Plus } from "lucide-react";
import { Song, LyricLine } from "../types";

interface ImportMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: Song) => void;
}

export const ImportMusicModal: React.FC<ImportMusicModalProps> = ({
  isOpen,
  onClose,
  onAddSong,
}) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyricsText, setLyricsText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  if (!isOpen) return null;

  const parseLRC = (lrcString: string): LyricLine[] => {
    const lines: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    for (const rawLine of lrcString.split("\n")) {
      const match = rawLine.match(regex);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3].padEnd(3, "0")) / 1000;
        lines.push({ time: Number(time.toFixed(2)), text: match[4].trim() });
      } else if (rawLine.trim()) {
        lines.push({ time: lines.length * 4, text: rawLine.trim() });
      }
    }
    return lines.sort((a, b) => a.time - b.time);
  };

  const extractYouTubeId = (url: string): string | undefined => {
    const match = url.match(/^.*(youtu.be\/|v\/|watch\?v=)([^#\&\?]*).*/);
    return match && match[2].length === 11 ? match[2] : undefined;
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setStatusMsg("Judul lagu wajib diisi.");
      return;
    }
    const ytId = extractYouTubeId(youtubeUrl);
    const lyricsLines = lyricsText ? parseLRC(lyricsText) : [
      { time: 0, text: `♪ ${title} - ${artist || "Aizat Music"} ♪` },
      { time: 4, text: "Lirik akan dimuat otomatis..." },
    ];
    const newSong: Song = {
      id: `custom-${Date.now()}`,
      title,
      artist: artist || "Artis Lokal",
      album: "Imported",
      coverBg: "from-pink-800 via-purple-950 to-neutral-900",
      audioUrl: audioFile ? URL.createObjectURL(audioFile) : undefined,
      youtubeVideoId: ytId,
      lyrics: lyricsLines,
      genre: genre || "Pop",
      duration: "03:30",
      durationSec: 210,
      bpm: 100,
      key: "C Major",
    };
    onAddSong(newSong);
    setStatusMsg(`Lagu "${title}" berhasil ditambahkan!`);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn font-sans">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-pink-400" />
            <h3 className="font-extrabold text-base">Import Musik</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {statusMsg && (
            <div className="p-2.5 bg-pink-950/80 border border-pink-800 text-pink-300 text-xs rounded-xl flex items-center justify-between">
              <span>{statusMsg}</span>
              <Check className="w-4 h-4 text-pink-400" />
            </div>
          )}

          <div className="bg-black/40 p-3 rounded-2xl border border-neutral-800 space-y-2">
            <label className="text-xs font-bold text-neutral-300 block">Link YouTube (opsional):</label>
            <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Judul Lagu *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Artis</label>
              <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Penyanyi" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">Upload Audio MP3/WAV (opsional):</label>
            <label className="w-full border-2 border-dashed border-neutral-700 hover:border-pink-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition text-xs text-neutral-400">
              <Upload className="w-4 h-4" />
              {audioFile ? audioFile.name : "Pilih file audio"}
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} className="hidden" />
            </label>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">Lirik LRC (opsional):</label>
            <textarea value={lyricsText} onChange={(e) => setLyricsText(e.target.value)} placeholder="[00:05.00] Baris pertama..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-500 resize-none h-24" />
          </div>

          <button onClick={handleSubmit} className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer">
            <Plus className="w-4 h-4" /> Tambah Lagu
          </button>
        </div>
      </div>
    </div>
  );
};
