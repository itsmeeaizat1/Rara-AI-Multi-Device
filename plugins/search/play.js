// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import yts from "yt-search";
import { toSC } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Putar musik/video YouTube",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(
      "╭─「 ✦ Play ✦ 」\n│\n│ 📌 " + toSC("Cara Pakai") + ":\n│ " + m.prefix + "play <judul lagu>\n│\n│ 💡 " + toSC("Contoh") + ":\n│ " + m.prefix + "play komang\n│ " + m.prefix + "play faded\n│\n╰────  •  ────",
    );
  }

  try {
    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) {
      return m.reply("╭─「 ✦ Play ✦ 」\n│\n│ ❌ " + toSC("Lagu tidak ditemukan") + "\n│ " + toSC("Coba kata kunci lain") + "\n│\n╰────  •  ────");
    }

    const video = search.videos[0];

    const reply =
      "╭─「 ✦ " + toSC("Now Playing") + " ✦ 」\n│\n" +
      "│ 📌 " + toSC("Judul") + " : *" + video.title + "*\n" +
      "│ 👤 " + toSC("Channel") + " : *" + video.author.name + "*\n" +
      "│ ⏱️ " + toSC("Durasi") + " : *" + video.duration.timestamp + "*\n" +
      "│ 👀 " + toSC("Views") + " : *" + formatViews(video.views) + "*\n" +
      "│ 🔗 " + video.url + "\n" +
      "│\n│ " + toSC("Download Audio") + ": " + m.prefix + "ytmp3 " + video.url + "\n" +
      "│ " + toSC("Download Video") + ": " + m.prefix + "ytmp4 " + video.url + "\n" +
      "╰────  •  ────";

    return m.reply(reply);
  } catch (err) {
    console.error("[Play]", err.message || err);
    return m.reply(
      "╭─「 ✦ Play ✦ 」\n│\n│ ❌ " + toSC("Gagal memutar lagu") + "\n│ " + toSC(err.message || "Coba lagi nanti") + "\n│\n╰────  •  ────",
    );
  }
}

export { pluginConfig as config, handler };
