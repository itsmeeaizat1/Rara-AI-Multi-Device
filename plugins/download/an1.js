// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// an1.js — Download game mod dari AN1
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "an1",
  alias: ["an1", "an1dl"],
  category: "download",
  description: "Search & download game mod dari AN1",
  usage: ".an1 <nama_game>",
  example: ".an1 minecraft",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("an1", `Masukkan nama game!\n\nContoh: .an1 minecraft`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/an1?q=${encodeURIComponent(query)}`);
    const data = res.data?.data || res.data?.result || [];
    if (!data.length) return m.reply(claraWrap("an1", "Game tidak ditemukan!", "error"));

    let msg = `╭──「 *AN1 SEARCH* 」\n`;
    msg += `│ Hasil pencarian: ${query}\n`;
    msg += `│\n`;
    data.slice(0, 8).forEach((item, i) => {
      msg += `│ ${i + 1}. ${item.title || item.name || "Unknown"}\n`;
      if (item.url) msg += `│    Link: ${item.url}\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("an1 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("an1", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
