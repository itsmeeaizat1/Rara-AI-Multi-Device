import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sliders,
  Volume2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Activity,
  Gauge,
  Waves,
  Radio,
} from "lucide-react";
import { AudioFX } from "../types";
import { audioEngine, EQ_FREQUENCIES } from "../lib/audioEngine";

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fx: AudioFX;
  onUpdateFX: (newFx: AudioFX) => void;
}

// === EQ Presets — tuned for Hi-Res engine ===
const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Vocal Boost": [-2, -1, 0, 2, 4, 6, 6, 4, 2, 1, 0, -1],
  "TikTok Clear": [-3, -1, 1, 3, 5, 7, 6, 5, 4, 3, 2, 1],
  "Smule Warm": [2, 3, 2, 1, 2, 4, 5, 3, 2, 1, 0, -1],
  "Bass Master": [8, 7, 5, 3, 1, 0, 0, 0, 1, 2, 3, 2],
  Pop: [-1, 1, 3, 5, 4, 2, 0, 2, 4, 5, 3, 1],
  Rock: [5, 4, 2, 0, -1, 1, 3, 5, 6, 5, 4, 3],
  Acoustic: [3, 2, 1, 1, 2, 3, 4, 4, 3, 2, 2, 1],
  "Hi-Res Air": [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8],
};

const REVERB_PRESETS: Record<string, { room: number; mix: number }> = {
  "Studio Clean": { room: 0.3, mix: 0.2 },
  "TikTok Reverb": { room: 0.5, mix: 0.35 },
  "Concert Hall": { room: 0.8, mix: 0.5 },
  "Echo Stage": { room: 0.6, mix: 0.45 },
  Off: { room: 0.0, mix: 0.0 },
};

const ECHO_PRESETS: Record<string, { delay: number; feedback: number; level: number }> = {
  "Smule Clean": { delay: 0.18, feedback: 0.35, level: 0.30 },
  "Ping Pong": { delay: 0.24, feedback: 0.45, level: 0.35 },
  "Warm Delay": { delay: 0.14, feedback: 0.25, level: 0.20 },
  Off: { delay: 0.05, feedback: 0.0, level: 0.0 },
};

// === Frequency labels for display ===
const FREQ_LABELS = ["32", "64", "125", "250", "500", "1k", "2k", "4k", "8k", "12k", "16k", "20k"];
const FREQ_UNITS = ["Hz", "Hz", "Hz", "Hz", "Hz", "Hz", "Hz", "Hz", "Hz", "Hz", "kHz", "kHz"];

// === Q Factor labels (from audioEngine) ===
const Q_LABELS = [0.8, 0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];
const BAND_TYPES = ["LowShelf", "Peak", "Peak", "Peak", "Peak", "Peak", "Peak", "Peak", "Peak", "Peak", "Peak", "HighShelf"];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  fx,
  onUpdateFX,
}) => {
  const [localFx, setLocalFx] = useState<AudioFX>(fx);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLocalFx(fx);
  }, [fx]);

  // === Realtime Spectrum Visualizer ===
  useEffect(() => {
    if (!isOpen) return;
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const { musicData, micData } = audioEngine.getSpectrumData();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / musicData.length) * 1.5;
          let x = 0;

          for (let i = 0; i < musicData.length; i++) {
            const barHeight = (musicData[i] / 255) * canvas.height;
            const micHeight = (micData[i] / 255) * canvas.height;

            // Music spectrum gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, "#10b981");
            gradient.addColorStop(0.5, "#06b6d4");
            gradient.addColorStop(1, "#f43f5e");

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

            // Mic overlay
            if (micHeight > 2) {
              ctx.fillStyle = "rgba(244, 63, 94, 0.7)";
              ctx.fillRect(x, canvas.height - micHeight, barWidth - 1, micHeight);
            }

            x += barWidth;
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  if (!isOpen) return null;

  // === Calculate headroom info ===
  const maxBoost = Math.max(0, ...localFx.eq12Bands);
  const inputCompensation = 1 / (1 + maxBoost / 12);
  const headroomDB = 20 * Math.log10(inputCompensation);
  const totalBoost = localFx.eq12Bands.reduce((s, g) => s + Math.max(0, g), 0);
  const totalCut = localFx.eq12Bands.reduce((s, g) => s + Math.max(0, -g), 0);

  const handleBandChange = (index: number, val: number) => {
    const updatedBands = [...localFx.eq12Bands];
    updatedBands[index] = val;
    const updated = { ...localFx, eq12Bands: updatedBands, eqPreset: "Custom" };
    setLocalFx(updated);
    onUpdateFX(updated);
  };

  const handleApplyPreset = (presetName: string) => {
    if (PRESETS[presetName]) {
      const updated = {
        ...localFx,
        eq12Bands: [...PRESETS[presetName]],
        eqPreset: presetName,
      };
      setLocalFx(updated);
      onUpdateFX(updated);
    }
  };

  const handleReset = () => {
    const updated = {
      ...localFx,
      eq12Bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      eqPreset: "Flat",
    };
    setLocalFx(updated);
    onUpdateFX(updated);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl">
        {/* === Header === */}
        <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                Hi-Res Equalizer
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  48kHz · 12-BAND
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Surgical EQ · Auto Headroom · No Compression
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* === Spectrum Visualizer === */}
          <div className="rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
            <div className="px-3 py-1.5 flex items-center justify-between text-xs">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Realtime Spectrum
              </span>
              <span className="text-neutral-600 font-mono">256-point FFT</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={80}
              className="w-full h-20"
            />
          </div>

          {/* === Headroom Meter === */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Auto Headroom Compensation
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  headroomDB < -6
                    ? "text-yellow-400"
                    : headroomDB < -3
                    ? "text-emerald-400"
                    : "text-neutral-400"
                }`}
              >
                {headroomDB.toFixed(1)} dB
              </span>
            </div>
            {/* Headroom bar */}
            <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
                style={{
                  width: `${100 - Math.abs(headroomDB) * 10}%`,
                  background:
                    Math.abs(headroomDB) > 6
                      ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                      : "linear-gradient(90deg, #10b981, #06b6d4)",
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1.5">
              Input auto-diturunkan {Math.abs(headroomDB).toFixed(1)}dB untuk cegah
              clip. Limiter gak ke-trigger → suara tetap HD.
            </p>
          </div>

          {/* === EQ Presets === */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">
                Preset EQ
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => handleApplyPreset(name)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    localFx.eqPreset === name
                      ? "bg-emerald-500 text-black"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* === 12-Band EQ Sliders === */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2 mb-3">
              <Waves className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-300">
                12-Band Hi-Res Equalizer
              </span>
            </div>

            {/* Slider grid */}
            <div className="flex justify-between items-end gap-1 h-40">
              {localFx.eq12Bands.map((val, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center flex-1 gap-1"
                >
                  {/* dB value */}
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      val > 0 ? "text-emerald-400" : val < 0 ? "text-rose-400" : "text-neutral-500"
                    }`}
                  >
                    {val > 0 ? "+" : ""}{val}
                  </span>

                  {/* Vertical slider */}
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={val}
                    onChange={(e) => handleBandChange(i, parseFloat(e.target.value))}
                    className="eq-vertical-slider w-1.5 h-24 bg-neutral-800 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to top, ${
                        val > 0 ? "#10b981 50%" : "#f43f5e 50%"
                      }`,
                      accentColor: val > 0 ? "#10b981" : "#f43f5e",
                    }}
                  />

                  {/* Frequency label */}
                  <span className="text-[9px] text-neutral-400 font-mono leading-none">
                    {FREQ_LABELS[i]}
                  </span>
                  <span className="text-[8px] text-neutral-600 leading-none">
                    {FREQ_UNITS[i]}
                  </span>

                  {/* Q factor badge */}
                  <span className="text-[7px] text-neutral-600 font-mono leading-none">
                    Q{Q_LABELS[i]}
                  </span>

                  {/* Band type indicator */}
                  <span
                    className={`text-[7px] leading-none mt-0.5 ${
                      BAND_TYPES[i] === "LowShelf"
                        ? "text-orange-400"
                        : BAND_TYPES[i] === "HighShelf"
                        ? "text-cyan-400"
                        : "text-neutral-700"
                    }`}
                  >
                    {BAND_TYPES[i] === "LowShelf" ? "LS" : BAND_TYPES[i] === "HighShelf" ? "HS" : "PK"}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-neutral-800">
              <span className="text-[9px] text-orange-400 font-mono">LS = Low Shelf</span>
              <span className="text-[9px] text-neutral-600 font-mono">PK = Peak</span>
              <span className="text-[9px] text-cyan-400 font-mono">HS = High Shelf (Air)</span>
            </div>
          </div>

          {/* === Reverb Section === */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Studio Reverb
              </span>
              <span className="text-[9px] text-neutral-500 ml-auto">
                {localFx.reverbPreset}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(REVERB_PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    const { room, mix } = REVERB_PRESETS[name];
                    const updated = {
                      ...localFx,
                      reverbRoomSize: room,
                      reverbMix: mix,
                      reverbPreset: name,
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                    localFx.reverbPreset === name
                      ? "bg-purple-500 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Room Size</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {Math.round(localFx.reverbRoomSize * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={localFx.reverbRoomSize}
                  onChange={(e) => {
                    const updated = {
                      ...localFx,
                      reverbRoomSize: parseFloat(e.target.value),
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Wet Mix</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {Math.round(localFx.reverbMix * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={localFx.reverbMix}
                  onChange={(e) => {
                    const updated = {
                      ...localFx,
                      reverbMix: parseFloat(e.target.value),
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>
            </div>
          </div>

          {/* === Echo Delay Section === */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Smule Echo Delay
              </span>
              <span className="text-[9px] text-neutral-500 ml-auto">
                {localFx.echoPreset}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(ECHO_PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    const { delay, feedback, level } = ECHO_PRESETS[name];
                    const updated = {
                      ...localFx,
                      echoDelayTime: delay,
                      echoFeedback: feedback,
                      echoLevel: level,
                      echoPreset: name,
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                    localFx.echoPreset === name
                      ? "bg-cyan-500 text-black"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Delay Time</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round((localFx.echoDelayTime || 0) * 1000)}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  value={localFx.echoDelayTime || 0.18}
                  onChange={(e) => {
                    const updated = {
                      ...localFx,
                      echoDelayTime: parseFloat(e.target.value),
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Feedback (Ulang)</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round((localFx.echoFeedback || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={localFx.echoFeedback || 0}
                  onChange={(e) => {
                    const updated = {
                      ...localFx,
                      echoFeedback: parseFloat(e.target.value),
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Level (Volume Echo)</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round((localFx.echoLevel || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={localFx.echoLevel || 0}
                  onChange={(e) => {
                    const updated = {
                      ...localFx,
                      echoLevel: parseFloat(e.target.value),
                    };
                    setLocalFx(updated);
                    onUpdateFX(updated);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* === Compression Guard / HD Mode === */}
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-200 flex items-center gap-2">
                  HD Mode — Transparent Limiter
                  {localFx.compressionGuard && (
                    <span className="text-[8px] bg-emerald-500 text-black px-1 py-0.5 rounded font-mono">
                      ACTIVE
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-neutral-400">
                  {localFx.compressionGuard
                    ? "Limiter transparan hanya catch peak asli. Suara tetap utuh, gak kekompres."
                    : "Limiter OFF — sinyal pure tanpa limit. Untuk pro user yang mau raw output."}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={localFx.compressionGuard}
                onChange={(e) => {
                  const updated = {
                    ...localFx,
                    compressionGuard: e.target.checked,
                  };
                  setLocalFx(updated);
                  onUpdateFX(updated);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* === Mic & Music Volume === */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <div className="flex justify-between text-[11px] text-neutral-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-pink-400" />
                  Mic Volume
                </span>
                <span className="font-mono text-pink-400 font-bold">
                  {Math.round(localFx.micVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={localFx.micVolume}
                onChange={(e) => {
                  const updated = {
                    ...localFx,
                    micVolume: parseFloat(e.target.value),
                  };
                  setLocalFx(updated);
                  onUpdateFX(updated);
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <div className="flex justify-between text-[11px] text-neutral-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  Music Volume
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(localFx.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localFx.musicVolume}
                onChange={(e) => {
                  const updated = {
                    ...localFx,
                    musicVolume: parseFloat(e.target.value),
                  };
                  setLocalFx(updated);
                  onUpdateFX(updated);
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* === Extra Toggles === */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={localFx.vocalMonitor}
                onChange={(e) => {
                  const updated = { ...localFx, vocalMonitor: e.target.checked };
                  setLocalFx(updated);
                  onUpdateFX(updated);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:mt-[2px] after:ml-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
              <span className="text-[11px] text-neutral-300">Vocal Monitor (Headphone)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={localFx.noiseSuppression}
                onChange={(e) => {
                  const updated = { ...localFx, noiseSuppression: e.target.checked };
                  setLocalFx(updated);
                  onUpdateFX(updated);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:mt-[2px] after:ml-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
              <span className="text-[11px] text-neutral-300">Noise Suppression (80Hz HPF)</span>
            </label>
          </div>
        </div>

        {/* === Footer === */}
        <div className="sticky bottom-0 p-4 bg-neutral-900 border-t border-neutral-800 flex justify-end gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition"
          >
            Selesai & Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
