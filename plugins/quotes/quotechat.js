// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const quotes = [
  "A: Kamu lagi apa? B: Lagi mikirin kamu. A: Hah? B: Iya, kamu kan selalu di kepala aku.",
  "A: Aku sayang kamu. B: Aku juga. A: Tapi kamu sayang makanan juga kan? B: ...iya.",
  "A: Kamu cantik deh. B: Iya emang. A: Tapi nggak secantik mantanku. B: DIAM KL AXKXNX",
  "Guru: Apa ibu kota Indonesia? Siswa: Ibu kota! Guru: Bukan, maksudku kota! Siswa: Oh, kota!",
  "A: Kamu mau jadi pacarku? B: Mau! A: Bercanda. B: Aku juga bercanda kok.",
  "A: Aku cinta kamu. B: Terus? A: Terus aku kabur.",
  "Dokter: Berapa jari ini? Pasien: Tiga. Dokter: Salah! Itu jari kamu yang sehat.",
  "A: Besok aku ultah. B: Mau hadiah apa? A: Kamu. B: Maaf, aku bukan barang.",
  "Guru: Kenapa telat? Siswa: Macet pak. Guru: Naik apa? Siswa: Naik kaki pak.",
  "A: Kamu itu penting buat aku. B: Kenapa? A: Karena kamu yang bantu PR aku.",
  "A: Sayang, kamu pilih aku atau game? B: Pilih game lah, kan bisa dimainkan kapan aja.",
  "Pembeli: Bang, es teh satu manis ya. Penjual: Nggak bisa mas, yang manis cuma senyuman mantan.",
  "A: Bro, pacar lu mana? B: Di surga. A: Innalillahi... B: Belum lahir maksudnya."
];

const pluginConfig = {
  name: "quotechat",
  alias: ["quotechat", "chatquote"],
  category: "quotes",
  description: "Random chat lucu",
  usage: ".quotechat",
  example: ".quotechat",
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    let result = `╭─「 ✦ QUOTE CHAT ✦ 」\n`;
    result += `│\n`;
    result += `│  ${q}\n`;
    result += `│\n`;
    result += `╰────  •  ────`;
    await sock.sendMessage(from, { text: result }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("quotechat", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
