// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "weton",
  alias: ["weton"],
  aliases: ["weton", "wetonjawa", "wetoninfo", "neptujawa"],
  category: "primbon",
  description: "Info weton Jawa lengkap - karakter, neptu, sifat, keberuntungan",
  usage: ".weton <hari lahir>",
  example: ".weton senin legi",
  isGroupOnly: false,
}

const HARI = {
  "minggu": { neptu: 5, sifat: "Tenang, bijaksana, suka membantu, pintar menyimpan rahasia, namun kadang keras kepala", planet: "Surya (Matahari)", warna: "Merah" },
  "senin": { neptu: 4, sifat: "Dinamis, mudah bergaul, berani, namun mudah tersinggung & cepat marah", planet: "Bulan", warna: "Putih" },
  "selasa": { neptu: 3, sifat: "Berani, pantang menyerah, tegas, suka membela kebenaran, namun terlalu kritis", planet: "Mars", warna: "Merah marun" },
  "rabu": { neptu: 7, sifat: "Cerdas, komunikatif, fleksibel, banyak akal, namun sering ragu & gampang bosan", planet: "Budha (Merkurius)", warna: "Hijau" },
  "kamis": { neptu: 8, sifat: "Penuh kasih, dermawan, suci hati, penyayang, namun mudah terbawa perasaan & cemburu", planet: "Brihaspati (Jupiter)", warna: "Kuning" },
  "jumat": { neptu: 6, sifat: "Pemurah, suka menolong, ramah, berhati bersih, namun pemalu & gampang terpengaruh", planet: "Sukra (Venus)", warna: "Hitam" },
  "sabtu": { neptu: 9, sifat: "Pekerja keras, teliti, ulet, disiplin, namun pendiam & tertutup", planet: "Sani (Saturnus)", warna: "Hitam pekat" },
}

const PASARAN = {
  "legi": { neptu: 5, sifat: "Banyak keinginan, suka menolong, dermawan, namun boros & gampang terbujuk", kewan: "Lembu", warna: "Putih" },
  "pahing": { neptu: 9, sifat: "Pendiam, keras kepala, berani, mandiri, namun tertutup & mudah tersinggung", kewan: "Kuda", warna: "Merah" },
  "pon": { neptu: 7, sifat: "Penuh kasih, sopan, hati-hati, hemat, namun gampang khawatir & ragu", kewan: "Sapi", warna: "Hitam" },
  "wage": { neptu: 4, sifat: "Tegas, jujur, ulet, pantang menyerah, namun mudah marah & keras kepala", kewan: "Kambing", warna: "Kuning" },
  "kliwon": { neptu: 8, sifat: "Tenang, bijak, mistis, penuh ide, namun pendendam & suka menyendiri", kewan: "Kerbau", warna: "Hitam kemerahan" },
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    if (!args[0]) {
      return m.reply(claraWrap("Weton Jawa", [
        "Cek karakter weton Jawa berdasarkan hari & pasaran.",
        "",
        "Cara: " + usedPrefix + "weton <hari> <pasaran>",
        "Contoh: " + usedPrefix + "weton senin legi",
        "",
        "Hari: minggu, senin, selasa, rabu, kamis, jumat, sabtu",
        "Pasaran: legi, pahing, pon, wage, kliwon",
      ].join("\n")))
    }

    const hariInput = (args[0] || "").toLowerCase()
    const pasaranInput = (args[1] || "").toLowerCase()

    const hari = HARI[hariInput]
    const pasaran = PASARAN[pasaranInput]

    if (!hari) {
      return m.reply(claraWrap("Weton", "Hari tidak valid: " + hariInput + "\nGunakan: minggu, senin, selasa, rabu, kamis, jumat, sabtu"))
    }

    if (!pasaran) {
      return m.reply(claraWrap("Weton", "Pasaran tidak valid: " + pasaranInput + "\nGunakan: legi, pahing, pon, wage, kliwon")
      )
    }

    const totalNeptu = hari.neptu + pasaran.neptu
    const wetonNama = hariInput.charAt(0).toUpperCase() + hariInput.slice(1) + " " + pasaranInput.charAt(0).toUpperCase() + pasaranInput.slice(1)

    // Determine character based on total neptu
    let karakter
    if (totalNeptu <= 8) {
      karakter = "Karakter lembut, mudah menyesuaikan diri, namun kurang kuat dalam menghadapi cobaan berat."
    } else if (totalNeptu <= 13) {
      karakter = "Karakter seimbang, cukup kuat, ulet, dan mampu menghadapi tantangan dengan baik."
    } else if (totalNeptu <= 18) {
      karakter = "Karakter kuat, tegas, pantang menyerah, namun perlu hati-hati dengan sifat keras kepala."
    } else {
      karakter = "Karakter sangat kuat, dominan, suka memimpin, namun rawan konflik jika tidak mengendalikan emosi."
    }

    // Determine lucky days
    let hariNaas
    if (totalNeptu === 9) hariNaas = "Setiap hari Selasa Kliwon"
    else if (totalNeptu === 13) hariNaas = "Setiap hari Minggu Pahing"
    else if (totalNeptu === 14) hariNaas = "Setiap hari Jumat Wage"
    else if (totalNeptu === 17) hariNaas = "Setiap hari Rabu Pon"
    else if (totalNeptu === 18) hariNaas = "Setiap hari Senin Kliwon"
    else hariNaas = "Tidak ada hari naas spesifik, namun tetap waspada"

    let lines = []
    lines.push("Weton: " + wetonNama)
    lines.push("")
    lines.push("Neptu Hari: " + hari.neptu + " (" + hariInput + ")")
    lines.push("Neptu Pasaran: " + pasaran.neptu + " (" + pasaranInput + ")")
    lines.push("Total Neptu: " + totalNeptu)
    lines.push("")
    lines.push("Sifat dari Hari:")
    lines.push(hari.sifat)
    lines.push("Planet: " + hari.planet + " | Warna: " + hari.warna)
    lines.push("")
    lines.push("Sifat dari Pasaran:")
    lines.push(pasaran.sifat)
    lines.push("Kewan (hewan simbol): " + pasaran.kewan)
    lines.push("")
    lines.push("Karakter Umum:")
    lines.push(karakter)
    lines.push("")
    lines.push("Hari Naas (hari peringatan):")
    lines.push(hariNaas)

    return m.reply(claraWrap("Weton " + wetonNama, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Weton", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
