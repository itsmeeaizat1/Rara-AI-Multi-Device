// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `xmas_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const pluginConfig = {
  name: "x-mas",
  alias: ["x-mas", "x"],
  category: "fun",
  description: "Fitur spesial Natal",
  usage: ".x-mas",
  example: ".x-mas",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const userName = m.pushName || "Kamu";
    const month = new Date().getMonth() + 1;
    const isChristmasSeason = month === 12;

    const text =
      claraWrap("Christmas", [`Hai *${userName}*!`,
        isChristmasSeason ? "Musim Natal aktif! 🎅" : "Khusus hari Natal!",
        "Selamat Natal! 🎄",
        "Damai dan bahagia selalu."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}x-mas untuk ucapan Natal`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.react("🐣");
    await m.reply(text, "x-mas");
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("XMas", "Gagal nih, coba lagi ya");

    await m.reply(text, "x-mas");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
