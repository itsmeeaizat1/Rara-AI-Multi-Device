// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "cintatips",
  alias: ["cintatips"],
  category: 'fun',
  description: 'Tips & saran cinta untuk setiap situasi - jadian, PDKT, masalah, dll',
  usage: '.cintatips | .cintatips <kategori>',
  example: '.cintatips | .cintatips jadian',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

const KATEGORI = [
  {
    nama: "jadian",
    judul: "Tips Bikin Dia Mau Jadian",
    tips: [
      "1. Jangan terburu-buru. Biarkan perasaan tumbuh natural.",
      "2. Tunjukkan kamu konsisten, bukan hanya saat PDKT.",
      "3. Perhatikan hal kecil yang dia ceritakan, ingat detail.",
      "4. Jadilah pendengar yang baik, bukan hanya pembicara.",
      "5. Beri ruang. Jangan terlalu agresif, biarkan dia juga rindu.",
      "6. Saat momen tepat, ungkapkan dengan jujur & tanpa tekanan.",
      "7. Tidak perlu janji muluk, cukup tunjukkan lewat tindakan.",
    ]
  },
  {
    nama: "pdkt",
    judul: "Tips PDKT yang Efektif",
    tips: [
      "1. Chat santai, jangan terlalu sering tapi konsisten.",
      "2. Cari tahu hobi & minatnya, bicara tentang hal yang dia suka.",
      "3. Beri compliment yang tulus, bukan puitis tapi palsu.",
      "4. Ajak ketemuan di tempat yang nyaman buat dia.",
      "5. Jangan paksa balas cepat. Dia punya kehidupan juga.",
      "6. Tunjukkan kamu peduli lewat hal kecil: ingat ulang tahun, tanya kabar.",
      "7. Baca tanda. Kalau dia nanggapi hangat, lanjut. Kalau dingin, mundur.",
    ]
  },
  {
    nama: "masalah",
    judul: "Tips Mengatasi Masalah Hubungan",
    tips: [
      "1. Jangan tidur dengan masalah yang belum selesai.",
      "2. Bicara tentang masalah, bukan menyerang pasangan.",
      "3. Dengarkan dulu sebelum membela diri.",
      "4. Akui salah jika salah. Ego bukan pahlawan.",
      "5. Fokus pada solusi, bukan menyalahkan.",
      "6. Kalau emosi naik, minta timeout 10 menit, bukan diam 3 hari.",
      "7. Setelah selesai, peluk & maaf. Jangan bawa ke esok hari.",
    ]
  },
  {
    nama: "lamaran",
    judul: "Tips Lamaran & Proposal",
    tips: [
      "1. Pastikan kalian sudah siap, bukan cuma terbawa perasaan.",
      "2. Pikirkan finansial, tempat tinggal, & masa depan.",
      "3. Kenali keluarganya dulu, bukan hanya dia.",
      "4. Pilih momen yang berarti buat kalian berdua.",
      "5. Tidak perlu mewah, cukup tulus & personal.",
      "6. Siapkan kata-kata, tapi jangan terlalu kaku. Yang natural lebih baik.",
      "7. Ingat: lamaran bukan akhir PDKT, tapi awal perjalanan baru.",
    ]
  },
  {
    nama: "rindu",
    judul: "Tips Mengatasi Rindu Jarak Jauh",
    tips: [
      "1. Video call rutin, minimal seminggu sekali.",
      "2. Kirim kejutan kecil: makanan, surat, atau foto kenangan.",
      "3. Jangan over-clingy. Biarkan dia juga punya waktu sendiri.",
      "4. Buat janji kapan ketemu lagi, agar ada yang dinanti.",
      "5. Bagikan keseharian, foto makanan, pemandangan, atau hal lucu.",
      "6. Trust is everything. Jangan gampang cemburu tanpa alasan.",
      "7. Rindu itu tanda cinta masih ada. Syukuri, jangan dibebani.",
    ]
  },
  {
    nama: "moveon",
    judul: "Tips Move On dari Masa Lalu",
    tips: [
      "1. Akui bahwa itu menyakitkan. Jangan dipendam.",
      "2. Hapus atau jauhkan pemicu: foto, chat, hadiah lama.",
      "3. Jangan stalking media sosialnya. Itu hanya memperlambat.",
      "4. Fokus pada diri sendiri: hobi, karier, kesehatan.",
      "5. Keluar, bertemu teman, jangan mengurung diri.",
      "6. Jangan pakai orang baru untuk lupakan orang lama. Itu tidak adil.",
      "7. Waktu penyembuh terbaik. Tapi kamu juga harus mau disembuhkan.",
    ]
  },
  {
    nama: "firtsdate",
    judul: "Tips Kencan Pertama",
    tips: [
      "1. Pilih tempat yang nyaman, tidak terlalu formal.",
      "2. Datang tepat waktu. Ingat: pertama itu penting.",
      "3. Jangan pakai pakaian yang tidak kamu. Jadi diri sendiri.",
      "4. Siapkan topik obrolan, tapi jangan seperti wawancara.",
      "5. Matikan atau silent HP. Kasih perhatian penuh.",
      "6. Jangan terlalu banyak bicara tentang mantan.",
      "7. Bawa uang cukup. Siap bayar, tapi lihat responsnya juga.",
    ]
  },
  {
    nama: "anniversary",
    judul: "Tips Anniversary Spesial",
    tips: [
      "1. Jangan lupa tanggal anniversary. Catat di kalender!",
      "2. Tidak perlu mewah, tapi harus bermakna.",
      "3. Tulis surat tangan. Ini lebih berharga dari hadiah mahal.",
      "4. Foto bareng di tempat pertama kalian jadian.",
      "5. Buat tradisi baru: makan di tempat yang sama setiap tahun.",
      "6. Tonton lagi film pertama yang kalian tonton bareng.",
      "7. Ucapkan terima kasih untuk setiap tahun yang dilewati.",
    ]
  },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      let lines = []
      lines.push("Tips & Saran Cinta")
      lines.push(KATEGORI.length + " Kategori")
      lines.push("")
      KATEGORI.forEach((k, i) => {
        lines.push((i + 1) + ". " + k.nama + " - " + k.judul)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "cintatips <kategori>")
      lines.push("Contoh: " + usedPrefix + "cintatips jadian")
      return m.reply(claraWrap("Tips Cinta", lines.join("\n")))
    }

    const kat = KATEGORI.find(k => k.nama.includes(input) || k.nama === input)

    if (!kat) {
      return m.reply(claraWrap("Tips Cinta", "Kategori tidak ditemukan: " + input + "\nKetik " + usedPrefix + "cintatips untuk lihat list.")
      )
    }

    let lines = []
    lines.push(kat.judul)
    lines.push("")
    kat.tips.forEach(t => {
      lines.push(t)
    })

    return m.reply(claraWrap("Tips Cinta - " + kat.nama, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Tips Cinta", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
