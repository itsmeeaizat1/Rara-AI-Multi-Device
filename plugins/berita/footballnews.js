// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// footballnews.js — Berita Bola
import { fetchNewsList } from "../../src/lib/rara-rss-news.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "beritabola",
  alias: ["beritabola"],
  category: "berita",
  description: "Berita Bola",
  usage: ".beritabola",
  example: ".beritabola",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const data = await fetchNewsList("https://news.google.com/rss/search?q=sepak%20bola&hl=id&gl=ID&ceid=ID:id", 8);
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("beritabola", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = raraBox("BERITA BOLA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("beritabola error:", err);
    await m.react("❌");
    return m.reply(raraWrap("beritabola", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
