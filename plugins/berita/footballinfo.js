// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// footballinfo.js — Info Bola
import { fetchNewsList } from "../../src/lib/rara-rss-news.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "infobola",
  alias: ["infobola"],
  category: "berita",
  description: "Info Bola",
  usage: ".infobola",
  example: ".infobola",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const data = await fetchNewsList("https://news.google.com/rss/search?q=timnas%20indonesia&hl=id&gl=ID&ceid=ID:id", 8);
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("infobola", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = raraBox("INFO BOLA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("infobola error:", err);
    await m.react("❌");
    return m.reply(raraWrap("infobola", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
