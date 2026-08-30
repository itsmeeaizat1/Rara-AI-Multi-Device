// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// alquran.js — Ayat Al-Quran
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alquran",
  alias: ["alquran", "quran"],
  category: "islami",
  description: "Ayat Al-Quran (surah:ayat)",
  usage: ".alquran <surah:ayat>",
  example: ".alquran 2:255",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const input = m.args?.[0]?.trim();
    if (!input || !input.includes(":")) return m.reply(claraWrap("alquran", `Format: .alquran <surah:ayat>\n\nContoh: .alquran 2:255`, "guide"));

    const [surah, ayat] = input.split(":");
    const res = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayat}/id.indonesian`);
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("alquran", "Ayat tidak ditemukan!", "error"));

    let msg = `╭──「 *AL-QURAN* 」\n`;
    msg += `│ 📖 ${d.surah?.name} (${d.surah?.englishName})\n`;
    msg += `│ Ayat: ${d.numberInSurah}\n`;
    msg += `│\n`;
    msg += `│ Arabic:\n│ ${d.text}\n`;
    msg += `│\n`;
    msg += `│ Arti:\n│ ${d.edition?.text || d.text}\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("alquran error:", err);
    await m.react("❌");
    return m.reply(claraWrap("alquran", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
