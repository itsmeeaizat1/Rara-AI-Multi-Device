// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cnn.js — Berita CNN Indonesia
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "cnn",
  alias: ["cnn"],
  category: "berita",
  description: "Berita CNN Indonesia",
  usage: ".cnn",
  example: ".cnn",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const res = await axios.get("https://api.siputzx.my.id/api/berita/cnn", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("cnn", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = raraBox("BERITA CNN INDONESIA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("cnn error:", err);
    await m.react("❌");
    return m.reply(raraWrap("cnn", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
