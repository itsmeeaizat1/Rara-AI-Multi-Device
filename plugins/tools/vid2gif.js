import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/**
 * plugins/tools/vid2gif.js
 * Command .vid2gif — Video to GIF Converter
 * Reply video, convert ke GIF dengan ukuran custom
 * Uses FFmpeg for conversion
 *
 * Options:
 * .vid2gif — default 10s, 480p, 15fps
 * .vid2gif 5 — 5 detik pertama
 * .vid2gif 720 — 720p resolution
 * .vid2gif 5 720 — 5 detik, 720p
 * .vid2gif 0 480 30 — full video, 480p, 30fps
 */

const pluginConfig = {
  name: "vid2gif",
  alias: ["vtogif", "togif", "videogif", "v2gif", "vgif"],
  category: "convert",
  description: "Convert video ke GIF dengan ukuran custom",
  usage: ".vid2gif (reply video)\n.vid2gif <detik> (reply video)\n.vid2gif <detik> <resolusi> (reply video)\n.vid2gif <detik> <resolusi> <fps> (reply video)",
  example: ".vid2gif\n.vid2gif 5\n.vid2gif 10 720\n.vid2gif 0 480 30",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
    );
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const isVideo =
      m.isVideo || m.quoted?.isVideo ||
      m.msg?.videoMessage || m.quoted?.msg?.videoMessage;

    if (!isVideo) {
      const text =
        claraWrap("Video to GIF", ["◦ Reply video lalu ketik .vid2gif",
          "◦ Convert video ke GIF dengan FFmpeg",
          "",
          "*Opsi:*",
          `◦ ${prefix}vid2gif — Default (10s, 480p, 15fps)`,
          `◦ ${prefix}vid2gif 5 — 5 detik pertama`,
          `◦ ${prefix}vid2gif 720 — Resolusi 720p`,
          `◦ ${prefix}vid2gif 5 720 — 5 detik, 720p`,
          `◦ ${prefix}vid2gif 0 480 30 — Full video, 480p, 30fps`,
          "",
          "*Parameter:*",
          "◦ Detik: 0 = full video (max 30s)",
          "◦ Resolusi: 240, 360, 480, 720 (default 480)",
          "◦ FPS: 10, 15, 20, 30 (default 15)"].join("\n")) + "\n" +
        tipText("Reply video lalu ketik .vid2gif");

      await sendReplyWithNav(sock, m, text, "vid2gif");
      return { handled: true };
    }

    await m.react("🕐");

    // Download video
    let mediaBuffer;
    if (m.isVideo && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    } else {
      const text =
        claraWrap("Video to GIF", ["◦ Status: *Gagal download video*",
          "◦ Coba reply video yang valid"].join("\n")) + "\n" +
        tipText("Reply video lalu ketik .vid2gif");

      await sendReplyWithNav(sock, m, text, "vid2gif");
      return { handled: true };
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      const text =
        claraWrap("Video to GIF", ["◦ Status: *Buffer video tidak valid*"].join("\n")) + "\n" +
        tipText("Coba video lain");

      await sendReplyWithNav(sock, m, text, "vid2gif");
      return { handled: true };
    }

    if (mediaBuffer.length > MAX_VIDEO_SIZE) {
      const sizeMB = (mediaBuffer.length / 1024 / 1024).toFixed(1);
      const text =
        claraWrap("Video to GIF", [`◦ Ukuran: *${sizeMB} MB*`,
          `◦ Maksimal: *20 MB*`,
          "◦ Compress video dulu atau gunakan video lebih kecil"].join("\n")) + "\n" +
        tipText("Gunakan video di bawah 20MB");

      await sendReplyWithNav(sock, m, text, "vid2gif");
      return { handled: true };
    }

    // Parse argumen
    const input = (m.body || "").replace(/^[!.#]\S+\s*/, "").trim();
    const parts = input.split(/\s+/).filter(Boolean);

    let duration = 10; // detik
    let resolution = 480; // height
    let fps = 15;

    if (parts.length >= 1) {
      const d = parseInt(parts[0], 10);
      if (!isNaN(d)) duration = d === 0 ? 30 : Math.min(d, 30);
    }
    if (parts.length >= 2) {
      const r = parseInt(parts[1], 10);
      if ([240, 360, 480, 720].includes(r)) resolution = r;
    }
    if (parts.length >= 3) {
      const f = parseInt(parts[2], 10);
      if ([10, 15, 20, 30].includes(f)) fps = f;
    }

    // Save video to temp
    const tmpdir = os.tmpdir();
    const inputPath = path.join(tmpdir, "nova_vid2gif_" + Date.now() + ".mp4");
    const outputPath = path.join(tmpdir, "nova_vid2gif_" + Date.now() + ".gif");

    fs.writeFileSync(inputPath, mediaBuffer);

    // Get actual video duration
    const videoDuration = await getVideoDuration(inputPath);
    const actualDuration = duration === 0 ? Math.min(videoDuration || 30, 30) : Math.min(duration, videoDuration || duration);

    // Build FFmpeg command
    // -t duration, -vf scale + fps, -an (no audio)
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -t ${actualDuration} -vf "fps=${fps},scale=-1:${resolution}:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" -loop 0 "${outputPath}"`;

    try {
      await execAsync(ffmpegCmd, { timeout: 60000 });
    } catch (err) {
      throw new Error("FFmpeg gagal convert: " + err.message.slice(0, 100));
    }

    // Cek hasil
    if (!fs.existsSync(outputPath)) {
      throw new Error("File GIF tidak ditemukan setelah convert");
    }

    const gifBuffer = fs.readFileSync(outputPath);
    const gifSize = gifBuffer.length;

    if (gifSize === 0) {
      throw new Error("GIF hasil kosong");
    }

    // Cleanup input
    try { fs.unlinkSync(inputPath); } catch (e) { console.error('[vid2gif.js]:', e.message); }
    try { fs.unlinkSync(outputPath); } catch (e) { console.error('[vid2gif.js]:', e.message); }

    await m.react("✅");

    const durLabel = duration === 0 ? "Full video" : actualDuration + "s";

    // Kirim sebagai dokumen (GIF lebih efisien sebagai file)
    if (gifSize > 5 * 1024 * 1024) {
      // Document mode untuk GIF besar
      await sock.sendMessage(m.chat, {
        document: gifBuffer,
        fileName: "converted_" + Date.now() + ".gif",
        mimetype: "image/gif",
        caption:
          claraWrap("Video to GIF", [`◦ Status: *Berhasil*`,
            `◦ Mode: *Dokumen (file besar)*`,
            `◦ Durasi: *${durLabel}*`,
            `◦ Resolusi: *${resolution}p*`,
            `◦ FPS: *${fps}*`,
            `◦ Ukuran: *${formatSize(gifSize)}*`].join("\n")) + "\n" +
          tipText("GIF dikirim sebagai dokumen karena ukuran besar"),
      }, { quoted: m });
    } else {
      // Kirim sebagai video/GIF (WhatsApp render sebagai animated)
      await sock.sendMessage(m.chat, {
        video: gifBuffer,
        caption:
          claraWrap("Video to GIF", [`◦ Status: *Berhasil*`,
            `◦ Durasi: *${durLabel}*`,
            `◦ Resolusi: *${resolution}p*`,
            `◦ FPS: *${fps}*`,
            `◦ Ukuran: *${formatSize(gifSize)}*`].join("\n")) + "\n" +
          tipText(`${prefix}vid2gif 5 720 — 5 detik 720p`),
      }, { quoted: m, gifPlayback: true });
    }

    return { handled: true };
  } catch (error) {
    console.error("[Vid2GIF Error]", error);
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal convert*`,
        `◦ Alasan: *${error.message || "Unknown error"}*`].join("\n")) + "\n" +
      tipText("Coba video lain atau durasi lebih pendek");

    await m.reply(claraWrap("vid2gif", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
