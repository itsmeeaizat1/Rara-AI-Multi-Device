// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const pluginConfig = {
  name: "vidcompress",
  alias: ["vidcompress"],
  category: "tools",
  description: "Kompres video (MP4/MOV/MKV) dengan kontrol kualitas dan resolusi",
  usage:
    ".vidcompress (reply video) — Kompres default\n.vidcompress <level> (reply video) — 1=light 2=medium 3=max\n.vidcompress max (reply video) — Kompres maksimal\n.vidcompress info (reply video) — Info detail video\n.vidcompress audio (reply video) — Ekstrak audio saja",
  example: ".vidcompress 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function downloadFile(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  return Buffer.from(res.data);
}

function getTmpFile(ext) {
  return path.join(os.tmpdir(), "nova_vidcmp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function cleanup(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) { console.error('[vidcompress.js]:', e.message); }
}

// Compression presets
const PRESETS = {
  light: {
    crf: 28,
    scale: 720,
    audioBitrate: "96k",
    preset: "fast",
    label: "Light (720p, CRF 28)",
  },
  medium: {
    crf: 32,
    scale: 480,
    audioBitrate: "64k",
    preset: "veryfast",
    label: "Medium (480p, CRF 32)",
  },
  max: {
    crf: 38,
    scale: 360,
    audioBitrate: "48k",
    preset: "veryfast",
    label: "Max (360p, CRF 38)",
  },
};

function runFfmpeg(inputPath, outputPath, options) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Scale (keep aspect ratio)
    if (options.scale) {
      command = command.size("?" + options.scale); // ? keeps aspect ratio
    }

    command
      .videoBitrate(options.videoBitrate || null)
      .videoCodec("libx264")
      .outputOptions([
        "-crf " + (options.crf || 30),
        "-preset " + (options.preset || "fast"),
        "-movflags +faststart",
        "-pix_fmt yuv420p",
      ]);

    if (options.audioBitrate) {
      command.audioBitrate(options.audioBitrate);
    }
    command.audioCodec("aac").audioChannels(2);

    command
      .on("start", (cmd) => {
        console.log("[vidcompress] FFmpeg started:", cmd.slice(0, 100));
      })
      .on("progress", (progress) => {
        // Silent progress, could log if needed
      })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

function runFfmpegAudioOnly(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .outputOptions(["-q:a 2"])
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta);
    });
  });
}

async function getMediaBuffer(m) {
  if (m.quoted) {
    if (m.quoted.buffer) return { buffer: m.quoted.buffer, mime: m.quoted.mimetype || "video/mp4", fileName: m.quoted.fileName };
    if (m.quoted.url) {
      try {
        const buffer = await downloadFile(m.quoted.url);
        return { buffer, mime: m.quoted.mimetype || "video/mp4", fileName: m.quoted.fileName };
      } catch (e) { console.error('[vidcompress.js]:', e.message); }
    }
  }
  if (m.buffer) return { buffer: m.buffer, mime: m.mimetype || "video/mp4", fileName: m.fileName };
  if (m.url) {
    try {
      const buffer = await downloadFile(m.url);
      return { buffer, mime: m.mimetype || "video/mp4", fileName: m.fileName };
    } catch (e) { console.error('[vidcompress.js]:', e.message); }
  }
  return null;
}

async function handler(m, { sock }) {
  const arg = (m.args?.[0] || "").toLowerCase();

  if (!arg) {
    let txt = "VIDEO COMPRESSOR\n\n";
    txt += "Kompres video untuk mengurangi ukuran file.\n\n";
    txt += "Cara pakai:\n";
    txt += "1. .vidcompress (reply video) — Kompres default (medium)\n";
    txt += "2. .vidcompress 1 (reply video) — Light (720p)\n";
    txt += "3. .vidcompress 2 (reply video) — Medium (480p)\n";
    txt += "4. .vidcompress 3 (reply video) — Max (360p)\n";
    txt += "5. .vidcompress max (reply video) — Kompres maksimal\n";
    txt += "6. .vidcompress info (reply video) — Info detail video\n";
    txt += "7. .vidcompress audio (reply video) — Ekstrak audio MP3\n\n";
    txt += "Level kompresi:\n";
    txt += "1 = Light (720p, kualitas tinggi)\n";
    txt += "2 = Medium (480p, seimbang)\n";
    txt += "3 = Max (360p, ukuran terkecil)\n\n";
    txt += "Format: MP4, MOV, MKV, AVI, WEBM\n";
    txt += "Max durasi: 5 menit | Max ukuran: 100 MB";
    return m.reply( txt, "vidcompress");
  }

  const media = await getMediaBuffer(m);

  if (!media) {
    return m.reply(claraWrap("Vidcompress", "Reply video dengan command .vidcompress\n\nKetik .vidcompress buat lihat cara pakai."));
  }

  const isVideo = (media.mime || "").startsWith("video/");
  const isAudio = (media.mime || "").startsWith("audio/");

  if (!isVideo && !isAudio) {
    return m.reply(claraWrap("Vidcompress", "File bukan video. Reply video dengan .vidcompress"));
  }

  if (media.buffer.length > 100 * 1048576) {
    return m.reply(claraWrap("Vidcompress", "Video terlalu besar (max 100 MB). Pilih video yang lebih kecil."));
  }

  const inputPath = getTmpFile("mp4");
  const outputPath = getTmpFile("mp4");

  try {
    fs.writeFileSync(inputPath, media.buffer);

    // === INFO ===
    if (arg === "info" || arg === "detail") {
      const meta = await getVideoInfo(inputPath);
      const v = meta.streams?.find(s => s.codec_type === "video");
      const a = meta.streams?.find(s => s.codec_type === "audio");
      const duration = meta.format?.duration || v?.duration;

      let txt = "INFO VIDEO\n\n";
      txt += "Format: " + (meta.format?.format_name || "-") + "\n";
      txt += "Durasi: " + formatDuration(parseFloat(duration)) + "\n";
      txt += "Ukuran: " + formatSize(media.buffer.length) + "\n";
      if (v) {
        txt += "Video:\n";
        txt += "  Codec: " + (v.codec_name || "-") + "\n";
        txt += "  Resolusi: " + v.width + "x" + v.height + "\n";
        txt += "  FPS: " + (v.r_frame_rate || "-") + "\n";
        txt += "  Bitrate: " + (v.bit_rate ? formatSize(parseInt(v.bit_rate)) + "/s" : "-") + "\n";
      }
      if (a) {
        txt += "Audio:\n";
        txt += "  Codec: " + (a.codec_name || "-") + "\n";
        txt += "  Sample rate: " + (a.sample_rate || "-") + " Hz\n";
        txt += "  Channels: " + (a.channels || "-") + "\n";
      }

      cleanup(inputPath);
      cleanup(outputPath);
      return m.reply( txt, "vidcompress");
    }

    // === AUDIO EXTRACT ===
    if (arg === "audio" || arg === "mp3" || arg === "extract") {
      const audioPath = getTmpFile("mp3");
      await m.react("🕒");
      await runFfmpegAudioOnly(inputPath, audioPath);
      const audioBuffer = fs.readFileSync(audioPath);

      await sock.sendMessage(m.chat, {
        audio: { url: audioPath },
        fileName: "audio_" + Date.now() + ".mp3",
        mimetype: "audio/mpeg",
      }, { quoted: m });

      cleanup(inputPath);
      cleanup(audioPath);
      return;
    }

    // === COMPRESS ===
    let preset;
    if (arg === "max" || arg === "3" || arg === "minimum") {
      preset = PRESETS.max;
    } else if (arg === "light" || arg === "1") {
      preset = PRESETS.light;
    } else if (arg === "medium" || arg === "2") {
      preset = PRESETS.medium;
    } else {
      preset = PRESETS.medium; // default
    }

    await m.react("🕒");
    await runFfmpeg(inputPath, outputPath, preset);

    const compressedSize = fs.statSync(outputPath).size;
    const originalSize = media.buffer.length;
    const ratio = Math.round((1 - compressedSize / originalSize) * 100);

    let caption = "VIDEO COMPRESSOR\n\n";
    caption += "Preset: " + preset.label + "\n";
    caption += "Sebelum: " + formatSize(originalSize) + "\n";
    caption += "Sesudah: " + formatSize(compressedSize) + "\n";
    caption += "Pengurangan: " + (ratio > 0 ? ratio + "%" : "0% (sudah optimal)");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      video: { url: outputPath },
      caption: caption,
    }, { quoted: m });

    cleanup(inputPath);
    cleanup(outputPath);
  } catch (e) {
    cleanup(inputPath);
    cleanup(outputPath);
    return m.reply(claraWrap("Error", "\u274c Gagal kompres video: " + e.message + "\n\nPastikan video valid dan tidak terlalu panjang (max 5 menit)."));
  }
}

export { pluginConfig as config, handler };
