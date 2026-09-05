// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "ramalancinta",
  alias: ["ramalancinta"],
  category: 'fun',
  description: 'Ramalan masa depan hubungan cintamu berdasarkan nama pasangan',
  usage: '.ramalancinta <nama1> & <nama2>',
  example: '.ramalancinta Andi & Budi',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true
}

const FASE = [
  { fase: "Tah Kenalan", deskripsi: "Kalian bertemu dalam situasi tak terduga. Mungkin lewat teman, atau saat sedang melakukan hal yang sama. Ada ketertarikan kecil yang belum kalian sadari." },
  { fase: "Pendekatan", deskripsi: "Kalian mulai sering chat, telepon, atau ketemu. Obrolan mengalir dengan mudah. Salah satu sudah mulai merasakan degup tapi belum berani ungkap." },
  { fase: "Jatuh Cinta", deskripsi: "Salah satu akhirnya mengaku lebih dulu. Momen pengakuan terjadi di waktu yang tidak terduga, mungkin saat hujan, atau setelah sebuah perdebatan kecil." },
  { fase: "Masa Manis", deskripsi: "Bulan madu hubungan. Kalian tidak bisa lepas satu sama lain. Semua terasa indah. Ini saatnya kalian saling mengenal lebih dalam." },
  { fase: "Ujian Pertama", deskripsi: "Ada konflik pertama, mungkin karena miss komunikasi atau hal kecil. Tapi kalian melewatinya & hubungan makin kuat." },
  { fase: "Stabil", deskripsi: "Hubungan kalian lebih dewasa. Kalian tahu kelebihan & kekurangan masing-masing. Tidak lagi hanya cinta tapi juga sahabat." },
  { fase: "Komitmen", deskripsi: "Salah satu siap untuk melangkah ke jenjang lebih serius. Mungkin lamaran, atau rencana masa depan bersama mulai dibicarakan." },
  { fase: "Bahagia", deskripsi: "Jika kalian konsisten, hubungan ini akan langgeng & membawa kebahagiaan sejati. Kalian tumbuh bersama, bukan hanya sebagai pasangan tapi sebagai tim." },
]

const RAMALAN_EXTRA = [
  { judul: "Waktu Paling Romantis", isi: "Suatu malam saat kalian sedang berdua, hujan turun, dan salah satu mengucapkan sesuatu yang tak terlupakan." },
  { judul: "Hal yang Akan Memperkuat", isi: "Krisis kecil yang kalian hadapi bersama. Bukan momen bahagia, tapi kesulitan yang berhasil kalian lewati." },
  { judul: "Hal yang Harus Dihindari", isi: "Mendiamkan perasaan terlalu lama. Komunikasi adalah kunci. Jangan biarkan ego menguasai diri." },
  { judul: "Hadiah Tak Terduga", isi: "Suatu hari, salah satu akan memberikan hadiah kecil yang sangat berarti, mungkin tidak mahal tapi sangat personal." },
  { judul: "Pertanda Baik", isi: "Saat kalian bisa tertawa bareng tanpa alasan, itu pertanda hubungan kalian sehat & langgeng." },
  { judul: "Tantangan Terbesar", isi: "Perbedaan pendapat tentang masa depan. Tapi jika kalian bisa kompromi, tidak ada yang tidak mungkin." },
  { judul: "Momen Tak Terlupakan", isi: "Perjalanan pertama bareng. Destinasinya mungkin sederhana, tapi kenangannya akan abadi." },
  { judul: "Kunci Hubungan", isi: "Kepercayaan & kesabaran. Keduanya harus ada. Tanpa salah satunya, hubungan akan goyah." },
]

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000
  }
  return hash
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const input = text.trim()
    if (!input || !input.includes("&")) {
      return m.reply(claraWrap("Ramalan Cinta", [
        "Ramalan masa depan hubungan cintamu.",
        "",
        "Cara: " + usedPrefix + "ramalancinta <nama1> & <nama2>",
        "Contoh: " + usedPrefix + "ramalancinta Andi & Budi",
      ].join("\n")))
    }

    const parts = input.split("&").map(s => s.trim())
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return m.reply(claraWrap("Ramalan Cinta", "Format salah. Gunakan: " + usedPrefix + "ramalancinta Nama1 & Nama2"))
    }

    const name1 = parts[0]
    const name2 = parts[1]
    const seed = hashCode(name1.toLowerCase() + name2.toLowerCase())

    let lines = []
    lines.push("Nama 1: " + name1)
    lines.push("Nama 2: " + name2)
    lines.push("")
    lines.push("Ramalan Masa Depan Hubungan:")
    lines.push("")

    FASE.forEach((f, i) => {
      lines.push((i + 1) + ". " + f.fase)
      lines.push("   " + f.deskripsi)
      lines.push("")
    })

    // Extra predictions
    const extraIdx = seed % RAMALAN_EXTRA.length
    const extra = RAMALAN_EXTRA[extraIdx]
    lines.push(extra.judul + ":")
    lines.push(extra.isi)

    lines.push("")
    lines.push("Catatan: Ini hanya ramalan untuk hiburan. Masa depan hubungan ada di tangan kalian berdua.")

    await m.react("🐣");
    return m.reply(claraWrap("Ramalan Cinta " + name1 + " & " + name2, lines.join("\n")))
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Ramalan Cinta", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
