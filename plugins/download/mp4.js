// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
    const fileName = url.split("/").pop() || `video_${Date.now()}.mp4`;
    const fileSize = (buffer.length / 1024 / 1024).toFixed(2);

    const _cap = mediaCaption({
      platformIcon: "🎬", platformName: "MP4",
      title: fileName,
      format: `${fileSize} MB`,
      method: "direct",
    });

    await m.react("🐣");
    await m.reply(novaBerhasil("mp4"));
    await sock.sendMessage(m.chat, {
      video: buffer,
      caption: _cap,
    }, { quoted: m });
  } catch (error) {
    await m.reply(novaGagal("MP4 Downloader"));
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