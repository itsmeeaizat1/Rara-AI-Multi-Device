// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";

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
  alias: ["quote"],
  category: "fun",
  description: "Dapatkan quote motivasi acak",
  usage: ".quote",
  example: ".quote",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    let quote = null;
    let author = "";
    let source = "";

    // Source 1: zenquotes.io (free, no key, verified alive)
    try {
      const res = await axios.get("https://zenquotes.io/api/random", { timeout: 15000 });
      if (res.data?.[0]?.q) {
        quote = res.data[0].q;
        author = res.data[0].a || "";
        source = "ZenQuotes";
      }
    } catch (e) { console.error('[quote.js]:', e.message); }

    // Source 2: Zeks API (DEAD - keep as fallback attempt)
    if (!quote) {
      try {
        const res = await axios.get("https://api.zeks.xyz/api/quote", { timeout: 8000 });
        quote = res.data?.result || res.data?.quote || res.data?.message || null;
        source = "Zeks";
      } catch (e) { /* dead API, skip */ }
    }

    if (!quote) quote = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    if (!source) source = "Local";

    const displayQuote = author ? `${quote}\n
— ${author}` : quote;
    const text =
      raraWrap("Quote", [`*${displayQuote}*`,
        `Sumber: *${source}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}quote untuk quote lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(text, "quote");
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("Quote", "Gagal nih, coba lagi ya");

    await m.reply(text, "quote");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
