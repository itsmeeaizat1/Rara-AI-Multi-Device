// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";

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
    return m.reply(
      `Cara Pakai: ${m.prefix}spotify <judul/artis>\nContoh: ${m.prefix}spotify bruno mars`
    );
  }

  try {
    const res = await axios.get(
      `https://api.cuki.biz.id/api/search/spotify?apikey=${config.APIkey?.cuki || "cuki-x"}&query=${encodeURIComponent(text)}&limit=5`,
      { timeout: 20000 },
    );
    const data = res.data;

    if (!data?.status || !data?.data?.results || data.data.results.length === 0) {
      return m.reply("❌ Lagu tidak ditemukan. Coba kata kunci lain.");
    }

    const results = data.data.results;

    let reply = "Hasil Pencarian Spotify:\n\n";

    results.forEach((t, i) => {
      reply += `${i + 1}. *${t.title}*\n`;
      reply += `   Artis: ${t.artist} | Durasi: ${t.duration}\n`;
    });

    reply += `\nDownload: ${m.prefix}spdl <link>`;

    return m.reply(reply);
  } catch (err) {
    console.error("[Spotify Search]", err.message);
    return m.reply("❌ API Spotify lagi bermasalah. Coba lagi nanti.");
  }
}

export { pluginConfig as config, handler };
