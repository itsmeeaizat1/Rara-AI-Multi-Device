// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bible.js — Ayat Alkitab
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alkitab",
  alias: ["alkitab", "bible"],
  category: "misc",
  description: "Ayat Alkitab random atau cari ayat",
  usage: ".alkitab [pasal:ayat]",
  example: ".alkitab\n.alkitab Yohanes 3:16",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    let url = "https://beeble.vercel.app/bible/v1/RandomVerse";
    if (query) url = `https://beeble.vercel.app/bible/v1/GetVerse?verse=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    const d = res.data;
    let _lines = [];
      _lines.push(`📖 ${d.book || "Unknown"} ${d.chapter || ""}:${d.verse || ""}`);
      _lines.push(`"${d.text || d.content || "Tidak ditemukan"}"`);
    let msg = novaBox("ALKITAB", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("alkitab error:", err);
    await m.react("❌");
    return m.reply(claraWrap("alkitab", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
