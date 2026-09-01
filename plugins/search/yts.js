// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import yts from "yt-search";
import { toSC } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "yts",
  alias: ["yts"],
  category: "search",
  description: "Cari video YouTube dengan thumbnail dan link download",
  usage: ".yts <query>",
  example: ".yts lagu pop terbaru",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function handler(m, { sock, text }) {
  if (!text) {
    return m.reply(
      "╭─「 ✦ YTS ✦ 」\n│\n│ 📌 " + toSC("Cara Pakai") + ":\n│ " + m.prefix + "yts <kata kunci>\n│\n│ 💡 " + toSC("Contoh") + ":\n│ " + m.prefix + "yts lagu galau indonesia\n│\n╰────  •  ────",
    );
  }

  try {
    const searchResults = await yts(text);
    const videos = searchResults.videos;

    if (!videos || videos.length === 0) {
      return m.reply("╭─「 ✦ YTS ✦ 」\n│\n│ ❌ " + toSC("Pencarian tidak menemukan hasil") + "\n│ " + toSC("Coba kata kunci lain") + "\n│\n╰────  •  ────");
    }

    const v = videos[0];

    const reply =
      "╭─「 ✦ " + toSC("Hasil Pencarian YouTube") + " ✦ 」\n│\n" +
      "│ 📌 " + toSC("Judul") + " : *" + v.title + "*\n" +
      "│ 👤 " + toSC("Channel") + " : *" + v.author.name + "*\n" +
      "│ ⏱️ " + toSC("Durasi") + " : *" + v.timestamp + "*\n" +
      "│ 👀 " + toSC("Views") + " : *" + formatViews(v.views) + "*\n" +
      "│ 📅 " + toSC("Upload") + " : *" + v.ago + "*\n" +
      "│ 🔗 " + v.url + "\n" +
      "│\n│ " + toSC("Download Audio") + ": " + m.prefix + "ytmp3 " + v.url + "\n" +
      "│ " + toSC("Download Video") + ": " + m.prefix + "ytmp4 " + v.url + "\n" +
      "╰────  •  ────";

    return m.reply(reply);
  } catch (error) {
    console.error("[YTS]", error.message || error);
    return m.reply("╭─「 ✦ YTS ✦ 」\n│\n│ ❌ " + toSC("Gagal mencari video") + "\n│ " + toSC(error.message || "Coba lagi nanti") + "\n│\n╰────  •  ────");
  }
}

export { pluginConfig as config, handler };
