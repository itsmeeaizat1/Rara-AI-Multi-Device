import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
  return path.join(TMP_DIR, `happy_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😜", "🤪", "😝", "🤗", "🤭", "🤠", "🥳", "😎"];

const pluginConfig = {
  name: "happyemoji",
  alias: ["happyemoji", "emoji2", "autoemoji"],
  category: "fun",
  description: "Kirim emoji acak yang ceria",
  usage: ".happyemoji",
  example: ".happyemoji",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const text =
      claraWrap("Happy Emoji", [`◦ Emoji: *${emoji}*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}happyemoji untuk emoji lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("happyemoji", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const reply =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, reply, "happyemoji");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
