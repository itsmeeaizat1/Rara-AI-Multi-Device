// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `mp4_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const url = m.text?.trim();

    if (!url) {
      await m.reply(novaNoInput("MP4 Downloader", "Masukkan link langsung video MP4!", `${prefix}mp4 https://example.com/video.mp4`));
      return { handled: true };
    }

    const response = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    const filePath = tempPath(".mp4");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      video: fs.readFileSync(filePath),
      caption: `│ URL: *${url}*\n│ Ukuran: *${(buffer.length / 1024 / 1024).toFixed(2)} MB*`,
    }, { quoted: m });

    const text =
      claraWrap("MP4 Download", [`│ Link: *${url}*`,
        "│ Status: *ʙᴇʀʜᴀꜱɪʟ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    await m.reply(novaError("MP4 Downloader", `Gagal mengunduh MP4: ${error.message}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "mp4",
  alias: ["mp4"],
  category: "download",
  description: "Download file MP4 dari link",
  usage: ".mp4 <link>",
  example: ".mp4 https://example.com/video.mp4",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }