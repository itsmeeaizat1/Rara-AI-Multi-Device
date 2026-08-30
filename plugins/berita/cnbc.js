// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cnbc.js — Berita CNBC Indonesia
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cnbc",
  alias: ["cnbc"],
  category: "berita",
  description: "Berita CNBC Indonesia",
  usage: ".cnbc",
  example: ".cnbc",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const res = await axios.get("https://api.siputzx.my.id/api/berita/cnbc", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("cnbc", "Gagal mengambil berita!", "error"));
    }

    let msg = `╭──「 *BERITA CNBC INDONESIA* 」──┐
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
    console.error("cnbc error:", err);
    await m.react("❌");
    return m.reply(claraWrap("cnbc", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
