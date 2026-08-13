import React, { useState } from "react";
import { Play, Pause, Download, Trash2, Disc, Award, Sparkles, Music } from "lucide-react";
import { Recording } from "../types";

interface RecordingsListProps {
  recordings: Recording[];
  onDeleteRecording: (id: string) => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  onDeleteRecording,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElem, setAudioElem] = useState<HTMLAudioElement | null>(null);
  const [selectedReview, setSelectedReview] = useState<Recording | null>(null);

  const handlePlayPause = (rec: Recording) => {
    if (playingId === rec.id) {
      audioElem?.pause();
      setPlayingId(null);
    } else {
      audioElem?.pause();
      const audio = new Audio(rec.audioBlobUrl);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingId(null);
      setAudioElem(audio);
      setPlayingId(rec.id);
    }
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto font-sans text-white">
      <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <Disc className="w-5 h-5 text-pink-400" />
          Koleksi Rekaman
        </h2>
      </div>

      {recordings.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-neutral-900/60 rounded-3xl border border-neutral-800">
          <Disc className="w-12 h-12 text-neutral-600 mb-3 animate-spin" />
          <h3 className="font-bold text-sm text-neutral-300">Belum Ada Rekaman</h3>
          <p className="text-xs text-neutral-500 mt-1">Mulai bernyanyi di Karaoke Studio untuk rekam vokalmu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map((rec) => (
            <div key={rec.id} className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-pink-500/50 transition group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${rec.coverBg} flex items-center justify-center shrink-0 border border-neutral-700`}>
                  <Music className="w-6 h-6 text-white/80" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{rec.songTitle}</h4>
                  <p className="text-xs text-neutral-400 truncate">{rec.artist} • {rec.recordedAt}</p>
                  <span className="text-[10px] font-mono font-bold bg-pink-950/80 text-pink-300 px-2 py-0.5 rounded border border-pink-800/60">SKOR: {rec.score}/100</span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                {rec.aiFeedback && (
                  <button onClick={() => setSelectedReview(rec)} className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5" /> Review AI
                  </button>
                )}
                <button onClick={() => handlePlayPause(rec)} className="p-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-bold transition cursor-pointer">
                  {playingId === rec.id ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                </button>
                <button onClick={() => { const a = document.createElement("a"); a.href = rec.audioBlobUrl; a.download = `Aizat_Karaoke_${rec.songTitle.replace(/\s+/g, "_")}.webm`; a.click(); }} className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteRecording(rec.id)} className="p-2.5 rounded-xl bg-neutral-800 hover:bg-rose-900 text-neutral-400 hover:text-rose-300 transition cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-5 space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-sm">Review Juri Vokal AI</h3>
              </div>
              <button onClick={() => setSelectedReview(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-neutral-300 italic bg-black/40 p-3 rounded-xl border border-neutral-800">"{selectedReview.aiFeedback}"</p>
            {selectedReview.vocalTips && (
              <div className="space-y-1.5">
                {selectedReview.vocalTips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-pink-300">• {tip}</p>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedReview(null)} className="w-full py-2 bg-pink-500 text-black font-bold text-xs rounded-xl hover:bg-pink-400 transition">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};
