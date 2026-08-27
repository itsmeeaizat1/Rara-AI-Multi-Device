// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `goodbye_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      const text =
        novaCaption({
  emoji: "👥",
  name: "goodbye2",
  description: "Pesan goodbye saat member keluar grup",
  usage: `${prefix}goodbye on/off`,
  example: `${prefix}goodbye on`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("goodbye2", text));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { goodbye: args === "on" });

    const text =
      claraWrap("Goodbye", ["│ Fitur: *ɢᴏᴏᴅʙʏᴇ ᴍᴇꜱꜱᴀɢᴇ*",
        `│ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `│ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}goodbye on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("goodbye2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "goodbye");
  }

  return { handled: true };
}

export default {
  config: {
    name: "goodbye2",
    alias: ["goodbye2"],
    category: "group",
    description: "Pesan goodbye saat member keluar grup",
    usage: ".goodbye on/off",
    example: ".goodbye on",
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
