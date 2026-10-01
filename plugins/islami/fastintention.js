// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "niatpuasa",
  alias: ["niatpuasa"],
  aliases: ["niatpuasa", "puasa", "panduanpuasa", "doapuasa", "ramadhan"],
  category: "islami",
  description: "Niat puasa + doa buka puasa + panduan puasa",
  usage: ".niatpuasa | .niatpuasa <jenis>",
  example: ".niatpuasa | .niatpuasa ramadhan | .niatpuasa buka",
  isGroupOnly: false,
}

const JENIS_PUASA = {
  "ramadhan": {
    judul: "Puasa Ramadhan",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i fardhi syahri ramadhaana haadzihis sanati lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan kewajiban puasa bulan Ramadhan tahun ini karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh) - sebaiknya baca sebelum tidur malam",
    catatan: "Wajib setiap hari di bulan Ramadhan. Niat cukup 1x sebelum fajar untuk seluruh bulan (pendapat sebagian ulama), atau setiap malam (pendapat yang lebih kuat).",
  },
  "seninkamis": {
    judul: "Puasa Senin-Kamis",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ الْأَيَّامِ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnatil ayyaami lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah hari-hari karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh)",
    catatan: "Sunnah muakkadah. Amalan Nabi SAW yang rutin dikerjakan setiap Senin dan Kamis. Pahalanya seperti puasa sepanjang tahun.",
  },
  "arafah": {
    judul: "Puasa Arafah (9 Dzulhijjah)",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَرَفَةَ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnati yaumi 'arafata lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah hari Arafah karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh) pada 9 Dzulhijjah",
    catatan: "Sunnah muakkadah. Dosa 2 tahun dihapus (tahun lalu & tahun depan). Bagi jemaah haji yang sedang wukuf, disunnahkan TIDAK berpuasa.",
  },
  "asyura": {
    judul: "Puasa Asyura (10 Muharram)",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَاشُورَاءَ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnati yaumi 'asyuuraa'a lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah hari Asyura karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh) pada 10 Muharram",
    catatan: "Sunnah muakkadah. Dosa 1 tahun dihapus. Dianjurkan juga puasa 9 Muharram (Tasu'a) atau 11 Muharram untuk berbeda dengan Yahudi.",
  },
  "dawud": {
    judul: "Puasa Dawud",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ صَوْمِ دَاوُدَ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnati shaumi daawuuda lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah puasa Dawud karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh)",
    catatan: "Puasa selang-seling: puasa 1 hari, lewat 1 hari. Puasa yang paling dicintai Allah. Nabi Dawud berpuasa sepanjang tahun dengan cara ini.",
  },
  "six": {
    judul: "Puasa Syawal (6 hari)",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ صَوْمِ سِتٍّ مِنْ شَوَّالٍ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnati shaumis sittin min syawwaali lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah puasa 6 hari Syawal karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh), setelah hari raya Idul Fitri",
    catatan: "Sunnah muakkadah. Pahalanya seperti puasa sepanjang tahun (1 Ramadhan + 6 Syawal = 1 tahun). Tidak harus berurutan, boleh tersebar di seluruh bulan Syawal.",
  },
  "haram": {
    judul: "Puasa Haram (Tanggal 13-15 Hijriyah)",
    niat: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ أَيَّامِ الْبِيضِ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i sunnati ayyaamil bidh lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan sunnah hari-hari putih (ayyamul bidh) karena Allah Ta'ala",
    waktu: "Sebelum terbit fajar (subuh) pada tanggal 13, 14, 15 Hijriyah setiap bulan",
    catatan: "Sunnah. Disebut ayyamul bidh (hari-hari putih) karena malamnya terang benderang karena bulan purnama.",
  },
};

const DOA_BUKA = {
  arab: "اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
  latin: "Allaahumma laka shumtu wa 'alaa rizqika afthartu, dzahabazh zhama'u wabtallatil 'uruuqu wa tsabatal ajru insyaaallaah",
  arti: "Ya Allah, untuk-Mu aku berpuasa dan dengan rezeki-Mu aku berbuka. Hilang dahaga, basah urat-urat, dan tetap pahala insya Allah.",
  waktu: "Saat berbuka (setelah adzan Maghrib)",
  catatan: "Baca sebelum atau saat menambahkan kurma/air ke mulut. Disunnahkan berbuka dengan kurma atau air, jika tidak ada kurma, dengan air yang manis.",
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "list") {
      let lines = [];
      lines.push("Panduan Puasa - Niat & Doa");
      lines.push("");
      lines.push("Jenis Puasa:");
      Object.entries(JENIS_PUASA).forEach(([k, v], i) => {
        lines.push((i + 1) + ". " + k + " (" + v.judul + ")");
      });
      lines.push("");
      lines.push("Doa:");
      lines.push("  buka (Doa buka puasa)");
      lines.push("");
      lines.push("Cara: " + usedPrefix + "niatpuasa <jenis>");
      lines.push("Contoh: " + usedPrefix + "niatpuasa ramadhan | " + usedPrefix + "niatpuasa buka");
      return m.reply(raraWrap("Panduan Puasa", lines.join("\n")));
    }

    if (input === "buka" || input === "iftar") {
      return m.reply(raraWrap("Doa Buka Puasa", [
        "Teks Arab:",
        DOA_BUKA.arab,
        "",
        "Transliterasi:",
        DOA_BUKA.latin,
        "",
        "Arti:",
        DOA_BUKA.arti,
        "",
        "Waktu: " + DOA_BUKA.waktu,
        "",
        "Catatan: " + DOA_BUKA.catatan,
      ].join("\n")));
    }

    if (!JENIS_PUASA[input]) {
      return m.reply(raraWrap("Panduan Puasa", "Jenis puasa tidak ditemukan: " + input + "\nKetik " + usedPrefix + "niatpuasa list"));
    }

    const p = JENIS_PUASA[input];
    return m.reply(raraWrap("Niat Puasa - " + p.judul, [
      "Niat:",
      "",
      p.niat,
      "",
      "Latin:",
      p.latin,
      "",
      "Arti:",
      p.arti,
      "",
      "Waktu Baca Niat: " + p.waktu,
      "",
      "Catatan:",
      p.catatan,
      "",
      "Doa Buka: Ketik " + usedPrefix + "niatpuasa buka",
    ].join("\n")));
  } catch (e) {
    return m.reply(raraWrap("Panduan Puasa", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
