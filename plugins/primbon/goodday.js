// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "haribaik",
  alias: ["haribaik"],
  aliases: ["haribaik", "harinaas", "harilarangan", "harilanggan", "haripentingjawa"],
  category: "primbon",
  description: "Cek hari baik, hari naas, & hari larangan dalam kalender Jawa",
  usage: ".haribaik | .haribaik <jenis>",
  example: ".haribaik | .haribaik naas",
  isGroupOnly: false,
}

const HARI_NAAS = [
  { hari: "Senin", pasaran: "Kliwon", neptu: 18, bahaya: "Hari paling naas dalam primbon Jawa. Hindari acara besar, perjalanan jauh, & transaksi penting. Rawan kecelakaan & konflik.", larangan: "Jangan mulai usaha baru, jangan pindah rumah, jangan perjalan jauh" },
  { hari: "Rabu", pasaran: "Pon", neptu: 17, bahaya: "Hari naas kedua. Hindari kegiatan yang berisiko tinggi. Banyak gangguan emosional & miskomunikasi.", larangan: "Jangan konflik dengan atasan, jangan tanda tangani kontrak" },
  { hari: "Jumat", pasaran: "Wage", neptu: 14, bahaya: "Hari naas ketiga. Kurang baik untuk urusan finansial & hubungan asmara.", larangan: "Jangan utang-piutang, jangan tunangan/lamaran" },
  { hari: "Minggu", pasaran: "Pahing", neptu: 13, bahaya: "Hari naas keempat. Hindari perjalanan jauh & pertemuan penting.", larangan: "Jangan musyawarah besar, jangan perjalan dinas" },
  { hari: "Sabtu", pasaran: "Kliwon", neptu: 17, bahaya: "Hari naas kelima. Cenderung sulit fokus & gampang lelah.", larangan: "Jangan ambil keputusan besar, jangan kerja berat" },
]

const HARI_BAIK = [
  { hari: "Kamis", pasaran: "Wage", kebaikan: "Sangat baik untuk memulai usaha, mencari rezeki, & investasi. Rejeki lancar di hari ini." },
  { hari: "Selasa", pasaran: "Legi", kebaikan: "Baik untuk acara keluarga, silaturahmi, & reuni. Hubungan makin erat." },
  { hari: "Minggu", pasaran: "Legi", kebaikan: "Baik untuk ibadah, refleksi, & menenangkan diri. Dapat inspirasi & keberkahan." },
  { hari: "Rabu", pasaran: "Legi", kebaikan: "Baik untuk belajar, ujian, & mendaftar sekolah/kulitas. Ilmu mudah diserap." },
  { hari: "Jumat", pasaran: "Legi", kebaikan: "Baik untuk ibadah & doa. Doa mustajab, hati tenang." },
  { hari: "Senin", pasaran: "Legi", kebaikan: "Baik untuk mulai pekerjaan baru & proyek kreatif. Energi positif & optimis." },
  { hari: "Kamis", pasaran: "Legi", kebaikan: "Baik untuk menjalin hubungan, jodoh, & pernikahan. Kasih sayang mengalir." },
  { hari: "Sabtu", pasaran: "Legi", kebaikan: "Baik untuk istirahat & rekreasi. Tubuh & pikiran segar kembali." },
]

const HARI_LARANGAN = [
  { perayaan: "Satu Suro", tanggal: "1 Muharram (Tahun Baru Hijriyah)", larangan: "Jangan mengadakan pesta, kembang api, atau sorak-sorai. Lakukan refleksi & tirakat.", keterangan: "Hari sakral dalam kalender Jawa-Islam. Tradisi tirakat & kemandungan di malam 1 Suro." },
  { perayaan: "Selasa Kliwon", tanggal: "Selasa Kliwon (setiap bulan)", larangan: "Hindari membawa keluar rumah barang berharga, jangan perjalan jauh malam.", keterangan: "Hari naas tertinggi dalam primbon Jawa, dianggap paling rawan gangguan." },
  { perayaan: "Rebo Wekasan", tanggal: "Rabu terakhir bulan Safar", larangan: "Jangan mandi di sungai/laut, jangan keluar rumah sore-malam.", keterangan: "Hari turunnya bala 303 jenis. Disunnahkan mandi khusus & membaca doa Rebo Wekasan." },
  { perayaan: "Jumat Wage", tanggal: "Jumat Wage (setiap bulan)", larangan: "Hindari urusan finansial, jangan utang-piutang, jangan beli barang mahal.", keterangan: "Hari kurang baik untuk harta & asmara. Lebih baik diam & hati-hati." },
  { perayaan: "Minggu Pahing", tanggal: "Minggu Pahing (setiap bulan)", larangan: "Hindari musyawarah besar & pertemuan penting. Jangan tanda tangani dokumen.", keterangan: "Hari naas, mudah muncul konflik & salah paham dalam pertemuan." },
  { perayaan: "Tumpek", tanggal: "Setiap hari Sabtu Wage (6x setahun)", larangan: "Jangan menebang pohon besar, jangan menyakiti hewan.", keterangan: "Hari suci untuk alam. Tumpek pengingatkan manusia untuk menjaga lingkungan." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      return m.reply(raraWrap("Hari Baik & Larangan Jawa", [
        "Pilih jenis:",
        "",
        "1. baik - Hari-hari baik untuk kegiatan",
        "2. naas - Hari-hari naas (harus dihindari)",
        "3. larangan - Hari larangan khusus",
        "",
        "Cara: " + usedPrefix + "haribaik <jenis>",
        "Contoh: " + usedPrefix + "haribaik naas",
      ].join("\n")))
    }

    if (input === "baik" || input === "1") {
      let lines = []
      lines.push("Hari-Hari Baik dalam Primbon Jawa")
      lines.push("")
      HARI_BAIK.forEach((h, i) => {
        lines.push((i + 1) + ". " + h.hari + " " + h.pasaran)
        lines.push("   " + h.kebaikan)
      })
      lines.push("")
      lines.push("Manfaatkan hari-hari ini untuk kegiatan penting!")
      return m.reply(raraWrap("Hari Baik", lines.join("\n")))
    }

    if (input === "naas" || input === "2") {
      let lines = []
      lines.push("Hari-Hari Naas dalam Primbon Jawa")
      lines.push("")
      HARI_NAAS.forEach((h, i) => {
        lines.push((i + 1) + ". " + h.hari + " " + h.pasaran + " (Neptu: " + h.neptu + ")")
        lines.push("   Bahaya: " + h.bahaya)
        lines.push("   Larangan: " + h.larangan)
      })
      lines.push("")
      lines.push("Hindari kegiatan penting di hari-hari ini!")
      return m.reply(raraWrap("Hari Naas", lines.join("\n")))
    }

    if (input === "larangan" || input === "3") {
      let lines = []
      lines.push("Hari Larangan Khusus dalam Primbon Jawa")
      lines.push("")
      HARI_LARANGAN.forEach((h, i) => {
        lines.push((i + 1) + ". " + h.perayaan + " (" + h.tanggal + ")")
        lines.push("   Larangan: " + h.larangan)
        lines.push("   Keterangan: " + h.keterangan)
      })
      return m.reply(raraWrap("Hari Larangan", lines.join("\n")))
    }

    return m.reply(raraError("HariBaik", "Jenis gak valid nih! Gunakan: baik, naas, atau larangan"))
  } catch (e) {
    return m.reply(raraWrap("Hari Baik", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
