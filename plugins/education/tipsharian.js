// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "tipsharian",
  alias: ["tipsharian"],
  category: 'education',
  description: 'Tips harian berguna untuk kehidupan sehari-hari',
  usage: '.tipsharian | .tipsharian <kategori>',
  example: '.tipsharian | .tipsharian kesehatan',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

const TIPS = {
  kesehatan: [
    "Minum air putih 8 gelas per hari. Dehidrasi ringan bisa turunkan konsentrasi 20%.",
    "Tidur 7-8 jam per malam. Kurang tidur melemahkan sistem imun & meningkatkan stres.",
    "Berjalan kaki 30 menit per hari bisa menurunkan risiko penyakit jantung hingga 35%.",
    "Makan buah dan sayur minimal 5 porsi per hari. Pelangi di piring adalah kunci nutrisi.",
    "Kurangi gula. Gula berlebih bikin cepat lapar dan lelah. Coba ganti dengan madu.",
    "Cuci tangan 20 detik dengan sabun. Cara paling murah cegah penyakit menular.",
    "Jangan lewatkan sarapan. Sarapan memulai metabolisme & menjaga mood sepanjang hari.",
    "Stretching 5 menit setiap bangun pagi. Bantu sirkulasi darah & kurangi pegal.",
    "Kurangi duduk terlalu lama. Setiap 1 jam, berdiri dan gerak 2-3 menit.",
    "Periksakan mata & gigi minimal 1x setahun. Pencegahan lebih murah dari pengobatan.",
  ],
  produktivitas: [
    "Tulis 3 tugas utama di pagi hari. Fokus pada 3 itu sebelum hal lain.",
    "Gunakan teknik Pomodoro: 25 menit fokus, 5 menit istirahat. Ulangi 4x.",
    "Matikan notifikasi HP saat bekerja. Tiap gangguan butuh 23 menit untuk kembali fokus.",
    "Sediakan 10 menit di malam hari untuk merencanakan besok. Lebih efisien dari pagi-pagi.",
    "Pisahkan tempat kerja dan tempat tidur. Otak perlu tahu kapan kerja, kapan istirahat.",
    "Kerjakan tugas tersulit pertama saat energi puncak (biasanya pagi).",
    "Batch tugas serupa: semua email sekaligus, semua telepon sekaligus. Hemat otak.",
    "Gunakan aturan 2 menit: kalau bisa selesai dalam 2 menit, kerjakan sekarang.",
    "Jangan multitasking. Fokus 1 tugas hingga selesai. Hasilnya lebih cepat & berkualitas.",
    "Review mingguan: apa yang berhasil, apa yang tidak. Improve setiap minggu.",
  ],
  keuangan: [
    "Sisihkan 20% pertama dari gaji untuk tabungan. Jangan tunggu sisa, karena tidak akan sisa.",
    "Catat semua pengeluaran 1 bulan. Kamu akan kaget melihat ke mana uangmu pergi.",
    "Beli kebutuhan, bukan keinginan. Tunda beli 'keinginan' 7 hari, biasanya hilang niatnya.",
    "Buat dana darurat = 6x pengeluaran bulanan. Ini bantal saat kejadian tak terduga.",
    "Bayar utang dengan bunga tertinggi lebih dulu. Utang adalah musuh terbesar keuangan.",
    "Investasi sebelum 30 tahun. Waktu adalah aset terbesar dalam investasi.",
    "Jangan pakai kartu kredit untuk belanja yang tidak bisa dilunasi bulan itu.",
    "Bandingkan harga sebelum beli. 5 menit riset bisa hemat ratusan ribu.",
    "Masak di rumah 5x seminggu. Bisa hemat 60% dari budget makan.",
    "Pelajari 1 hal baru tentang keuangan setiap minggu. Financial literacy adalah kunci.",
  ],
  teknologi: [
    "Backup data setiap minggu. Hardisk bisa rusak, cloud bisa aman, tapi keduanya bisa hilang.",
    "Gunakan password manager. Satu password kuat untuk semuanya, sisanya di manager.",
    "Aktifkan 2FA di semua akun penting. Password bisa bocor, 2FA adalah benteng kedua.",
    "Update aplikasi & OS secara rutin. Update bukan cuma fitur baru, tapi patch keamanan.",
    "Jangan pakai Wi-Fi publik tanpa VPN. Datamu bisa diintai orang di jaringan yang sama.",
    "Bersihkan cache ponsel tiap bulan. Bisa hemat ratusan MB dan percepat performa.",
    "Matikan location service untuk aplikasi yang tidak butuh. Hemat baterai & privasi.",
    "Cek permission aplikasi. Banyak aplikasi minta akses yang tidak seharusnya.",
    "Scan USB/flash disk sebelum dibuka. Virus paling sering menyebar lewat USB.",
    "Jangan klik link mencurigakan. Phishing adalah cara paling umum hack akun.",
  ],
  sosial: [
    "Dengarkan lebih banyak dari yang kamu bicarakan. Orang suka didengarkan, bukan dinasehati.",
    "Ingat nama orang. Nama adalah suara terindah bagi seseorang.",
    "Tersenyum saat berbicara di telepon. Nada suara berubah, terdengar lebih hangat.",
    "Jangan menilai. Semua orang punya cerita yang tidak kamu tahu.",
    "Berikan pujian yang tulus, bukan basa-basi. Orang tahu bedanya.",
    "Minta maaf duluan, walaupun tidak salah. Ego tidak pernah menang.",
    "Jangan pernah membicarakan seseorang di belakangnya. Itu tidak pernah berakhir baik.",
    "Jaga kontak dengan teman lama. Hubungan lama lebih berharga dari yang kamu kira.",
    "Bantu orang tanpa mengharap balasan. Karma itu nyata.",
    "Jadilah pendengar yang baik. Tidak semua orang butuh solusi, kadang cuma butuh didengarkan.",
  ],
}

const KATEGORI_LIST = Object.keys(TIPS)

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      const randomKat = KATEGORI_LIST[Math.floor(Math.random() * KATEGORI_LIST.length)]
      const tip = TIPS[randomKat][Math.floor(Math.random() * TIPS[randomKat].length)]
      let lines = []
      lines.push("Tips Harian Random")
      lines.push("Kategori: " + randomKat)
      lines.push("")
      lines.push(tip)
      lines.push("")
      lines.push("Kategori: " + KATEGORI_LIST.join(", "))
      return m.reply(raraWrap("Tips Harian", lines.join("\n")))
    }

    const kat = KATEGORI_LIST.find(k => k.includes(input) || k === input)
    if (!kat) {
      return m.reply(raraWrap("Tips Harian", "Kategori tidak ditemukan: " + input + "\nTersedia: " + KATEGORI_LIST.join(", ")))
    }

    const tip = TIPS[kat][Math.floor(Math.random() * TIPS[kat].length)]
    return m.reply(raraWrap("Tips: " + kat, tip))
  } catch (e) {
    return m.reply(raraWrap("Tips Harian", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
