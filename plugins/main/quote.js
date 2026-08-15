// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `quote_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const pluginConfig = {
  name: "quote",
  alias: ["quote", "quotes", "quotemain"],
  category: "fun",
  description: "Dapatkan quote motivasi acak",
  usage: ".quote",
  example: ".quote",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const LOCAL_QUOTES = [
  "Hidup itu seperti sepeda, agar tetap seimbang kamu harus terus bergerak.",
  "Jangan tunggu kesempatan, buatlah kesempatan itu sendiri.",
  "Kegagalan adalah kesempatan untuk mulai lagi dengan lebih bijak.",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    let quote = null;
    let source = "";

    try {
      const res = await axios.get("https://api.zeks.xyz/api/quote", { timeout: 15000 });
      quote = res.data?.result || res.data?.quote || res.data?.message || null;
      source = "API";
    } catch {}

    if (!quote) quote = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    if (!source) source = "Local";

    const text =
      claraWrap("Quote", [`◦ *${quote}*`,
        `◦ Sumber: *${source}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}quote untuk quote lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("quote", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "quote");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
