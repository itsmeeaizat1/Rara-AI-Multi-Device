// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const quotes = [
  "Aku bukan orang yang perfect, tapi aku berusaha jadi yang terbaik untukmu.",
  "Kalau kamu jadi bintang, aku rela jadi langit demi menemu setiap malammu.",
  "Aku hanya ingin menemani senjamu, dan menyiram cintamu tiap pagi.",
  "Setiap detik tanpamu terasa seperti setahun yang panjang.",
  "Kamu adalah alasan aku tersenyum setiap hari.",
  "Mencintaimu bukan kewajiban, tapi kebutuhan hatiku.",
  "Kehilanganmu lebih menakutkan daripada kehilangan dunia.",
  "Setiap kata yang keluar dari mulutmu adalah puisi bagiku.",
  "Aku rela jadi pajangan di hatimu, asal aku bisa selalu ada di sana.",
  "Sebesar apapun dunia ini, hatiku hanya muat untukmu.",
  "Cintamu itu seperti kopi pahit yang bikin ketagihan.",
  "Aku mungkin bukan yang pertama, tapi aku ingin jadi yang terakhir.",
  "Kalau jarak kita jauh, dekatkan dengan rindu, jangan dengan mengganti.",
  "Namamu sudah jadi doa harian yang tak pernah terlewat.",
  "Aku tak butuh bintang, karena cintamu sudah cukup menerangi hatiku.",
  "Walau kau tak sempurna, untukku kau adalah segalanya.",
  "Aku ingin menjadi alasanmu tersenyum di setiap pagi.",
  "Setiap kali aku menutup mata, wajahmu yang terlintas.",
  "Tidak ada kata terlambat untuk mengucap rindu, selama kamu masih ada.",
  "Kalahlah denganku sekali, menanglah untukku seterusnya."
];

const pluginConfig = {
  name: "quotesbucin",
  alias: ["quotesbucin", "bucin"],
  category: "quotes",
  description: "Random kata-kata bucin",
  usage: ".quotesbucin",
  example: ".quotesbucin",
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
    return m.reply(claraWrap("quotesbucin", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
