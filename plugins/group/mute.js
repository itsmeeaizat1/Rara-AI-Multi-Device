// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `mute_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        novaCaption({
  emoji: "👥",
  name: "mute2",
  description: "Mute member grup",
  usage: `${prefix}mute <@target>`,
  example: `${prefix}mute @username`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "mute");
      return { handled: true };
    }

    const targetName = targetRaw.replace(/^@+/, "") || targetRaw;

    const text =
      claraWrap("Mute", [`Target: *${targetName}*`,
        "Status: *ʙᴇʀʜᴀꜱɪʟ ᴅɪᴍᴜᴛᴇ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}mute <@target> untuk mute orang lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("mute2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
    await m.reply(novaError("Mute", "Gagal nih, coba lagi ya"));
  }

  return { handled: true };
}

export default {
  config: {
    name: "mute2",
    alias: ["mute2", "mute"],
    category: "group",
    description: "Mute member grup",
    usage: ".mute <@target>",
    example: ".mute @username",
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
  },
  handler,
};
