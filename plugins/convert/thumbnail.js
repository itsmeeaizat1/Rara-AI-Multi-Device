// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .thumbnail — ambil frame dari video sebagai thumbnail (request owner 11 Sep
// 2026: "cara thumbnail mp4", varian no 1: frame otomatis di 20% durasi).
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
  description: "Ambil thumbnail/frame dari video mp4 — default frame di 20% durasi, atau pilih detik spesifik",
  usage: ".thumbnail (reply video) | .thumbnail <detik> (reply video)",
  example: ".thumbnail\n.thumbnail 8",
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
          "Unggah atau reply video (mp4/webm/mkv) dengan caption .thumbnail",
          `${m.prefix}thumbnail\n${m.prefix}thumbnail 8`,
          "Tanpa angka = frame otomatis diambil di 20% durasi\n.thumbnail <detik> = ambil frame di detik spesifik"
        )
      );
    }

    await m.react("🕒");

    // arg detik opsional (".thumbnail 8" = frame di detik ke-8)
    const argSec = parseFloat(String(args[0] || "").replace(",", "."));
    const hasSec = !isNaN(argSec) && argSec >= 0;

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
    let time = hasSec ? argSec : dur > 0 ? Math.min(dur * 0.2, 10) : 0;
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
  }
}

export { handler, pluginConfig };
