// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .convert <format> — convert media terakhir yang diunduh (session 10 menit)
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import { novaBox, novaError, novaGuide, claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import {
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  getConvertSession,
} from "../../src/lib/nova-convert.js";

const pluginConfig = {
  name: "convert",
  alias: ["convert", "conv"],
  aliases: ["convert", "conv", "konversi", "konvert", "cv"],
  category: "convert",
  description: "Convert media terakhir yang kamu unduh ke format lain (audio & video lengkap)",
  usage: ".convert <format> — audio: mp3, wav, flac, aac, m4a, ogg, opus, wma, ac3, amr | video: mp4, mkv, avi, mov, webm, flv, 3gp, wmv, mpeg, m4v, ts, ogv, gif",
  example: ".convert mp3 / .convert avi",
  isOwner: false, isPremium: false,
  cooldown: 5, energi: 3, isEnabled: true,
};

const MAX_INPUT_MB = 200;
const MAX_OUTPUT_MB = 95; // WhatsApp limit ~100MB

function formatListText() {
  const audio = Object.entries(AUDIO_FORMATS).map(([k, v]) => `• ${k} — ${v.desc}`).join("\n");
  const video = Object.entries(VIDEO_FORMATS).map(([k, v]) => `• ${k} — ${v.desc}`).join("\n");
  return claraWrap("Convert", [
    "📌 Tentukan format tujuan!",
    "",
    "💡 Format tersedia:",
    "",
    "— Audio —",
    audio,
    "",
    "— Video —",
    video,
    "",
    "📌 Cara pakai:",
    "1. Download media dulu (.tiktok, .play, dll)",
    "2. Ketik .convert <format>",
    "",
    "Contoh: .convert mp3",
  ].join("\n"));
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const format = (args[0] || "").toLowerCase().trim();

  // Validasi format dulu biar list error-nya informatif
  const isAudio = !!AUDIO_FORMATS[format];
  const isVideo = !!VIDEO_FORMATS[format];
  if (!format || (!isAudio && !isVideo)) {
    return m.reply(formatListText());
  }

  const session = getConvertSession(m);
  if (!session || (!session.filePath && !session.mediaUrl)) {
    await m.react("❗");
    return m.reply(
      novaGuide(
        "Convert",
        "Belum ada media buat di-convert nih! Session convert udah kedaluwarsa atau belum ada.\n\nDownload media dulu (.tiktok, .play, dll) — nanti otomatis muncul tawaran convert di bawah medianya.",
        `${m.prefix}convert mp3`
      )
    );
  }

  // Session audio cuma bisa convert ke format audio
  if (session.type === "audio" && isVideo) {
    await m.react("❗");
    return m.reply(novaError("Convert", "Media ini audio, jadi cuma bisa convert ke format audio (mp3, wav, aac, dll)."));
  }

  const fmt = isAudio ? AUDIO_FORMATS[format] : VIDEO_FORMATS[format];
  await m.react("🕒");

  try {
    // ── Ambil source: dari temp file (buffer) atau download ulang URL ──
    const tmpDir = path.join(os.tmpdir(), "nova-convert-out");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const inputPath = path.join(tmpDir, `in_${id}`);
    const outputPath = path.join(tmpDir, `out_${id}.${fmt.ext}`);

    if (session.filePath && fs.existsSync(session.filePath)) {
      fs.copyFileSync(session.filePath, inputPath);
    } else {
      const res = await axios.get(session.mediaUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: MAX_INPUT_MB * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      fs.writeFileSync(inputPath, Buffer.from(res.data));
    }

    const inSize = fs.statSync(inputPath).size;
    if (inSize > MAX_INPUT_MB * 1024 * 1024) {
      fs.unlinkSync(inputPath);
      await m.react("❌");
      return m.reply(novaError("Convert", `Media kegedean (${(inSize / 1024 / 1024).toFixed(0)} MB). Maksimal ${MAX_INPUT_MB} MB.`));
    }

    // ── Build perintah ffmpeg ──
    let cmd;
    if (isAudio) {
      let extra = "";
      if (format === "amr") extra = " -ar 8000 -ac 1";
      if (format === "opus") extra = " -ar 48000";
      if (format === "ac3") extra = " -ar 48000 -ac 2";
      if (format === "aiff" || format === "au") extra = " -ar 44100 -ac 2";
      cmd = `ffmpeg -y -i "${inputPath}" -vn -c:a ${fmt.codec}${extra} -q:a 2 "${outputPath}"`;
    } else {
      const audioArgs = fmt.audio ? `-c:a ${fmt.audio}` : "-an";
      cmd = `ffmpeg -y -i "${inputPath}" -c:v ${fmt.codec} ${fmt.extra || ""} ${audioArgs} "${outputPath}"`;
    }

    await queueFFmpeg(cmd);

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error("Hasil convert kosong — format/codec gak didukung ffmpeg");
    }

    let buf = fs.readFileSync(outputPath);
    if (buf.length > MAX_OUTPUT_MB * 1024 * 1024) {
      buf = null;
      fs.unlinkSync(inputPath); fs.unlinkSync(outputPath);
      await m.react("❌");
      return m.reply(novaError("Convert", `Hasil convert kegedean (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(0)} MB) — gak bisa dikirim via WhatsApp (maks ~100 MB).`));
    }

    // ── Kirim hasil ──
    const title = session.title || session.platform || "Media";
    const card = mediaPreviewCard({
      title: `${title} → ${format.toUpperCase()}`,
      body: `Nova Convert • ${fmt.desc}`,
      sourceUrl: session.sourceUrl || "",
      thumbnailUrl: "",
    });
    const sizeMB = (buf.length / 1024 / 1024).toFixed(2);

    if (isAudio) {
      const isPtt = format === "ogg" || format === "opus";
      await sock.sendMessage(m.chat, {
        audio: buf,
        mimetype: fmt.mime,
        ptt: isPtt,
        fileName: `${(title || "nova").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "nova"}.${fmt.ext}`,
        contextInfo: card,
      }, { quoted: m });
    } else if (format === "mp4") {
      await sock.sendMessage(m.chat, {
        video: buf,
        mimetype: fmt.mime,
        contextInfo: card,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        document: buf,
        fileName: `${(title || "nova").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "nova"}.${fmt.ext}`,
        mimetype: fmt.mime,
        contextInfo: card,
      }, { quoted: m });
    }

    await m.reply(
      novaBox("Convert", [
        `✅ Berhasil convert ke ${format.toUpperCase()}`,
        `Format: ${fmt.desc}`,
        `Size: ${sizeMB} MB`,
        "",
        "Mau format lain? Ketik",
        ".convert <format> — session",
        "masih aktif.",
      ])
    );

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    await m.react("🐣");
    await m.reply(novaBerhasil("Convert"));
  } catch (e) {
    console.error("[convert.js]", e.message);
    await m.react("❌");
    return m.reply(novaGangguan("Convert"));
  }
}

export { pluginConfig as config, handler };
