// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "kepribadianwarna",
  alias: ["kepribadianwarna"],
  aliases: ["kepribadianwarna", "warnakepribadian", "warna", "psikologilwarna"],
  category: "primbon",
  description: "Kepribadian berdasarkan warna favorit (color psychology)",
  usage: ".kepribadianwarna | .kepribadianwarna <nama warna>",
  example: ".kepribadianwarna | .kepribadianwarna merah",
  isGroupOnly: false,
}

const WARNA = [
  { nama: "Merah", sifat: ["Berani", "Penuh gairah", "Dominan", "Pemimpin alami", "Energik", "Suka tantangan"], kelebihan: "Mampu memimpin & memotivasi orang lain. Tidak takut mengambil risiko. Energik & penuh antusiasme.", kekurangan: "Cepat marah, impulsif, terkadang agresif & mendominasi. Sulit mengontrol emosi saat tertekan.", karier: "CEO, atlet, militer, wiraswasta, sales", pasangan: "Biru (menyeimbangkan emosi), Kuning (mencerahkan)", tips: "Kurangi kafein, belajar meditasi, pikir 3x sebelum bertindak" },
  { nama: "Biru", sifat: ["Tenang", "Setia", "Pemikir", "Dapat diandalkan", "Perdamaian", "Harmonis"], kelebihan: "Pikiran jernih, mampu menenangkan situasi. Setia & dipercaya. Kreatif dalam problem solving.", kekurangan: "Sering menahan perasaan, terlalu perfeksionis, mudah cemas & ragu.", karier: "Dokter, psikolog, ilmuwan, programmer, desainer", pasangan: "Merah (memberi keberanian), Oranye (memberi kehangatan)", tips: "Ekspresikan perasaan, jangan pendam terlalu lama, luangkan waktu untuk refreshing" },
  { nama: "Kuning", sifat: ["Optimis", "Kreatif", "Cerian", "Sosial", "Intelektual", "Banyak ide"], kelebihan: "Mampu melihat sisi positif. Kreatif & inovatif. Senang berbagi ilmu & menularkan keceriaan.", kekurangan: "Cenderung kekanak-kanakan, tidak fokus, gampang bosan & terlalu kritis.", karier: "Seniman, guru, jurnalis, marketing, content creator", pasangan: "Ungu (mengkedewasaan), Hijau (menenangkan)", tips: "Fokus pada 1 tujuan, kurangi multitasking, latih konsistensi" },
  { nama: "Hijau", sifat: ["Pemaaf", "Penyayang", "Alami", "Tulus", "Penyembuh", "Praktis"], kelebihan: "Memiliki empati tinggi. Mampu menyembuhkan hati orang lain. Setia & tulus dalam hubungan.", kekurangan: "Terlalu idealis, mudah kecewa, sering menunda & terlalu permissive.", karier: "Perawat, dokter, konselor, environmentalist, guru", pasangan: "Kuning (menyemangati), Putih (menenangkan)", tips: "Kurangi ekspektasi, lebih realistis, belajar mengatakan 'tidak'" },
  { nama: "Ungu", sifat: ["Mistis", "Kreatif", "Penuh imajinasi", "Dewasa", "Sensitif", "Spiritual"], kelebihan: "Intuisi kuat, mampu memahami hal-hal gaib. Kreatif luar biasa & berwawasan luas.", kekurangan: "Sering merasa sendiri, terlalu sensitif, mudah tersinggung & gampang khayal.", karier: "Seniman, musisi, penulis, peramal, psikolog", pasangan: "Kuning (menyemangati), Emas (memberi kemewahan)", tips: "Gabungkan imajinasi dengan aksi nyata, jangan terlalu banyak menyendiri" },
  { nama: "Oranye", sifat: ["Hangat", "Energik", "Sosial", "Penuh gairah", "Suportif", "Petualang"], kelebihan: "Mampu menularkan kehangatan & semangat. Senang membantu & sosial. Tipe petualang sejati.", kekurangan: "Sering show off, terlalu dramatis, gampang terbawa suasana & kurang fokus.", karier: "Tour guide, event organizer, sales, entertainer, chef", pasangan: "Biru (menyeimbangkan), Hijau (menenangkan)", tips: "Kurangi drama, lebih fokus, belajar mendengarkan" },
  { nama: "Hitam", sifat: ["Misterius", "Elegan", "Berwibawa", "Mandiri", "Disiplin", "Protektif"], kelebihan: "Kuat & elegan. Mampu menjaga rahasia. Disiplin & bertanggung jawab. Memberi kesan wibawa.", kekurangan: "Cenderung tertutup, gampang curiga, sering melihat sisi gelap & terlalu serius.", karier: "Pengusaha, hakim, desainer, arsitek, militer", pasangan: "Putih (menyeimbangkan), Emas (menambah kemewahan)", tips: "Buka diri lebih, kurangi sikap curiga, latih kepercayaan" },
  { nama: "Putih", sifat: ["Murni", "Jujur", "Tenang", "Tulus", "Rapi", "Sempurna"], kelebihan: "Jujur & tulus, senang ketertiban & kebersihan. Mampu melihat dengan jernih & netral.", kekurangan: "Terlalu perfeksionis, gampang kecewa, sering merasa lebih suci & terlalu kritis.", karier: "Dokter, ilmuwan, auditor, editor, perancang", pasangan: "Hitam (memberi kontras), Merah (memberi semangat)", tips: "Kurangi perfeksionisme, terima ketidaksempurnaan, lebih fleksibel" },
  { nama: "Emas", sifat: ["Mewah", "Ambisius", "Pemimpin", "Karismatik", "Percaya diri", "Berwibawa"], kelebihan: "Karismatik & memikat. Mampu mewujudkan impian. Mencintai kemewahan & kualitas tinggi.", kekurangan: "Sering sombong, terlalu materialis, gampang terbuai pujian & mengutamakan kemewahan.", karier: "CEO, investor, art collector, desainer fashion, diplomat", pasangan: "Ungu (memberi kedalaman), Hitam (memberi wibawa)", tips: "Kurangi sisi materialis, hargai kesederhanaan, belajar kerendahan hatian" },
  { nama: "Pink", sifat: ["Penuh kasih", "Lembut", "Penuh perhatian", "Romantis", "Naif", "Manis"], kelebihan: "Sangat perhatian & penuh kasih. Mampu menenangkan orang lain. Romantis & setia.", kekurangan: "Terlalu naif, mudah dimanfaatkan, seringkali gampang menangis & gampang khawatir.", karier: "Perawat, guru anak, konselor, perancang, florist", pasangan: "Biru (memberi ketenangan), Hijau (memberi keseimbangan)", tips: "Lebih tegas, belajar melindungi diri, kurangi kecemasan" },
  { nama: "Coklat", sifat: ["Andal", "Stabil", "Pekerja keras", "Penuh tanggung jawab", "Jujur", "Praktis"], kelebihan: "Stabil & dapat diandalkan. Pekerja keras & teliti. Mampu mengelola sumber daya dengan baik.", kekurangan: "Kaku, gampang stres, terlalu konvensional & gampang rewel saat hal tak sesuai rencana.", karier: "Akuntan, manajer, tukang, insinyur, petani", pasangan: "Hijau (memberi keseimbangan), Oranye (memberi semangat)", tips: "Lebih fleksibel, kurangi kaku, belajar menerima perubahan" },
  { nama: "Abu-abu", sifat: ["Netral", "Seimbang", "Kompromi", "Dewasa", "Rendah hati", "Praktis"], kelebihan: "Mampu menengahi konflik. Dewasa & rendah hati. Berpikir jernih & objektif.", kekurangan: "Tidak ekspresif, gampang terlupakan, sering tidak ambil sikap & gampang ragu.", karier: "Mediator, konsultan, analis, diplomat, hakim", pasangan: "Merah (memberi semangat), Kuning (memberi keceriaan)", tips: "Ambil sikap lebih tegas, ekspresikan pendapat, jangan terlalu netral" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      let lines = []
      lines.push("Kepribadian Berdasarkan Warna Favorit")
      lines.push(WARNA.length + " Warna Tersedia")
      lines.push("")
      WARNA.forEach((w, i) => {
        lines.push((i + 1) + ". " + w.nama)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "kepribadianwarna <warna>")
      lines.push("Contoh: " + usedPrefix + "kepribadianwarna biru")
      return m.reply(raraWrap("Kepribadian Warna", lines.join("\n")))
    }

    const warna = WARNA.find(w => w.nama.toLowerCase().includes(input))

    if (!warna) {
      return m.reply(raraWrap("Kepribadian Warna", "Warna tidak ditemukan: " + input + "\nKetik " + usedPrefix + "kepribadianwarna untuk lihat list.")
      )
    }

    return m.reply(raraWrap("Kepribadian Warna " + warna.nama, [
      "Sifat Utama:",
      warna.sifat.join(", "),
      "",
      "Kelebihan:",
      warna.kelebihan,
      "",
      "Kekurangan:",
      warna.kekurangan,
      "",
      "Karier Cocok: " + warna.karier,
      "Pasangan Cocok: " + warna.pasangan,
      "",
      "Tips Pengembangan Diri:",
      warna.tips,
    ].join("\n")))
  } catch (e) {
    return m.reply(raraWrap("Kepribadian Warna", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
