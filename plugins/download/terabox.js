// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

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
    // Try IkyyXD terabox first
    const ikyyResult = await ikyyDl("terabox", url);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      await sock.sendMedia(m.chat, video.url, ikyyResult.title || "Terabox", m, {
        type: "video", contextInfo: { forwardingScore: 0, isForwarded: false }
      });
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
        "Status: *ʙᴇʀʜᴀꜱɪʟ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}terabox <link> untuk download file lain`);

    await m.reply(text);
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
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }