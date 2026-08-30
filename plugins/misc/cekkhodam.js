// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cekkhodam.js — Cek khodam (fun)
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const KHODAM = [
  "Naga Hitam", "Macan Tutul", "Kuda Sembrani", "Burung Garuda",
  "Ular Sanca", "Kerbau Raksasa", "Banteng Liar", "Kucing Oren",
  "Ayam Jago", "Bebek Peking", "Cicak Ganteng", "Kecoa Terbang",
  "Semut Merah", "Lalat Buah", "Capung Biru", "Kupu-kupu Malam",
  "Belalang Sembah", "Kuda Lumping", "Gajah Mada", "Harimau Sumatera",
  "Komodo", "Buaya Muara", "Kelelawar Hitam", "Monyet Bidadari",
  "Landak Jawa", "Trenggiling", "Musang Luwak", "Babi Hutan",
  "Rusa Sumba", "Anjing Liar", "Kambing Etawa", "Domba Garut"
];

const KHODAM_DESC = [
  "khodam yang sakti mandraguna, mampu menaklukkan musuh dengan satu tatapan",
  "khodam penjaga rumah, setia dan tidak akan pernah meninggalkan tuannya",
  "khodam yang suka bercanda, tapi saat bertarung sangat ganas",
  "khodam pemalas, tapi punya kekuatan terpendam yang luar biasa",
  "khodam yang cerdas, mampu menyelesaikan masalah dengan cepat",
  "khodam misterius, jarang menampakkan diri tapi selalu melindungi",
  "khodam yang agresif, cocok untuk pemilik dengan jiwa petarung",
  "khodam yang lucu, selalu membuat tuannya tertawa",
];

const pluginConfig = {
  name: "cekkhodam",
  alias: ["cekkhodam", "khodam"],
  category: "misc",
  description: "Cek khodam yang ada dalam dirimu (fun)",
  usage: ".cekkhodam @tag (atau kosong untuk cek diri sendiri)",
  example: ".cekkhodam\n.cekkhodam @628xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const name = target === m.sender ? (m.pushName || "Kamu") : target.split("@")[0];
    const khodam = KHODAM[Math.floor(Math.random() * KHODAM.length)];
    const desc = KHODAM_DESC[Math.floor(Math.random() * KHODAM_DESC.length)];
    const power = Math.floor(Math.random() * 100) + 1;

    let _lines = [];
      _lines.push(`👤 ${name}`);
      _lines.push(`🔮 Khodam: *${khodam}*`);
      _lines.push(`💬 ${desc}`);
      _lines.push(`⚡ Power: ${power}%`);
      _lines.push(`⚠️ Ini hanya untuk hiburan, bukan takhayat!`);
    let msg = novaBox("CEK KHODAM", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("cekkhodam error:", err);
    await m.react("❌");
    return m.reply(claraWrap("cekkhodam", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
