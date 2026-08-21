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
  return path.join(TMP_DIR, `nh_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();

    if (!query) {
      const text =
        claraWrap("Cara Pakai", [`╎❏ Penggunaan: *${prefix}nhentai <kode/nama>*`,
          `╎❏ Contoh: *${prefix}nhentai 123456*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "nhentai");
      return { handled: true };
    }

    let resultText = query;
    try {
      const apiUrl = `https://api.zeks.xyz/api/nhentai?q=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl, { timeout: 10000 });
      const data = response.data;
      const result = data?.result || data;
      resultText = result?.title || result?.name || result?.result || query;
    } catch (e) { console.error('[nhentai.js]:', e.message); }

    const text =
      claraWrap("NHentai", [`╎❏ Query: *${query}*`,
        `╎❏ Hasil: *${resultText}*`,
        "╎❏ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("nhentai", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("nhentai", text));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "nhentai",
  alias: ["nhentai", "nh", "manga2"],
  category: "search",
  description: "Cari info manga/doujin",
  usage: ".nhentai <kode/nama>",
  example: ".nhentai 123456",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
