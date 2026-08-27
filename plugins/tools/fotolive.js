// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/**
 * plugins/tools/fotolive.js
 * Command .fotolive — Video to Live Photo
 * Convert video jadi "foto live" (animated looping image)
 * WhatsApp render sebagai video gifPlayback (looping seperti Live Photo iOS)
 *
 * LIMIT DURASI VIDEO SUMBER (wajib):
 * - Minimal: 20 detik (WAJIB, video terlalu pendek = efek live gak kelihatan)
 * - Jika lebih panjang: auto-trim ke durasi output
 *
 * Limit durasi output:
 * - Default: 3 detik
 * - Range: 1.5s - 10s
 *
 * Options:
 * .fotolive — default 3s, 480p, 15fps
 * .fotolive 5 — 5 detik
 * .fotolive 5 720 — 5 detik, 720p
 * .fotolive 5 720 20 — 5 detik, 720p, 20fps
 */

const pluginConfig = {
  name: "fotolive",
  alias: ["fotolive"],
  category: "tools",
  description: "Convert video jadi foto live (animated looping image)",
  usage: ".fotolive (reply video)\n.fotolive <durasi>\n.fotolive <durasi> <resolusi>\n.fotolive <durasi> <resolusi> <fps>",
  example: ".fotolive\n.fotolive 5\n.fotolive 3 720",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

// Limit durasi VIDEO SUMBER (wajib dicek sebelum convert)
const SRC_MIN_DURATION = 20;   // Video sumber minimal 20 detik

// Limit durasi OUTPUT (yang diambil dari video)
const OUT_MIN_DURATION = 1.5;   // Output minimal 1.5 detik
const OUT_MAX_DURATION = 10;    // Output maksimal 10 detik
const OUT_DEFAULT = 3;          // Default 3 detik

const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function getVideoInfo(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "${filePath}"`
    );
    const parts = stdout.trim().split(",");
    return {
      width: parseInt(parts[0]) || 0,
      height: parseInt(parts[1]) || 0,
      fps: parts[2] || "30",
      duration: parseFloat(parts[3]) || 0,
    };
  } catch {
    return { width: 0, height: 0, fps: "30", duration: 0 };
  }
}

async function handler(m, { sock }) {
  try {
    const isVideo =
      m.isVideo || m.quoted?.isVideo ||
      m.msg?.videoMessage || m.quoted?.msg?.videoMessage;

    if (!isVideo) {
      return m.reply(
        `Cara pakai:\n` +
        `Reply video lalu ketik ${m.prefix}fotolive\n\n` +
        `Opsi:\n` +
        `1. ${m.prefix}fotolive — Default (3s, 480p, 15fps)\n` +
        `2. ${m.prefix}fotolive 5 — 5 detik\n` +
        `3. ${m.prefix}fotolive 5 720 — 5 detik, 720p\n` +
        `4. ${m.prefix}fotolive 3 720 20 — 3 detik, 720p, 20fps\n\n` +
        `Limit video sumber:\n` +
        `Minimal: ${SRC_MIN_DURATION}s (wajib)\n` +
        `Lebih panjang: auto-trim\n` +
        `Limit durasi output: ${OUT_MIN_DURATION}s - ${OUT_MAX_DURATION}s`,
        "fotolive"
      );
    }

    await m.react("🕒");

    // Download video
    let mediaBuffer;
    if (m.isVideo && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    } else {
      return m.reply(claraWrap("fotolive", "Gagal download video. Coba reply video yang valid."));
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      return m.reply(claraWrap("fotolive", "Buffer video tidak valid."));
    }

    if (mediaBuffer.length > MAX_VIDEO_SIZE) {
      return m.reply(claraWrap("fotolive", `Video terlalu besar: ${formatSize(mediaBuffer.length)}\nMaksimal: 25 MB`));
    }

    // Save video to temp untuk cek durasi
    const tmpdir = os.tmpdir();
    const ts = Date.now();
    const inputPath = path.join(tmpdir, `nova_vlive_${ts}.mp4`);
    const outputPath = path.join(tmpdir, `nova_vlive_out_${ts}.mp4`);

    fs.writeFileSync(inputPath, mediaBuffer);

    // CEK DURASI VIDEO SUMBER (WAJIB sebelum convert)
    const videoInfo = await getVideoInfo(inputPath);
    const srcDuration = videoInfo.duration || 0;

    if (srcDuration === 0) {
      try { fs.unlinkSync(inputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }
      return m.reply(claraWrap("fotolive", "Tidak bisa membaca durasi video. Pastikan video valid."));
    }

    // Validasi durasi video sumber — MINIMAL
    if (srcDuration < SRC_MIN_DURATION) {
      try { fs.unlinkSync(inputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }
      return m.reply(
        `╭──「 *Video Terlalu Pendek* 」\n` +
        `\n` +
        `│ *ᴅᴜʀᴀꜱɪ ᴠɪᴅᴇᴏ:* ${srcDuration.toFixed(1)}s\n` +
        `│ *ᴍɪɴɪᴍᴀʟ ᴡᴀᴊɪʙ:* ${SRC_MIN_DURATION}s\n` +
        `╰──────────❀\n\n` +
        `Video sumber terlalu pendek! Minimal ${SRC_MIN_DURATION}s biar efek live-nya kelihatan dan pas.`
      );
    }


    // Parse argumen untuk durasi output
    const input = (m.body || "").replace(/^[!.#]\S+\s*/, "").trim();
    const parts = input.split(/\s+/).filter(Boolean);

    let duration = OUT_DEFAULT;
    let resolution = 480;
    let fps = 15;

    if (parts.length >= 1) {
      const d = parseFloat(parts[0]);
      if (!isNaN(d)) duration = d;
    }
    if (parts.length >= 2) {
      const r = parseInt(parts[1], 10);
      if ([240, 360, 480, 720].includes(r)) resolution = r;
    }
    if (parts.length >= 3) {
      const f = parseInt(parts[2], 10);
      if ([10, 15, 20, 24, 30].includes(f)) fps = f;
    }

    // Validasi durasi output — MINIMAL
    if (duration < OUT_MIN_DURATION) {
      try { fs.unlinkSync(inputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }
      return m.reply(
        `╭──「 *Durasi Output Terlalu Pendek* 」\n` +
        `\n` +
        `│ *ᴅɪᴍɪɴᴛᴀ:* ${duration}s\n` +
        `│ *ᴍɪɴɪᴍᴀʟ:* ${OUT_MIN_DURATION}s (wajib)\n` +
        `╰──────────❀\n\n` +
        `Durasi output minimal ${OUT_MIN_DURATION}s wajib biar efek live pas!`
      );
    }

    // Validasi durasi output — MAKSIMAL
    if (duration > OUT_MAX_DURATION) {
      try { fs.unlinkSync(inputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }
      return m.reply(
        `╭──「 *Durasi Output Terlalu Panjang* 」\n` +
        `\n` +
        `│ *ᴅɪᴍɪɴᴛᴀ:* ${duration}s\n` +
        `│ *ᴍᴀᴋꜱɪᴍᴀʟ:* ${OUT_MAX_DURATION}s\n` +
        `╰──────────❀\n\n` +
        `Durasi output maksimal ${OUT_MAX_DURATION}s untuk performa optimal.`
      );
    }

    // Clamp durasi output ke durasi video sumber
    const actualDuration = Math.min(duration, srcDuration);

    // Convert video to "live photo" format
    // - Trim to specified duration
    // - Scale to target resolution (maintain aspect ratio)
    // - Set FPS for smooth playback
    // - Remove audio (live photo = visual only)
    // - H.264 with faststart for instant playback
    // - gifPlayback = true di WhatsApp bikin looping seperti Live Photo
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -t ${actualDuration} ` +
      `-vf "fps=${fps},scale=-1:${resolution}:flags=lanczos" ` +
      `-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p ` +
      `-movflags +faststart -an ` +
      `-metadata title="Live Photo" ` +
      `"${outputPath}"`;

    try {
      await execAsync(ffmpegCmd, { timeout: 60000 });
    } catch (err) {
      // Fallback: simpler command
      const fallbackCmd = `ffmpeg -y -i "${inputPath}" -t ${actualDuration} ` +
        `-vf "fps=${fps},scale=-1:${resolution}" ` +
        `-c:v libx264 -preset ultrafast -crf 25 -pix_fmt yuv420p ` +
        `-an -movflags +faststart "${outputPath}"`;
      try {
        await execAsync(fallbackCmd, { timeout: 60000 });
      } catch (err2) {
        throw new Error("FFmpeg gagal convert: " + err2.message.slice(0, 100));
      }
    }

    // Cek hasil
    if (!fs.existsSync(outputPath)) {
      throw new Error("File output tidak ditemukan");
    }

    const liveBuffer = fs.readFileSync(outputPath);
    const liveSize = liveBuffer.length;

    if (liveSize === 0) {
      throw new Error("File output kosong");
    }

    // Cleanup input
    try { fs.unlinkSync(inputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }

    await m.react("🐣");

    const durLabel = actualDuration.toFixed(1) + "s";
    const wasTrimmed = srcDuration > actualDuration;

    // Kirim sebagai video dengan gifPlayback = true
    // WhatsApp render sebagai animated looping image (Live Photo)
    await sock.sendMessage(m.chat, {
      video: liveBuffer,
      gifPlayback: true,
      caption:
        `╭──「 *Live Photo* 」\n` +
        `\n` +
        `│ *ᴅᴜʀᴀꜱɪ:* ${durLabel}\n` +
        `│ *ʀᴇꜱᴏʟᴜꜱɪ:* ${resolution}p\n` +
        `│ *ꜰᴘꜱ:* ${fps}\n` +
        `│ *ᴜᴋᴜʀᴀɴ:* ${formatSize(liveSize)}\n` +
        (wasTrimmed ? `│ *ᴛʀɪᴍᴍᴇᴅ:* ${srcDuration.toFixed(1)}s → ${durLabel}\n` : '') +
        `╰──────────❀`,
    }, { quoted: m });

    // Cleanup output
    try { fs.unlinkSync(outputPath); } catch (e) { console.error('[fotolive.js]:', e.message); }

    return { handled: true };
  } catch (error) {
    console.error("[FotoLive Error]", error);

    let errMsg = error.message || "Unknown error";
    if (errMsg.length > 150) errMsg = errMsg.slice(0, 150) + "...";

    await m.reply(
      `╭──「 *Live Photo Error* 」\n` +
      `\n` +
      `│ *ᴇʀʀᴏʀ:* ${errMsg}\n` +
      `╰──────────❀\n\n` +
      `Coba video lain atau durasi lebih pendek.`
    );
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
