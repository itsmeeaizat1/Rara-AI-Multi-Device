// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `join_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const url = m.text?.trim();

    if (!url) {
      const text =
        raraCaption({
  emoji: "👑",
  name: "join2",
  description: "Bot join ke grup via link",
  usage: `${prefix}join <link grup>`,
  example: `${prefix}join https://chat.whatsapp.com/xxxxx`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "join");
      return { handled: true };
    }

    let inviteCode = url;
    const match = url.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (match) inviteCode = match[1];

    await sock.groupAcceptInvite(inviteCode);

    const text =
      raraWrap("Join", [`Link: *${url}*`,
        "Status: *Joined*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "join2");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("Owner", "Gagal nih, coba lagi ya");

    await m.reply( text, "join");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "join2",
  alias: ["join2", "join"],
  category: "owner",
  description: "Bot join ke grup via link",
  usage: ".join <link grup>",
  example: ".join https://chat.whatsapp.com/xxxxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
