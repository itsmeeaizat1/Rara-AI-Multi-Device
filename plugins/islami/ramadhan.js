// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "ramadhan",
  aliases: ["ramadhan", "doaramadhan", "doasahur", "doaiftar", "puasaramadhan", "doalailatulqadr", "lailatulqadr"],
  category: "islami",
  description: "Panduan lengkap Ramadhan - niat, doa sahur, buka puasa, lailatul qadr, tarawih",
  usage: ".ramadhan | .ramadhan <nomor>",
  example: ".ramadhan | .ramadhan 1",
  isGroupOnly: false,
}

const RAMADHAN = [
  {
    no: 1,
    judul: "Niat Puasa Ramadhan",
    arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى",
    latin: "Nawaitu shauma ghadin 'an adaa'i fardhi syahri Ramadhaani haadzihis sanati lillaahi ta'aalaa",
    arti: "Aku niat puasa esok hari untuk menunaikan kewajiban bulan Ramadhan tahun ini karena Allah Ta'ala",
    keterangan: "Dibaca di malam hari (sebelum terbit fajar). Disunnahkan membaca niat setiap malam, namun sebagian ulama membolehkan satu niat untuk seluruh Ramadhan.",
  },
  {
    no: 2,
    judul: "Doa Sahur",
    arab: "اللَّهُمَّ صُمْ لِي غَدًا عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ",
    latin: "Allaahumma shumli ghadin 'an adaa'i fardhi syahri Ramadhaan",
    arti: "Ya Allah, aku niat berpuasa esok hari untuk menunaikan kewajiban puasa di bulan Ramadhan",
    keterangan: "Waktu sahur dari tengah malam sampai sebelum terbit fajar (Subuh). Makan sahur adalah sunnah yang sangat dianjurkan, Nabi SAW bersabda: 'Bersahurlah kalian, karena dalam sahur ada keberkahan.'",
  },
  {
    no: 3,
    judul: "Doa Buka Puasa (Iftar)",
    arab: "اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
    latin: "Allaahumma laka shumtu wa 'alaa rizqika afthartu, wa 'alayka tawakkaltu, wa biraka aamantu. Dzahabadh dhamaa'u wabtallatil 'uruuqu wa tsabatal ajru insyaaallaah",
    arti: "Ya Allah, untuk-Mu aku berpuasa dan dengan rezeki-Mu aku berbuka. Kepada-Mu aku bertawakal, dan kepada-Mu aku beriman. Hilang dahaga, basahlah urat-urat, dan tetaplah pahala insya Allah",
    keterangan: "Dibaca saat berbuka puasa. Waktu berbuka adalah saat terbenam matahari. Disunnahkan menyegerakan berbuka jika sudah masuk waktu. Berbuka dengan ruthab (kurma basah), tamr (kurma kering), atau air.",
  },
  {
    no: 4,
    judul: "Doa Setelah Buka Puasa",
    arab: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
    latin: "Dzahabadh dhamaa'u wabtallatil 'uruuqu wa tsabatal ajru insyaaallaah",
    arti: "Hilang dahaga, basahlah urat-urat, dan tetaplah pahala insya Allah",
    keterangan: "Doa yang dibaca Nabi SAW setelah berbuka. Hadits riwayat Abu Daud. Doa singkat yang penuh makna.",
  },
  {
    no: 5,
    judul: "Niat Sholat Tarawih",
    arab: "أُصَلِّي سُنَّةَ التَّرَاوِيحِ رَكْعَتَيْنِ لِلَّهِ تَعَالَى",
    latin: "Ushalli sunnatat taraaweehi rak'ataini lillaahi ta'aalaa, imaaman (makmum) / imaaman (imam)",
    arti: "Aku niat sholat sunnah tarawih 2 rakaat karena Allah Ta'ala",
    keterangan: "Tarawih adalah sholat sunnah khusus Ramadhan, dikerjakan berjamaah setelah Isya. Jumlah rakaat 8 atau 20 (sesuai mazhab). Disunnahkan berjamaah di masjid.",
  },
  {
    no: 6,
    judul: "Doa Setelah Tarawih (Wirid)",
    arab: "سُبْحَانَ ذِي الْمُلْكِ وَالْمَلَكُوتِ",
    latin: "Subhaana dzil mulki wal malakuut, subhaana dzil 'izzati wal 'azhamati wal jabaruuti wal kibriyaa'i wal 'aazhmati wal qudraati wal jabaruutir rabbil malakuutil 'azhiimi wal 'a'zhami kullihim",
    arti: "Maha Suci Yang memiliki kerajaan dan keagungan. Maha Suci Yang memiliki kemuliaan, keagungan, kebesaran, kekuasaan, dan keperkasaan, Tuhan yang memiliki keagungan, Yang Maha Besar dari semuanya",
    keterangan: "Dibaca 3x setelah tarawih. Juga dianjurkan membaca: 'Subhaanal hayyil qayyuum' 3x dan 'Laa ilaaha illallaah' 100x",
  },
  {
    no: 7,
    judul: "Doa Lailatul Qadr",
    arab: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    latin: "Allaahumma innaka 'afuwwun kariimun tuhibbul 'afwa fa'fu 'annii",
    arti: "Ya Allah, sesungguhnya Engkau Maha Pemaaf, Maha Mulia, dan Engkau menyukai pemaafan, maka maafkanlah aku",
    keterangan: "Doa paling utama di Lailatul Qadr, diajarkan oleh Aisyah RA. Dibaca pada 10 malam terakhir Ramadhan, terutama malam ganjil (21, 23, 25, 27, 29).",
  },
  {
    no: 8,
    judul: "Keutamaan Lailatul Qadr",
    isi: [
      "Lailatul Qadr = Malam Penentuan, lebih baik dari 1000 bulan.",
      "",
      "Surah Al-Qadr ayat 3:",
      "'Malam kemuliaan itu lebih baik dari seribu bulan.'",
      "",
      "Tanda-tanda malam Lailatul Qadr:",
      "1. Malam yang tenang dan damai",
      "2. Tidak terlalu panas dan tidak terlalu dingin",
      "3. Bulan terlihat separuh (separuh bersinar)",
      "4. Pagi harinya matahari terbit lembut, tidak menyilaukan",
      "",
      "Cara mendapatkannya:",
      "1. I'tikaf di masjid 10 malam terakhir",
      "2. Perbanyak ibadah: sholat, baca Quran, dzikir",
      "3. Bangun malam untuk qiyamul lail",
      "4. Baca doa Lailatul Qadr dengan khusyuk",
      "5. Mencari di malam ganjil: 21, 23, 25, 27, 29",
    ],
  },
  {
    no: 9,
    judul: "Doa Witir",
    arab: "اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ وَعَافِنِي فِيمَنْ عَافَيْتَ",
    latin: "Allaahummah dinii fiiman hadait, wa 'aafinii fiiman 'aafait, wa tawallanii fiiman tawallait, wa baarik lii fiimaa a'thait, wa qinii syarra maa qadhait, fa innaka taqdhi wa laa yuqdha 'alaik, innahu laa yazhillu man waalait, wa laa ya'izzu man 'aadait, tabaarakta rabbanaa wa ta'aalait",
    arti: "Ya Allah, berilah petunjuk kepadaku sebagaimana Engkau beri petunjuk. Berilah kesehatan kepadaku sebagaimana Engkau beri kesehatan. Uruslah aku sebagaimana Engkau urus. Berilah keberkahan untukku. Lindungilah aku dari keburukan. Engkau yang menentukan dan tidak ada yang menentukan-Mu. Tidak hina orang yang Engkau lindungi, tidak mulia orang yang Engkau musuhi. Maha Suci Engkau Ya Tuhan kami",
    keterangan: "Doa qunut witir, dibaca setelah ruku' pada rakaat terakhir sholat witir. Witir dikerjakan setelah tarawih, minimal 1 rakaat, disunnahkan 3 rakaat.",
  },
  {
    no: 10,
    judul: "Keutamaan Bulan Ramadhan",
    isi: [
      "Keutamaan bulan Ramadhan:",
      "",
      "1. Bulan turunnya Al-Quran (Surah Al-Baqarah: 185)",
      "2. Pintu surga dibuka, pintu neraka ditutup, setan dibelenggu",
      "3. Setiap amal kebaikan dilipatgandakan pahalanya",
      "4. Ada malam Lailatul Qadr (lebih baik dari 1000 bulan)",
      "5. Puasa Ramadhan adalah rukun Islam ke-4",
      "6. Ampunan dosa masa lalu bagi yang berpuasa dengan iman",
      "7. Setiap doa orang berpuasa mustajab",
      "8. Bau mulut orang puasa lebih harum dari misk di sisi Allah",
      "9. Ada 2 kegembiraan: saat berbuka & saat bertemu Allah",
      "10. Pahala sholat tarawih sama dengan sholat sepanjang malam",
      "",
      "Sunnah-sunnah Ramadhan:",
      "1. Menyegerakan berbuka (jika sudah masuk waktu)",
      "2. Berbuka dengan kurma & air",
      "3. Makan sahur (ada keberkahan)",
      "4. Memperbanyak sedekah",
      "5. Membaca Al-Quran (target khatam)",
      "6. I'tikaf di masjid (10 malam terakhir)",
      "7. Memperbanyak dzikir & istighfar",
      "8. Menunda sahur semirip mungkin dengan Subuh",
    ],
  },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > RAMADHAN.length) {
      let lines = []
      lines.push("Panduan Ramadhan - " + RAMADHAN.length + " Topik")
      lines.push("")
      RAMADHAN.forEach(r => {
        lines.push(r.no + ". " + r.judul)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "ramadhan <nomor>")
      lines.push("Contoh: " + usedPrefix + "ramadhan 3 (Doa buka puasa)")
      return m.reply(claraWrap("Panduan Ramadhan", lines.join("\n")))
    }

    const r = RAMADHAN[input - 1]

    if (r.isi) {
      return m.reply(claraWrap("Ramadhan - " + r.judul, r.isi.join("\n")))
    }

    return m.reply(claraWrap("Ramadhan - " + r.judul, [
      "Teks Arab:",
      r.arab,
      "",
      "Latin:",
      r.latin,
      "",
      "Arti:",
      r.arti,
      "",
      "Keterangan:",
      r.keterangan,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Ramadhan", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
