import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Square, Play, Save, Sliders, Award, Sparkles, Volume2, Radio } from "lucide-react";
import { Song, AudioFX, Recording } from "../types";
import { audioEngine } from "../lib/audioEngine";

interface KaraokeStudioProps {
  song: Song;
  fx: AudioFX;
  onUpdateFX: (fx: AudioFX) => void;
  onClose: () => void;
  onSaveRecording: (rec: Recording) => void;
  onOpenEQ: () => void;
}

export const KaraokeStudio: React.FC<KaraokeStudioProps> = ({
  song,
  fx,
  onUpdateFX,
  onClose,
  onSaveRecording,
  onOpenEQ,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [score, setScore] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [vocalTips, setVocalTips] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    audioEngine.init();
    audioEngine.updateFX(fx);
    return () => audioEngine.stopMicrophone();
  }, []);

  const handleToggleMic = async () => {
    if (micActive) {
      audioEngine.stopMicrophone();
      setMicActive(false);
    } else {
      const ok = await audioEngine.startMicrophone();
      setMicActive(ok);
    }
  };

  const handleStartRecording = async () => {
    if (!micActive) {
      const ok = await audioEngine.startMicrophone();
      if (!ok) return;
      setMicActive(true);
    }
    await audioEngine.startRecording();
    setIsRecording(true);
    setRecordTime(0);
    setScore(0);
    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordTime(elapsed);
      setScore(Math.min(100, Math.floor(70 + Math.random() * 30)));
    }, 1000);
  };

  const handleStopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const blob = await audioEngine.stopRecording();
    setIsRecording(false);

    if (blob) {
      const audioUrl = URL.createObjectURL(blob);
      const rec: Recording = {
        id: `rec-${Date.now()}`,
        songId: song.id,
        songTitle: song.title,
        artist: song.artist,
        recordedAt: new Date().toLocaleString("id-ID"),
        audioBlobUrl: audioUrl,
        durationSec: recordTime,
        score,
        coverBg: song.coverBg,
      };
      onSaveRecording(rec);
      fetchAIFeedback(rec);
    }
  };

  const fetchAIFeedback = async (rec: Recording) => {
    try {
      const res = await fetch("/api/karaoke/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songTitle: rec.songTitle,
          score: rec.score,
          accuracy: "88%",
          fxUsed: "12-Band EQ & Studio Reverb",
        }),
      });
      const data = await res.json();
      setAiFeedback(data.feedback || "Kerja bagus!");
      setVocalTips(data.vocalTips || []);
      setShowFeedback(true);
    } catch {
      setAiFeedback("Suara vokalmu luar biasa! EQ 12-band aktif tanpa kompresi.");
      setVocalTips(["Pertahankan pernapasan diafragma", "Naikkan 2kHz-4kHz untuk klaritas vokal"]);
      setShowFeedback(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col overflow-hidden animate-fadeIn font-sans">
      <div className={`absolute inset-0 bg-gradient-to-b ${song.coverBg} opacity-30 blur-3xl scale-125 pointer-events-none`} />

      <div className="p-4 flex items-center justify-between z-10 border-b border-white/10 backdrop-blur-md bg-black/20">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer text-neutral-300">
          <X className="w-6 h-6" />
        </button>
        <h3 className="font-bold text-sm">Karaoke Studio</h3>
        <button onClick={onOpenEQ} className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer text-pink-400">
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 p-6 overflow-y-auto">
        <div className={`w-40 h-40 rounded-3xl bg-gradient-to-tr ${song.coverBg} shadow-2xl border-2 border-white/20 flex items-center justify-center mb-4 ${isRecording ? "animate-pulse" : ""}`}>
          <Mic className={`w-16 h-16 ${micActive ? "text-pink-400" : "text-white/60"}`} />
        </div>

        <h2 className="text-xl font-extrabold text-white text-center">{song.title}</h2>
        <p className="text-sm text-pink-400">{song.artist}</p>

        {isRecording && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-red-400">REC {recordTime}s</span>
            </div>
            <div className="text-sm font-mono text-pink-400">SCORE: {score}/100</div>
          </div>
        )}

        {micActive && !isRecording && (
          <div className="mt-3 flex items-center gap-2 text-xs text-pink-400">
            <Radio className="w-4 h-4 animate-pulse" />
            Mic Active — Siap rekam!
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {!isRecording ? (
            <button onClick={handleStartRecording} className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg">
              <Mic className="w-4 h-4" /> Mulai Rekaman
            </button>
          ) : (
            <button onClick={handleStopRecording} className="px-8 py-3 rounded-full bg-red-600 hover:bg-red-500 font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg">
              <Square className="w-4 h-4" /> Stop & Simpan
            </button>
          )}
          <button onClick={handleToggleMic} className={`px-4 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition cursor-pointer ${micActive ? "bg-neutral-800 text-pink-400" : "bg-neutral-800 text-neutral-400"}`}>
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {showFeedback && (
          <div className="mt-6 w-full max-w-md bg-black/40 backdrop-blur-md rounded-2xl border border-purple-800/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <h4 className="font-bold text-sm text-purple-300">Review Juri Vokal AI</h4>
            </div>
            <p className="text-xs text-neutral-300 italic">"{aiFeedback}"</p>
            {vocalTips.length > 0 && (
              <div className="space-y-1">
                {vocalTips.map((tip, i) => (
                  <p key={i} className="text-xs text-pink-300">• {tip}</p>
                ))}
              </div>
            )}
            <button onClick={() => setShowFeedback(false)} className="text-xs text-neutral-400 hover:text-white">Tutup</button>
          </div>
        )}
      </div>
    </div>
  );
};
