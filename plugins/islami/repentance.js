// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "taubat",
  alias: ["taubat"],
  aliases: ["taubat", "doataubat", "doaistighfar", "istighfar", "taubatnasuha"],
  category: "islami",
  description: "Doa taubat & istighfar lengkap (taubat nasuha, sayyidul istighfar, doa ampun)",
  usage: ".taubat | .taubat <nomor>",
  example: ".taubat | .taubat 1",
  isGroupOnly: false,
}

const TAUBAT = [
  {
    no: 1,
    judul: "Sayyidul Istighfar (Penghulu Istighfar)",
    arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ",
    latin: "Allaahumma anta rabbii laa ilaaha illaa anta khalaqtanii wa anaa 'abduka, wa anaa 'alaa 'ahdika wa wa'dika mastatha'tu, a'uudzu bika min syarri maa shana'tu, abuu'u laka bini'matika 'alayya wa abuu'u bidzanbii faghfirlii fa innahu laa yaghfirudz dzuunuuba illaa anta",
    arti: "Ya Allah, Engkau Tuhanku, tidak ada Tuhan selain Engkau, Engkau menciptakanku dan aku hamba-Mu. Aku berpegang pada janji & kesepakatan-Mu sebatas kemampuanku. Aku berlindung kepada-Mu dari keburukan perbuatanku. Aku mengakui nikmat-Mu atasku dan aku mengakui dosaku, maka ampunilah aku. Sesungguhnya tidak ada yang mengampuni dosa kecuali Engkau",
    keutamaan: "Siapa membaca dengan yakin di siang hari lalu wafat hari itu sebelum sore, ia ahli surga. Jika membaca di malam hari lalu wafat sebelum pagi, ia ahli surga. (HR. Bukhari)",
  },
  {
    no: 2,
    judul: "Doa Taubat Nasuha",
    arab: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    latin: "Rabbighfirlii wa tub 'alayya innaka antat tawaabur rahiim (100x)",
    arti: "Ya Tuhanku, ampunilah aku dan terimalah taubatku, sesungguhnya Engkau Maha Penerima Taubat lagi Maha Penyayang",
    keutamaan: "Dibaca 100x setiap hari. Taubat nasuha = taubat yang tulus, dengan 3 syarat: (1) menyesali dosa, (2) berhenti mengerjakannya, (3) bertekad tidak mengulangi. Jika dosa terkait manusia, wajib minta maaf & kembalikan hak.",
  },
  {
    no: 3,
    judul: "Doa Ampun untuk Semua Dosa",
    arab: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ دِقَّهُ وَجِلَّهُ وَأَوَّلَهُ وَآخِرَهُ وَعَلَانِيَتَهُ وَسِرَّهُ",
    latin: "Allaahummaghfirlii dzanbii kullahu diqqahu wa jillahu wa awwalahu wa aakhirahu wa 'alaaniyatahu wa sirrahu",
    arti: "Ya Allah, ampunilah segala dosaku, yang kecil maupun yang besar, yang awal maupun yang akhir, yang terang maupun yang tersembunyi",
    keutamaan: "Doa Nabi SAW yang dibaca dalam sholat (HR. Muslim). Mengakui semua dosa dan memohon ampun tanpa kecuali. Dibaca setelah sholat atau sebelum tidur.",
  },
  {
    no: 4,
    judul: "Istighfar Singkat (Astaghfirullah)",
    arab: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ",
    latin: "Astaghfirullaahal 'azhiim (100x atau lebih)",
    arti: "Aku memohon ampun kepada Allah Yang Maha Agung",
    keutamaan: "Nabi SAW beristighfar 70-100x setiap hari. Dibaca 100x pagi & sore, Allah ampuni dosa meski sebanyak buih di lautan. Istighfar adalah pembuka pintu rezeki & penolak bala. (HR. Bukhari & Muslim)",
  },
  {
    no: 5,
    judul: "Doa Taubat Nabi Adam AS",
    arab: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    latin: "Rabbanaa dzhalamnaa anfusanaa wa in lam taghfir lanaa wa tarhamnaa lanakuunanna minal khaasiriin",
    arti: "Ya Tuhan kami, kami telah menzalimi diri kami sendiri. Jika Engkau tidak mengampuni kami dan tidak merahmati kami, niscaya kami termasuk orang-orang yang merugi",
    keutamaan: "Doa Nabi Adam AS & Hawa setelah keluar dari surga (Surah Al-A'raf: 23). Doa taubat tertua & teragung. Mengakui kesalahan tanpa alasan, memohon ampun dengan tulus.",
  },
  {
    no: 6,
    judul: "Doa Taubat Nabi Yunus AS",
    arab: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    latin: "Laa ilaaha illaa anta subhaanaka innii kuntu minadh dhaalimiin (40x)",
    arti: "Tidak ada Tuhan selain Engkau, Maha Suci Engkau, sesungguhnya aku termasuk orang-orang yang zalim",
    keutamaan: "Doa Nabi Yunus AS di dalam perut ikan. Dibaca 40x, insya Allah Allah kabulkan doa. Siapa membaca doa ini dengan ikhlas, Allah ampuni dosanya. (HR. Tirmidzi)",
  },
  {
    no: 7,
    judul: "Rukun & Syarat Taubat",
    isi: [
      "Rukun Taubat (4 syarat):",
      "",
      "1. Niat karena Allah (ikhlas)",
      "   Taubat harus murni karena Allah, bukan karena takut",
      "   manusia, malu, atau ingin dipuji.",
      "",
      "2. Menyesali dosa (nadim)",
      "   Merasa sungguh-sungguh menyesal atas perbuatan dosa.",
      "   Penyesalan ini harus datang dari hati, bukan hanya ucapan.",
      "",
      "3. Berhenti dari dosa (ijtinab)",
      "   Segera berhenti melakukan dosa tersebut.",
      "   Jika dosa masih dikerjakan, taubat tidak sah.",
      "",
      "4. Bertekad tidak mengulangi ('azm)",
      "   Memiliki tekad kuat untuk tidak mengulangi dosa.",
      "   Jika terlintas niat mengulangi, taubat batal.",
      "",
      "Syarat tambahan jika dosa terkait manusia:",
      "   - Jika mengambil hak orang: wajib kembalikan",
      "   - Jika menzalimi orang: wajib minta maaf",
      "   - Jika menyebar aib: wajib klarifikasi",
      "   - Jika membunuh: wajib qishas/diyat",
      "",
      "Jenis taubat:",
      "   1. Taubat Nasuha: taubat tulus & sempurna",
      "   2. Taubat biasa: menyesal & berhenti tapi lemah tekad",
      "   3. Taubat sebelum sakaratul maut: diterima jika sempat",
      "   4. Taubat setelah dosa besar: wajib, jangan ditunda",
    ],
  },
  {
    no: 8,
    judul: "Keutamaan Istighfar",
    isi: [
      "Keutamaan istighfar dalam Al-Quran & Hadits:",
      "",
      "1. Pembuka pintu rezeki",
      "   'Mintalah ampun kepada Tuhanmu, sungguh Dia Maha Pengampun, niscaya Dia akan menurunkan hujan lebat, menambah harta & anak-anak.' (Surah Nuh: 10-12)",
      "",
      "2. Penghapus dosa",
      "   'Jika kamu tidak mengerjakan dosa, niscaya Allah akan menggantikan kamu dengan kaum yang berdosa lalu beristighfar.' (HR. Muslim)",
      "",
      "3. Penolak bala & musibah",
      "   Nabi Nuh AS beristighfar & Allah selamatkan dari banjir bandang.",
      "",
      "4. Penenang hati",
      "   'Siapa perbanyak istighfar, Allah buat jalan keluar dari setiap kesulitan & kelapangan dari setiap kesusahan.' (HR. Abu Daud)",
      "",
      "5. Pemberat timbangan kebaikan",
      "   'Dua kalimat ringan di lisan, berat di timbangan: Subhanallah wa bihamdih, Subhanallahil 'azhiim.' (HR. Bukhari)",
      "",
      "6. Penambah kekuatan",
      "   'Subhanallah wa bihamdih' 100x = dihapus dosa meski sebanyak buih lautan. (HR. Bukhari & Muslim)",
      "",
      "7. Doa yang mustajab",
      "   'Setiap Nabi memiliki doa mustajab yang dikabulkan. Aku simpan doaku untuk syafaat umatku di akhirat.' (HR. Bukhari)",
      "",
      "Praktik terbaik:",
      "   - Baca 'Astaghfirullah' 100x setiap pagi & sore",
      "   - Baca Sayyidul Istighfar 1x pagi & sore",
      "   - Baca istighfar setelah sholat fardhu",
      "   - Perbanyak istighfar saat kesulitan & musibah",
    ],
  },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > TAUBAT.length) {
      let lines = []
      lines.push("Doa Taubat & Istighfar")
      lines.push(TAUBAT.length + " Topik Lengkap")
      lines.push("")
      TAUBAT.forEach(t => {
        lines.push(t.no + ". " + t.judul)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "taubat <nomor>")
      lines.push("Contoh: " + usedPrefix + "taubat 1 (Sayyidul Istighfar)")
      return m.reply(novaWrap("Taubat & Istighfar", lines.join("\n")))
    }

    const t = TAUBAT[input - 1]

    if (t.isi) {
      return m.reply(novaWrap("Taubat - " + t.judul, t.isi.join("\n")))
    }

    return m.reply(novaWrap("Taubat - " + t.judul, [
      "Teks Arab:",
      t.arab,
      "",
      "Latin:",
      t.latin,
      "",
      "Arti:",
      t.arti,
      "",
      "Keutamaan:",
      t.keutamaan,
    ].join("\n")))
  } catch (e) {
    return m.reply(novaWrap("Taubat & Istighfar", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
