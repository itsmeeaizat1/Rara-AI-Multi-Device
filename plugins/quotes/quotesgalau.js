// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const quotes = [
  "Kadang yang kita butuhkan bukan jawaban, tapi kesabaran untuk menerima kenyataan.",
  "Ada luka yang tak terlihat tapi terasa sangat nyata.",
  "Patah hati itu bukan akhir, tapi awal untuk mengenal diri sendiri lebih dalam.",
  "Terkadang kita harus kehilangan dulu untuk belajar menghargai.",
  "Saat mimpi menjadi kenyataan, kadang kenyataannya lebih menyakitkan.",
  "Tak semua yang kita cintai bisa kita miliki.",
  "Diam bukan berarti tak ada kata, tapi tak ada kata yang cukup untuk diucapkan.",
  "Senyum kadang adalah topeng terbaik untuk menyembunyikan luka.",
  "Mengerti lebih baik daripada dimengerti, tapi tak semua orang tahu itu.",
  "Kadang perpisahan adalah cara terbaik untuk tetap mencintai.",
  "Ada hati yang terlalu lelah untuk marah, terlalu hancur untuk merasa.",
  "Kenangan adalah tempat yang indah untuk dikunjungi, tapi tempat yang buruk untuk tinggal.",
  "Kadang aku bertanya-tanya, apakah kamu pernah memikirkanku seperti aku memikirkanmu.",
  "Rasa kecewa datang dari harapan yang terlalu tinggi.",
  "Lebih baik pernah mencinta dan kehilangan, daripada tidak pernah mencinta sama sekali.",
  "Terkadang jalan terpanjang adalah jalan pulang ke hati sendiri.",
  "Aku belajar bahwa tidak semua yang dimulai harus berakhir bahagia.",
  "Luka terdalam adalah yang diberikan oleh orang yang paling kita percaya.",
  "Menerima kenyataan butuh waktu yang lebih lama daripada menerima cinta.",
  "Kadang diam adalah jawaban paling jujur dari hati yang sedang galau."
];

const pluginConfig = {
  name: "quotesgalau",
  alias: ["quotesgalau", "galau"],
  category: "quotes",
  description: "Random kata-kata galau",
  usage: ".quotesgalau",
  example: ".quotesgalau",
  cooldown: 3, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    let result = `╭─「 *QUOTES GALAU* 」\n`;
    result += `│\n`;
    result += `│  "${q}"\n`;
    result += `│\n`;
    result += `╰──────────`;
    await sock.sendMessage(from, { text: result }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("quotesgalau", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
