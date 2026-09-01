// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { toSC } from "../../src/lib/nova-menu-style.js";

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
      "╭─「 ✦ Spotify ✦ 」\n│\n│ 📌 " + toSC("Cara Pakai") + ":\n│ " + m.prefix + "spotify <judul/artis>\n│\n│ 💡 " + toSC("Contoh") + ":\n│ " + m.prefix + "spotify bruno mars\n│\n╰────  •  ────",
    );
  }

  try {
    const res = await axios.get(
      `https://api.cuki.biz.id/api/search/spotify?apikey=${config.APIkey?.cuki || "cuki-x"}&query=${encodeURIComponent(text)}&limit=5`,
      { timeout: 20000 },
    );
    const data = res.data;

    if (!data?.status || !data?.data?.results || data.data.results.length === 0) {
      return m.reply("╭─「 ✦ Spotify ✦ 」\n│\n│ ❌ " + toSC("Lagu tidak ditemukan") + "\n│ " + toSC("Coba kata kunci lain") + "\n│\n╰────  •  ────");
    }

    const results = data.data.results;

    let reply = "╭─「 ✦ " + toSC("Hasil Pencarian Spotify") + " ✦ 」\n│\n";

    results.forEach((t, i) => {
      reply += "│ " + (i + 1) + ". *" + t.title + "*\n";
      reply += "│    🎤 " + t.artist + " | ⏱️ " + t.duration + "\n";
    });

    reply += "│\n│ " + toSC("Download") + ": " + m.prefix + "spdl <link>\n";
    reply += "╰────  •  ────";

    return m.reply(reply);
  } catch (err) {
    console.error("[Spotify Search]", err.message);
    return m.reply("╭─「 ✦ Spotify ✦ 」\n│\n│ ❌ " + toSC("API Spotify lagi bermasalah") + "\n│ " + toSC("Coba lagi nanti") + "\n│\n╰────  •  ────");
  }
}

export { pluginConfig as config, handler };
