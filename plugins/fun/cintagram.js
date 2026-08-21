// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "cintagram",
  alias: ["cintagram", "gramcinta", "loveletter", "lovegram"],
  category: 'fun',
  description: 'Buat surat cinta / love gram personal untuk seseorang',
  usage: '.cintagram <nama> | <pesan>',
  example: '.cintagram Sayang | Kamu adalah alasan aku tersenyum hari ini',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true
}

const TEMPLATE = [
  { judul: "Surat Cinta Klasik", opening: "Untuk yang paling kutunggu,", closing: "Selalu memikirkanmu," },
  { judul: "Surat Cinta Manis", opening: "Halo, manusia favoritku,", closing: "Sampai jumpa di mimpi kita," },
  { judul: "Surat Cinta Dalam", opening: "Untuk hati yang selalu kukenal,", closing: "Dengan seluruh rasa yang kumiliki," },
  { judul: "Surat Cinta Lucu", opening: "Eh, kamu! Ya kamu!", closing: "Pengen ketemu, dan mungkin peluk," },
  { judul: "Surat Cinta Rindu", opening: "Untuk yang sedang jauh dari sini,", closing: "Dari yang menunggu kepulanganmu," },
]

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000
  }
  return Math.abs(hash)
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim()
    if (!input || !input.includes("|")) {
      return m.reply(claraWrap("Cinta Gram", [
        "Buat surat cinta personal untuk seseorang.",
        "",
        "Cara: " + usedPrefix + "cintagram <nama> | <pesan>",
        "Contoh: " + usedPrefix + "cintagram Sayang | Kamu alasan aku tersenyum",
      ].join("\n")))
    }

    const parts = input.split("|").map(s => s.trim())
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return m.reply(claraWrap("Cinta Gram", "Format salah. Gunakan: " + usedPrefix + "cintagram Nama | Pesan"))
    }

    const nama = parts[0]
    const pesan = parts[1]
    const seed = hashCode(nama + pesan)
    const tmpl = TEMPLATE[seed % TEMPLATE.length]

    let lines = []
    lines.push(tmpl.judul)
    lines.push("")
    lines.push(tmpl.opening)
    lines.push("")
    lines.push("Untuk " + nama + ",")
    lines.push("")
    lines.push(pesan)
    lines.push("")
    lines.push("Mungkin ini terdengar sederhana, tapi setiap kata di sini tulus. Kadang lupa untuk mengatakannya, jadi biar aku tulis saja.")
    lines.push("")
    lines.push("Terima kasih sudah hadir di hidupku. Kamu mungkin tidak tahu seberapa besar dampakmu, tapi aku merasakannya setiap hari.")
    lines.push("")
    lines.push(tmpl.closing)
    lines.push("")
    lines.push("~ Seseorang yang menyayangimu ~")

    return m.reply(claraWrap("Cinta Gram untuk " + nama, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Cinta Gram", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
