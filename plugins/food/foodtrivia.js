// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "foodtrivia",
  alias: ["foodtrivia", "foodrandom", "triviamakanan", "faktamakanan"],
  category: 'food',
  description: 'Trivia & fakta unik tentang makanan dari seluruh dunia',
  usage: '.foodtrivia | .foodtrivia <nomor>',
  example: '.foodtrivia | .foodtrivia 1',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

const TRIVIA = [
  { no: 1, negara: "Italia", fakta: "Pizza Margherita dibuat untuk Ratu Margherita dari Italia tahun 1889. Warna merah (tomat), putih (mozzarella), hijau (basil) mewakili bendera Italia.", makanan: "Pizza Margherita" },
  { no: 2, negara: "Jepang", fakta: "Sushi awalnya adalah makanan cepat saji di Jepang abad ke-19, dijual di gerobak jalanan, bukan restoran mewah seperti sekarang.", makanan: "Sushi" },
  { no: 3, negara: "Indonesia", fakta: "Rendang asal Minangkabau pernah dinobatkan sebagai makanan terenak di dunia oleh CNN International tahun 2011.", makanan: "Rendang" },
  { no: 4, negara: "Perancis", fakta: "Croissant awalnya bukan dari Perancis, tapi dari Austria. Dibawa ke Perancis saat Ratu Marie Antoinette menikah dengan Raja Louis XVI.", makanan: "Croissant" },
  { no: 5, negara: "Cina", fakta: "Mi instan ditemukan oleh Momofuku Ando di Jepang tahun 1958, terinspirasi dari mie Cina. Sekarang lebih dari 100 milyar porsi terjual per tahun.", makanan: "Mi Instan" },
  { no: 6, negara: "Meksiko", fakta: "Coklat aslinya berasal dari Meksiko. Suku Aztec dan Maya minum coklat cair sebagai minuman pahit, bukan manis.", makanan: "Coklat" },
  { no: 7, negara: "India", fakta: "Kari bukan satu jenis masakan, tapi istilah umum untuk berbagai hidangan berbumbu di India. Tiap daerah punya resep kari yang berbeda.", makanan: "Kari" },
  { no: 8, negara: "Thailand", fakta: "Pad Thai sebenarnya bukan masakan Thailand tradisional. Diciptakan tahun 1930an oleh pemerintah Thailand untuk mempromosikan identitas nasional.", makanan: "Pad Thai" },
  { no: 9, negara: "Amerika", fakta: "Hamburger dinamai dari kota Hamburg, Jerman. Dibawa imigran Jerman ke Amerika, lalu jadi makanan ikonik AS.", makanan: "Hamburger" },
  { no: 10, negara: "Korea", fakta: "Kimchi sudah ada sejak abad ke-7. Awalnya disimpan di tembok tanah untuk fermentasi musim dingin.", makanan: "Kimchi" },
  { no: 11, negara: "Italia", fakta: "Pasta terpanjang di dunia dibuat di Italia, sepanjang 3.7 km. Rekat di Guinness World Records tahun 2010.", makanan: "Pasta" },
  { no: 12, negara: "Inggris", fakta: "Fish and Chips muncul saat imigran Yahudi dari Portugal membawa ikan goreng ke Inggris abad ke-16.", makanan: "Fish and Chips" },
  { no: 13, negara: "Turki", fakta: "Kopi Turki dilarang keras di Inggris tahun 1674. Dituduh bikin orang malas dan merusak pernikahan.", makanan: "Kopi" },
  { no: 14, negara: "Belanda", fakta: "Kue stroopwafel ditemukan di Gouda abad ke-18. Dibuat dari sisa roti dan sirup gula.", makanan: "Stroopwafel" },
  { no: 15, negara: "Indonesia", fakta: "Nasi goreng dianggap sebagai salah satu makanan yang membuat Barack Obama jatuh cinta saat berkunjung ke Indonesia.", makanan: "Nasi Goreng" },
  { no: 16, negara: "Spanyol", fakta: "Paella asli dari Valencia. Awalnya makanan petani, dimasak dengan hewan apa pun yang ada di sawah.", makanan: "Paella" },
  { no: 17, negara: "Argentina", fakta: "Asado (barbekyu Argentina) adalah tradisi sosial. Sering lebih lama dari 6 jam, murni daging tanpa bumbu, hanya garam.", makanan: "Asado" },
  { no: 18, negara: "Vietnam", fakta: "Pho mulanya dijual oleh pedagang kaki lima tahun 1900an. Sekarang adalah makanan nasional Vietnam.", makanan: "Pho" },
  { no: 19, negara: "Ethiopia", fakta: "Injera, roti pipih Ethiopia, dibuat dari biji teff. Biji ini bebas gluten dan kaya serat.", makanan: "Injera" },
  { no: 20, negara: "Brasil", fakta: "Feijoada, hidangan kacang hitam dan daging, awalnya makanan budak di Brasil kolonial. Sekarang makanan nasional Brasil.", makanan: "Feijoada" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > TRIVIA.length) {
      // Random trivia
      const t = TRIVIA[Math.floor(Math.random() * TRIVIA.length)]
      let lines = []
      lines.push("Trivia Makanan Random")
      lines.push("")
      lines.push("Makanan: " + t.makanan)
      lines.push("Negara: " + t.negara)
      lines.push("")
      lines.push("Fakta:")
      lines.push(t.fakta)
      lines.push("")
      lines.push("Total trivia: " + TRIVIA.length)
      lines.push("Cara: " + usedPrefix + "foodtrivia <nomor>")
      return m.reply(claraWrap("Food Trivia", lines.join("\n")))
    }

    const t = TRIVIA[input - 1]
    return m.reply(claraWrap("Trivia: " + t.makanan, [
      "Makanan: " + t.makanan,
      "Negara: " + t.negara,
      "",
      "Fakta:",
      t.fakta,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Food Trivia", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
