// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "panduanwudhu",
  alias: ["panduanwudhu"],
  aliases: ["panduanwudhu", "carawudhu", "tatawudhu", "wudhuguide", "wudhu"],
  category: "islami",
  description: "Panduan lengkap tata cara wudhu (7 langkah + doa)",
  usage: ".panduanwudhu | .panduanwudhu <nomor>",
  example: ".panduanwudhu | .panduanwudhu 1",
  isGroupOnly: false,
}

const LANGKAH = [
  {
    no: 1,
    judul: "Niat Wudhu",
    arab: "نَاوَيْتُ الْوُضُوءَ لِرَفْعِ الْحَدَثِ الْأَصْغَرِ لِلَّهِ تَعَالَى",
    latin: "Nawaitul wudhuu-a li raf'il hadatsil ashghari lillaahi ta'aalaa",
    arti: "Aku berniat wudhu untuk menghilangkan hadats kecil karena Allah Ta'ala",
    keterangan: "Baca niat dalam hati sebelum mulai membasuh anggota wudhu. Sebelumnya, awali dengan membaca Bismillah.",
  },
  {
    no: 2,
    judul: "Mencuci Kedua Tangan",
    arab: "بِسْمِ اللَّهِ",
    latin: "Bismillaah",
    arti: "Dengan nama Allah",
    keterangan: "Cuci kedua tangan sampai pergelangan 3x. Gosok sela-sela jari. Pastikan air mengenai seluruh permukaan tangan hingga pergelangan.",
  },
  {
    no: 3,
    judul: "Berkumur & Membersihkan Hidung",
    arab: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    latin: "Allaahumma a'innii 'alaa dzikrika wa syukrika wa husni 'ibaadatik",
    arti: "Ya Allah, bantulah aku untuk mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu",
    keterangan: "Berkumur-kumur 3x (air masuk ke mulut lalu keluarkan). Membersihkan hidung 3x (tarik air hidung lalu buang). Ada juga yang membaca doa di atas setelah berkumur.",
  },
  {
    no: 4,
    judul: "Membasuh Wajah",
    arab: "اللَّهُمَّ بَيِّضْ وَجْهِي يَوْمَ تَبْيَاضُّ وُجُوهٌ وَتَسْوَادُّ وُجُوهٌ",
    latin: "Allaahumma bayyidh wajhii yauma tabyaadhdhu wujuuhun wa taswaaddu wujuuhun",
    arti: "Ya Allah, putihkanlah wajahku pada hari ketika wajah-wajah menjadi putih dan wajah-wajah menjadi hitam",
    keterangan: "Basuh seluruh wajah 3x: dari batas dahi (tempat tumbuh rambut) sampai dagu, dan dari telinga kanan ke telinga kiri. Pastikan air mengenai seluruh wajah tanpa terkecuali.",
  },
  {
    no: 5,
    judul: "Membasuh Kedua Tangan sampai Siku",
    arab: "اللَّهُمَّ اعْطِنِي كِتَابِي بِيَمِينِي وَلَا تُعْطِنِيهِ شِمَالِي",
    latin: "Allaahumma a'thinii kitaabii biyamiiinii wa laa tu'thiniihi syimaalii",
    arti: "Ya Allah, berilah aku catatan amalku dari sisi kanan dan jangan dari sisi kiri",
    keterangan: "Basuh tangan kanan dulu dari ujung jari sampai siku 3x, lalu tangan kiri 3x. Pastikan air mengenai seluruh permukaan termasuk sela-sela jari. Sunnah: mengusap sela-sela jari dengan jari kelingking yang basah.",
  },
  {
    no: 6,
    judul: "Mengusap Sebagian Kepala",
    arab: "اللَّهُمَّ حَرِّمْ شَعْرِي وَبَشَرِي عَلَى النَّارِ",
    latin: "Allaahumma harrom sya'rii wa basyarii 'alan naar",
    arti: "Ya Allah, haramkanlah rambut dan kulitku dari api neraka",
    keterangan: "Usap sebagian kepala (depan) dengan tangan yang basah 1x, dari depan ke belakang lalu kembali ke depan. Untuk wanita, cukup usap sebagian rambut bagian depan.",
  },
  {
    no: 7,
    judul: "Membasuh Telinga & Kaki",
    arab: "اللَّهُمَّ اجْعَلْنِي مِمَّنْ يَسْتَمِعُونَ الْقَوْلَ فَيَتَّبِعُونَ أَحْسَنَهُ\nاللَّهُمَّ ثَبِّتْ قَدَمَيَّ عَلَى الصِّرَاطِ يَوْمَ تَزِلُّ فِيهِ الْأَقْدَامُ",
    latin: "Allaahummaj'alnii mimman yasma'uunal qawla fa yattabi'uuna ahsanah\nAllaahumma tsabbit qadamayya 'alash shiraath yauma tazillu fihil aqdaam",
    arti: "Ya Allah, jadikanlah aku termasuk orang yang mendengar perkataan lalu mengikuti yang terbaik. Ya Allah, teguhkanlah kedua kakiku di atas jembatan (shirat) pada hari ketaka kaki tergelincir.",
    keterangan: "Usap kedua telinga 1x (bagian luar dan dalam dengan jari yang basah). Lalu basuh kaki kanan 3x dari ujung jari sampai mata kaki, termasuk sela-sela jari. Ulangi untuk kaki kiri 3x. Gosok sela-sela jari kaki dengan jari kelingking yang basah.",
  },
  {
    no: 8,
    judul: "Doa Setelah Wudhu",
    arab: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ\nوَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ\nاللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ\nسُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
    latin: "Asyhadu allaa ilaaha illallaahu wahdahu laa syariikal lahu\nWa asyhadu anna Muhammadan 'abduhu wa rasuuluh\nAllaahummaj'alnii minat tawwaabiina waj'alnii minal mutathahhiriin\nSubhaanakallaahumma wa bihamdika asyhadu allaa ilaaha illaa anta astaghfiruka wa atuubu ilaik",
    arti: "Aku bersaksi bahwa tidak ada Tuhan selain Allah, Yang Maha Esa, tidak ada sekutu bagi-Nya. Dan aku bersaksi bahwa Nabi Muhammad adalah hamba dan utusan-Nya. Ya Allah, jadikanlah aku termasuk orang yang bertaubat dan orang yang menyucikan diri. Maha Suci Engkau Ya Allah, segala puji bagi-Mu, aku bersaksi tidak ada Tuhan selain Engkau, aku memohon ampun dan bertaubat kepada-Mu.",
    keterangan: "Setelah selesai wudhu, menghadap kiblat, lalu baca doa di atas. Dianjurkan juga minum air wudhu yang tersisa. Doa setelah wudhu ini sangat dianjurkan karena pintu surga dibuka untuk orang yang baca doa ini.",
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > LANGKAH.length) {
      let lines = [];
      lines.push("Panduan Tata Cara Wudhu");
      lines.push(LANGKAH.length + " Langkah Lengkap + Doa");
      lines.push("");
      LANGKAH.forEach(t => {
        lines.push(t.no + ". " + t.judul);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "panduanwudhu <nomor>");
      lines.push("Contoh: " + usedPrefix + "panduanwudhu 4");
      return m.reply(raraWrap("Panduan Wudhu", lines.join("\n")));
    }

    const t = LANGKAH[input - 1];
    const lines = [
      "Langkah " + t.no + " dari " + LANGKAH.length,
      "Judul: " + t.judul,
      "",
      "Teks Arab:",
      t.arab,
      "",
      "Transliterasi:",
      t.latin,
      "",
      "Arti:",
      t.arti,
      "",
      "Keterangan:",
      t.keterangan,
      "",
      t.no < LANGKAH.length ? "Ketik " + usedPrefix + "panduanwudhu " + (t.no + 1) + " untuk langkah berikutnya" : "Wudhu selesai. Semoga ibadah kita diterima Allah SWT.",
    ];

    return m.reply(raraWrap("Panduan Wudhu - Langkah " + t.no, lines.join("\n")));
  } catch (e) {
    return m.reply(raraWrap("Panduan Wudhu", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
