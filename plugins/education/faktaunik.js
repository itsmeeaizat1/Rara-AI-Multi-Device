// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "faktaunik",
  alias: ["faktaunik"],
  category: 'education',
  description: 'Fakta unik & menarik dari berbagai bidang',
  usage: '.faktaunik | .faktaunik <kategori>',
  example: '.faktaunik | .faktaunik sains',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

const FAKTA = {
  sains: [
    "Cahaya dari matahari butuh 8 menit 20 detik untuk sampai ke Bumi. Jadi yang kamu lihat sekarang adalah matahari 8 menit yang lalu.",
    "Jika kamu bisa mengendarai mobil secepat kecepatan cahaya, kamu bisa mengelilingi Bumi 7.5 kali dalam 1 detik.",
    "Garam yang kamu makan sehari-hari sebagian besar berasal dari batu yang larut jutaan tahun yang lalu.",
    "Kaca sebenarnya bukan benda padat, melainkan cairan yang sangat kental. Kaca lama-lama mengalir ke bawah, tapi sangat lambat.",
    "Suara tidak bisa merambat di ruang hampa. Jadi di luar angkasa, meski ada ledakan, kamu tidak akan mendengar apapun.",
    "Otak manusia menghasilkan sekitar 20 watt listrik, cukup untuk menyalakan lampu kecil.",
    "Tubuh manusia punya lebih banyak sel bakteri daripada sel manusia. Rasio sekitar 1.3:1.",
    "Air yang kamu minum hari ini mungkin pernah dialir lewat dinosaurus jutaan tahun lalu. Siklus air tidak pernah berhenti.",
    "Intan dan grafit pensil terbuat dari bahan yang sama: karbon. Bedanya hanya susunan atom.",
    "Tanaman pohon lebih dari 80% isinya adalah udara, bukan kayu padat.",
  ],
  hewan: [
    "Gurita punya 3 jantung dan 9 otak. 1 otak utama dan 8 otak kecil di setiap tentakelnya.",
    "Lumba-lumba tidur dengan setengah otak saja. Satu sisi tidur, sisi lain tetap aktif untuk bernapas.",
    "Kuda laut adalah salah satu hewan dimana jantannya yang mengandung & melahirkan anak.",
    "Burung unta bisa berlari lebih cepat dari kuda. Kecepatan mereka bisa mencapai 70 km/jam.",
    "Lebah madu bisa mengenali wajah manusia. Mereka belajar dari pengalaman visual.",
    "Ikan paus biru jantungnya sebesar mobil, dan suara detik jantungnya bisa didengar dari 3 km jauhnya.",
    "Semut tidak pernah tidur. Mereka hanya beristirahat sebentar, sekitar 1 menit per jam.",
    "Kucing mengeong hanya untuk berkomunikasi dengan manusia. Dengan kucing lain, mereka pakai bahasa tubuh & aroma.",
    "Kalajengking bisa bertahan hidup 1 tahun tanpa makan. Mereka memperlambat metabolisme tubuhnya.",
    "Kupu-kupu merasakan rasa dengan kakinya, bukan mulutnya. Mereka mendarat di bunga untuk 'merasakannya'.",
  ],
  sejarah: [
    "Cleopatra hidup lebih dekat ke era pendaratan bulan (1969) daripada ke era pembangunan Piramida Giza.",
    "Sekolah tertua di dunia adalah Universitas Al-Qarawiyyin di Maroko, didirikan tahun 859 M.",
    "Gajah memiliki upacara pemakaman. Mereka menutupi matiannya dengan dedaunan & menjaga lokasinya.",
    "Pada abad pertengahan, orang Epercaya bahwa tomat beracun. Mereka menyebutnya 'apel beracun'.",
    "Kertas toilet ditemukan tahun 1857. Sebelum itu, orang pakai daun, kulit, atau bahkan tangan.",
    "Pada zaman kuno, bangsa Mesir Kuno pakai batu sebagai kertas tidur. Mereka percaya batu dingin membantu tidur.",
    "Perang terpendek dalam sejarah adalah Perang Anglo-Zanzibar tahun 1896, hanya berlangsung 38 menit.",
    "Lilin pertama di dunia ditemukan di Mesir Kuno, sekitar 3000 SM, terbuat dari lemak hewan.",
    "Albert Einstein ditawari menjadi Presiden Israel tahun 1952, tapi dia menolak.",
    "Pada zaman kuno, bangsa Viking pakai tulang hewan sebagai dadu untuk permainan mereka.",
  ],
  teknologi: [
    "Email lebih tua daripada internet. Email ditemukan tahun 1971, internet baru komersial tahun 1983.",
    "Ponsel pertama yang dijual, Motorola DynaTAC tahun 1983, harganya setara Rp 100 juta saat ini.",
    "Kode pertama yang ditulis oleh programmer wanita pertama, Ada Lovelace, tahun 1843 untuk mesin analitik.",
    "Google awalnya hanya bisa mencari 25-30 halaman per detik. Sekarang jutaan halaman per detik.",
    "Penduduk Indonesia lebih banyak pakai ponsel daripada sikat gigi. Menurut data, 87% punya ponsel, 61% sikat gigi.",
    "Domain .com pertama yang terdaftar adalah symbolics.com, tanggal 15 Maret 1985.",
    "WhatsApp awalnya ditolak oleh Facebook untuk akuisisi tahun 2009. 5 tahun kemudian, Facebook beli dengan $19 miliar.",
    "Layar ponsel pertama dengan touch screen ada di IBM Simon tahun 1994, sebelum iPhone 13 tahun.",
    "Hashtag (#) di Twitter awalnya diusulkan oleh pengguna, bukan oleh Twitter sendiri.",
    "USB flash drive pertama hanya bisa menyimpan 8 MB data. Sekarang ada yang 2 TB, 250.000x lipat.",
  ],
  tubuh: [
    "Pembuluh darah di tubuh manusia jika disambung, bisa mengelilingi Bumi 2.5 kali.",
    "Rambut manusia bisa menahan beban hingga 100 gram per helai. Rambut kuat seperti kawat tembaga.",
    "Setiap kaki manusia punya 250.000 kelenjar keringat. Kaki menghasilkan sekitar 1 liter keringat per hari.",
    "Manusia menghasilkan 1-2 liter air liur per hari. Sepanjang hidup, cukup untuk isi 2 kolam renang.",
    "Kuku jari tangan tumbuh 3-4 kali lebih cepat dari kuku kaki.",
    "Tulang manusia 5 kali lebih kuat dari baja dengan berat yang sama.",
    "Jantung manusia berdetak sekitar 100.000 kali per hari, memompa 7.500 liter darah.",
    "Otak manusia 60% lemak. Otak adalah organ dengan kandungan lemak tertinggi di tubuh.",
    "Manusia berkedip sekitar 15-20 kali per menit, total 10.000-15.000 kali per hari.",
    "Setiap sel tubuh manusia diganti dalam 7-10 tahun. Jadi secara teknis, kamu adalah orang yang berbeda tiap dekade.",
  ],
  alam: [
    "Letusan gunung Krakatau tahun 1883 terdengar sampai 4.800 km jauhnya. Suara terkeras yang pernah tercatat.",
    "Gurun Sahara adalah gurun terbesar di dunia, seluas 9 juta km persegi. Tapi gurun terbesar sebenarnya adalah Antartika.",
    "Petir lebih panas dari permukaan matahari. Suhu petir mencapai 30.000 derajat C, matahari 5.500 derajat C.",
    "Awan cumulonimbus bisa berbobot jutaan ton, tapi bisa melayang karena ukurannya yang sangat luas.",
    "Pohon tertua di dunia adalah Methuselah, pohon Bristlecone Pine berusia 4.800+ tahun, di California.",
    "Air terjun tertinggi di dunia adalah Angel Falls di Venezuela, setinggi 979 meter, 15x Niagara.",
    "Samudra Pasific adalah samudra terbesar, menutupi 30% permukaan Bumi, lebih besar dari semua daratan digabung.",
    "Laut Mati sangat asin sehingga orang bisa mengambang tanpa berenang. Kepadatan airnya hampir 10x laut biasa.",
    "Gempa terdahsyat yang tercatat adalah gempa Valdivia, Chili, 1960, magnitudo 9.5.",
    "Es di Antartika menyimpan 70% air tawar dunia. Jika semua mencair, permukaan laut naik 60 meter.",
  ],
}

const KATEGORI_LIST = Object.keys(FAKTA)

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      const randomKat = KATEGORI_LIST[Math.floor(Math.random() * KATEGORI_LIST.length)]
      const randomFakta = FAKTA[randomKat][Math.floor(Math.random() * FAKTA[randomKat].length)]
      let lines = []
      lines.push("Fakta Unik Random")
      lines.push("Kategori: " + randomKat)
      lines.push("")
      lines.push(randomFakta)
      lines.push("")
      lines.push("Kategori tersedia: " + KATEGORI_LIST.join(", "))
      lines.push("Cara: " + usedPrefix + "faktaunik <kategori>")
      return m.reply(claraWrap("Fakta Unik", lines.join("\n")))
    }

    const kat = KATEGORI_LIST.find(k => k.includes(input) || k === input)
    if (!kat) {
      return m.reply(claraWrap("Fakta Unik", "Kategori tidak ditemukan: " + input + "\nTersedia: " + KATEGORI_LIST.join(", ")))
    }

    const fakta = FAKTA[kat][Math.floor(Math.random() * FAKTA[kat].length)]
    let lines = []
    lines.push("Fakta Unik - " + kat)
    lines.push("")
    lines.push(fakta)

    return m.reply(claraWrap("Fakta " + kat, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Fakta Unik", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
