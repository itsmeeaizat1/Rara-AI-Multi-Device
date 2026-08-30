// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// happymod.js — Search mod apps di HappyMod
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "happymod",
  alias: ["happymod", "hmod"],
  category: "download",
  description: "Search aplikasi mod di HappyMod",
  usage: ".happymod <nama_aplikasi>",
  example: ".happymod spotify",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("happymod", `Masukkan nama aplikasi!\n\nContoh: .happymod spotify`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/happymod?q=${encodeURIComponent(query)}`);
    const data = res.data?.data || res.data?.result || [];
    if (!data.length) return m.reply(claraWrap("happymod", "Aplikasi tidak ditemukan!", "error"));

    let msg = `╭──「 *HAPPYMOD* 」\n`;
    msg += `│ Hasil: ${query}\n`;
    msg += `│\n`;
    data.slice(0, 8).forEach((item, i) => {
      msg += `│ ${i + 1}. ${item.title || item.name || "Unknown"}\n`;
      if (item.rating) msg += `│    Rating: ${item.rating}\n`;
      if (item.url) msg += `│    Link: ${item.url}\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("happymod error:", err);
    await m.react("❌");
    return m.reply(claraWrap("happymod", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
