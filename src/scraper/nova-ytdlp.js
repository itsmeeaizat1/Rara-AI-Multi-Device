// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ytdlp.js — YouTube downloader via yt-dlp binary (100% gratis, no API key)
// Support: audio (128/192/256/320 kbps) + video (360/480/720/1080p)
// Requires: yt-dlp + ffmpeg installed on VPS
// Fallback: cobalt API (self-hosted or community instance)

import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const run = promisify(exec);

const YT_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

function extractVideoId(url) {
  return String(url || "").match(YT_ID_REGEX)?.[1] || null;
}

// Cek apakah yt-dlp terinstall
let _ytdlpAvailable = null;
async function isYtDlpAvailable() {
  if (_ytdlpAvailable !== null) return _ytdlpAvailable;
  try {
    await run("yt-dlp --version", { timeout: 5000 });
    _ytdlpAvailable = true;
    console.log("[nova-ytdlp] ✅ yt-dlp terdeteksi");
  } catch {
    _ytdlpAvailable = false;
    console.log("[nova-ytdlp] ⚠️ yt-dlp tidak terinstall, akan fallback ke cobalt API");
  }
  return _ytdlpAvailable;
}

// Cek apakah ffmpeg terinstall
let _ffmpegAvailable = null;
async function isFfmpegAvailable() {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    await run("ffmpeg -version", { timeout: 5000 });
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

/**
 * Download audio via yt-dlp dengan pilihan kbps
 * @param {string} url - YouTube URL
 * @param {string} kbps - 128/192/256/320
 * @returns {Promise<{buffer: Buffer, title: string, duration: number}>}
 */
async function downloadAudioYtDlp(url, kbps = "128") {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("URL YouTube tidak valid");

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const id = crypto.randomBytes(6).toString("hex");
  const outputPath = path.join(tempDir, `ytdlp_${id}.mp3`);

  try {
    // yt-dlp audio extraction with specific bitrate
    // --audio-quality 0 = best (256-320k), 5 = medium (~128k), 9 = worst
    // For explicit kbps control, use --postprocessor-args
    const qualityMap = {
      "320": "320k",
      "256": "256k",
      "192": "192k",
      "128": "128k",
      "96": "96k",
      "64": "64k",
    };
    const bitrate = qualityMap[String(kbps)] || "128k";

    // Get title first
    const { stdout: titleOut } = await run(
      `yt-dlp --get-title --no-warnings "${url}"`,
      { timeout: 15000 },
    );
    const title = titleOut.trim() || "Audio";

    // Download + convert to mp3 with specified bitrate
    const cmd = [
      "yt-dlp",
      "-x",                              // extract audio
      "--audio-format", "mp3",
      "--audio-quality", "0",            // best source quality
      "--postprocessor-args", `"ffmpeg:-b:a ${bitrate}"`,
      "-o", `"${outputPath.replace(/\.mp3$/, "")}.%(ext)s"`,
      "--no-playlist",
      "--no-warnings",
      "--newline",
      `"${url}"`,
    ].join(" ");

    await run(cmd, { timeout: 180000 }); // 3 min max

    // yt-dlp outputs .mp3 directly
    const finalPath = outputPath.replace(/\.mp3$/, ".mp3");
    if (!fs.existsSync(finalPath)) {
      // Try alternative naming
      const altPath = path.join(tempDir, `ytdlp_${id}.mp3`);
      if (fs.existsSync(altPath)) {
        const buffer = fs.readFileSync(altPath);
        if (buffer.length < 10000) throw new Error("Audio terlalu kecil");
        return { buffer, title, kbps: String(kbps) };
      }
      throw new Error("File audio tidak ditemukan setelah download");
    }

    const buffer = fs.readFileSync(finalPath);
    if (buffer.length < 10000) throw new Error("Audio terlalu kecil");

    return { buffer, title, kbps: String(kbps) };
  } finally {
    // Cleanup
    try {
      const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`ytdlp_${id}`));
      for (const f of files) fs.unlinkSync(path.join(tempDir, f));
    } catch {}
  }
}

/**
 * Download video via yt-dlp dengan pilihan quality
 * @param {string} url - YouTube URL
 * @param {string} quality - 360/480/720/1080
 * @returns {Promise<{buffer: Buffer, title: string, quality: string}>}
 */
async function downloadVideoYtDlp(url, quality = "720") {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("URL YouTube tidak valid");

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const id = crypto.randomBytes(6).toString("hex");
  const outputPath = path.join(tempDir, `ytdlp_vid_${id}.mp4`);

  try {
    // Get title first
    const { stdout: titleOut } = await run(
      `yt-dlp --get-title --no-warnings "${url}"`,
      { timeout: 15000 },
    );
    const title = titleOut.trim() || "Video";

    // Download video with max quality constraint
    const cmd = [
      "yt-dlp",
      "-f", `"bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best"`,
      "--merge-output-format", "mp4",
      "-o", `"${outputPath.replace(/\.mp4$/, "")}.%(ext)s"`,
      "--no-playlist",
      "--no-warnings",
      `"${url}"`,
    ].join(" ");

    await run(cmd, { timeout: 300000 }); // 5 min max

    if (!fs.existsSync(outputPath)) {
      throw new Error("File video tidak ditemukan setelah download");
    }

    const buffer = fs.readFileSync(outputPath);
    if (buffer.length < 10000) throw new Error("Video terlalu kecil");

    return { buffer, title, quality: `${quality}p` };
  } finally {
    try {
      const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`ytdlp_vid_${id}`));
      for (const f of files) fs.unlinkSync(path.join(tempDir, f));
    } catch {}
  }
}

/**
 * Cobalt API fallback (self-hosted or community instance)
 * Support: audioBitrate (320/256/128/96/64/8) + videoQuality
 */
const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  // Community instances bisa ditambah di sini (cek cobalt.tools/settings/instances)
];

async function downloadViaCobalt(url, { audioBitrate, videoQuality } = {}) {
  for (const instance of COBALT_INSTANCES) {
    try {
      const body = { url };
      if (audioBitrate) {
        body.audioBitrate = String(audioBitrate);
        body.audioFormat = "mp3";
        body.downloadMode = "audio";
      } else if (videoQuality) {
        body.videoQuality = String(videoQuality);
      }

      const { data } = await axios.post(instance + "/", body, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      if (data?.status === "tunnel" || data?.status === "redirect") {
        // Download the file
        const fileRes = await axios.get(data.url, {
          responseType: "arraybuffer",
          timeout: 120000,
        });
        return {
          buffer: Buffer.from(fileRes.data),
          filename: data.filename || "download",
        };
      }
    } catch (err) {
      console.error(`[nova-ytdlp] Cobalt ${instance} error:`, err.message);
    }
  }
  return null;
}

/**
 * Universal download audio — yt-dlp first, cobalt fallback, ytdl.js last resort
 */
async function downloadAudio(url, kbps = "128") {
  // 1. Try yt-dlp (best — 100% free, no API key)
  if (await isYtDlpAvailable()) {
    try {
      console.log(`[nova-ytdlp] 🎵 Downloading audio ${kbps}kbps via yt-dlp...`);
      const result = await downloadAudioYtDlp(url, kbps);
      console.log(`[nova-ytdlp] ✅ yt-dlp success: ${result.buffer.length} bytes`);
      return result;
    } catch (err) {
      console.error("[nova-ytdlp] yt-dlp failed:", err.message);
    }
  }

  // 2. Try cobalt API (if instance available)
  try {
    console.log(`[nova-ytdlp] 🎵 Trying cobalt API ${kbps}kbps...`);
    const cobaltResult = await downloadViaCobalt(url, { audioBitrate: kbps });
    if (cobaltResult?.buffer?.length > 10000) {
      return { buffer: cobaltResult.buffer, title: cobaltResult.filename, kbps: String(kbps) };
    }
  } catch (err) {
    console.error("[nova-ytdlp] cobalt failed:", err.message);
  }

  // 3. Fallback to ytdl.js (ytmp3.mobi) — no kbps control, default 128
  throw new Error("Semua API audio gagal. Pastikan yt-dlp terinstall di VPS: pip install yt-dlp");
}

/**
 * Universal download video — yt-dlp first, cobalt fallback
 */
async function downloadVideo(url, quality = "720") {
  // 1. Try yt-dlp
  if (await isYtDlpAvailable()) {
    try {
      console.log(`[nova-ytdlp] 🎥 Downloading video ${quality}p via yt-dlp...`);
      const result = await downloadVideoYtDlp(url, quality);
      console.log(`[nova-ytdlp] ✅ yt-dlp video success: ${result.buffer.length} bytes`);
      return result;
    } catch (err) {
      console.error("[nova-ytdlp] yt-dlp video failed:", err.message);
    }
  }

  // 2. Try cobalt API
  try {
    console.log(`[nova-ytdlp] 🎥 Trying cobalt API ${quality}p...`);
    const cobaltResult = await downloadViaCobalt(url, { videoQuality: quality });
    if (cobaltResult?.buffer?.length > 10000) {
      return { buffer: cobaltResult.buffer, title: cobaltResult.filename, quality: `${quality}p` };
    }
  } catch (err) {
    console.error("[nova-ytdlp] cobalt video failed:", err.message);
  }

  throw new Error("Semua API video gagal. Pastikan yt-dlp terinstall di VPS: pip install yt-dlp");
}

export {
  downloadAudio,
  downloadVideo,
  downloadAudioYtDlp,
  downloadVideoYtDlp,
  isYtDlpAvailable,
  isFfmpegAvailable,
};
