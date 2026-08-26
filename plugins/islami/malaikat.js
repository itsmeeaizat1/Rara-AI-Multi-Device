// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "malaikat",
  alias: ["malaikat"],
  aliases: ["malaikat", "doamalaikat", "10malaikat", "sifatmalaikat"],
  category: "islami",
  description: "10 Malaikat Allah - tugas, sifat, dan keutamaan",
  usage: ".malaikat | .malaikat <nomor>",
  example: ".malaikat | .malaikat 1",
  isGroupOnly: false,
}

const MALAIKAT = [
  { no: 1, nama: "Jibril", tugas: "Menyampaikan wahyu kepada para Nabi & Rasul", sifat: "Sangat kuat, setia, dan memiliki keindahan yang luar biasa", keutamaan: "Malaikat terbesar & teringgi. Pernah menampakkan diri dalam wujud asli hanya 3x kepada Nabi Muhammad SAW" },
  { no: 2, nama: "Mikail", tugas: "Mengatur rezeki, turunnya hujan, dan tumbuh-tumbuhan", sifat: "Penuh rahmat, selalu memohon ampun untuk umat", keutamaan: "Sahabat Jibril dalam mengurus urusan alam semesta" },
  { no: 3, nama: "Israfil", tugas: "Meniup sangkakala (terompet) saat hari kiamat", sifat: "Selalu siap dengan sangkakala di bibirnya", keutamaan: "Akan meniup 2x: tiupan pertama mematikan semua makhluk, tiupan kedua membangkitkan kembali" },
  { no: 4, nama: "Izrail", tugas: "Mencabut nyawa (malaikat maut)", sifat: "Tidak memihak, adil, menuruti perintah Allah sepenuhnya", keutamaan: "Setiap nyawa dicabut sesuai amal: orang baik dicabut lembut, orang zalim dicabut keras" },
  { no: 5, nama: "Munkar", tugas: "Menguji mayat di alam kubur bersama Nakir", sifat: "Tegas & menegur", keutamaan: "Bertanya 3 hal: Siapa Tuhanmu? Apa agamamu? Siapa nabimu?" },
  { no: 6, nama: "Nakir", tugas: "Menguji mayat di alam kubur bersama Munkar", sifat: "Tegas & menegur", keutamaan: "Jika mayat bisa jawab, kubur dilapangkan. Jika tidak, kubur sempit & disiksa" },
  { no: 7, nama: "Raqib", tugas: "Mencatat amal baik manusia", sifat: "Penuh perhatian, mencatat setiap kebaikan sekecil apa pun", keutamaan: "Berada di sisi kanan setiap manusia, mencatat amal sholeh" },
  { no: 8, nama: "Atid", tugas: "Mencatat amal buruk manusia", sifat: "Penuh perhatian, mencatat setiap keburukan sekecil apa pun", keutamaan: "Berada di sisi kiri setiap manusia, mencatat dosa" },
  { no: 9, nama: "Malik", tugas: "Penjaga neraka (Zabaniah)", sifat: "Keras & tidak kasihan kepada penghuni neraka", keutamaan: "Memimpin 19 malaikat Zabaniah yang menjaga pintu-pintu neraka" },
  { no: 10, nama: "Ridwan", tugas: "Penjaga pintu surga", sifat: "Penuh rahmat & welas asih", keutamaan: "Menyambut ahli surga dengan ucapan salam & kegembiraan" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > MALAIKAT.length) {
      let lines = []
      lines.push("10 Malaikat Allah")
      lines.push("")
      MALAIKAT.forEach(a => {
        lines.push(a.no + ". Malaikat " + a.nama)
        lines.push("   Tugas: " + a.tugas)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "malaikat <nomor>")
      lines.push("Contoh: " + usedPrefix + "malaikat 1")
      return m.reply(claraWrap("10 Malaikat", lines.join("\n")))
    }

    const a = MALAIKAT[input - 1]
    return m.reply(claraWrap("Malaikat " + a.nama, [
      "Nama: Malaikat " + a.nama,
      "",
      "Tugas:",
      a.tugas,
      "",
      "Sifat:",
      a.sifat,
      "",
      "Keutamaan:",
      a.keutamaan,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Malaikat", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
