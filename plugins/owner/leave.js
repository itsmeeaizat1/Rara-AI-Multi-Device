// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { raraError, raraEmpty, raraGuide, raraNoInput, tipText,  raraWrap } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `leave_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    await sock.groupLeave(m.chat);

    const text =
      raraWrap("Leave", [`Group: *${m.chat}*`,
        "Status: *Left*",
        `Executor: *${m.pushName || "Owner"}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "leave2");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("Owner", "Gagal nih, coba lagi ya");

    await m.reply( text, "leave");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "leave2",
  alias: ["leave2", "leave"],
  category: "owner",
  description: "Bot keluar dari grup (owner only)",
  usage: ".leave",
  example: ".leave",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
