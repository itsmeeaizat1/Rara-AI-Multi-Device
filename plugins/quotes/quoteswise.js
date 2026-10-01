// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const quotes = [
  "Kegagalan adalah kesuksesan yang tertunda. Jangan pernah menyerah!",
  "Sukses bukanlah akhir dari segalanya, kegagalan bukanlah akhir dari segalanya.",
  "Yang penting adalah keberanian untuk melanjutkan.",
  "Belajar dari kemarin, hidup untuk hari ini, berharap untuk besok.",
  "Jangan takut gagal, takutlah untuk tidak mencoba.",
  "Kesuksesan datang kepada mereka yang terus berusaha.",
  "Jika kamu ingin mencapai sesuatu yang belum pernah kamu capai, maka kamu harus melakukan sesuatu yang belum pernah kamu lakukan.",
  "Kualitas bukanlah tindakan, melainkan kebiasaan.",
  "Kesempatan tidak datang dengan sendirinya, kamu harus menciptakannya.",
  "Pendidikan adalah senjata paling ampuh untuk mengubah dunia.",
  "Berani mencoba, berani gagal, dan berani mencoba lagi.",
  "Jangan menunggu kesempatan, ciptakan kesempatan.",
  "Kebaikan adalah bahasa yang didengar oleh tuli dan dilihat oleh buta.",
  "Hidup itu sederhana, kita yang membuatnya rumit.",
  "Kebahagiaan tidak datang dari luar, tapi dari dalam diri.",
  "Saat kamu berhenti mencoba, saat itulah kamu benar-benar gagal.",
  "Kerja keras mengalahkan bakat saat bakat tidak bekerja keras.",
  "Lebih baik mencoba dan gagal daripada tidak mencoba sama sekali.",
  "Kesempurnaan adalah akhir dari kemajuan.",
  "Bersyukur atas apa yang kamu miliki, sambil terus berjuang untuk apa yang kamu inginkan."
];

const pluginConfig = {
  name: "quotesbijak",
  alias: ["quotesbijak", "bijak"],
  category: "quotes",
  description: "Random kata-kata bijak",
  usage: ".quotesbijak",
  example: ".quotesbijak",
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
    return m.reply(raraWrap("quotesbijak", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
