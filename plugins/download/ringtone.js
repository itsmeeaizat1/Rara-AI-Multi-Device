// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ringtone.js — Search & download ringtone
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ringtone",
  alias: ["ringtone", "ringtonedl"],
  category: "download",
  description: "Search dan download ringtone",
  usage: ".ringtone <query>",
  example: ".ringtone iphone",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("ringtone", `Masukkan kata kunci!\n\nContoh: .ringtone iphone`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/s/ringtone?q=${encodeURIComponent(query)}`);
    const data = res.data?.data || res.data?.result || [];
    if (!data.length) return m.reply(claraWrap("ringtone", "Ringtone tidak ditemukan!", "error"));

    let _lines = [];
      _lines.push(`Hasil: ${query}`);
    data.slice(0, 10).forEach((item, i) => {
      _lines.push(`${i + 1}. ${item.title || item.name || "Unknown"}`);
      if (item.audio) _lines.push(`Audio: ${item.audio}`);
    });
    let msg = novaBox("RINGTONE", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("ringtone error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ringtone", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
