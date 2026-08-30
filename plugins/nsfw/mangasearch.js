// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mangasearch.js — Search manga (NSFW)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mangasearch",
  alias: ["mangasearch", "manga"],
  category: "nsfw",
  description: "Search manga/hentai",
  usage: ".mangasearch <judul>",
  example: ".mangasearch overlord",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("mangasearch", "Masukkan judul manga!", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/manga?q=${encodeURIComponent(query)}`, { timeout: 15000 });
    const data = res.data?.data || [];
    if (!data.length) return m.reply(claraWrap("mangasearch", "Manga tidak ditemukan!", "error"));

    let msg = `╭──「 *MANGA SEARCH* 」──┐
`;
    data.slice(0, 8).forEach((item, i) => {
      msg += `│ ${i + 1}. ${item.title || item.name || "Unknown"}
`;
      if (item.url) msg += `│    ${item.url}
`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("mangasearch error:", err);
    await m.react("❌");
    return m.reply(claraWrap("mangasearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
