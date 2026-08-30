// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// happymod.js — Search mod apps di HappyMod
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

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

    let _lines = [];
      _lines.push(`Hasil: ${query}`);
    data.slice(0, 8).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.name || "Unknown"}`);
      if (item.rating) _lines.push(`Rating: ${item.rating}`);
      if (item.url) _lines.push(`Link: ${item.url}`);
    });
    let msg = novaBox("HAPPYMOD", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("happymod error:", err);
    await m.react("❌");
    return m.reply(claraWrap("happymod", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
