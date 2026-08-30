// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// inews.js — Berita iNews
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "inews",
  alias: ["inews"],
  category: "berita",
  description: "Berita iNews",
  usage: ".inews",
  example: ".inews",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const res = await axios.get("https://api.siputzx.my.id/api/berita/inews", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("inews", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = novaBox("BERITA INEWS", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("inews error:", err);
    await m.react("❌");
    return m.reply(claraWrap("inews", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
