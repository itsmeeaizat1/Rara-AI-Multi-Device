// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// infobola.js — Info Bola
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

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
    const res = await axios.get("https://api.siputzx.my.id/api/berita/info-bola", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("infobola", "Gagal mengambil berita!", "error"));
    }

    let _lines = [];
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.judul || "Unknown"}`);
      if (item.url || item.link) _lines.push(`${item.url || item.link}`);
      _lines.push(``);
    });
    let msg = novaBox("INFO BOLA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("infobola error:", err);
    await m.react("❌");
    return m.reply(claraWrap("infobola", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
