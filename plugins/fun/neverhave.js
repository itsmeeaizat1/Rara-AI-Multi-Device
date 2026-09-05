// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "neverhave",
  alias: ["neverhave"],
  category: "fun",
  description: "Never Have I Ever — Generator statement lucu/malu/ngakak",
  usage: ".neverhave — Dapat statement acak\n.neverhave <tema> — Tema: lucu, malu, gaul, dewasa, random",
  example: ".neverhave\n.neverhave malu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const STATEMENTS = {
  lucu: [
    "Aku belum pernah makan nasi pakai kecap sampai habis sebotol",
    "Aku belum pernah ketiduran di kamar mandi",
    "Aku belum pernah ngomong sendiri di depan cermin lebih dari 5 menit",
    "Aku belum pernah lupa nama sendiri",
    "Aku belum pernah menangis karena tidak bisa buka tutup botol",
    "Aku belum pernah nonton drama sama-muka-sambil nangis",
    "Aku belum pernah lupa pin HP sendiri",
    "Aku belum pernah tertawa sendiri di tempat umum karena inget meme",
    "Aku belum pernah mimpi jadi presiden",
    "Aku belum pernah bilang 'iya' padahal gak denger apa yang dikata",
  ],
  malu: [
    "Aku belum pernah ngirim pesan ke grup yang salah",
    "Aku belum pernah panggil guru 'mama'",
    "Aku belum pernah jatuh di depan banyak orang",
    "Aku belum pernah lupa nomor HP sendiri saat ditanya orang",
    "Aku belum pernah ketahuan nyimak chat orang lain",
    "Aku belum pernah bilang 'iya' ke orang yang salah panggil",
    "Aku belum pernah bawa tutup botol bukan dari botol itu",
    "Aku belum pernah lupa nama temen deket saat ketemu",
    "Aku belum pernah kentut pas lagi meeting",
    "Aku belum pernah ketiduran saat di talk",
  ],
  gaul: [
    "Aku belum pernah ganti nama sosmed lebih dari 5 kali",
    "Aku belum pernah stalk mantan sampai ke tahun 2016",
    "Aku belum pernah nge-save story orang gak dikenal",
    "Aku belum pernah kirim voice note lebih dari 2 menit",
    "Aku belum pernah buka tiktok sampai lupa waktu lebih dari 3 jam",
    "Aku belum pernah jawab 'iya' padahal gak ngerti konteks obrolan",
    "Aku belum pernah blocking/unblocking orang lebih dari 3 kali",
    "Aku belum pernah reply chat pakai emoji doang biar gak dibilang seen",
    "Aku belum pernah bikin story tapi hapus dalam 10 menit",
    "Aku belum pernah download reels buat di-upload ulang",
  ],
  dewasa: [
    "Aku belum pernah lupa gajih karena sibuk",
    "Aku belum pernah kerja lembur sampai lupa hari",
    "Aku belum pernah bawa makan siang dari rumah biar hemat",
    "Aku belum pernah bayar tagihan lebih dari 1 juta",
    "Aku belum pernah lupa kunci rumah dan harus tunggu orang",
    "Aku belum pernah telat bayar cicilan",
    "Aku belum pernah nego harga di pasar sampai capai",
    "Aku belum pernah beli baju diskon tapi gak pernah dipakai",
    "Aku belum pernah masak tapi bakar",
    "Aku belum pernah nyuci piring sampai 3 hari ngendon",
  ],
};

const THEMES = Object.keys(STATEMENTS);

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const theme = args[0]?.toLowerCase();

    if (theme && !STATEMENTS[theme]) {
      return m.reply(claraWrap("Never Have I Ever", "Tema tidak ada!\n\nTersedia: " + THEMES.join(", "), "warn"));
    }

    const selectedTheme = theme || THEMES[Math.floor(Math.random() * THEMES.length)];
    const pool = STATEMENTS[selectedTheme];
    const statement = pool[Math.floor(Math.random() * pool.length)];

    await m.react("🐣");
    return m.reply(claraWrap("Never Have I Ever", [
      "Tema: " + selectedTheme,
      "",
      statement,
      "",
      "Yang pernah, react apa saja!",
      usedPrefix + "neverhave <tema> untuk tema lain",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Never Have I Ever", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
