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
  return path.join(TMP_DIR, `videy_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();

    if (!url) {
      await m.reply(novaNoInput("Videy Downloader", "Masukkan URL video Videy yang mau kamu download!", `${prefix}videy https://videy.co/video/xxxx`));
      return { handled: true };
    }

    const apiUrl = `https://api.zeks.xyz/api/videy?url=${encodeURIComponent(url)}`;
    let response;
    try {
      response = await axios.get(apiUrl, { timeout: 10000 });
    } catch (apiErr) {
      throw new Error("API Videy sedang bermasalah nih. Coba lagi nanti atau gunakan downloader lain.");
    }
    const data = response.data;
    const result = data?.result || data;
    const videoUrl = result?.url || result?.link || url;

    const text =
      claraWrap("Videy", [`│ Link: *${url}*`,
        `│ Result: *${videoUrl}*`,
        "│ Status: *ʙᴇʀʜᴀꜱɪʟ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}videy <link> untuk download video lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    await m.reply(novaError("Videy Downloader", error.message || "Gagal mengambil video dari Videy"));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "videy2",
  alias: ["videy2"],
  category: "download",
  description: "Download video dari Videy",
  usage: ".videy <link>",
  example: ".videy https://videy.co/video/xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler };
