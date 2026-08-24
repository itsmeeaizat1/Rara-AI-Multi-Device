// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "sholatjenazah",
  aliases: ["sholatjenazah", "jenazah", "tatasolatjenazah", "doajenazah", "sholatmayat"],
  category: "islami",
  description: "Panduan tata cara sholat jenazah lengkap (4 takbir, doa, tata cara)",
  usage: ".sholatjenazah | .sholatjenazah <nomor>",
  example: ".sholatjenazah | .sholatjenazah 1",
  isGroupOnly: false,
}

const TAHAPAN = [
  {
    no: 1,
    judul: "Syarat & Rukun",
    isi: [
      "Syarat sholat jenazah:",
      "1. Mayat sudah dimandikan dan dikafani",
      "2. Mayat diletakkan di depan orang yang sholat",
      "3. Mayat muslim (tidak murtad)",
      "",
      "Rukun sholat jenazah (7 rukun):",
      "1. Niat (dalam hati)",
      "2. Berdiri (wajib, kecuali tidak mampu)",
      "3. Takbiratul ihram (takbir pertama)",
      "4. Membaca Al-Fatihah",
      "5. Sholawat kepada Nabi SAW (setelah takbir kedua)",
      "6. Doa untuk mayat (setelah takbir ketiga)",
      "7. Salam (setelah takbir keempat)",
      "",
      "Catatan: Tidak ada ruku, sujud, tasyahud. Sholat jenazah murni doa dengan 4 takbir.",
    ],
  },
  {
    no: 2,
    judul: "Niat Sholat Jenazah",
    arab: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ - (niat dalam hati)",
    latin: "Nawaitu an ushollia 'alaa haadzal mayyiti lillaahi ta'aalaa (untuk mayat laki-laki). Nawaitu an ushollia 'alaa haadzihil mayyitati lillaahi ta'aalaa (untuk mayat perempuan)",
    arti: "Aku niat sholat atas mayat ini karena Allah Ta'ala",
    keterangan: "Niat dibaca dalam hati. Bedakan dhamir (kata ganti): 'haadzal mayyit' (mayat laki-laki), 'haadzihil mayyitah' (mayat perempuan). Untuk beberapa mayat sekaligus, tambahkan niat jamaah.",
  },
  {
    no: 3,
    judul: "Takbir Pertama + Al-Fatihah",
    arab: "اللهُ أَكْبَرُ (takbir 1)",
    latin: "Allaahu Akbar",
    arti: "Allah Maha Besar",
    keterangan: "Setelah takbiratul ihram, tangan rapat di dada. Lalu baca Al-Fatihah wajib tanpa surah pendek. Jika lupa Al-Fatihah, sholat tidak sah.",
  },
  {
    no: 4,
    judul: "Takbir Kedua + Sholawat",
    arab: "اللهُ أَكْبَرُ (takbir 2)\nاللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    latin: "Allaahu Akbar\nAllaahumma sholli 'alaa Muhammad wa 'alaa aali Muhammad, kamaa shollaita 'alaa Ibrahim wa 'alaa aali Ibrahim, innaka hamiidum majiid",
    arti: "Allah Maha Besar. Ya Allah, berilah sholawat kepada Nabi Muhammad dan keluarganya, sebagaimana Engkau memberi sholawat kepada Nabi Ibrahim dan keluarganya, sesungguhnya Engkau Maha Terpuji lagi Maha Agung",
    keterangan: "Setelah takbir kedua, baca sholawat Ibrahimiyah (yang sama dengan di tasyahud). Minimal baca 'Allaahumma sholli 'alaa Muhammad'.",
  },
  {
    no: 5,
    judul: "Takbir Ketiga + Doa untuk Mayat",
    arab: "اللهُ أَكْبَرُ (takbir 3)\nاللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ",
    latin: "Allaahu Akbar\nAllaahummaghfir lahu warhamhu, wa 'aafihii wa'fu 'anhu, wa akrim nuzulahu wa wassi' madkhalahu, wagsilhu bil maa'i wath thalji wal barad, wanaqqihi minal khataya kamaa yunaqqats tsaubul abyadhu minad danas, wa abdilhu daaran khairam min daarihi, wa ahlan khairam min ahlihi, wa zaujan khairam min zaujihi, wa adkhilhul jannata wa a'idzhu min 'adzaabin naar (atau min 'adzaabil qubur)",
    arti: "Allah Maha Besar. Ya Allah, ampunilah dia, rahmatilah dia, maafkanlah dia, muliakanlah tempat tinggalnya, luaskanlah kuburnya, mandikanlah dia dengan air, salju, dan embun. Bersihkanlah dia dari dosa seperti kain putih dibersihkan dari kotoran. Gantilah rumahnya dengan yang lebih baik, keluarganya dengan yang lebih baik, pasangannya dengan yang lebih baik. Masukkanlah ia ke surga dan lindungilah ia dari azab kubur / azab neraka",
    keterangan: "Doa utama untuk mayat. Untuk mayat LAKI-LAKI gunakan 'lahu, warhamhu, wa'aafihii, wa'fu anhu, wa akrim nuzulahu'. Untuk mayat PEREMPUAN ganti menjadi 'lahaa, warhamhaa, wa'aafihaa, wa'fu anhaa, wa akrim nuzuluhaa'. Untuk mayat ANAK kecil, doanya beda (lihat nomor 7).",
  },
  {
    no: 6,
    judul: "Takbir Keempat + Doa Tambahan",
    arab: "اللهُ أَكْبَرُ (takbir 4)\nاللَّهُمَّ لَا تَحْرِمْنَا أَجْرَهُ",
    latin: "Allaahu Akbar\nAllaahumma laa tahrimnaa ajrahu wa laa taftinaa ba'dahu waghfir lanaa wa lahu (untuk laki-laki). Untuk perempuan: ajrahaa, ba'dahaa, waghfir lanaa wa lahaa",
    arti: "Allah Maha Besar. Ya Allah, janganlah Engkau halangi kami dari pahalanya, janganlah Engkau fitnah kami setelahnya, dan ampunilah kami dan dia (mayat)",
    keterangan: "Bisa juga baca doa singkat: 'Allaahummaj'alhu lanaa farathan wa salafan wa ajran'. Setelah takbir keempat dan doa, langsung salam.",
  },
  {
    no: 7,
    judul: "Salam",
    arab: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
    latin: "Assalaamu'alaikum wa rahmatullaah",
    arti: "Semoga keselamatan dan rahmat Allah terlimpah kepadamu",
    keterangan: "Salam ke kanan 1x (cukup 1x menurut sebagian ulama, atau 2x kanan-kiri menurut ulama lain). Dengan salam, sholat jenazah selesai.",
  },
  {
    no: 8,
    judul: "Doa untuk Mayat Anak Kecil",
    arab: "اللَّهُمَّ اجْعَلْهُ فَرَطًا وَسَلَفًا وَأَجْرًا",
    latin: "Allaahummaj'alhu lanaa farathan, wa salafan, wa ajran, wa dhukhron, wa 'itab (untuk laki-laki). Untuk perempuan: farathan, wa salafan, wa ajran, wa dhukhron, wa 'itab (dengan i'rab muannats)",
    arti: "Ya Allah, jadikanlah ia untuk kami penghulu (yang mendahului di surga), pendahulu, pahala, simpanan, dan pelajaran",
    keterangan: "Khusus untuk mayat anak kecil yang belum baligh. Doa ini dibaca pada takbir ketiga, menggantikan doa dewasa. Anak kecil tidak punya dosa, jadi doanya untuk keluarga yang ditinggalkan.",
  },
  {
    no: 9,
    judul: "Tata Cara Praktis",
    isi: [
      "Ringkasan tata cara sholat jenazah:",
      "",
      "1. Berdiri menghadap kiblat, mayat di depan (sebelah kiblat)",
      "2. Takbiratul ihram (takbir 1) + Al-Fatihah",
      "3. Takbir 2 + Sholawat Nabi (Ibrahimiyah)",
      "4. Takbir 3 + Doa untuk mayat",
      "5. Takbir 4 + Doa tambahan / penutup",
      "6. Salam",
      "",
      "Dilakukan sambil berdiri, tanpa ruku, sujud, atau duduk.",
      "Tangan tetap rapat di dada sepanjang sholat.",
      "Setelah salam, langsung mengantar jenazah ke pemakaman.",
      "",
      "Catatan: Jumlah takbir 4 (ada pendapat 5 dengan takbir permulaan terpisah). Pendapat yang lebih kuam: 4 takbir (takbiratul ihram termasuk yang pertama).",
    ],
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > TAHAPAN.length) {
      let lines = [];
      lines.push("Panduan Sholat Jenazah");
      lines.push(TAHAPAN.length + " Tahapan Lengkap");
      lines.push("");
      TAHAPAN.forEach(t => {
        lines.push(t.no + ". " + t.judul);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "sholatjenazah <nomor>");
      lines.push("Contoh: " + usedPrefix + "sholatjenazah 5 (Doa mayat)");
      return m.reply(claraWrap("Sholat Jenazah", lines.join("\n")));
    }

    const t = TAHAPAN[input - 1];

    if (t.isi) {
      return m.reply(claraWrap("Sholat Jenazah - " + t.judul, t.isi.join("\n")));
    }

    return m.reply(claraWrap("Sholat Jenazah - " + t.judul, [
      "Teks Arab:",
      t.arab,
      "",
      "Latin:",
      t.latin,
      "",
      "Arti:",
      t.arti,
      "",
      "Keterangan:",
      t.keterangan,
    ].join("\n")));
  } catch (e) {
    return m.reply(claraWrap("Sholat Jenazah", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
