// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { novaGameBox, gameCTA } from '../../src/lib/nova-games.js'

const pluginConfig = {
  name: "lovecalc",
  alias: ["lovecalc"],
  category: "fun",
  description: 'Kalkulator cinta - hitung persentase kecocokan cinta 2 nama',
  usage: '.lovecalc <nama1> & <nama2>',
  example: '.lovecalc Andi & Budi',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

function calcLove(name1, name2) {
  const combined = (name1 + name2).toLowerCase().replace(/[^a-z]/g, "")
  let score = 0
  for (let i = 0; i < combined.length; i++) {
    score += combined.charCodeAt(i)
  }
  let hash = score
  for (let i = 0; i < 3; i++) {
    hash = (hash * 31 + 17) % 101
  }
  let percent = hash
  if (percent < 15) percent += 20
  if (percent > 95) percent = 95
  return percent
}

function getLevel(percent) {
  if (percent >= 90) return { level: "Cinta Sejati", msg: "Kalian diciptakan untuk bersama! Kecocokan sempurna, jarang ada pasangan seperti kalian." }
  if (percent >= 75) return { level: "Sangat Cocok", msg: "Hubungan kalian sangat harmonis. Sedikit perbedaan tapi bisa diatasi dengan komunikasi." }
  if (percent >= 60) return { level: "Cocok", msg: "Kalian cukup cocok. Ada beberapa hal yang perlu disesuaikan, tapi hubungan ini punya masa depan." }
  if (percent >= 45) return { level: "Cukup", msg: "Kecocokan standar. Butuh effort lebih untuk menjaga hubungan tetap langgeng." }
  if (percent >= 30) return { level: "Kurang Cocok", msg: "Banyak perbedaan. Hubungan ini butuh kompromi besar dari kedua belah pihak." }
  return { level: "Tidak Cocok", msg: "Kecocokan rendah. Mungkin lebih baik jadi teman. Tapi cinta bisa tak terduga!" }
}

const POSITIF = [
  "Kalian saling melengkapi kekurangan satu sama lain",
  "Komunikasi kalian sangat terbuka & jujur",
  "Kalian punya chemistry yang kuat sejak awal",
  "Sama-sama setia dan tidak mudah goyah",
  "Menghargai perbedaan pendapat",
  "Saling support dalam mimpi dan tujuan",
  "Humor kalian cocok, sering ketawa bareng",
  "Kalian bisa diam bersama tanpa canggung",
]
const NEGATIF = [
  "Sering salah paham karena kurang komunikasi",
  "Keduanya keras kepala soal hal kecil",
  "Cemburu berlebihan kadang muncul",
  "Jarang quality time bareng",
  "Sensitif terhadap kata-kata satu sama lain",
  "Ego masing-masing sering bentrok",
  "Sulit mengakui salah",
  "Sering menyimpan perasaan",
]
const TIPS = [
  "Perbanyak quality time tanpa gadget",
  "Dengarkan sebelum membela diri",
  "Ucapkan terima kasih setiap hari",
  "Jangan tidur dengan marah",
  "Beri kejutan kecil yang tulus",
  "Komunikasikan perasaan, jangan didam",
  "Hargai hal kecil yang dilakukan pasangan",
  "Cari hobi bersama yang baru",
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const input = text.trim()
    if (!input || !input.includes("&")) {
      return m.reply(claraWrap("Love Calculator", [
        "Hitung persentase kecocokan cinta 2 nama.",
        "",
        "Cara: " + usedPrefix + "lovecalc <nama1> & <nama2>",
        "Contoh: " + usedPrefix + "lovecalc Andi & Budi",
      ].join("\n")))
    }

    const parts = input.split("&").map(s => s.trim())
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return m.reply(claraWrap("Love Calculator", "Format salah. Gunakan: " + usedPrefix + "lovecalc Nama1 & Nama2"))
    }

    const name1 = parts[0]
    const name2 = parts[1]
    const percent = calcLove(name1, name2)
    const info = getLevel(percent)

    const pIdx = percent % POSITIF.length
    const nIdx = (percent + 3) % NEGATIF.length
    const tIdx = (percent + 5) % TIPS.length

    const rows = [
      `│ • 💘 Nama 1 : ${name1}`,
      `│ • 💘 Nama 2 : ${name2}`,
      `│ • 💯 Persentase Cinta : ${percent}%`,
      `│ • 📊 Level : ${info.level}`,
      `│ • 💭 Hasil : ${info.msg}`,
      `│ • ✨ Kekuatan Hubungan : ${POSITIF[pIdx]}`,
      `│ • ⚠️ Tantangan : ${NEGATIF[nIdx]}`,
      `│ • 💡 Tips : ${TIPS[tIdx]}`,
    ]

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "love calculator", icon: "💘",
      flavor: "💘 *SEBERAPA CINTA KALIAN?*",
      body: rows.join("\n"),
      cta: gameCTA("lovecalc"),
    }))
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Love Calculator", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
