// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kontan.js — Berita Kontan Finance
import { fetchNewsList } from "../../src/lib/rara-rss-news.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "kontan",
  alias: ["kontan"],
  category: "berita",
  description: "Berita Kontan Finance",
  usage: ".kontan",
  example: ".kontan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const data = await fetchNewsList("https://news.google.com/rss/search?q=site%3Akontan.co.id&hl=id&gl=ID&ceid=ID:id", 8);
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("kontan", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = raraBox("BERITA KONTAN FINANCE", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("kontan error:", err);
    await m.react("❌");
    return m.reply(raraWrap("kontan", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
