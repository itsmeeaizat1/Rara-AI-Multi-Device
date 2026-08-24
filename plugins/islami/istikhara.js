// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "istikhara",
  aliases: ["istikhara", "doaistikhara", "doaistikharah", "istikharah", "sholatistikhara"],
  category: "islami",
  description: "Panduan sholat & doa Istikhara (mohon petunjuk Allah saat bingung memilih)",
  usage: ".istikhara | .istikhara <nomor>",
  example: ".istikhara | .istikhara 1",
  isGroupOnly: false,
}

const ISTIKHARA = [
  {
    no: 1,
    judul: "Pengertian & Keutamaan",
    isi: [
      "Sholat Istikhara adalah sholat sunnah 2 rakaat untuk memohon petunjuk (kebaikan) dari Allah dalam memilih sesuatu.",
      "",
      "Keutamaan:",
      "1. Nabi SAW mengajarkan sholat ini kepada sahabat seperti mengajarkan surah Al-Quran",
      "2. Dilakukan saat seseorang menghadapi pilihan yang sulit",
      "3. Petunjuk datang dari Allah, bukan dari mimpi atau perasaan",
      "4. Insya Allah, Allah akan pilihkan yang terbaik",
      "",
      "Kapan dilakukan?",
      "Sebelum mengambil keputusan penting: menikah, bekerja, pindah, usaha, dll.",
      "Tidak perlu setiap hari, cukup saat menghadapi keputusan.",
    ],
  },
  {
    no: 2,
    judul: "Tata Cara Sholat",
    isi: [
      "Tata cara sholat Istikhara:",
      "",
      "1. Wudhu & niat (dalam hati):",
      "   'Nawaitu an ushollia sunnatal istikhaari rak'ataini lillaahi ta'aalaa'",
      "   (Aku niat sholat sunnah istikhara 2 rakaat karena Allah)",
      "",
      "2. Rakaat pertama:",
      "   - Takbiratul ihram",
      "   - Baca Al-Fatihah",
      "   - Baca surah pendek (disunnahkan Al-Kafirun)",
      "   - Ruku, sujud, duduk seperti sholat biasa",
      "",
      "3. Rakaat kedua:",
      "   - Takbir untuk berdiri",
      "   - Baca Al-Fatihah",
      "   - Baca surah pendek (disunnahkan Al-Ikhlas)",
      "   - Ruku, sujud",
      "",
      "4. Setelah salam, baca doa Istikhara",
      "5. Baca doa dengan khusyuk, sebutkan hajat yang diminta",
      "6. Setelah itu, ikuti perasaan yang muncul (yang lebih dekat ke hati)",
      "",
      "Catatan:",
      "   - Waktu sholat: kapan saja kecuali waktu terlarang (terbit, tengah hari, terbenam)",
      "   - Disunnahkan di sepertiga malam terakhir",
      "   - Bisa diulang 7 kali jika belum yakin",
    ],
  },
  {
    no: 3,
    judul: "Doa Istikhara",
    arab: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ",
    latin: "Allaahumma innii astakhiruka bi'ilmika wa astaqdiruka biqudratik, wa as'aluka min fadhlikal 'azhiim, fa innaka taqdiru wa laa aqdir, wa ta'lamu wa laa a'lam, wa anta 'allaamul ghuyuub. Allaahumma in kunta ta'lamu annal amra haadzaa (sebutkan hajat) khairun lii fii diinii wa ma'aasyi wa 'aaqibati amri faqdurhu lii wa yassirhu lii tsumma baarik lii fiihi. Wa in kunta ta'lamu annal amra haadzaa (sebutkan hajat) syarrun lii fii diinii wa ma'aasyi wa 'aaqibati amri fasrifhu 'annii wasrifnii 'anhu, waqdur liyal khaira haitsu kaana tsumma radhinii bihi",
    arti: "Ya Allah, sesungguhnya aku memohon pilihan yang baik kepada-Mu dengan ilmu-Mu, dan aku mohon kekuasaan-Mu dengan qudrah-Mu, dan aku memohon karunia-Mu yang agung. Engkau Maha Kuasa, aku tidak kuasa. Engkau Maha Mengetahui, aku tidak mengetahui. Engkau Mengetahui segala yang gaib. Ya Allah, jika Engkau mengetahui bahwa urusan ini (sebut hajat) lebih baik bagiku dalam urusan agamaku, kehidupanku, dan akhir urusanku, maka tentukanlah untukku dan mudahkanlah, kemudian berilah berkah. Jika Engkau mengetahui bahwa urusan ini (sebut hajat) buruk bagiku dalam urusan agamaku, kehidupanku, dan akhir urusanku, maka jauhkanlah ia dariku dan jauhkanlah aku darinya, dan tentukanlah yang baik untukku di mana saja, lalu ridhailah aku dengannya",
    keterangan: "Setelah membaca 'annal amra haadzaa', sebutkan hajat/hal yang ingin diputuskan. Misal: 'pernikahan dengan si fulanah' atau 'menerima pekerjaan di tempat X'.",
  },
  {
    no: 4,
    judul: "Tanda Setelah Istikhara",
    isi: [
      "Bagaimana mengetahui hasil Istikhara?",
      "",
      "1. Hati lebih condong ke satu pilihan",
      "   Setelah sholat & doa, perhatikan perasaan hati.",
      "   Jika hati tenang & nyaman dengan pilihan A, itu petunjuk.",
      "   Jika hati gelisah dengan pilihan B, itu pertanda tidak baik.",
      "",
      "2. Urusan menjadi mudah",
      "   Jika pilihan yang diambil baik, Allah akan mudahkan urusannya.",
      "   Jika tidak baik, Allah akan menutup jalan tersebut.",
      "",
      "3. Bukan harus melalui mimpi",
      "   Istikhara BUKAN harus melalui mimpi.",
      "   Mimpi hanya salah satu cara, bukan syarat.",
      "   Yang utama adalah ketenangan hati & kemudahan urusan.",
      "",
      "4. Tidak ada tanda yang jelas?",
      "   Jika setelah 7 kali belum ada tanda,",
      "   pilihlah yang lebih dekat ke hati dan ikhlaskan hasilnya.",
      "",
      "Penting:",
      "   - Istikhara bukan jaminan 100% bebas masalah",
      "   - Ikhtiar + tawakal tetap diperlukan",
      "   - Allah pilihkan yang terbaik, bukan yang kita inginkan",
      "   - Jangan paksa Allah dengan keinginan sendiri",
    ],
  },
  {
    no: 5,
    judul: "Doa Tambahan Setelah Istikhara",
    arab: "رَبِّ إِنِّي أَعُوذُ بِكَ أَنْ أَظْلِمَ أَوْ أُظْلَمَ",
    latin: "Rabbi innii a'uudzu bika an azhlima au uzhlama, Allaahumma a'innii 'alaa dzikrika wa syukrika wa husni 'ibaadatik, Allaahummaftahlii abwaaba rahmatik, Allaahumma a'innii wa laa tu'in 'alayya, wansurnii wa laa tansur 'alayya, wamkur lii wa laa tamkur 'alayya",
    arti: "Ya Tuhanku, aku berlindung kepada-Mu dari menzalimi atau dizalimi. Ya Allah, bantulah aku untuk mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik. Ya Allah, bukakan pintu rahmat-Mu untukku. Ya Allah, bantulah aku jangan lawanku, menangkanlah aku jangan kalahkan aku, dan berilah strategi untukku jangan melawanku",
    keterangan: "Doa tambahan setelah doa Istikhara, untuk memohon perlindungan & pertolongan Allah dalam keputusan yang akan diambil.",
  },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > ISTIKHARA.length) {
      let lines = []
      lines.push("Panduan Sholat Istikhara")
      lines.push(ISTIKHARA.length + " Topik Lengkap")
      lines.push("")
      ISTIKHARA.forEach(i => {
        lines.push(i.no + ". " + i.judul)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "istikhara <nomor>")
      lines.push("Contoh: " + usedPrefix + "istikhara 3 (Doa Istikhara)")
      return m.reply(claraWrap("Sholat Istikhara", lines.join("\n")))
    }

    const item = ISTIKHARA[input - 1]

    if (item.isi) {
      return m.reply(claraWrap("Istikhara - " + item.judul, item.isi.join("\n")))
    }

    return m.reply(claraWrap("Istikhara - " + item.judul, [
      "Teks Arab:",
      item.arab,
      "",
      "Latin:",
      item.latin,
      "",
      "Arti:",
      item.arti,
      "",
      "Keterangan:",
      item.keterangan,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Istikhara", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
