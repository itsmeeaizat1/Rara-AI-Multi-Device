// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "cintaquiz",
  alias: ["cintaquiz", "ujiancinta", "cintatest", "lovetest", "quizcinta"],
  category: 'fun',
  description: 'Kuis cinta - 10 pertanyaan untuk menguji seberapa dalam kamu mencintai',
  usage: '.cintaquiz',
  example: '.cintaquiz',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true
}

const PERTANYAAN = [
  { no: 1, q: "Saat dia sedih, apa yang kamu lakukan pertama kali?", a: "Diam menemani", b: "Bertanya apa yang terjadi", c: "Mencari solusi", d: "Bikin dia tertawa" },
  { no: 2, q: "Apa hal pertama yang kamu ingat saat bangun pagi?", a: "Dia", b: "Tugas/kerja", c: "Sarapan", d: "Lagi ngapain dia sekarang" },
  { no: 3, q: "Saat dia salah, apa reaksi kamu?", a: "Marah langsung", b: "Diam dan pikir", c: "Bicara baik-baik", d: "Tunggu dia sadar" },
  { no: 4, q: "Seberapa sering kamu cek dia di sosmed?", a: "Tiap hari", b: "Beberapa kali sehari", c: "Saat ingat saja", d: "Jarang" },
  { no: 5, q: "Saat dia sakit, kamu akan?", a: "Datang langsung", b: "Telepon terus", c: "Kirim obat/makanan", d: "Doa dari jauh" },
  { no: 6, q: "Apa yang kamu pikirkan saat lihat dia tertawa?", a: "Ingin selalu melihat itu", b: "Dia lucu", c: "Senang dia bahagia", d: "Mood naik" },
  { no: 7, q: "Saat dia bicara dengan lawan jenis, kamu?", a: "Cemburu", b: "Biasa saja", c: "Sedikit tidak nyaman", d: "Proud dia sosial" },
  { no: 8, q: "Apa hal terkecil yang kamu ingat tentang dia?", a: "Aroma parfumnya", b: "Cara dia menyeduh teh", c: "Suara tawanya", d: "Semuanya, bahkan detail kecil" },
  { no: 9, q: "Saat kamu mimpi buruk, kamu ingin?", a: "Dia memelukmu", b: "Lari dari mimpi", c: "Lupa saja", d: "Telepon dia" },
  { no: 10, q: "Apa arti cinta menurut kamu?", a: "Memberi tanpa syarat", b: "Saling pengertian", c: "Setia dalam suka duka", d: "Menjadi alasan untuk berkembang" },
]

const HASIL = [
  { range: "90-100", judul: "Cinta Sejati", deskripsi: "Kamu mencintai dengan tulus & mendalam. Cintamu bukan sekadar perasaan, tapi tindakan nyata. Kamu siap berkomitmen sepenuhnya." },
  { range: "70-89", judul: "Cinta Kuat", deskripsi: "Cintamu sangat kuat & nyata. Kamu peduli dengan detail kecil, tapi kadang terlalu protektif. Biarkan dia bernapas juga." },
  { range: "50-69", judul: "Cinta Sedang", deskripsi: "Kamu mencintai dengan wajar. Ada rasa, tapi masih ragu untuk benar-benar terbuka. Coba lebih jujur dengan perasaanmu." },
  { range: "30-49", judul: "Cinta Berkembang", deskripsi: "Perasaanmu masih berkembang. Mungkin kamu baru mulai jatuh cinta atau masih menyangkal. Luangkan waktu untuk memahami hatimu." },
  { range: "0-29", judul: "Belum Yakin", deskripsi: "Kamu mungkin belum yakin dengan perasaanmu. Tidak apa-apa, cinta butuh waktu. Jangan memaksa, biarkan mengalir." },
]

// State tracking per user
const userState = new Map()

async function handler(m, { conn, text, args, usedPrefix, command, sender }) {
  try {
    const userId = sender || m.sender
    const input = text.trim()

    // Start quiz
    if (!input || input === "start" || input === "mulai") {
      userState.set(userId, { qIndex: 0, answers: [] })
      const q = PERTANYAAN[0]
      let lines = []
      lines.push("Kuis Cinta - 10 Pertanyaan")
      lines.push("Jawab dengan huruf a/b/c/d")
      lines.push("")
      lines.push("Pertanyaan 1/" + PERTANYAAN.length + ":")
      lines.push(q.q)
      lines.push("")
      lines.push("a. " + q.a)
      lines.push("b. " + q.b)
      lines.push("c. " + q.c)
      lines.push("d. " + q.d)
      lines.push("")
      lines.push("Ketik: " + usedPrefix + "cintaquiz <a/b/c/d>")
      return m.reply(claraWrap("Kuis Cinta #1", lines.join("\n")))
    }

    // Answer question
    const state = userState.get(userId)
    if (!state) {
      return m.reply(claraWrap("Kuis Cinta", "Belum mulai kuis. Ketik: " + usedPrefix + "cintaquiz mulai"))
    }

    const ans = input.toLowerCase().charAt(0)
    if (!["a", "b", "c", "d"].includes(ans)) {
      return m.reply(claraWrap("Kuis Cinta", "Jawab dengan a, b, c, atau d saja."))
    }

    // Score: a=10, b=8, c=7, d=9 (weighted)
    const scoreMap = { a: 10, b: 8, c: 7, d: 9 }
    state.answers.push(scoreMap[ans])
    state.qIndex++

    // Quiz finished
    if (state.qIndex >= PERTANYAAN.length) {
      const total = state.answers.reduce((a, b) => a + b, 0)
      const percent = Math.round((total / (PERTANYAAN.length * 10)) * 100)
      const hasil = HASIL.find(h => {
        const [min, max] = h.range.split("-").map(Number)
        return percent >= min && percent <= max
      }) || HASIL[4]

      userState.delete(userId)

      let lines = []
      lines.push("Kuis Cinta Selesai!")
      lines.push("")
      lines.push("Skor: " + total + "/" + (PERTANYAAN.length * 10))
      lines.push("Persentase: " + percent + "%")
      lines.push("")
      lines.push("Hasil: " + hasil.judul)
      lines.push("")
      lines.push(hasil.deskripsi)

      return m.reply(claraWrap("Hasil Kuis Cinta", lines.join("\n")))
    }

    // Next question
    const q = PERTANYAAN[state.qIndex]
    let lines = []
    lines.push("Pertanyaan " + (state.qIndex + 1) + "/" + PERTANYAAN.length + ":")
    lines.push(q.q)
    lines.push("")
    lines.push("a. " + q.a)
    lines.push("b. " + q.b)
    lines.push("c. " + q.c)
    lines.push("d. " + q.d)
    lines.push("")
    lines.push("Ketik: " + usedPrefix + "cintaquiz <a/b/c/d>")

    return m.reply(claraWrap("Kuis Cinta #" + (state.qIndex + 1), lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Kuis Cinta", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
