// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "spotify",
  alias: ["spotify"],
  category: "search",
  description: "Cari lagu di Spotify berdasarkan judul atau artis",
  usage: ".spotify <query>",
  example: ".spotify neffex grateful",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, text }) {
  if (!text) {
    return m.reply(raraWrap("spotify", [
      "Cari lagu di Spotify berdasarkan judul atau artis.",
      "",
      `📌 Format: ${m.prefix}spotify <judul/artis>`,
      "",
      `💡 Contoh: ${m.prefix}spotify bruno mars`,
    ]));
  }

  await m.react("🕒");
  try {
    const res = await axios.get(
      `https://api.cuki.biz.id/api/search/spotify?apikey=${config.APIkey?.cuki || "cuki-x"}&query=${encodeURIComponent(text)}&limit=5`,
      { timeout: 20000 },
    );
    const data = res.data;

    if (!data?.status || !data?.data?.results || data.data.results.length === 0) {
      await m.react("❗");
      return m.reply(raraWrap("spotify", "Lagu tidak ditemukan kak, coba kata kunci lain ya.", "error"));
    }

    const results = data.data.results;

    let reply = "Hasil Pencarian Spotify:\n\n";

    results.forEach((t, i) => {
      reply += `${i + 1}. *${t.title}*\n`;
      reply += `   Artis: ${t.artist} | Durasi: ${t.duration}\n`;
    });

    reply += `\nDownload: ${m.prefix}spdl <link>`;

    await m.react("🐣");
    return m.reply(reply);
  } catch (err) {
    console.error("[Spotify Search]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("spotify", "API Spotify lagi gangguan kak, coba lain waktu ya 😥", "error"));
  }
}

export { pluginConfig as config, handler };
