// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "dzikir",
  alias: ["dzikir"],
  aliases: ["dzikir", "zikir", "dhikr", "dzikirpagi", "dzikirpetang"],
  category: "islami",
  description: "Dzikir pagi & petang lengkap (Arab, Latin, Arti)",
  usage: ".dzikir pagi | .dzikir petang | .dzikir list",
  example: ".dzikir pagi | .dzikir petang",
  isGroupOnly: false,
}

const DZIKIR_PAGI = [
  { nama: "Ayat Kursi", arab: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", latin: "Allaahu laa ilaaha illaa huwal hayyul qayyuum...", jumlah: "1x", keutamaan: "Siapa baca pagi, dilindungi dari segala gangguan sampai sore" },
  { nama: "Al-Ikhlas, Al-Falaq, An-Nas", arab: "Qul huwallaahu ahad... | Qul a'udzu birabbil falaq... | Qul a'udzu birabbin naas...", latin: "(3 surah pendek)", jumlah: "3x masing-masing", keutamaan: "Pelindung dari segala kejahatan dan gangguan" },
  { nama: "Doa Pagi", arab: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", latin: "Ashbahnaa wa ashbahal mulku lillaah, walhamdulillaah, laa ilaaha illallaahu wahdahu laa syariika lah", jumlah: "1x", keutamaan: "Pengakuan bahwa kerajaan hanya milik Allah di waktu pagi" },
  { nama: "Doa Kebaikan Pagi", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ", latin: "Allaahumma innii as'aluka khaira haadzal yaum: fathahu wa nashrahu wa nuruhi wa barakatuhu wa hudaah", jumlah: "1x", keutamaan: "Memohon kebaikan hari ini: kemenangan, cahaya, dan keberkahan" },
  { nama: "Doa Perlindungan", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduk, wa ana 'alaa 'ahdika wa wa'dika mastatha't", jumlah: "1x", keutamaan: "Siapa baca pagi lalu mati hari itu, masuk surga" },
  { nama: "Sayyidul Istighfar", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta khalaqtanii wa ana 'abduk... (baca lengkap)", jumlah: "1x", keutamaan: "Siapa baca dengan yakin pagi/petang lalu mati, masuk surga" },
  { nama: "Tasbih, Tahmid, Takbir", arab: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", latin: "Subhaanallaahi wa bihamdih (100x)", jumlah: "100x", keutamaan: "Dihapus dosanya walaupun sebanyak buih di lautan" },
  { nama: "La ilaaha illallah", arab: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa 'alaa kulli syai'in qadiir (10x/100x)", jumlah: "10x atau 100x", keutamaan: "Setara dengan memerdekakan budak, dicatat 100 kebaikan, dihapus 100 dosa" },
  { nama: "Doa Hasan Basri", arab: "اللَّهُمَّ عَافِنِي فِي بَدَنِي", latin: "Allaahumma 'aafinii fi badanii, 'aafinii fi sam'ii, 'aafinii fii basharii, laa ilaaha illaa ant (3x)", jumlah: "3x", keutamaan: "Memohon kesehatan fisik, pendengaran, dan penglihatan" },
  { nama: "Doa Kecemasan", arab: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ", latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alaihi tawakkaltu wa huwa rabbul 'arsyil 'azhiim (7x)", jumlah: "7x", keutamaan: "Cukup atas segala kecemasan, Allah yang menanggung urusannya" },
];

const DZIKIR_PETANG = [
  { nama: "Ayat Kursi", arab: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", latin: "Allaahu laa ilaaha illaa huwal hayyul qayyuum...", jumlah: "1x", keutamaan: "Siapa baca sore, dilindungi sampai pagi" },
  { nama: "Al-Ikhlas, Al-Falaq, An-Nas", arab: "Qul huwallaahu ahad... | Qul a'udzu birabbil falaq... | Qul a'udzu birabbin naas...", latin: "(3 surah pendek)", jumlah: "3x masing-masing", keutamaan: "Pelindung dari gangguan jin dan setan malam hari" },
  { nama: "Doa Sore", arab: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ", latin: "Amsainaa wa amsal mulku lillaah, walhamdulillaah, laa ilaaha illallaahu wahdahu laa syariika lah", jumlah: "1x", keutamaan: "Pengakuan kerajaan Allah di waktu sore" },
  { nama: "Doa Kebaikan Sore", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ", latin: "Allaahumma innii as'aluka khaira haadzihil lailah: fathahu wa nashrahu wa nuruhi wa barakatuhu", jumlah: "1x", keutamaan: "Memohon kebaikan malam ini" },
  { nama: "Doa Perlindungan", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduk (baca lengkap)", jumlah: "1x", keutamaan: "Siapa baca sore lalu mati malam itu, masuk surga" },
  { nama: "Sayyidul Istighfar", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta khalaqtanii wa ana 'abduk... (baca lengkap)", jumlah: "1x", keutamaan: "Syurga bagi yang baca dengan yakin" },
  { nama: "Tasbih", arab: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", latin: "Subhaanallaahi wa bihamdih (100x)", jumlah: "100x", keutamaan: "Dihapus dosa sebanyak buih di lautan" },
  { nama: "Doa Hasan Basri", arab: "اللَّهُمَّ عَافِنِي فِي بَدَنِي", latin: "Allaahumma 'aafinii fi badanii, 'aafinii fi sam'ii, 'aafinii fii basharii (3x)", jumlah: "3x", keutamaan: "Memohon kesehatan menjelang malam" },
  { nama: "Doa Kecemasan", arab: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ", latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alaihi tawakkaltu wa huwa rabbul 'arsyil 'azhiim (7x)", jumlah: "7x", keutamaan: "Cukup atas kecemasan malam" },
  { nama: "Istighfar Sebelum Tidur", arab: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", latin: "Astaghfirullaahal 'azhiim alladzii laa ilaaha illaa huwal hayyul qayyuumu wa atuubu ilaih (3x)", jumlah: "3x", keutamaan: "Dihapus dosa meski sebanyak buih lautan" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "list") {
      return m.reply(claraWrap("Dzikir Pagi & Petang", [
        "Dzikir harian lengkap dari hadits shahih",
        "",
        "Cara pakai:",
        usedPrefix + "dzikir pagi (10 dzikir pagi)",
        usedPrefix + "dzikir petang (10 dzikir petang)",
        usedPrefix + "dzikir list (menu ini)",
      ].join("\n")));
    }

    let list, judul;
    if (input === "pagi") {
      list = DZIKIR_PAGI;
      judul = "Dzikir Pagi";
    } else if (input === "petang" || input === "sore") {
      list = DZIKIR_PETANG;
      judul = "Dzikir Petang";
    } else {
      return m.reply(claraWrap("Dzikir", "Pilihan: pagi atau petang\nContoh: " + usedPrefix + "dzikir pagi"));
    }

    let lines = [];
    lines.push(judul + " - " + list.length + " Dzikir");
    lines.push("");
    list.forEach((d, i) => {
      lines.push((i + 1) + ". " + d.nama);
      lines.push("   Jumlah: " + d.jumlah);
      lines.push("   Arab: " + d.arab);
      lines.push("   Latin: " + d.latin);
      lines.push("   Keutamaan: " + d.keutamaan);
      lines.push("");
    });

    return m.reply(claraWrap(judul, lines.join("\n")));
  } catch (e) {
    return m.reply(claraWrap("Dzikir", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
