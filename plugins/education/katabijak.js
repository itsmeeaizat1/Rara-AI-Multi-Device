// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "katabijak",
  alias: ["katabijak", "katabijakharini", "quotesmotivasi", "quotesharian", "motivasiharian", "kisahmotivasi"],
  category: 'education',
  description: 'Kata bijak & motivasi harian dari tokoh dunia',
  usage: '.katabijak | .katabijak <kategori>',
  example: '.katabijak | .katabijak sukses',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

const BIJAK = {
  sukses: [
    { kata: "Sukses bukan tentang seberapa cepat kamu sampai, tapi seberapa banyak kamu bangkit setelah jatuh.", tokoh: "Anonymous" },
    { kata: "Kesuksesan bukan tentang menjadi yang terbaik, tapi tentang menjadi versi terbaik dari dirimu.", tokoh: "Unknown" },
    { kata: "Jangan takut gagal. Takutilah tidak pernah mencoba.", tokoh: "Roy T. Bennett" },
    { kata: "Sukses adalah pergi dari satu kegagalan ke kegagalan lain tanpa kehilangan semangat.", tokoh: "Winston Churchill" },
    { kata: "Cara terbaik untuk memprediksi masa depan adalah dengan menciptakannya.", tokoh: "Peter Drucker" },
    { kata: "Sukses bukan tentang siapa yang lebih cepat, tapi siapa yang tidak pernah menyerah.", tokoh: "Ida F. Utama" },
    { kata: "Kesuksesan datang pada mereka yang berani memulai, bukan menunggu kesempatan datang.", tokoh: "Unknown" },
    { kata: "Disiplin adalah jembatan antara tujuan dan pencapaian. Tanpa disiplin, mimpi hanya angan-angan.", tokoh: "Jim Rohn" },
  ],
  cinta: [
    { kata: "Cinta bukan tentang menemukan orang yang sempurna, tapi melihat orang yang tidak sempurna dengan cara yang sempurna.", tokoh: "Sam Keen" },
    { kata: "Jangan cintai seseorang karena kelebihannya, tapi cintai karena kamu menerima kekurangannya.", tokoh: "Unknown" },
    { kata: "Cinta sejati tidak pernah mati. Mungkin bentuknya berubah, tapi perasaannya tidak pernah hilang.", tokoh: "Anonymous" },
    { kata: "Pencarian cinta adalah proses untuk mencari diri sendiri. Ketika kamu mencintai, kamu jadi lebih tahu siapa dirimu.", tokoh: "Unknown" },
    { kata: "Cinta bukan tentang memiliki, tapi tentang memberi tanpa mengharap balasan.", tokoh: "Unknown" },
    { kata: "Jangan pernah menyerah pada cinta hanya karena satu orang menyakitimu. Masih banyak yang layak mendapatkannya.", tokoh: "Anonymous" },
    { kata: "Cinta yang tulus tidak butuh kata-kata. Tindakan lebih berbicara dari janji.", tokoh: "Unknown" },
    { kata: "Cinta terbesar bukan yang sempurna, tapi yang bertahan melalui ketidaksempurnaan.", tokoh: "Anonymous" },
  ],
  kehidupan: [
    { kata: "Hidup bukan tentang menunggu badai berlalu, tapi belajar menari dalam hujan.", tokoh: "Vivian Greene" },
    { kata: "Hidup itu seperti mengendarai sepeda. Untuk menjaga keseimbangan, kamu harus terus bergerak.", tokoh: "Albert Einstein" },
    { kata: "Jangan menyesali masa lalu, jangan khawatir masa depan. Fokus pada hari ini, karena hari ini adalah anugerah.", tokoh: "Eleanor Roosevelt" },
    { kata: "Hidup terlalu singkat untuk dihabiskan dengan memikirkan apa yang orang lain pikirkan tentangmu.", tokoh: "Anonymous" },
    { kata: "Yang membuat hidup berarti bukan berapa lama kamu hidup, tapi bagaimana kamu menjalani.", tokoh: "Seneca" },
    { kata: "Hidup itu pilihan. Pilih untuk bahagia, pilih untuk berani, pilih untuk tumbuh.", tokoh: "Unknown" },
    { kata: "Hidup bukan soal menjadi yang terbaik, tapi menjadi lebih baik dari kemarin.", tokoh: "Anonymous" },
    { kata: "Setiap hari adalah kesempatan baru. Jangan sia-siakan dengan menyesal kemarin.", tokoh: "Unknown" },
  ],
  pendidikan: [
    { kata: "Pendidikan adalah senjata paling ampuh untuk mengubah dunia.", tokoh: "Nelson Mandela" },
    { kata: "Belajar tidak pernah berhenti. Semakin banyak kamu tahu, semakin banyak kamu sadar bahwa kamu tidak tahu.", tokoh: "Albert Einstein" },
    { kata: "Ilmu tanpa amal seperti pohon tanpa buah. Tidak bermanfaat untuk siapapun.", tokoh: "Imam Al-Ghazali" },
    { kata: "Membaca adalah jendela dunia. Semakin banyak kamu membaca, semakin luas pandanganmu.", tokoh: "Unknown" },
    { kata: "Pendidikan bukan sekadar nilai, tapi karakter yang dibentuk dari proses belajar.", tokoh: "John Dewey" },
    { kata: "Belajar dari kemarin, hidup untuk hari ini, harap untuk esok. Yang penting jangan berhenti bertanya.", tokoh: "Albert Einstein" },
    { kata: "Orang yang berhenti belajar adalah orang yang berhenti tumbuh. Jangan pernah berhenti belajar.", tokoh: "Unknown" },
    { kata: "Pendidikan mahal? Coba bandingkan dengan harga ketidaktahuan.", tokoh: "Derek Bok" },
  ],
  keberanian: [
    { kata: "Keberanian bukan ketiadaan rasa takut, tapi kemampuan untuk bertindak meski takut.", tokoh: "Nelson Mandela" },
    { kata: "Berani memulai lebih baik daripada menunggu sempurna. Kesempurnaan lahir dari proses.", tokoh: "Unknown" },
    { kata: "Orang berani bukan yang tidak kenal takut, tapi yang takut dan tetap maju.", tokoh: "John Wayne" },
    { kata: "Keberanian adalah melawan ketakutan, bukan mengabaikannya.", tokoh: "Mark Twain" },
    { kata: "Jangan pernah takut untuk bangkit. Jatuh adalah bagian dari proses, bangkit kembali adalah kekuatan.", tokoh: "Unknown" },
    { kata: "Berani mencoba, berani gagal, berani bangkit. Itulah kunci pertumbuhan.", tokoh: "Anonymous" },
    { kata: "Keberanian bukan tentang tidak pernah jatuh, tapi tentang selalu bangkit setiap kali jatuh.", tokoh: "Confucius" },
    { kata: "Hidup dimulai di luar zona nyaman. Beranikan diri keluar dari cangkangmu.", tokoh: "Neale Donald Walsch" },
  ],
}

const KATEGORI_LIST = Object.keys(BIJAK)

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      const randomKat = KATEGORI_LIST[Math.floor(Math.random() * KATEGORI_LIST.length)]
      const q = BIJAK[randomKat][Math.floor(Math.random() * BIJAK[randomKat].length)]
      let lines = []
      lines.push("Kata Bijak Random")
      lines.push("Kategori: " + randomKat)
      lines.push("")
      lines.push('"' + q.kata + '"')
      lines.push("- " + q.tokoh)
      lines.push("")
      lines.push("Kategori: " + KATEGORI_LIST.join(", "))
      return m.reply(claraWrap("Kata Bijak", lines.join("\n")))
    }

    const kat = KATEGORI_LIST.find(k => k.includes(input) || k === input)
    if (!kat) {
      return m.reply(claraWrap("Kata Bijak", "Kategori tidak ditemukan: " + input + "\nTersedia: " + KATEGORI_LIST.join(", ")))
    }

    const q = BIJAK[kat][Math.floor(Math.random() * BIJAK[kat].length)]
    let lines = []
    lines.push("Kata Bijak - " + kat)
    lines.push("")
    lines.push('"' + q.kata + '"')
    lines.push("- " + q.tokoh)

    return m.reply(claraWrap("Kata Bijak: " + kat, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Kata Bijak", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
