// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

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
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}videy <link>*`,
          `◦ Contoh: *${prefix}videy https://videy.co/video/xxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "videy");
      return { handled: true };
    }

    const apiUrl = `https://api.zeks.xyz/api/videy?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const data = response.data;
    const result = data?.result || data;
    const videoUrl = result?.url || result?.link || url;

    const text =
      claraWrap("Videy", [`◦ Link: *${url}*`,
        `◦ Result: *${videoUrl}*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}videy <link> untuk download video lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("videy2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "videy");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "videy2",
  alias: ["videy2", "videymain", "videy2dl"],
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

export { pluginConfig as config, handler }
