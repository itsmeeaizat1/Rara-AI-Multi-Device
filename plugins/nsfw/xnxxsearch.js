// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// xnxxsearch.js — Search video NSFW
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBox } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "xnxxsearch",
  alias: ["xnxxsearch", "xnxxs"],
  category: "nsfw",
  description: "Search video NSFW",
  usage: ".xnxxsearch <query>",
  example: ".xnxxsearch amateur",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(raraWrap("xnxxsearch", "Masukkan kata kunci!", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/xnxx?q=${encodeURIComponent(query)}`, { timeout: 15000 });
    const data = res.data?.data || res.data?.result || [];
    if (!data.length) return m.reply(raraWrap("xnxxsearch", "Tidak ada hasil!", "error"));

    let _lines = [];
    _lines.push(`Query: ${query}`);
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || "Unknown"}`);
      if (item.url) _lines.push(`   ${item.url}`);
      _lines.push(``);
    });

    await m.react("🐣");
    let msg = raraBox("XNXX SEARCH", _lines);
    return m.reply(msg);
  } catch (err) {
    console.error("xnxxsearch error:", err);
    await m.react("❌");
    return m.reply(raraWrap("xnxxsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
