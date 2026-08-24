// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animegenre",
  aliases: ["animegenre", "genremanga", "animekategorinfo", "daftargenre"],
  category: "anime",
  description: "Panduan genre anime & manga - penjelasan & rekomendasi",
  usage: ".animegenre | .animegenre <nomor>",
  example: ".animegenre | .animegenre 1",
  isGroupOnly: false,
}

const GENRES = [
  { no: 1, nama: "Shounen", arti: "Untuk anak laki-laki remaja (12-18)", ciri: "Aksi, pertarungan, persahabatan, karakter yang berkembang dari lemah jadi kuat", contoh: "Naruto, One Piece, My Hero Academia, Demon Slayer, Jujutsu Kaisen" },
  { no: 2, nama: "Shoujo", arti: "Untuk anak perempuan remaja (12-18)", ciri: "Romansa, drama, emosi, fokus pada hubungan antar karakter & perasaan", contoh: "Sailor Moon, Fruits Basket, Ouran High School Host Club" },
  { no: 3, nama: "Seinen", arti: "Untuk dewasa pria (18+)", ciri: "Cerita matang, tema berat, kekerasan realistis, moral abu-abu, kompleks", contoh: "Berserk, Vinland Saga, Attack on Titan, Tokyo Ghoul, Monster" },
  { no: 4, nama: "Josei", arti: "Untuk dewasa wanita (18+)", ciri: "Romansa realistis, kehidupan dewasa, perasaan mendalam, slice of life", contoh: "Nana, Honey and Clover, Paradise Kiss" },
  { no: 5, nama: "Isekai", arti: "Dunia lain / transfer ke dunia paralel", ciri: "Karakter dipindahkan ke dunia fantasi, RPG, memiliki kekuatan baru, sering jadi pahlawan", contoh: "Re:Zero, Sword Art Online, That Time I Got Reincarnated as a Slime, Mushoku Tensei" },
  { no: 6, nama: "Mecha", arti: "Robot raksasa", ciri: "Pilot robot raksasa, pertempuran teknologi tinggi, drama politik & perang", contoh: "Gundam, Code Geass, Evangelion, Darling in the Franxx" },
  { no: 7, nama: "Slice of Life", arti: "Potongan kehidupan sehari-hari", ciri: "Kehidupan karakter, tidak ada plot besar, hangat & santai, fokus pada interaksi", contoh: "K-On!, Non Non Biyori, Barakamon, Lucky Star" },
  { no: 8, nama: "Romance", arti: "Cerita cinta", ciri: "Romansa, perasaan, hubungan berkembang, bisa drama atau komedi", contoh: "Toradora!, Your Lie in April, Clannad, Horimiya" },
  { no: 9, nama: "Comedy", arti: "Komedi / lucu", ciri: "Gurauan, absurd, parody, karakter unik, cerita santai & menghibur", contoh: "Gintama, One Punch Man, Konosuba, Grand Blue" },
  { no: 10, nama: "Action", arti: "Aksi & pertarungan", ciri: "Pertempuran, kekuatan, adrenalin, animasi epik, konflik intens", contoh: "Demon Slayer, Jujutsu Kaisen, Chainsaw Man, Bleach" },
  { no: 11, nama: "Fantasy", arti: "Dunia fantasi & sihir", ciri: "Sihir, naga, petualangan, dunia fiktif, ras (elf, dwarf, dll)", contoh: "Frieren, Made in Abyss, Re:Zero, Mushoku Tensei" },
  { no: 12, nama: "Horror", arti: "Horror / menakutkan", ciri: "Menakutkan, psikologis, supranatural, ketegangan, suspense", contoh: "Junji Ito Collection, Another, Higurashi, Shiki" },
  { no: 13, nama: "Psychological", arti: "Psikologis & mendalam", ciri: "Memanipulasi emosi, moral abu-abu, cerita yang memusingkan, mind game", contoh: "Death Note, Monster, Psycho-Pass, Steins;Gate" },
  { no: 14, nama: "Thriller", arti: "Menegangkan", ciri: "Suspense, misteri, ketegangan, plot twist, detektif & investigasi", contoh: "Erased, Death Note, The Promised Neverland, Terror in Resonance" },
  { no: 15, nama: "Mystery", arti: "Misteri & teka-teki", ciri: "Investigasi, rahasia, puzzle, karakter mencari tahu, plot twist", contoh: "Detective Conan, Hyouka, The Promised Neverland, Monster" },
  { no: 16, nama: "Sports", arti: "Olahraga", ciri: "Kompetisi, tim, latihan, rivalitas, semangat & persahabatan", contoh: "Haikyuu!!, Kuroko no Basket, Slam Dunk, Free!" },
  { no: 17, nama: "Supernatural", arti: "Supranatural", ciri: "Hantu, iblis, kekuatan gaib, dunia paralel, misteri kematian", contoh: "Bleach, Jujutsu Kaisen, Mob Psycho 100, Noragami" },
  { no: 18, nama: "Adventure", arti: "Petualangan", ciri: "Penjelajahan, perjalanan, dunia baru, teman baru, rintangan", contoh: "One Piece, Hunter x Hunter, Made in Abyss, Frieren" },
  { no: 19, nama: "Drama", arti: "Drama emosi", ciri: "Cerita berat, emosi mendalam, tragedi, kehidupan, keluarga", contoh: "Clannad, Anohana, Your Lie in April, Violet Evergarden" },
  { no: 20, nama: "Sci-Fi", arti: "Fiksi ilmiah", ciri: "Masa depan, teknologi, luar angkasa, AI, robot, dunia distopia", contoh: "Cowboy Bebop, Steins;Gate, Ghost in the Shell, Psycho-Pass" },
  { no: 21, nama: "Ecchi", arti: "Sedikit vulgar (18+)", ciri: "Fanservice, situasi suggestive, komedi dewasa, belum hentai", contoh: "High School DxD, To Love-Ru, Prison School" },
  { no: 22, nama: "Harem", arti: "Banyak wanita untuk 1 pria", ciri: "1 karakter pria dikelilingi banyak wanita yang suka padanya", contoh: "Date A Live, Nisekoi, The Quintessential Quintuplets" },
  { no: 23, nama: "Mecha", arti: "Robot/Machine", ciri: "Robot, Android, Cyborg", contoh: "Neon Genesis Evangelion, Code Geass, Gundam" },
  { no: 24, nama: "Magical Girl", arti: "Gadis ajaib", ciri: "Gadis dengan kekuatan sihir, transformasi, melindungi dunia", contoh: "Sailor Moon, Madoka Magica, Cardcaptor Sakura" },
  { no: 25, nama: "Yuri/Yaoi", arti: "Romansa sesama jenis", ciri: "Yuri (wanita-wanita), Yaoi (pria-pria), romansa sesama jenis", contoh: "Bloom Into You, Yuri on Ice, Given" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > GENRES.length) {
      let lines = []
      lines.push("Panduan Genre Anime & Manga")
      lines.push(GENRES.length + " Genre Tersedia")
      lines.push("")
      GENRES.forEach(g => {
        lines.push(g.no + ". " + g.nama + " - " + g.arti)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animegenre <nomor>")
      lines.push("Contoh: " + usedPrefix + "animegenre 5")
      return m.reply(claraWrap("Genre Anime", lines.join("\n")))
    }

    const g = GENRES[input - 1]
    return m.reply(claraWrap("Genre: " + g.nama, [
      "Arti: " + g.arti,
      "",
      "Ciri-ciri:",
      g.ciri,
      "",
      "Contoh Anime:",
      g.contoh,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Genre Anime", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
