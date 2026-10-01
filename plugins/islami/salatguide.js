// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "panduansholat",
  alias: ["panduansholat"],
  aliases: ["panduansholat", "carasolat", "tatasolat", "sholatguide", "bacaansholat"],
  category: "islami",
  description: "Panduan lengkap tata cara sholat (gerakan, bacaan, urutan)",
  usage: ".panduansholat | .panduansholat <nomor>",
  example: ".panduansholat | .panduansholat 1 (Niat)",
  isGroupOnly: false,
}

const TAHAPAN = [
  {
    no: 1,
    judul: "Niat Sholat",
    arab: "نِيَّتِيْ صَلَاةً لِلَّهِ تَعَالَى",
    latin: "Usholli fardhol [Subuh/Dzuhur/Ashar/Maghrib/Isya] rak'ataini lillahi ta'ala",
    arti: "Aku niat sholat fardhu [Subuh/Dzuhur/Ashar/Maghrib/Isya] dua rakaat karena Allah Ta'ala",
    keterangan: "Diucapkan dalam hati sambil menghadap kiblat. Ganti [Subuh] sesuai sholat yang dikerjakan. Untuk sholat selain Subuh, ganti rak'ataini dengan jumlah rakaat yang sesuai.",
  },
  {
    no: 2,
    judul: "Takbiratul Ihram",
    arab: "اللهُ أَكْبَرُ",
    latin: "Allahu Akbar",
    arti: "Allah Maha Besar",
    keterangan: "Angkat kedua tangan sejajar telinga, telapak menghadap kiblat. Setelah takbir, rapatkan tangan di dada (tangan kanan di atas tangan kiri). Mulai dari sini sholat dimulai, dilarang melakukan gerakan lain selain sholat.",
  },
  {
    no: 3,
    judul: "Doa Iftitah",
    arab: "اللهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا",
    latin: "Allahu Akbar kabiirowaa walhamdulillaahi katsiiroo",
    arti: "Allah Maha Besar dengan kebesaran yang sempurna, dan segala puji bagi Allah dengan pujian yang banyak",
    keterangan: "Dibaca setelah takbiratul ihram dan sebelum Al-Fatihah. Ada beberapa variasi doa iftitah, ini salah satunya yang paling umum (doa iftitah menurut hadits Muslim).",
  },
  {
    no: 4,
    judul: "Al-Fatihah",
    arab: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\nالرَّحْمَٰنِ الرَّحِيمِ\nمَالِكِ يَوْمِ الدِّينِ\nإِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ\nاهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ\nصِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    latin: "Bismillaahir Rahmaanir Rahiim\nAlhamdulillaahi Rabbil 'aalamiin\nAr-Rahmaanir Rahiim\nMaaliki yaumid diin\nIyyaaka na'budu wa iyyaaka nasta'iin\nIhdinash shiraathal mustaqiim\nShiraathal ladziina an'amta 'alaihim ghairil maghdhuubi 'alaihim waladh dhaalliin",
    arti: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang. Segala puji bagi Allah, Tuhan semesta alam. Yang Maha Pengasih lagi Maha Penyayang. Pemilik hari pembalasan. Hanya kepada-Mu kami menyembah dan hanya kepada-Mu kami memohon pertolongan. Tunjukilah kami jalan yang lurus. Jalan orang-orang yang telah Engkau beri nikmat, bukan jalan orang-orang yang Engkau murkai dan bukan pula jalan orang-orang yang sesat.",
    keterangan: "WAJIB dibaca di setiap rakaat. Tanpa Al-Fatihah, sholat tidak sah. Setelah selesai baca 'Aamin' (dalam hati).",
  },
  {
    no: 5,
    judul: "Surah Pendek",
    arab: "(Contoh: Al-Ikhlas)",
    latin: "Qul huwallaahu ahad, Allaahus shamad, Lam yalid wa lam yuulad, Wa lam yakul lahu kufuwan ahad",
    arti: "Katakanlah: Dialah Allah Yang Maha Esa. Allah tempat meminta segala sesuatu. Dia tidak beranak dan tidak diperanakkan. Dan tidak ada sesuatu pun yang setara dengan Dia.",
    keterangan: "Baca surah pendek setelah Al-Fatihah (rata-rata orang baca Al-Ikhlas, Al-Falaq, An-Nas, atau surah pendek lain). Pada rakaat ke-2 dan seterusnya juga baca Al-Fatihah + surah pendek.",
  },
  {
    no: 6,
    judul: "Ruku",
    arab: "سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ",
    latin: "Subhaana Rabbiyal 'Azhiimi wa bihamdih",
    arti: "Maha Suci Tuhanku Yang Maha Agung dan segala puji bagi-Nya",
    keterangan: "Bungkukkan badan, tangan pegang lutut, punggung lurus. Baca 3x. Setelah ruku, i'tidal sambil baca: 'Sami'allaahu liman hamidah, Rabbanaa lakal hamd' (Allah mendengar orang yang memuji-Nya, Ya Tuhan kami, puji untuk-Mu).",
  },
  {
    no: 7,
    judul: "Sujud",
    arab: "سُبْحَانَ رَبِّيَ الْأَعْلَى وَبِحَمْدِهِ",
    latin: "Subhaana Rabbiyal A'laa wa bihamdih",
    arti: "Maha Suci Tuhanku Yang Maha Tinggi dan segala puji bagi-Nya",
    keterangan: "Sujud: dahi, hidung, dua telapak tangan, dua lutut, dan jari kaki menyentuh lantai. Baca 3x. Bangun dari sujud baca 'Allahu Akbar', duduk lalu sujud lagi. Antara dua sujud dianjurkan baca doa: 'Rabbighfirli warhamnii wahdinii wa ja burnii wa 'aafinii'.",
  },
  {
    no: 8,
    judul: "Duduk di Antara Dua Sujud",
    arab: "رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَاجْبُرْنِي وَعَافِنِي",
    latin: "Rabbighfirlii warhamnii wahdinii wajburnii wa'aafinii",
    arti: "Ya Tuhanku, ampunilah aku, rahmatilah aku, berilah petunjuk, cukupi kekurangan, dan sehatkanlah aku",
    keterangan: "Duduk iftirasy (duduk di atas kaki kiri, kaki kanan tegak). Setelah itu kembali sujud (sujud kedua).",
  },
  {
    no: 9,
    judul: "Duduk Tasyahud Awal (Rakaat ke-2)",
    arab: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ\nالسَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ\nالسَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ\nأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ",
    latin: "At-tahiyyaatu lillaahi wash sholawaatu wath thayyibaat\nAssalaamu 'alaika ayyuhan nabiyyu wa rahmatullaahi wa barokaatuh\nAssalaamu 'alainaa wa 'alaa 'ibaadillaahish shaalihiin\nAsyhadu allaa ilaaha illallah wa asyhadu anna Muhammadar rasuulullah",
    arti: "Segala penghormatan, sholawat, dan kebaikan hanya bagi Allah. Semoga keselamatan, rahmat, dan keberkahan terlimpah kepadamu wahai Nabi, dan kepada kami serta hamba-hamba Allah yang sholeh. Aku bersaksi tidak ada Tuhan selain Allah, dan Muhammad adalah utusan Allah.",
    keterangan: "Duduk iftirasy. Hanya untuk sholat yang lebih dari 2 rakaat (Dzuhur, Ashar, Maghrib, Isya). Setelah tasyahud awal, berdiri lagi untuk rakaat berikutnya dengan baca 'Allahu Akbar'.",
  },
  {
    no: 10,
    judul: "Tasyahud Akhir + Sholawat",
    arab: "...اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ\nوَعَلَى آلِ مُحَمَّدٍ\nكَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ\nإِنَّكَ حَمِيدٌ مَجِيدٌ",
    latin: "Allaahumma sholli 'alaa Muhammad wa 'alaa aali Muhammad, kamaa shollaita 'alaa Ibrahim wa 'alaa aali Ibrahim, innaka hamiidum majiid",
    arti: "Ya Allah, berilah rahmat kepada Nabi Muhammad dan keluarganya, sebagaimana Engkau memberi rahmat kepada Nabi Ibrahim dan keluarganya, sesungguhnya Engkau Maha Terpuji lagi Maha Agung",
    keterangan: "Duduk tawarruk (duduk di atas pantat, kaki kiri masuk di bawah betis kanan). Lanjut dengan sholawat Ibrahim dan doa: 'Allahumma inni a'udzu bika min 'adzaabi jahannam wa min 'adzaabil qubur...'",
  },
  {
    no: 11,
    judul: "Salam",
    arab: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
    latin: "Assalaamu'alaikum wa rahmatullaah",
    arti: "Semoga keselamatan dan rahmat Allah terlimpah kepadamu",
    keterangan: "Miringkan kepala ke kanan lalu baca salam, lalu miringkan ke kiri dan baca salam lagi. Dengan salam, sholat selesai. Setelah salam, dianjurkan baca dzikir dan doa setelah sholat.",
  },
  {
    no: 12,
    judul: "Dzikir Setelah Sholat",
    arab: "أَسْتَغْفِرُ اللَّهَ (3x)\nاللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ\nتَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    latin: "Astaghfirullaah (3x)\nAllaahumma antas salaam wa minkas salaam, tabaarakta yaa dzal jalaali wal ikraam",
    arti: "Aku memohon ampun kepada Allah (3x). Ya Allah, Engkaulah sumber keselamatan dan dari-Mu keselamatan. Maha Suci Engkau wahai Dzat yang memiliki keagungan dan kemuliaan.",
    keterangan: "Dzikir setelah sholat: baca istighfar 3x, lalu doa di atas. Lanjut baca Ayat Kursi, Al-Ikhlas, Al-Falaq, An-Nas masing-masing 1x. Dianjurkan juga tasbih 33x, tahmid 33x, takbir 33x, lalu baca 'Laa ilaaha illallaahu wahdahu...' 1x untuk genap 100.",
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > TAHAPAN.length) {
      let lines = [];
      lines.push("Panduan Lengkap Tata Cara Sholat");
      lines.push(TAHAPAN.length + " Tahapan dari Niat sampai Dzikir");
      lines.push("");
      TAHAPAN.forEach(t => {
        lines.push(t.no + ". " + t.judul);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "panduansholat <nomor>");
      lines.push("Contoh: " + usedPrefix + "panduansholat 4 (Al-Fatihah)");
      return m.reply(novaWrap("Panduan Sholat", lines.join("\n")));
    }

    const t = TAHAPAN[input - 1];
    const lines = [
      "Tahap " + t.no + " dari " + TAHAPAN.length,
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
      t.no < TAHAPAN.length ? "Ketik " + usedPrefix + "panduansholat " + (t.no + 1) + " untuk tahap berikutnya" : "Selesai. Semoga sholat kita diterima Allah SWT.",
    ];

    return m.reply(novaWrap("Panduan Sholat - Tahap " + t.no, lines.join("\n")));
  } catch (e) {
    return m.reply(novaWrap("Panduan Sholat", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
