// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const quotes = [
  "Kamu tahu kenapa aku suka hujan? Karena setiap tetesnya mengingatkan aku padamu.",
  "Wajahmu itu seperti nasi padang, bikin aku selalu ingin nambah.",
  "Kamu itu seperti wifi, makin dekat makin kuat sinyalnya.",
  "Kalau aku jada polisi, aku akan arrest hatimu karena terlalu cantik.",
  "Aku rela mati di ujung senjatanmu, asal kamu yang memegangnya.",
  "Kamu itu seperti kopi, pahit tapi bikin nagih.",
  "Jangan deketin aku kalau tidak suka, karena aku bisa jatuh cinta seperti hujan.",
  "Kamu itu internet, aku selalu terhubung padamu walau sinyal lemah.",
  "Kalau aku jadi koki, aku akan masak cinta untukmu setiap hari.",
  "Aku ingin jadi bantalmu, biar aku bisa dekat dengan kepalamu.",
  "Kamu itu seperti mentari, selalu menerangi hariku.",
  "Gak perlu jadi pahlawan, aku cukup melindungimu dari jauh.",
  "Kamu itu seperti kunci, selalu bisa membuka hatiku.",
  "Jangan pakai parfum, cinta kita sudah harum tanpa itu.",
  "Kalau aku jadi waktu, aku akan berhenti saat bersamamu.",
  "Kamu itu magnet, aku selalu tertarik padamu.",
  "Aku rela berenang di lautan api demi senyummu.",
  "Kamu itu seperti bintang, aku selalu mendongak ke arahmu.",
  "Aku tidak butuh Google, karena semua jawaban ada di hatimu.",
  "Kalau senyum kamu jadi komoditas, inflasi pasti naik karena terlalu berharga."
];

const pluginConfig = {
  name: "quotesgombal",
  alias: ["quotesgombal", "gombal"],
  category: "quotes",
  description: "Random kata-kata gombal",
  usage: ".quotesgombal",
  example: ".quotesgombal",
  cooldown: 3, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    let result = "";
    result += `
`;
    result += `"${q}"\n`;
    result += `
`;
        await sock.sendMessage(from, { text: result }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("quotesgombal", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
