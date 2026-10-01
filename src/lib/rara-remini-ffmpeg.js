// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 REMINI ENGINE — FFmpeg Upscale Pipeline (request owner 12 Sep 2026:
//   "hasil remini pertama (Photiu) jelek bgt — pakai kode ini aja" → revisi
//   "balik lagi pakai Photiu, cm poles dikit settingannya agar jernih":
//   Photiu JADI ENGINE UTAMA LAGI, hasilnya dipoles pass FFmpeg polishImage)
// 🔹 Port verbatim kode owner (CJS → ESM): hqdn3d denoise → lanczos scale
//   → unsharp → eq color, output mjpeg q2. Preset 2/4/6/8x, input 25MB,
//   output maks 16000px, timeout FFmpeg 3 menit.
// ============================================================
import { spawn } from "child_process";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MAX_OUTPUT_PX = 16000;
export const FFMPEG_TIMEOUT_MS = 180000;

export const HD_PRESETS = Object.freeze({
  2: { label: "2x HD", emoji: "🔵", description: "Cepat dan aman", denoise: "low", sharpness: "balanced", color: "natural" },
  4: { label: "4x HD", emoji: "🔶", description: "Tajam dan seimbang", denoise: "medium", sharpness: "sharp", color: "vivid" },
  6: { label: "6x HD", emoji: "🟣", description: "Kualitas tinggi", denoise: "high", sharpness: "sharp", color: "enhanced" },
  8: { label: "8x Ultra HD", emoji: "🟢", description: "Maksimal untuk FFmpeg", denoise: "high", sharpness: "ultra", color: "cinematic" },
});

const DENOISE_PROFILES = Object.freeze({
  low: { spatial: 1.0, temporal: 1.0, spatialChroma: 3, temporalChroma: 3 },
  medium: { spatial: 1.25, temporal: 1.25, spatialChroma: 4, temporalChroma: 4 },
  high: { spatial: 1.5, temporal: 1.5, spatialChroma: 5, temporalChroma: 5 },
});

// 🔥 DOSE SHARPNESS DINAIKIN (request owner 12 Sep 2026: "pixelnya ditajemin
// biar makin jernih") — balanced 0.65→0.90, sharp 0.90→1.20, BARU ultra 1.35
// (radius lebih gede 7x7) buat 8x Ultra HD.
const SHARPNESS_PROFILES = Object.freeze({
  balanced: { lumaX: 5, lumaY: 5, lumaAmount: 0.90, chromaX: 3, chromaY: 3, chromaAmount: 0.20 },
  sharp: { lumaX: 5, lumaY: 5, lumaAmount: 1.20, chromaX: 3, chromaY: 3, chromaAmount: 0.25 },
  ultra: { lumaX: 7, lumaY: 7, lumaAmount: 1.35, chromaX: 5, chromaY: 5, chromaAmount: 0.30 },
});

const COLOR_PROFILES = Object.freeze({
  natural: { saturation: 1.02, contrast: 1.02, gamma: 1.00, brightness: 0.00 },
  vivid: { saturation: 1.05, contrast: 1.03, gamma: 0.99, brightness: 0.005 },
  enhanced: { saturation: 1.08, contrast: 1.04, gamma: 0.98, brightness: 0.01 },
  cinematic: { saturation: 1.10, contrast: 1.05, gamma: 0.98, brightness: 0.015 },
});

export function validateInput(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer)) throw new TypeError("Input gambar harus berupa Buffer.");
  if (inputBuffer.length === 0) throw new Error("Buffer gambar kosong.");
  if (inputBuffer.length > MAX_INPUT_BYTES) {
    throw new Error(`Ukuran gambar maksimal ${MAX_INPUT_BYTES / 1024 / 1024} MB.`);
  }
}

export function normalizeFactor(factor) {
  const value = Number.parseInt(factor, 10);
  if (!HD_PRESETS[value]) throw new Error("Faktor tidak valid. Gunakan 2, 4, 6, atau 8.");
  return value;
}

export function buildDenoiseFilter(name) {
  const profile = DENOISE_PROFILES[name] || DENOISE_PROFILES.medium;
  return ["hqdn3d", [profile.spatial, profile.temporal, profile.spatialChroma, profile.temporalChroma].join(":")].join("=");
}

export function buildSharpnessFilter(name) {
  const profile = SHARPNESS_PROFILES[name] || SHARPNESS_PROFILES.balanced;
  return [
    "unsharp",
    [
      `lx=${profile.lumaX}`,
      `ly=${profile.lumaY}`,
      `la=${profile.lumaAmount}`,
      `cx=${profile.chromaX}`,
      `cy=${profile.chromaY}`,
      `ca=${profile.chromaAmount}`,
    ].join(":"),
  ].join("=");
}

export function buildColorFilter(name) {
  const profile = COLOR_PROFILES[name] || COLOR_PROFILES.natural;
  return [
    "eq",
    [
      `saturation=${profile.saturation}`,
      `contrast=${profile.contrast}`,
      `gamma=${profile.gamma}`,
      `brightness=${profile.brightness}`,
    ].join(":"),
  ].join("=");
}

export function buildScaleFilter(factor) {
  return [
    "scale",
    [
      `w=min(iw*${factor}\\,${MAX_OUTPUT_PX})`,
      `h=min(ih*${factor}\\,${MAX_OUTPUT_PX})`,
      "force_original_aspect_ratio=decrease",
      "flags=lanczos+accurate_rnd+full_chroma_int",
    ].join(":"),
  ].join("=");
}

export function buildFilterChain(factor) {
  const preset = HD_PRESETS[factor];
  return [
    buildDenoiseFilter(preset.denoise),
    buildScaleFilter(factor),
    buildSharpnessFilter(preset.sharpness),
    buildColorFilter(preset.color),
  ].join(",");
}

function createTempPaths() {
  const id = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  return {
    input: path.join(os.tmpdir(), `image_input_${id}.jpg`),
    output: path.join(os.tmpdir(), `image_output_${id}.jpg`),
  };
}

async function removeFile(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("[REMINI-FFMPEG] Gagal menghapus file:", error.message);
  }
}

export function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn("ffmpeg", args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      childProcess.kill("SIGKILL");
      reject(new Error("Proses FFmpeg melebihi batas waktu."));
    }, FFMPEG_TIMEOUT_MS);

    childProcess.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });

    childProcess.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error.code === "ENOENT") { reject(new Error("FFmpeg belum terpasang di server.")); return; }
      reject(error);
    });

    childProcess.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(errorOutput.trim().slice(-1000) || `FFmpeg berhenti dengan kode ${code}.`));
        return;
      }
      resolve();
    });
  });
}

export async function upscaleImage(inputBuffer, factor = 4) {
  validateInput(inputBuffer);
  const selectedFactor = normalizeFactor(factor);
  const paths = createTempPaths();
  const filterChain = buildFilterChain(selectedFactor);

  try {
    await fsp.writeFile(paths.input, inputBuffer);

    await runFfmpeg([
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      paths.input,
      "-vf",
      filterChain,
      "-frames:v",
      "1",
      "-an",
      "-c:v",
      "mjpeg",
      "-q:v",
      "2",
      "-pix_fmt",
      "yuvj420p",
      paths.output,
    ]);

    const outputBuffer = await fsp.readFile(paths.output);
    if (!outputBuffer.length) throw new Error("Hasil gambar kosong.");
    return outputBuffer;
  } finally {
    await removeFile(paths.input);
    await removeFile(paths.output);
  }
}

// ═══ POLISH PASS (request owner 12 Sep 2026: "balik pakai Photiu, cm poles
// dikit agar jernih") — dipake SETELAH Photiu AI: hqdn3d tipis buang noise
// kompresi → unsharp tajamin pixel → eq natural warna tetap. TANPA upscale
// (Photiu udah ngasih resolusi) — cuma poles biar jernih.
export async function polishImage(inputBuffer) {
  validateInput(inputBuffer);
  const paths = createTempPaths();
  const filterChain = [
    buildDenoiseFilter("low"),
    buildSharpnessFilter("balanced"),
    buildColorFilter("natural"),
  ].join(",");

  try {
    await fsp.writeFile(paths.input, inputBuffer);

    await runFfmpeg([
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      paths.input,
      "-vf",
      filterChain,
      "-frames:v",
      "1",
      "-an",
      "-c:v",
      "mjpeg",
      "-q:v",
      "2",
      "-pix_fmt",
      "yuvj420p",
      paths.output,
    ]);

    const outputBuffer = await fsp.readFile(paths.output);
    if (!outputBuffer.length) throw new Error("Hasil gambar kosong.");
    return outputBuffer;
  } finally {
    await removeFile(paths.input);
    await removeFile(paths.output);
  }
}

export function getPresets() {
  return Object.entries(HD_PRESETS).map(([factor, preset]) => ({ factor: Number(factor), ...preset }));
}
