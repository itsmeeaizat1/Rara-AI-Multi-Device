// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "otakudict",
  aliases: ["otakudict", "animeterminology", "animeglossary", "istilahanime"],
  category: "anime",
  description: "Kamus istilah anime & manga (otaku terminology)",
  usage: ".otakudict | .otakudict <nomor>",
  example: ".otakudict | .otakudict 1",
  isGroupOnly: false,
}

const ISTILAH = [
  { no: 1, istilah: "Otaku", arti: "Orang yang terobsesi dengan anime, manga, atau hal tertentu (bisa positif/negatif). Di Jepang dulu negatif, kini lebih netral.", kategori: "Umum" },
  { no: 2, istilah: "Weaboo / Weeb", arti: "Orang non-Jepang yang terobsesi dengan budaya Jepang (anime, manga). Sering digunakan sebagai ejekan, tapi banyak yang menerimanya.", kategori: "Umum" },
  { no: 3, istilah: "Tsundere", arti: "Karakter yang awalnya dingin/hostile, tapi lama-lama jadi hangat & penuh kasih. 'Tsun' = dingin, 'dere' = hangat.", kategori: "Tropes" },
  { no: 4, istilah: "Yandere", arti: "Karakter yang awalnya manis & penuh cinta, tapi bisa sangat obsesif & kejam untuk melindungi/mendapatkan orang yang dicintai.", kategori: "Tropes" },
  { no: 5, istilah: "Kuudere", arti: "Karakter yang dingin, tenang, & jarang menunjukkan emosi, tapi sebenarnya peduli.", kategori: "Tropes" },
  { no: 6, istilah: "Dandere", arti: "Karakter pemalu & pendiam, tapi bisa terbuka & hangat jika sudah dekat.", kategori: "Tropes" },
  { no: 7, istilah: "Deredere", arti: "Karakter yang selalu manis, hangat, energik, & penuh kasih ke semua orang.", kategori: "Tropes" },
  { no: 8, istilah: "Harem", arti: "Karakter (biasanya pria) dikelilingi oleh banyak karakter wanita yang menyukainya.", kategori: "Genre" },
  { no: 9, istilah: "Reverse Harem", arti: "Karakter wanita dikelilingi banyak pria yang menyukainya.", kategori: "Genre" },
  { no: 10, istilah: "Isekai", arti: "Karakter dipindahkan/terlahir kembali ke dunia lain, biasanya dunia fantasi.", kategori: "Genre" },
  { no: 11, istilah: "Mecha", arti: "Anime/manga dengan robot raksasa sebagai elemen utama.", kategori: "Genre" },
  { no: 12, istilah: "Slice of Life", arti: "Cerita tentang kehidupan sehari-hari karakter, tanpa plot besar.", kategori: "Genre" },
  { no: 13, istilah: "Shounen", arti: "Target audiens: anak laki-laki remaja (12-18). Fokus aksi & petualangan.", kategori: "Demografik" },
  { no: 14, istilah: "Shoujo", arti: "Target audiens: anak perempuan remaja (12-18). Fokus romansa & drama.", kategori: "Demografik" },
  { no: 15, istilah: "Seinen", arti: "Target audiens: pria dewasa (18+). Tema berat, moral abu-abu.", kategori: "Demografik" },
  { no: 16, istilah: "Josei", arti: "Target audiens: wanita dewasa (18+). Romansa realistis & kehidupan dewasa.", kategori: "Demografik" },
  { no: 17, istilah: "Kodomo", arti: "Target audiens: anak-anak. Cerita sederhana & mendidik (contoh: Doraemon).", kategori: "Demografik" },
  { no: 18, istilah: "Canon", arti: "Event/karakter yang resmi dalam cerita utama manga/novel asli.", kategori: "Story" },
  { no: 19, istilah: "Filler", arti: "Episode yang tidak ada di manga asli, dibuat untuk mengejar manga (tidak canon).", kategori: "Story" },
  { no: 20, istilah: "OVA", arti: "Original Video Animation. Episode khusus yang dirilis langsung ke video, bukan TV.", kategori: "Format" },
  { no: 21, istilah: "ONA", arti: "Original Net Animation. Dirilis langsung di internet/streaming.", kategori: "Format" },
  { no: 22, istilah: "Movie / Film", arti: "Film anime layar lebar yang dirilis di bioskop.", kategori: "Format" },
  { no: 23, istilah: "Special", arti: "Episode khusus pendek yang biasanya menyertakan volume manga/BD.", kategori: "Format" },
  { no: 24, istilah: "Cour", arti: "Satu musim siaran (sekitar 12-13 episode). 1 cour = 12-13 eps, 2 cour = 24-26 eps.", kategori: "Format" },
  { no: 25, istilah: "OP", arti: "Opening. Lagu & animasi pembuka di awal setiap episode.", kategori: "Musik" },
  { no: 26, istilah: "ED", arti: "Ending. Lagu & animasi penutup di akhir setiap episode.", kategori: "Musik" },
  { no: 27, istilah: "OST", arti: "Original Soundtrack. Musik latar yang dibuat khusus untuk anime.", kategori: "Musik" },
  { no: 28, istilah: "Seiyuu", arti: "Voice actor / pengisi suara di anime (bisa sangat terkenal di Jepang).", kategori: "Industri" },
  { no: 29, istilah: "Mangaka", arti: "Pembuat/illustrator manga. Sering merangkap penulis & illustrator.", kategori: "Industri" },
  { no: 30, istilah: "Light Novel", arti: "Novel Jepang ringan dengan beberapa ilustrasi, sumber banyak anime.", kategori: "Format" },
  { no: 31, istilah: "Visual Novel", arti: "Game cerita interaktif dengan banyak pilihan yang mempengaruhi ending.", kategori: "Format" },
  { no: 32, istilah: "Tankobon", arti: "Volume manga yang berisi beberapa chapter (biasanya 8-10 chapter per volume).", kategori: "Format" },
  { no: 33, istilah: "Power Scaling", arti: "Membandingkan kekuatan karakter antar anime (contoh: Goku vs Saitama).", kategori: "Komunitas" },
  { no: 34, istilah: "Shipping", arti: "Mendukung/mengharapkan pasangan romantis antar karakter.", kategori: "Komunitas" },
  { no: 35, istilah: "Cosplay", arti: "Memakai kostum & memerankan karakter anime/manga.", kategori: "Komunitas" },
  { no: 36, istilah: "AMV", arti: "Anime Music Video. Fan-made video yang menggabungkan cuplikan anime dengan lagu.", kategori: "Komunitas" },
  { no: 37, istilah: "Sub", arti: "Subtitle. Anime dengan subtitle bahasa asing (tidak dialihbahasakan).", kategori: "Bahasa" },
  { no: 38, istilah: "Dub", arti: "Dubbing. Anime dialihbahasakan ke bahasa lain (contoh: English Dub).", kategori: "Bahasa" },
  { no: 39, istilah: "Raw", arti: "Versi asli anime/manga tanpa subtitle atau editing.", kategori: "Bahasa" },
  { no: 40, istilah: "Scanlation", arti: "Fan-made scan manga + terjemahan (scan + translation).", kategori: "Komunitas" },
  { no: 41, istilah: "Kawaii", arti: "Lucu / imut. Salah satu kata paling terkenal dari budaya anime.", kategori: "Kata" },
  { no: 42, istilah: "Sugoi", arti: "Luar biasa / hebat.", kategori: "Kata" },
  { no: 43, istilah: "Baka", arti: "Bodoh / idiot. Sering diucapkan karakter tsundere.", kategori: "Kata" },
  { no: 44, istilah: "Senpai", arti: "Senior (di sekolah/kerja). Sering jadi idola/crush.", kategori: "Kata" },
  { no: 45, istilah: "Kouhai", arti: "Junior (di sekolah/kerja). Lawan dari senpai.", kategori: "Kata" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > ISTILAH.length) {
      let lines = []
      lines.push("Kamus Istilah Anime & Manga")
      lines.push(ISTILAH.length + " Istilah")
      lines.push("")
      ISTILAH.forEach(i => {
        lines.push(i.no + ". " + i.istilah + " [" + i.kategori + "]")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "otakudict <nomor>")
      lines.push("Contoh: " + usedPrefix + "otakudict 3")
      return m.reply(claraWrap("Kamus Otaku", lines.join("\n")))
    }

    const item = ISTILAH[input - 1]
    return m.reply(claraWrap("Istilah: " + item.istilah, [
      "Kategori: " + item.kategori,
      "",
      "Arti:",
      item.arti,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Kamus Otaku", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
