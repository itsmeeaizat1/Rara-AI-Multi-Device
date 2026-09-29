// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .thumbnail — ambil frame dari video sebagai thumbnail (request owner 11 Sep
// 2026: "cara thumbnail mp4", varian no 1: frame otomatis di 20% durasi).
// REVISI 11 Sep (owner: "kyk gaya thumbnail gambar saat ini cn versi video kyk
// sc elaina") → 2 MODE: (1) default = FOTO frame statis, (2) `.thumbnail video`
// = CLIP ANIMASI PENDEK (mp4 480px, mulai 20% durasi default, ±5 dtk, ala
// sample Elaina) — thumbnail yang gerak, bukan cuma gambar.
// Ekstraksi via TEMP FILE + queueFFmpeg — mp4 dengan moov-atom di belakang
// gak bisa di-seek via stdin/pipe, lewat file pasti jalan (verified 11 Sep).
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "thumbnail",
  alias: ["thumbnail"],
  aliases: ["thumb", "thumbvideo", "videothumb", "getthumb", "thumbs", "thumbnailvideo"],
  category: "convert",
  description: "Ambil thumbnail dari video mp4 — foto frame statis, atau clip animasi pendek (.thumbnail video)",
  usage: ".thumbnail [detik] (reply video) | .thumbnail video [mulai] [durasi] (reply video)",
  example: ".thumbnail\n.thumbnail 8\n.thumbnail video\n.thumbnail video 4 3",
  isGroupOnly: false,
  isOwner: false,
  isPremium: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// durasi via ffprobe (semua container: mp4/webm/mkv) — gagal → 0
function probeDuration(file) {
  return new Promise((resolve) => {
    exec(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { timeout: 20_000 }, (err, stdout) => {
      const d = parseFloat(String(stdout || "").trim());
      resolve(err || isNaN(d) || d <= 0 ? 0 : d);
    });
  });
}

async function handler(m, { sock, args }) {
  let outputPath = null;
  let inputPath = null;
  let clipPath = null;
  try {
    const q = m.quoted;
    const qDocMime = q?.message?.documentMessage?.mimetype || "";
    const mDocMime = m.isDocument ? m.message?.documentMessage?.mimetype || "" : "";
    const fromQuoted = !!(q && (q.isVideo || qDocMime.startsWith("video")));
    const fromDirect = m.isVideo || mDocMime.startsWith("video");

    if (!fromQuoted && !fromDirect) {
      await m.react("❗");
      return m.reply(
        novaGuide(
          "Thumbnail",
          "Unggah atau reply video (mp4/webm/mkv) dengan caption .thumbnail — hasilnya foto frame; tambah kata video buat thumbnail animasi",
          `${m.prefix}thumbnail\n${m.prefix}thumbnail 8\n${m.prefix}thumbnail video\n${m.prefix}thumbnail video 4 3`,
          "Tanpa angka = frame otomatis diambil di 20% durasi\n.thumbnail <detik> = frame di detik spesifik\n.thumbnail video = clip animasi pendek (mulai 20% durasi, 5 dtk)\n.thumbnail video <mulai> <durasi> = clip mulai detik X sepanjang Y dtk (maks 15)"
        )
      );
    }

    await m.react("🕒");

    // parse arg: ".thumbnail [detik]" = frame statis | ".thumbnail video [mulai] [durasi]" = clip animasi
    const rawArgs = (args || []).map(String);
    const vidIdx = rawArgs.findIndex((a) => /^(video|vid|animasi|animated|clip)$/i.test(a));
    const videoMode = vidIdx >= 0;
    if (videoMode) rawArgs.splice(vidIdx, 1);
    const nums = rawArgs.map((a) => parseFloat(a.replace(",", "."))).filter((n) => !isNaN(n) && n >= 0);

    const buffer = fromQuoted ? await q.download() : await m.download();
    if (!buffer || !buffer.length) {
      await m.react("❌");
      return m.reply(novaError("Thumbnail", "Gagal download video. Coba kirim ulang."));
    }

    const tmpDir = path.join(os.tmpdir(), "nova-thumbnail");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    inputPath = path.join(tmpDir, `in-${tag}.mp4`);
    outputPath = path.join(tmpDir, `out-${tag}.jpg`);
    fs.writeFileSync(inputPath, buffer);

    const dur = await probeDuration(inputPath);
    if (videoMode) {
      // ── MODE CLIP ANIMASI: thumbnail versi video ala sample Elaina ──
      let clipStart = nums[0] !== undefined ? nums[0] : dur > 0 ? dur * 0.2 : 0;
      let clipLen = nums[1] !== undefined ? nums[1] : 5;
      clipLen = Math.min(Math.max(clipLen, 1), 15); // 1-15 dtk
      if (dur > 0) {
        if (clipStart > dur) clipStart = Math.max(0, dur - clipLen); // clamp biar clip tetap dapet potongan penuh
        if (clipStart + clipLen > dur) clipLen = Math.max(0.5, dur - clipStart);
      }

      clipPath = outputPath.replace(/\.jpg$/, ".mp4");
      try {
        await queueFFmpeg(
          `ffmpeg -y -ss ${clipStart} -i "${inputPath}" -t ${clipLen} -vf scale=480:-2 -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${clipPath}"`,
          180_000
        );
      } catch {
        await m.react("❌");
        return m.reply(novaError("Thumbnail", "Gagal bikin clip animasi — mungkin video rusak / codec gak didukung. Coba .thumbnail video <detik> lain."));
      }

      try { fs.unlinkSync(inputPath); inputPath = null; } catch {}

      if (!fs.existsSync(clipPath) || fs.statSync(clipPath).size === 0) {
        await m.react("❌");
        return m.reply(novaError("Thumbnail", "Gagal bikin clip animasi — mungkin video rusak / codec gak didukung. Coba .thumbnail video <detik> lain."));
      }

      const clipBuf = fs.readFileSync(clipPath);
      try { fs.unlinkSync(clipPath); } catch {}

      const durStr = dur > 0 ? `${dur.toFixed(1)} dtk` : "?";
      const cap = [
        "🎬 ᴛʜᴜᴍʙɴᴀɪʟ ᴀɴɪᴍᴀᴛᴇᴅ",
        `⏱️ ᴍᴜʟᴀɪ ᴅɪᴛɪᴋ : ${clipStart.toFixed(1)} ᴅᴛᴋ`,
        `🎬 ᴅᴜʀᴀꜱɪ ᴄʟɪᴘ : ${clipLen.toFixed(1)} ᴅᴛᴋ`,
        `🎞️ ᴅᴜʀᴀꜱɪ ᴠɪᴅᴇᴏ : ${durStr}`,
        `📐 ʀᴇꜱᴏʟᴜꜱɪ : 480px`,
      ].join("\n");

      await sock.sendMessage(m.chat, { video: clipBuf, caption: cap }, { quoted: m });
      await m.react("🐣");
      return;
    }

    let time = nums[0] !== undefined ? nums[0] : dur > 0 ? Math.min(dur * 0.2, 10) : 0;
    if (dur > 0 && time > dur) time = Math.max(0, dur - 0.5); // jangan nyasar lewat durasi

    try {
      await queueFFmpeg(
        `ffmpeg -y -ss ${time} -i "${inputPath}" -vframes 1 -vf scale=320:-2 -q:v 5 "${outputPath}"`,
        60_000
      );
    } catch {
      await m.react("❌");
      return m.reply(novaError("Thumbnail", "Gagal ambil frame — mungkin video rusak / codec gak didukung. Coba .thumbnail <detik> lain."));
    }

    try { fs.unlinkSync(inputPath); inputPath = null; } catch {}

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      await m.react("❌");
      return m.reply(novaError("Thumbnail", "Gagal ambil frame — mungkin codec gak didukung. Coba .thumbnail <detik> lain."));
    }

    const thumbBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); outputPath = null; } catch {}

    const durStr = dur > 0 ? `${dur.toFixed(1)} dtk` : "?";
    const cap = [
      "🎬 ᴛʜᴜᴍʙɴᴀɪʟ ᴠɪᴅᴇᴏ",
      `⏱️ ꜰʀᴀᴍᴇ ᴅɪᴛɪᴋ : ${time.toFixed(1)} ᴅᴛᴋ`,
      `🎬 ᴅᴜʀᴀꜱɪ ᴠɪᴅᴇᴏ : ${durStr}`,
      `📐 ʀᴇꜱᴏʟᴜꜱɪ : 320px`,
    ].join("\n");

    await sock.sendMessage(m.chat, { image: thumbBuf, caption: cap }, { quoted: m });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    return m.reply(novaError("Thumbnail", e?.message || "Yah gagal kak, coba lagi 😩"));
  } finally {
    try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    try { if (clipPath && fs.existsSync(clipPath)) fs.unlinkSync(clipPath); } catch {}
  }
}

export { handler, pluginConfig, pluginConfig as config };
