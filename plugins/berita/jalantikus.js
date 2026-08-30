// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// jalantikus.js — Berita Jalan Tikus
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jalantikus",
  alias: ["jalantikus"],
  category: "berita",
  description: "Berita Jalan Tikus",
  usage: ".jalantikus",
  example: ".jalantikus",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const res = await axios.get("https://api.siputzx.my.id/api/berita/jalan-tikus", { timeout: 15000 });
    const data = res.data?.data || res.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("jalantikus", "Gagal mengambil berita!", "error"));
    }

    let msg = `╭──「 *BERITA JALAN TIKUS* 」──┐
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
    console.error("jalantikus error:", err);
    await m.react("❌");
    return m.reply(claraWrap("jalantikus", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
