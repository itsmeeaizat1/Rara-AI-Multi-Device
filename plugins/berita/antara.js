// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// antara.js — Berita Antara News
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antara",
  alias: ["antara"],
  category: "berita",
  description: "Berita Antara News",
  usage: ".antara",
  example: ".antara",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const res = await axios.get("https://api.siputzx.my.id/api/berita/antara", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("antara", "Gagal mengambil berita!", "error"));
    }

    let msg = `╭──「 *BERITA ANTARA NEWS* 」──┐
`;
    data.slice(0, 8).forEach((item, i) => {
      msg += `│ ${i + 1}. ${item.title || item.judul || "Unknown"}
`;
      if (item.url || item.link) msg += `│    ${item.url || item.link}
`;
      msg += `│
`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("antara error:", err);
    await m.react("❌");
    return m.reply(claraWrap("antara", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
