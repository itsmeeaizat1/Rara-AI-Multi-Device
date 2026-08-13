import React, { useState } from "react";
import { X, Search, Youtube, Upload, Check, Plus, Music } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyricsText, setLyricsText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedYtId, setSelectedYtId] = useState<string | undefined>(undefined);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  if (!isOpen) return null;

  const handleSearchOnline = async () => {
    if (!query.trim()) return;
    setIsLoadingSearch(true);
    setStatusMsg("🕐 Mencari lagu di YouTube...");

    try {
      const res = await fetch("/api/music/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setStatusMsg(`✅ Ditemukan ${data.results.length} hasil dari YouTube!`);
      } else {
        setStatusMsg("Tidak ada hasil. Coba kata kunci lain.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setStatusMsg("Gagal mencari. Cek koneksi internet.");
    } finally {
      setIsLoadingSearch(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleSelectResult = (res: any) => {
    setTitle(res.title);
    setArtist(res.artist);
    setGenre(res.genre || "Pop");
    if (res.youtubeVideoId) {
      setSelectedYtId(res.youtubeVideoId);
      setYoutubeUrl(`https://www.youtube.com/watch?v=${res.youtubeVideoId}`);
    }
    if (res.sampleLyric) {
      setLyricsText(`[00:05.00] ${res.sampleLyric}\n[00:15.00] Lirik akan dimuat otomatis...`);
    }
    setStatusMsg(`✅ "${res.title}" terpilih! Klik "Tambah Lagu" untuk simpan.`);
    setTimeout(() => setStatusMsg(""), 4000);
  };

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

    const ytId = selectedYtId || extractYouTubeId(youtubeUrl);
    const lyricsLines = lyricsText
      ? parseLRC(lyricsText)
      : [
          { time: 0, text: `♪ ${title} - ${artist || "Aizat Music"} ♪` },
          { time: 4, text: "Klik 'Lirik Online' di player untuk cari lirik otomatis" },
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
      youtubeUrl: youtubeUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined),
    };

    onAddSong(newSong);
    setStatusMsg(`✅ Lagu "${title}" berhasil ditambahkan!`);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn font-sans">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-pink-400" />
            <div>
              <h3 className="font-extrabold text-base">Import Musik Online</h3>
              <p className="text-xs text-neutral-400">Cari di YouTube atau upload file manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer">
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

          {/* Section 1: Online Search */}
          <div className="bg-black/40 p-3 rounded-2xl border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-neutral-300 block">
              1. Cari di YouTube:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchOnline()}
                placeholder="Judul lagu, artis, atau link YouTube"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleSearchOnline}
                disabled={isLoadingSearch}
                className="bg-pink-500 hover:bg-pink-400 text-black font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {isLoadingSearch ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Cari...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Cari
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectResult(res)}
                    className="p-2.5 bg-neutral-950 hover:bg-pink-950/60 rounded-xl border border-neutral-800 hover:border-pink-500 flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-pink-900/40 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4 text-pink-400" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-pink-300 truncate">{res.title}</h5>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {res.artist} • {res.genre}
                        </p>
                      </div>
                    </div>
                    <button className="text-[10px] bg-pink-500 text-black px-2 py-1 rounded font-bold shrink-0 ml-2">
                      Pilih
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Song Info */}
          <div className="bg-black/40 p-3 rounded-2xl border border-neutral-800 space-y-3">
            <span className="text-xs font-bold text-neutral-300 block">
              2. Detail Lagu:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Judul Lagu *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Tak Ingin Usai"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Penyanyi</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Contoh: Keisya Levronka"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Link YouTube (opsional)</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Upload Audio MP3/WAV (opsional)</label>
              <label className="w-full border-2 border-dashed border-neutral-700 hover:border-pink-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition text-xs text-neutral-400">
                <Upload className="w-4 h-4" />
                {audioFile ? audioFile.name : "Pilih file audio"}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAudioFile(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Lirik LRC (opsional)</label>
              <textarea
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
                placeholder="[00:05.00] Baris pertama..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-500 resize-none h-24"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Lagu ke Pustaka
          </button>
        </div>
      </div>
    </div>
  );
};
