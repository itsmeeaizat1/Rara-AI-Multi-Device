// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `ppcouple_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const couple = db?.getCouple?.(m.sender) || null;

    if (!couple) {
      const text =
        claraWrap("PP Couple", ["│ ❏ Kamu belum memiliki pasangan!",
          "",
          `│ ❏ Coba: *${prefix}marry @member*`,
          `│ ❏ Atau: *${prefix}couple*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ppcouple");
      return { handled: true };
    }

    const text =
      claraWrap("PP Couple", [`│ ❏ Kamu: *${m.pushName || "Player"}*`,
        `│ ❏ Pasangan: *${couple.partner || "Unknown"}*`,
        "│ ❏ Status: *ᴍᴀʀʀɪᴇᴅ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("ppcouple", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ppcouple");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "ppcouple",
  alias: ["ppcouple", "ppcp", "ppcouple2"],
  category: "game",
  description: "Lihat PP/status pasangan",
  usage: ".ppcouple",
  example: ".ppcouple",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
