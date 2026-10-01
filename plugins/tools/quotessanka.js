// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "quotessanka",
  alias: ["quotessanka"],
  category: "tools",
  description: "Random quotes motivasi via Sanka API",
  usage: ".quotessanka",
  example: ".quotessanka",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const url = `${API_BASE}/random/quotes?apikey=${API_KEY}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.status) {
      throw new Error(res.data?.message || "API error");
    }

    const quotes = res.data.result?.quotes;

    if (!quotes || !quotes.length) {
      throw new Error("Tidak ada quotes ditemukan");
    }

    // Ambil 1 quote random dari list
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    let txt = `Quotes Sanka\n\n`;
    txt += `"${quote}"\n\n`;
    txt += `~ ${res.data.by || "Sanka Vollerei"}`;

    await m.react("🐣");
    await m.reply( txt, { commandName: "quotessanka" });
  } catch (e) {
    await m.react("❌");
    console.error("[QUOTESSANKA] Error:", e.message);
    let txt = `Gagal mengambil quotes!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(raraWrap("quotessanka", txt));
  }
}

export { pluginConfig as config, handler };
