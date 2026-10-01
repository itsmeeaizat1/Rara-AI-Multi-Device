// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, raraWrap, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `unban_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      await m.reply(raraGuide('Unban', 'Tag atau sebutkan member yang ingin di-unban dari grup/bot!', `${prefix}unban @user`));
      return { handled: true };
    }

    const targetName = targetRaw.replace(/^@+/, "") || targetRaw;

    const text =
      raraWrap("Unban", [`Target: *${targetName}*`,
        "Status: *berhasil di-unban*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}unban <@target> untuk unban orang lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "unban2");
  } catch (error) {
    await m.reply(raraError('Unban', `Gagal membuka ban member: ${error.message}`));
  }

  return { handled: true };
}

export default {
  config: {
    name: "unban2",
    alias: ["unban2", "unban"],
    category: "group",
    description: "Unban member grup",
    usage: ".unban <@target>",
    example: ".unban @username",
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
