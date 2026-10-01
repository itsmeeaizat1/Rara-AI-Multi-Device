// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "hajat",
  alias: ["hajat"],
  aliases: ["hajat", "doahajat", "sholathajat", "doakebaikan"],
  category: "islami",
  description: "Panduan sholat & doa hajat (mohon kebaikan dunia akhirat)",
  usage: ".hajat | .hajat <nomor>",
  example: ".hajat | .hajat 1",
  isGroupOnly: false,
}

const HAJAT = [
  {
    no: 1,
    judul: "Pengertian & Keutamaan",
    isi: [
      "Sholat Hajat adalah sholat sunnah untuk memohon sesuatu kepada Allah SWT.",
      "",
      "Keutamaan:",
      "1. Nabi SAW bersabda: 'Barang siapa memiliki hajat kepada Allah atau seseorang, maka mandilah & wudhulah, lalu sholat 2 rakaat.' (HR. Bukhari)",
      "2. Dilakukan saat memohon kebutuhan dunia & akhirat",
      "3. Allah berjanji mengabulkan hajat yang baik",
      "4. Doa setelah sholat hajat sangat mustajab",
      "",
      "Kapan dilakukan?",
      "Saat membutuhkan: rezeki, jodoh, kesembuhan, kebaikan, perlindungan, ampunan, ketenangan, solusi masalah.",
      "",
      "Waktu terbaik:",
      "1. Sepertiga malam terakhir (setelah tahajud)",
      "2. Setelah sholat fardhu (disunnahkan)",
      "3. Hari Jumat (ada waktu mustajab)",
      "4. Waktu yang bebas (bukan waktu terlarang)",
    ],
  },
  {
    no: 2,
    judul: "Tata Cara Sholat Hajat",
    isi: [
      "Tata cara sholat hajat:",
      "",
      "1. Mandi & wudhu (sunnahan mandi sebelum sholat)",
      "2. Niat (dalam hati):",
      "   'Nawaitu an ushollia sunnatal haajati rak'ataini lillaahi ta'aalaa'",
      "   (Aku niat sholat sunnah hajat 2 rakaat karena Allah Ta'ala)",
      "",
      "3. Rakaat pertama:",
      "   - Takbiratul ihram",
      "   - Al-Fatihah",
      "   - Baca surah pendek (Al-Ikhlas 3x atau Al-Kafirun)",
      "   - Ruku, sujud",
      "",
      "4. Rakaat kedua:",
      "   - Al-Fatihah",
      "   - Baca surah pendek (Al-Ikhlas 3x atau Al-Falaq & An-Nas)",
      "   - Ruku, sujud",
      "",
      "5. Setelah salam, baca:",
      "   - Istighfar 70x (atau 100x)",
      "   - Sholawat Nabi 10x",
      "   - Doa hajat",
      "   - Doa kebaikan dunia akhirat",
      "",
      "6. Sujud & baca doa hajat dengan khusyuk",
      "7. Sebutkan hajat yang diminta",
      "8. Tutup dengan sholawat & salam",
      "",
      "Jumlah rakaat:",
      "   - Minimal 2 rakaat",
      "   - Bisa 4, 6, 8, atau 12 rakaat (kelipatan 2)",
      "   - Dianjurkan 2 rakaat saja untuk pemula",
    ],
  },
  {
    no: 3,
    judul: "Doa Hajat Utama",
    arab: "اللَّهُمَّ يَا رَبَّ السَّمَاوَاتِ وَالْأَرْضِ وَمَا فِيهِنَّ",
    latin: "Allaahumma yaa rabbas samaawaati wal ardhi wa maa fiihinna wa maa baynahinna, wa rabbal 'arsyil 'azhiimi, as'aluka bi haqqi kalimaatik kullihina, allatii haajat bihaa kullu shai'in min khalqika, an tusalliya 'alaa Muhammadin wa aali Muhammad, wa an taf'alabii maa anta ahluh, Allaahumma anta rabbii laa ilaaha illaa anta, 'alayka tawakkaltu wa anta rabbul 'arsyil 'azhiim, maa syaa'allahu kaana wa maa lam yasya' lam yakun, wa laa haula wa laa quwwata illaa billaahil 'aliyyil 'azhiim, as'aluka khairan min kulli syai'in, Allaahummaftahlii khaira baab",
    arti: "Ya Allah, Tuhan langit & bumi dan segala isinya, Tuhan 'Arsy yang agung. Aku memohon dengan hak seluruh kalimat-Mu yang menjadi kebutuhan setiap ciptaan-Mu, agar Engkau limpahkan sholawat kepada Muhammad & keluarganya, dan agar Engkau berbuat kepadaku apa yang Engkau layakkan. Ya Allah, Engkau Tuhanku, tidak ada Tuhan selain Engkau, kepada-Mu aku bertawakal, Engkau Tuhan 'Arsy yang agung. Apa yang Allah kehendaki terjadi, apa yang tidak dikehendaki tidak terjadi. Tidak ada daya & kekuatan kecuali dengan Allah Yang Maha Tinggi lagi Maha Agung. Aku memohon kebaikan dari segala sesuatu. Ya Allah, bukakan untukku pintu kebaikan yang terbaik",
    keterangan: "Doa utama setelah sholat hajat. Sebutkan hajat setelah membaca doa ini. Bisa dibaca dalam sujud atau setelah salam.",
  },
  {
    no: 4,
    judul: "Doa Kebaikan Dunia & Akhirat",
    arab: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    latin: "Rabbanaa aatinaa fid dunyaa hasanah, wa fil aakhirati hasanah, wa qinaa 'adzaaban naar (dibaca 7x atau lebih)",
    arti: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka",
    keterangan: "Doa yang paling sering dibaca Nabi SAW (HR. Bukhari & Muslim). Hasanah di dunia = istri sholehah, rumah yang nyaman, kendaraan. Hasanah di akhirat = surga. Dibaca 7x atau lebih setelah sholat hajat.",
  },
  {
    no: 5,
    judul: "Doa Sapu Jagat (Paling Mustajab)",
    arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ",
    latin: "Allaahumma innii as'aluka minal khairi kullihi 'aajilihi wa aajilihi maa 'alimtu minhu wa maa lam a'lam, wa a'uudzu bika minal syarri kullihi 'aajilihi wa aajilihi maa 'alimtu minhu wa maa lam a'lam, wa as'alukal jannata wa maa qarraba ilaiha min qawlin aw 'amalin, wa a'uudzu bika binnaari wa maa qarraba ilaiha min qawlin aw 'amalin",
    arti: "Ya Allah, aku memohon kepada-Mu seluruh kebaikan, yang segera & yang ditunda, yang aku tahu & yang tidak aku tahu. Aku berlindung kepada-Mu dari segala keburukan, yang segera & yang ditunda, yang aku tahu & yang tidak aku tahu. Aku memohon surga & segala yang mendekatkan kepadanya baik ucapan maupun perbuatan. Aku berlindung kepada-Mu dari neraka & segala yang mendekatkan kepadanya baik ucapan maupun perbuatan",
    keterangan: "Doa sapu jagat yang mencakup semua kebaikan dunia & akhirat. Dibaca setelah sholat hajat atau setelah sholat fardhu. Sangat mustajab karena mencakup segala hal.",
  },
  {
    no: 6,
    judul: "Doa Rezeki & Kelapangan",
    arab: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    latin: "Allaahumma akfinii bihalalika 'an haraamik, wa aghninii bifadhlika 'amman siwaak (100x)",
    arti: "Ya Allah, cukupkanlah aku dengan yang halal dari yang haram, dan kayakanlah aku dengan karunia-Mu dari selain-Mu",
    keterangan: "Doa pembuka rezeki paling mustajab. Dibaca 100x setelah sholat hajat atau setiap pagi/sore. Hindari harap-harap cemas, ganti dengan tawakal penuh.",
  },
  {
    no: 7,
    judul: "Doa Memohon Jodoh",
    arab: "اللَّهُمَّ ارْزُقْنِي زَوْجًا صَالِحًا",
    latin: "Allaahummar zuqnii zaujan shaalihan (atau shaalihah), taatan lillaahi wa rasuulihi, yuhfadhunii (yuhfadhzhinii) fii ghaybihi wa yuhshinunii (yuhshinunii) fii wajhihi, yuthi'unii (yuthi'unii) idha amartu wa yushdi'inii (yushdi'inii) idha nahait, Allaahumma jab qalbahu (qalbaha) 'alayya kamaa jabta qalba Nabi Yusuf 'alaa Zulaikha",
    arti: "Ya Allah, rezekikanlah aku pasangan yang sholeh (sholehah), taat kepada Allah & Rasul-Nya, menjagaku di belakang & memuliakanku di depan, patuh jika aku perintah & menjaga jika aku larang. Ya Allah, ikatlah hatinya kepadaku sebagaimana Engkau mengikat hati Nabi Yusuf kepada Zulaikha",
    keterangan: "Doa untuk memohon jodoh yang sholeh/sholehah. Lakukan sholat hajat di sepertiga malam, baca doa ini 7x dengan khusyuk. Jodoh datang dari Allah, bukan dari usaha semata.",
  },
  {
    no: 8,
    judul: "Tips Agar Hajat Dikabulkan",
    isi: [
      "Tips agar sholat hajat & doa dikabulkan:",
      "",
      "1. Yakin & ikhlas",
      "   Yakin Allah akan mengabulkan. Jangan ragu sedikitpun.",
      "   'Sesungguhnya Allah tidak menerima amal kecuali yang ikhlas.'",
      "",
      "2. Perbanyak sholawat",
      "   Baca sholawat sebelum & sesudah doa.",
      "   Sholawat pembuka pintu langit & pengantar doa.",
      "",
      "3. Pilih waktu mustajab",
      "   - Sepertiga malam terakhir (sebelum Subuh)",
      "   - Setelah sholat fardhu",
      "   - Saat sujud (paling dekat dengan Allah)",
      "   - Hari Jumat (ada waktu mustajab tersembunyi)",
      "   - Bulan Ramadhan (pintu langit terbuka)",
      "",
      "4. Halalkan makanan",
      "   Doa tidak akan terkabul jika makanan haram.",
      "   Pastikan makan, minum, pakaian, & nafkah halal.",
      "",
      "5. Jangan terburu-buru",
      "   Nabi SAW bersabda: 'Setiap orang akan dikabulkan selama tidak terburu-buru, yaitu berkata: Aku sudah berdoa tapi belum dikabulkan.' (HR. Bukhari & Muslim)",
      "",
      "6. Hajat yang baik",
      "   Hajat harus: halal, baik, & tidak merugikan orang lain.",
      "   Jika hajat untuk hal haram/merugikan, Allah tolak.",
      "",
      "7. Perbanyak sedekah",
      "   Sedekah sebelum & sesudah sholat hajat.",
      "   'Tolak bala dengan sedekah.' (HR. Tirmidzi)",
      "",
      "8. Istighfar sebelum doa",
      "   Bersihkan diri dengan istighfar 70x sebelum memohon.",
      "   Hati yang bersih lebih mudah dikabulkan doanya.",
    ],
  },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > HAJAT.length) {
      let lines = []
      lines.push("Sholat & Doa Hajat")
      lines.push(HAJAT.length + " Topik Lengkap")
      lines.push("")
      HAJAT.forEach(h => {
        lines.push(h.no + ". " + h.judul)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "hajat <nomor>")
      lines.push("Contoh: " + usedPrefix + "hajat 3 (Doa utama)")
      return m.reply(novaWrap("Sholat & Doa Hajat", lines.join("\n")))
    }

    const h = HAJAT[input - 1]

    if (h.isi) {
      return m.reply(novaWrap("Hajat - " + h.judul, h.isi.join("\n")))
    }

    return m.reply(novaWrap("Hajat - " + h.judul, [
      "Teks Arab:",
      h.arab,
      "",
      "Latin:",
      h.latin,
      "",
      "Arti:",
      h.arti,
      "",
      "Keterangan:",
      h.keterangan,
    ].join("\n")))
  } catch (e) {
    return m.reply(novaWrap("Sholat & Doa Hajat", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
