// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
  return path.join(TMP_DIR, `join_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();

    if (!url) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}join <link grup>*`,
          `  ┊  ➶ Contoh: *${prefix}join https://chat.whatsapp.com/xxxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "join");
      return { handled: true };
    }

    let inviteCode = url;
    const match = url.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (match) inviteCode = match[1];

    await sock.groupAcceptInvite(inviteCode);

    const text =
      claraWrap("Join", [`  ┊  ➶ Link: *${url}*`,
        "  ┊  ➶ Status: *Joined*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("join2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "join");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "join2",
  alias: ["join2", "joingroup", "masukgroup"],
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
