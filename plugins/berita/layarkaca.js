// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// layarkaca.js — Berita Layarkaca
import { fetchNewsList } from "../../src/lib/rara-rss-news.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "layarkaca",
  alias: ["layarkaca"],
  category: "berita",
  description: "Berita Layarkaca",
  usage: ".layarkaca",
  example: ".layarkaca",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const data = await fetchNewsList("https://news.google.com/rss/search?q=film%20bioskop&hl=id&gl=ID&ceid=ID:id", 8);
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("layarkaca", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = raraBox("BERITA LAYARKACA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("layarkaca error:", err);
    await m.react("❌");
    return m.reply(raraWrap("layarkaca", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
