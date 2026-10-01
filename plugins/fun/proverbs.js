// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "pepatah",
  alias: ["pepatah"],
  category: "fun",
  description: "Generator pepatah/quote absurd — pepatah asli dengan ending absurd",
  usage: ".pepatah — Dapat pepatah absurd acak\n.pepatah info — Tentang fitur",
  example: ".pepatah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const PEPATAH_AWAL = [
  "Gajah mati meninggalkan gading,",
  "Harimau mati meninggalkan belang,",
  "Bunga mawar tumbuh di taman,",
  "Bersama kita teguh, bercerai kita runtuh,",
  "Biar lambat asal selamat,",
  "Sedia payung sebelum hujan,",
  "Jadilah padi yang semakin berisi semakin merunduk,",
  "Di mana bumi dipijak, di sana langit dijunjung,",
  "Tong kosong nyaring bunyinya,",
  "Karena mulut badan binasa,",
  "Sekali dayung dua tiga pulau terlampaui,",
  "Sekali merengkuh dayung dua tiga pulau terlampaui,",
  "Besar pasak daripada tiang,",
  "Sepandai-pandai tupai melompat, sekali jatuh kepanjangan,",
  "Sambil menyelam minum air,",
  "Tak kenal maka tak sayang,",
  "Satu tangan tak akan bisa bertepuk,",
  "Guru kencing berdiri murid kencing berlari,",
  "Babi di hutan disusukan lebah,",
  "Malu bertanya sesat di jalan,",
];

const PEPATAH_AKHIR = [
  "tapi gajah hidup meninggalkan kotoran.",
  "tapi manusia mati meninggalkan tagihan.",
  "tapi ditelan tikal masih juga.",
  "tapi mawar juga punya duri yang bikin nangis.",
  "tapi kalo diem-diem jatuh juga.",
  "tapi lebih bagus bawa perahu dari pada basah.",
  "tapi jangan merunduk ke mantan lagi.",
  "tapi di luar negeri langitnya beda.",
  "tapi tong isi nyaring banget suaranya (tapi lho).",
  "tapi mulut badan bangkrut kalau gak kerja.",
  "tapi sekali dayung sampan jebol.",
  "tapi kalo dayung lagi luka, darahnya juga terlampaui.",
  "tapi lebih gede lagi pasak beli iPhone.",
  "akhirnya tetap dikejar anjing juga.",
  "tapi kalo nyelam di air keruh, jangan diminum.",
  "tapi kenal-kenal juga belum tentu sayang.",
  "tapi satu tangan bisa pegang HP.",
  "tapi guru kencing di WC, murid kencing di kelas.",
  "tapi babi di rumah disusukan nenen.",
  "tapi malas berangkat, kangen juga ujungnya.",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    if (args[0]?.toLowerCase() === "info") {
      return m.reply(raraWrap("Pepatah", [
        "PEPATAH ABSURD",
        "Mix & match pepatah asli dengan ending absurd",
        "Hasilnya bijaksana tapi gak jelas",
        "",
        "Ketik: " + usedPrefix + "pepatah",
      ], "info"));
    }

    const awal = PEPATAH_AWAL[Math.floor(Math.random() * PEPATAH_AWAL.length)];
    const akhir = PEPATAH_AKHIR[Math.floor(Math.random() * PEPATAH_AKHIR.length)];

    await m.react("🐣");
    return m.reply(raraWrap("Pepatah", [
      "PEPATAH ABSURD",
      "",
      awal + " " + akhir,
      "",
      usedPrefix + "pepatah untuk lagi",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Pepatah", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
