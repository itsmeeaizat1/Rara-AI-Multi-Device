// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `welcome_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide('Welcome', 'Aktifkan atau matikan pesan sambutan (welcome) untuk member baru.', `${prefix}welcome on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    const text =
      claraWrap("Welcome", ["│ Fitur: *ᴡᴇʟᴄᴏᴍᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `│ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `│ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}welcome on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("welcome2", text));
  } catch (error) {
    await m.reply(novaError('Welcome', `Gagal memproses pengaturan welcome: ${error.message}`));
  }

  return { handled: true };
}

export default {
  config: {
    name: "welcome2",
    alias: ["welcome2"],
    category: "group",
    description: "Pesan welcome saat member join grup",
    usage: ".welcome on/off",
    example: ".welcome on",
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
  },
  handler,
};
