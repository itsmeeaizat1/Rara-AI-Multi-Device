// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `sfile_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const url = m.text?.trim();

    if (!url) {
      await m.reply(novaNoInput("SFile DL", "Kirim link SFile yang mau didownload!", `${prefix}sfiledl https://sfile.mobi/xxxx`));
      return { handled: true };
    }

    const response = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    const fileName = url.split("/").pop() || `sfile_${Date.now()}`;
    const fileSize = (buffer.length / 1024 / 1024).toFixed(2);

    const _cap = mediaCaption({
      platformIcon: "📂", platformName: "SFile",
      title: fileName,
      format: `${fileSize} MB`,
      method: "direct",
    });

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      document: buffer,
      mimetype: "application/octet-stream",
      fileName,
      caption: _cap,
    }, { quoted: m });
  } catch (error) {
    await m.reply(novaError("SFile DL", `Gagal mengunduh file: ${error.message}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "sfiledl2",
  alias: ["sfiledl2", "sfiledl"],
  category: "download",
  description: "Download file dari SFile",
  usage: ".sfiledl <link>",
  example: ".sfiledl https://sfile.mobi/xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }