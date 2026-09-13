// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { renderQuoteCard } from "../../src/lib/nova-quote-card.js";

const pluginConfig = {
  name: "quotesanime",
  alias: ["quotesanime", "animequote"],
  category: "quotes",
  description: "Random quotes dari anime",
  usage: ".quotesanime",
  example: ".quotesanime",
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const res = await axios.get("https://animechan.xyz/api/random");
    const { quote, character, anime } = res.data;
    let result = "";
    result += `
`;
    result += `"${quote}"\n`;
    result += `— ${character} (${anime})\n`;
    result += `
`;
        // 🔹 TEKS DULU + KARTU DI BAWAHNYA (13 Sep, revisi owner "versi plain teks
    // tetep ada jadi di atas versi gambarnya"): plain text dikirim dulu,
    // kartu estetik menyusul; render gagal → teks doang (gak pernah rusak).
    await sock.sendMessage(from, { text: result }, { quoted: m });
    try {
      const _card = await renderQuoteCard({ quote: quote, author: character + " (" + anime + ")", category: "anime" });
      await sock.sendMessage(from, { image: _card, caption: "ᴠᴇʀꜱɪ ᴋᴀʀᴛᴜ" });
    } catch {}
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("quotesanime", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
