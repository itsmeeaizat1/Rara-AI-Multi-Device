// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tempo.js — Berita Tempo
import { fetchNewsList } from "../../src/lib/nova-rss-news.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tempo",
  alias: ["tempo"],
  category: "berita",
  description: "Berita Tempo",
  usage: ".tempo",
  example: ".tempo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const data = await fetchNewsList("https://rss.tempo.co", 8);
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("tempo", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = novaBox("BERITA TEMPO", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("tempo error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tempo", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
