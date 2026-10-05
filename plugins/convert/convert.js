// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .convert <format> — convert media terakhir yang diunduh (session 10 menit)
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { queueFFmpeg } from "../../src/lib/rara-ffmpeg.js";
import { raraBox, raraError, raraGuide, raraSalah, raraWrap, raraBerhasil, raraGagal, raraGangguan, toSC, scLine } from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import {
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  IMAGE_FORMATS,
  getConvertSession,
  setConvertSession,
} from "../../src/lib/rara-convert.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const IMAGE_MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

const pluginConfig = {
  name: "convert",
  alias: ["convert", "conv"],
  aliases: ["convert", "conv", "konversi", "konvert", "cv"],
  category: "convert",
  description: "Convert media ke format lain — reply media langsung, upload dengan caption, atau dari media terakhir yang diunduh (audio, video, gambar lengkap)",
  usage: ".convert <format> — reply media / upload media + caption .convert <format> — audio: mp3, wav, flac, aac, m4a, ogg, opus, wma, ac3, amr | video: mp4, mkv, avi, mov, webm, flv, 3gp, wmv, mpeg, m4v, ts, ogv, gif | gambar: jpg, png, webp",
  example: ".convert mp3 (reply video) / .convert png (reply gambar)",
  isOwner: false, isPremium: false,
  cooldown: 5, energi: 3, isEnabled: true,
};

const MAX_INPUT_MB = 200;
const MAX_OUTPUT_MB = 95; // WhatsApp limit ~100MB

// REWORK 2026-09-10 (owner: "klo convert dibawahnya berarti ada detail
// daftar list format" — layout usage terpadu): 📝 Cara Pakai + 💡 Contoh +
// 📋 detail daftar format di bawah contoh (ala section model di usage AI).
function formatListText() {
  // REWORK 10 Sep (owner: "gini aja jgn dobel") — nama format gak dobel:
  // desc yang ngeulang nama format ("MP3 (universal)") di-strip prefix-nya → "mp3 (universal)".
  const fmtItem = ([k, v]) => {
    const stripped = String(v.desc || "").replace(new RegExp(`^${k}\\s*`, "i"), "").trim();
    return stripped ? `${k} ${stripped}` : k;
  };
  const audio = Object.entries(AUDIO_FORMATS).map(fmtItem);
  const video = Object.entries(VIDEO_FORMATS).map(fmtItem);
  const image = Object.entries(IMAGE_FORMATS).map(fmtItem);
  return raraBox("Convert", [
    `📝 ${toSC("Cara Pakai")}:`,
    "Unggah atau reply media dengan caption .convert <format>",
    "",
    `💡 ${toSC("Contoh")}:`,
    ".convert mp3 (reply video)",
    "",
    `📋 ${toSC("Format Tersedia")}:`,
    { sub: "Audio" },
    ...audio,
    "",
    { sub: "Video" },
    ...video,
    "",
    { sub: "Gambar" },
    ...image,
    "",
    `📍 ${scLine("Media hasil download bot (.tiktok, .play, dll) otomatis ke-session 10 menit:")}`,
    scLine("Tinggal ketik .convert <format>"),
  ]);
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const format = (args[0] || "").toLowerCase().trim();

  // Validasi format dulu biar list error-nya informatif
  const isAudio = !!AUDIO_FORMATS[format];
  const isVideo = !!VIDEO_FORMATS[format];
  const isImage = !!IMAGE_FORMATS[format];
  if (!format || (!isAudio && !isVideo && !isImage)) {
    return m.reply(formatListText());
  }

  // ── Jalur 1: reply media / upload media + caption — convert langsung ──
  const media = m.quoted?.isMedia ? m.quoted : m.isMedia ? m : null;
  if (media) {
    const buffer = await media.download();
    if (!buffer) {
      await m.react("❌");
      return m.reply(raraError("Convert", "Gagal mengunduh media-nya. Coba ulangi lagi ya."));
    }

    // Deteksi jenis media
    let type = null;
    let title = "Media Upload";
    if (media.isVideo) type = "video";
    else if (media.isAudio || media.isSticker || media.isImage) type = media.isAudio ? "audio" : "image";
    else if (media.isDocument) {
      const doc = media.message?.documentMessage || {};
      const mime = doc.mimetype || "";
      title = doc.fileName || "Media Upload";
      if (mime.startsWith("video/")) type = "video";
      else if (mime.startsWith("audio/")) type = "audio";
      else if (mime.startsWith("image/")) type = "image";
    }

    if (!type) {
      await m.react("❗");
      return m.reply(raraError("Convert", "File ini bukan media yang bisa di-convert. Kirim video, audio, gambar, atau sticker ya."));
    }

    // Validasi format vs jenis media
    if (type === "audio" && (isVideo || isImage)) {
      await m.react("❗");
      return await sendUsageCard(sock, m, raraSalah("Convert", "media ini audio, cuma bisa convert ke format audio"), { name: "Convert" });
    }
    if (type === "image" && !isImage && format !== "gif") {
      await m.react("❗");
      return await sendUsageCard(sock, m, raraSalah("Convert", "media ini gambar, cuma bisa convert ke format gambar atau gif"), { name: "Convert" });
    }

    // Masukin ke session biar chaining .convert <format> laennya tetap bisa
    setConvertSession(m, { buffer, type, platform: "Upload", title });
  }

  // ── Jalur 2: session dari media terakhir yang diunduh ──
  const session = getConvertSession(m);
  if (!session || (!session.filePath && !session.mediaUrl)) {
    await m.react("❗");
    return m.reply(
      raraGuide(
        "Convert",
        "Belum ada media buat di-convert nih!\n\nUnggah atau reply media dengan caption .convert <format>",
        `${m.prefix}convert mp3`,
        "Media hasil download bot (.tiktok, .play, dll) otomatis ke-session 10 menit — tinggal ketik .convert <format>"
      )
    );
  }

  // Session audio cuma bisa convert ke format audio
  if (session.type === "audio" && (isVideo || isImage)) {
    await m.react("❗");
    return await sendUsageCard(sock, m, raraSalah("Convert", "media ini audio, cuma bisa convert ke format audio"), { name: "Convert" });
  }

  // Session gambar cuma bisa convert ke format gambar / gif
  if (session.type === "image" && !isImage && format !== "gif") {
    await m.react("❗");
    return await sendUsageCard(sock, m, raraSalah("Convert", "media ini gambar, cuma bisa convert ke format gambar atau gif"), { name: "Convert" });
  }

  const fmt = isAudio ? AUDIO_FORMATS[format] : isImage ? IMAGE_FORMATS[format] : VIDEO_FORMATS[format];
  await m.react("🕒");

  try {
    // ── Ambil source: dari temp file (buffer) atau download ulang URL ──
    const tmpDir = path.join(os.tmpdir(), "rara-convert-out");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const inputPath = path.join(tmpDir, `in_${id}`);
    const outExt = fmt.ext || format;
    const outputPath = path.join(tmpDir, `out_${id}.${outExt}`);

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
      return m.reply(raraError("Convert", `Media kegedean (${(inSize / 1024 / 1024).toFixed(0)} MB). Maksimal ${MAX_INPUT_MB} MB.`));
    }

    // ── Build perintah ffmpeg ──
    let cmd;
    if (isImage) {
      cmd = `ffmpeg -y -i "${inputPath}" "${outputPath}"`;
    } else if (isAudio) {
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
      return m.reply(raraError("Convert", `Hasil convert kegedean (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(0)} MB) — gak bisa dikirim via WhatsApp (maks ~100 MB).`));
    }

    // ── Kirim hasil ──
    const title = session.title || session.platform || "Media";
    const previewCard = mediaPreviewCard({
      title: `${title} → ${format.toUpperCase()}`,
      body: `Rara Convert • ${fmt.desc}`,
      sourceUrl: session.sourceUrl || "",
      thumbnailUrl: "",
    });
    const sizeMB = (buf.length / 1024 / 1024).toFixed(2);

    let mcard = "";
    try {
      const info = await probeBuffer(buf, { mime: isImage ? (IMAGE_MIME[format] || "image/jpeg") : fmt.mime });
      mcard = mediaResultCard({
        header: pluginConfig.name,
        type: isImage ? "foto" : isAudio ? "audio" : (format === "mp4" ? "video" : "dokumen"),
        request: [
          ["Format Target", format.toUpperCase()],
          ["Deskripsi", fmt.desc || ""],
        ],
        size: info.size,
        mime: info.mime || fmt.mime,
        width: info.width,
        height: info.height,
        duration: info.duration,
      });
    } catch { /* best-effort */ }

    if (isImage) {
      await sock.sendMessage(m.chat, {
        image: buf,
        mimetype: IMAGE_MIME[format] || "image/jpeg",
        caption: mcard || undefined,
        contextInfo: previewCard,
      }, { quoted: m });
    } else if (isAudio) {
      const isPtt = format === "ogg" || format === "opus";
      await sock.sendMessage(m.chat, {
        audio: buf,
        mimetype: fmt.mime,
        ptt: isPtt,
        fileName: `${(title || "rara").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "rara"}.${fmt.ext}`,
        contextInfo: previewCard,
      }, { quoted: m });
      if (mcard) await m.reply(mcard);
    } else if (format === "mp4") {
      await sock.sendMessage(m.chat, {
        video: buf,
        mimetype: fmt.mime,
        caption: mcard || undefined,
        contextInfo: previewCard,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        document: buf,
        fileName: `${(title || "rara").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "rara"}.${fmt.ext}`,
        mimetype: fmt.mime,
        caption: mcard || undefined,
        contextInfo: previewCard,
      }, { quoted: m });
    }

    await m.reply(
      raraBox("Convert", [
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
    await m.reply(raraBerhasil("Convert"));
  } catch (e) {
    console.error("[convert.js]", e.message);
    await m.react("❌");
    return m.reply(raraGangguan("Convert"));
  }
}

export { pluginConfig as config, handler };
