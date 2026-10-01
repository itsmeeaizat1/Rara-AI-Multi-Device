// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `terabox_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
        await m.react("🕒");
    // Try IkyyXD terabox first
    const ikyyResult = await ikyyDl("terabox", url);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
const _cap = mediaCaption({ platformIcon: "📦", platformName: "Terabox", title: ikyyResult.title || "Terabox Video", format: "Video", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
      return;
    }

    const url = m.text?.trim();

    if (!url) {
      return m.reply(novaGuide("Terabox", "Masukkan URL file Terabox yang mau diunduh!", `${prefix}terabox https://terabox.com/s/xxxx`));
    }

    const response = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    const ext = ".bin";
    const filePath = tempPath(ext);
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      document: fs.readFileSync(filePath),
      mimetype: "application/octet-stream",
      fileName: `terabox_${Date.now()}${ext}`,
    });

    const text =
      claraWrap("Terabox", [`Link: *${url}*`,
        "Status: *berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}terabox <link> untuk download file lain`);

    await m.reply(text);
      await m.react("🐣"); await m.react("🐣"); m.reply(novaBerhasil("terabox2"));
  } catch (error) {
    return m.reply(novaError("Terabox", `Gagal mengunduh file — ${error.message || 'terjadi kesalahan, coba lagi nanti ya'}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "terabox2",
  alias: ["terabox2", "terabox"],
  category: "download",
  description: "Download file dari Terabox",
  usage: ".terabox <link>",
  example: ".terabox https://terabox.com/s/xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
