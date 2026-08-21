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
  return path.join(TMP_DIR, `loli_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const ENDPOINTS = [
  "https://api.zeks.xyz/api/loli",
];

const pluginConfig = {
  name: "loli",
  alias: ["loli", "loliphoto", "loliimg"],
  category: "search",
  description: "Cari gambar",
  usage: ".loli",
  example: ".loli",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    let buffer = null;
    for (const baseUrl of ENDPOINTS) {
      try {
        const res = await axios.get(baseUrl, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        if (res.status === 200 && res.data && res.data.length > 1000) {
          buffer = Buffer.from(res.data);
          break;
        }
      } catch (e) { console.error('[loli.js]:', e.message); }
    }

    if (!buffer) {
      const text =
        claraWrap("Gagal", ["╎❏ Status: *Gagal*",
          "╎❏ Alasan: *Endpoint saat ini tidak merespons.*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "loli");
      return { handled: true };
    }

    const filePath = tempPath(".jpg");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: "╎❏ Status: *Berhasil*",
    }, { quoted: m });

    const text =
      claraWrap("Foto", ["╎❏ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}loli untuk hasil lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("loli", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "loli");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
