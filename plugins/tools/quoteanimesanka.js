// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "quoteanimesanka",
  alias: ["quoteanimesanka"],
  category: "tools",
  description: "Random quote/quotes anime dari Otakotaku",
  usage: ".quoteanimesanka",
  example: ".quoteanimesanka",
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
    const url = `${API_BASE}/anime/quote?apikey=${API_KEY}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.status) {
      throw new Error(res.data?.message || "API error");
    }

    const quotes = res.data.result;

    if (!quotes || !quotes.length) {
      throw new Error("Tidak ada quote ditemukan");
    }

    // Ambil 1 quote random dari list
    const q = quotes[Math.floor(Math.random() * quotes.length)];

    let txt = `Anime Quote\n\n`;
    txt += `"${q.quote}"\n\n`;
    txt += `Karakter: ${q.character}\n`;
    txt += `Anime: ${q.anime}\n`;
    txt += `Episode: ${q.episode}\n\n`;
    txt += `Source: ${q.link}`;

    // Kalau ada image karakter, kirim sebagai image+caption
    if (q.image) {
      try {
        const imgRes = await axios.get(q.image, {
          responseType: "arraybuffer",
          timeout: 15000,
          validateStatus: () => true,
        });
        if (imgRes.status === 200) {
          const buf = Buffer.from(imgRes.data);
          await sock.sendMessage(m.chat, {
            image: buf,
            caption: txt,
          }, { quoted: m });
          return;
        }
      } catch (e) { /* fall through to text */ }
    }

    // Tanpa image, kirim text saja
    await m.react("🐣");
    await m.reply( txt, { commandName: "quoteanimesanka" });
  } catch (e) {
    await m.react("❌");
    console.error("[QUOTEANIMESANKA] Error:", e.message);
    let txt = `Gagal mengambil quote anime!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(raraWrap("quoteanimesanka", txt));
  }
}

export { pluginConfig as config, handler };
