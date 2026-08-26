// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "kalimatthoyyibah",
  alias: ["kalimatthoyyibah"],
  aliases: ["kalimatthoyyibah", "kalimatsuci", "kalimah", "dzikirpendek"],
  category: "islami",
  description: "Kalimat-kalimat thayyibah (dzikir pendek yang penuh pahala)",
  usage: ".kalimatthoyyibah | .kalimatthoyyibah <nomor>",
  example: ".kalimatthoyyibah | .kalimatthoyyibah 1",
  isGroupOnly: false,
}

const KALIMAT = [
  { no: 1, nama: "Tahlil", arab: "لَا إِلَهَ إِلَّا اللَّهُ", latin: "Laa ilaaha illallaah", arti: "Tidak ada Tuhan selain Allah", fadhilah: "Kalimat tauhid yang paling agung. Siapa mengucapkkan sebagai kalimat terakhir, masuk surga." },
  { no: 2, nama: "Takbir", arab: "اللَّهُ أَكْبَرُ", latin: "Allaahu Akbar", arti: "Allah Maha Besar", fadhilah: "Mengagungkan Allah, dibaca dalam sholat, takbir hari raya, dan tahlil. Pintu kebesaran Allah." },
  { no: 3, nama: "Tahmid", arab: "الْحَمْدُ لِلَّهِ", latin: "Alhamdulillaah", arti: "Segala puji bagi Allah", fadhilah: "Mengisi timbangan kebaikan. Siapa mengucapkan 'Alhamdulillaahi rabbil 'aalamiin', Allah akan membalas dengan kebaikan yang lebih." },
  { no: 4, nama: "Tasbih", arab: "سُبْحَانَ اللَّهِ", latin: "Subhaanallaah", arti: "Maha Suci Allah", fadhilah: "Dua kalimat yang ringan di lisan, berat di timbangan, dicintai Ar-Rahman. (Subhanallah walhamdulillah = 100 kebaikan)" },
  { no: 5, nama: "Istighfar", arab: "أَسْتَغْفِرُ اللَّهَ", latin: "Astaghfirullaah", arti: "Aku memohon ampun kepada Allah", fadhilah: "Penghapus dosa, pembuka pintu rezeki, penolak bala. Nabi SAW beristighfar 70-100x setiap hari." },
  { no: 6, nama: "Hauqalah", arab: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", latin: "Laa haula wa laa quwwata illaa billaah", arti: "Tidak ada daya dan kekuatan kecuali dengan Allah", fadhilah: "Salah satu dari 9 kalimat yang menjadi penyembab hati. Dibaca saat sedih, takut, atau lemah." },
  { no: 7, nama: "Basmalah", arab: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", latin: "Bismillaahir Rahmaanir Rahiim", arti: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang", fadhilah: "Membuka segala kebaikan. Dibaca sebelum makan, minum, dan memulai aktivitas. Dibaca di awal tiap surah Al-Quran (kecuali Taubah)." },
  { no: 8, nama: "Sholawat", arab: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", latin: "Allaahumma sholli 'alaa Muhammad", arti: "Ya Allah, limpahkan sholawat kepada Nabi Muhammad", fadhilah: "Siapa baca sholawat 1x, Allah memberi 10x rahmat. Sholawat jumat adalah persembahan kepadaku." },
  { no: 9, nama: "Syahadat", arab: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ", latin: "Asyhadu allaa ilaaha illallaah, wa asyhadu anna Muhammadar rasuulullaah", arti: "Aku bersaksi tidak ada Tuhan selain Allah, dan aku bersaksi Nabi Muhammad adalah utusan Allah", fadhilah: "Pondasi Islam. Siapa yang kalimat terakhirnya syahadat, masuk surga. Kunci pintu surga." },
  { no: 10, nama: "Tahlilul 'Arsyi", arab: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa 'alaa kulli syai'in qadiir", arti: "Tidak ada Tuhan selain Allah Yang Maha Esa, tidak ada sekutu bagi-Nya. Milik-Nya kerajaan dan pujian, dan Dia Maha Kuasa atas segala sesuatu", fadhilah: "Dibaca 100x, setara dengan memerdekakan 10 budak, dicatat 100 kebaikan, dihapus 100 dosa, dilindungi dari setan sepanjang hari." },
  { no: 11, nama: "Tarhib", arab: "رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", latin: "Radhitu billaahi rabbaa, wa bil islaami diinaa, wa bi Muhammadin sallallaahu 'alaihi wa sallam nabiyyaa (3x)", arti: "Aku ridha Allah sebagai Tuhan, Islam sebagai agama, dan Nabi Muhammad SAW sebagai Nabi", fadhilah: "Siapa membaca 3x pagi dan sore, Allah berjanji akan meridhainya pada hari kiamat." },
  { no: 12, nama: "Tasbih Fatimah", arab: "سُبْحَانَ اللَّهِ (33x) الْحَمْدُ لِلَّهِ (33x) اللَّهُ أَكْبَرُ (33x)", latin: "Subhaanallaah (33x), Alhamdulillaah (33x), Allaahu Akbar (33x), lalu baca: Laa ilaaha illallaahu wahdahu laa syariika lah... (1x)", arti: "33x Tasbih, 33x Tahmid, 33x Takbir, lalu 1x Tahlil", fadhilah: "Dianjurkan Nabi SAW kepada Fatimah az-Zahra untuk dibaca setelah sholat fardhu. Lebih baik dari pelayan. Dibaca 100x, dihapus dosa meski sebanyak buih di lautan." },
  { no: 13, nama: "Doa Perlindungan", arab: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alaihi tawakkaltu wa huwa rabbul 'arsyil 'azhiim (7x)", arti: "Cukuplah Allah bagiku, tidak ada Tuhan selain Dia, kepada-Nya aku bertawakal, dan Dia adalah Tuhan 'Arsy yang agung", fadhilah: "Siapa membaca 7x pagi dan sore, Allah akan mencukupkan urusannya dan melindunginya dari segala gangguan." },
  { no: 14, nama: "Dzikir Paling Utama", arab: "لَا إِلَهَ إِلَّا اللَّهُ", latin: "Laa ilaaha illallaah (100x)", arti: "Tidak ada Tuhan selain Allah", fadhilah: "Nabi SAW bersabda: 'Sebaik-baik dzikir adalah Laa ilaaha illallah, dan sebaik-baik doa adalah Alhamdulillah.' (HR. Tirmidzi)" },
  { no: 15, nama: "Dzikir Penenang Hati", arab: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", latin: "Hasbunallaahu wa ni'mal wakiil", arti: "Cukuplah Allah bagi kami, dan Dia sebaik-baik pelindung", fadhilah: "Dibaca Nabi SAW dan para sahabat saat menghadapi musuh yang lebih banyak. Dibaca saat cemas, takut, atau menghadapi kesulitan." },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > KALIMAT.length) {
      let lines = [];
      lines.push("Kalimat Thoyyibah - " + KALIMAT.length + " Kalimat");
      lines.push("");
      KALIMAT.forEach(k => {
        lines.push(k.no + ". " + k.nama + " - " + k.latin);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "kalimatthoyyibah <nomor>");
      lines.push("Contoh: " + usedPrefix + "kalimatthoyyibah 5");
      return m.reply(claraWrap("Kalimat Thoyyibah", lines.join("\n")));
    }

    const k = KALIMAT[input - 1];
    return m.reply(claraWrap("Kalimat - " + k.nama, [
      "Teks Arab:",
      k.arab,
      "",
      "Latin:",
      k.latin,
      "",
      "Arti:",
      k.arti,
      "",
      "Keutamaan:",
      k.fadhilah,
    ].join("\n")));
  } catch (e) {
    return m.reply(claraWrap("Kalimat Thoyyibah", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
