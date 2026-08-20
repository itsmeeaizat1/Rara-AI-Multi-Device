// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

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
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}welcome on/off*`,
          `◦ Contoh: *${prefix}welcome on*`,
          `◦ Contoh: *${prefix}welcome off*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("welcome2", text));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { welcome: args === "on" });

    const text =
      claraWrap("Welcome", ["◦ Fitur: *Welcome Message*",
        `◦ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `◦ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}welcome on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("welcome2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "welcome");
  }

  return { handled: true };
}

export default {
  config: {
    name: "welcome2",
    alias: ["welcome2", "welcomemain", "welcm"],
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
