// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "animestudio",
  alias: ["animestudio"],
  aliases: ["animestudio", "studioanime", "studiodatabase", "studioinfo"],
  category: "anime",
  description: "Database studio anime & karya-karya terbaiknya",
  usage: ".animestudio | .animestudio <nomor>",
  example: ".animestudio | .animestudio 1",
  isGroupOnly: false,
}

const STUDIOS = [
  { no: 1, nama: "ufotable", tahun: "2000", negara: "Jepang", karya: "Demon Slayer: Kimetsu no Yaiba, Fate/stay night: Unlimited Blade Works, Fate/Zero, Garden of Sinners", kelebihan: "Animasi epik, efek visual menakjubkan, CGI terbaik, koreografi pertarungan sinematik", kekurangan: "Jadwal rilis lama, jarang produksi paralel" },
  { no: 2, nama: "MAPPA", tahun: "2011", negara: "Jepang", karya: "Attack on Titan Final Season, Jujutsu Kaisen, Chainsaw Man, Vinland Saga S2, Yuri on Ice, Hell's Paradise", kelebihan: "Kualitas animasi terkini, ambisius, adaptasi manga besar, animasi aksi memukau", kekurangan: "Kondisi kerja animator sering dikritik, jadwal ketat" },
  { no: 3, nama: "Studio Ghibli", tahun: "1985", negara: "Jepang", karya: "Spirited Away, Princess Mononoke, Howl's Moving Castle, My Neighbor Totoro, Grave of the Fireflies", kelebihan: "Karya masterpiece, animasi tangan terbaik, cerita puitis & universal, karya Hayao Miyazaki", kekurangan: "Produksi lama, tidak banyak serial TV" },
  { no: 4, nama: "Madhouse", tahun: "1972", negara: "Jepang", karya: "Hunter x Hunter 2011, Death Note, One Punch Man, Monster, No Game No Life, Frieren", kelebihan: "Kualitas cerita terbaik, adaptasi manga/novel matang, animasi konsisten tinggi", kekurangan: "Beberapa proyek grafik tidak setara dengan animasi" },
  { no: 5, nama: "Bones", tahun: "1998", negara: "Jepang", karya: "Fullmetal Alchemist: Brotherhood, My Hero Academia, Mob Psycho 100, Soul Eater, Ouran High School Host Club", kelebihan: "Animasi aksi terbaik, komedi & action seimbang, adaptasi manga populer", kekurangan: "Animasi bisa fluktuatif tergantung tim" },
  { no: 6, nama: "Kyoto Animation (KyoAni)", tahun: "1985", negara: "Jepang", karya: "Violet Evergarden, A Silent Voice, Clannad, K-On!, Hibike Euphonium, Free!", kelebihan: "Detail animasi luar biasa, emosi mendalam, kualitas konsisten, karakter anak perempuan terbaik", kekurangan: "Genre terbatas, jarang action berat" },
  { no: 7, nama: "WIT Studio", tahun: "2012", negara: "Jepang", karya: "Attack on Titan S1-3, Vinland Saga S1, Spy x Family, The Ancient Magus Bride, Owarimono", kelebihan: "Animasi 3D/2D hybrid inovatif, koreografi pertempuran dinamis, sinematik", kekurangan: "Tingkat produksi tidak sebanyak studio besar" },
  { no: 8, nama: "Production I.G", tahun: "1993", negara: "Jepang", karya: "Haikyuu!!, Psycho-Pass, Ghost in the Shell, Kuroko no Basket, Ao Haru Ride", kelebihan: "Animasi sport terbaik, teknologi CGI matang, kualitas konsisten", kekurangan: "Jarang genre action fantasy berat" },
  { no: 9, nama: "A-1 Pictures", tahun: "2005", negara: "Jepang", karya: "Sword Art Online, Your Lie in April, Anohana, Erased, Solo Leveling, Kaguya-sama", kelebihan: "Produktifitas tinggi, banyak genre, animasi bagus & konsisten", kekurangan: "Beberapa proyek 'rush', kualitas bervariasi" },
  { no: 10, nama: "CloverWorks", tahun: "2018", negara: "Jepang", karya: "Spy x Family, Bocchi the Rock!, Horimiya, The Promised Neverland S1, Darling in the Franxx (co-production)", kelebihan: "Studio baru dengan kualitas tinggi, inovatif, genre comedy & drama terbaik", kekurangan: "Katalog masih terbatas, studio spin-off" },
  { no: 11, nama: "Toei Animation", tahun: "1948", negara: "Jepang", karya: "One Piece, Dragon Ball Z, Sailor Moon, Naruto (movie), Digimon", kelebihan: "Studio veteran, karya legendaris, franchise terbesar & paling lama", kekurangan: "Animasi terkadang tidak konsisten, episode filler" },
  { no: 12, nama: "Pierrot", tahun: "1979", negara: "Jepang", karya: "Naruto Shippuden, Bleach, Black Clover, Tokyo Ghoul, Yu Yu Hakusho", kelebihan: "Spesialis shounen panjang, produktif, animasi aksi bagus saat 'serious mode'", kekurangan: "Banyak filler, animasi terkadang drop" },
  { no: 13, nama: "Shaft", tahun: "1975", negara: "Jepang", karya: "Monogatari Series, Madoka Magica, March Comes in Like a Lion, Nisekoi", kelebihan: "Gaya visual unik & eksperimental, storyboard tak biasa, artistik", kekurangan: "Gaya tidak untuk semua orang, plot kadang membingungkan" },
  { no: 14, nama: "Trigger", tahun: "2011", negara: "Jepang", karya: "Kill la Kill, Cyberpunk: Edgerunners, Darling in the Franxx (co), Little Witch Academia, Promare", kelebihan: "Animasi hiperaktif & penuh gaya, aksi ekstrim, inovatif", kekurangan: "Gaya terlalu unik untuk semua penonton" },
  { no: 15, nama: "White Fox", tahun: "2007", negara: "Jepang", karya: "Re:Zero, Steins;Gate, The Eminence in Shadow, Akame ga Kill, Goblin Slayer", kelebihan: "Adaptasi visual novel & light novel terbaik, drama emosional, detail cerita", kekurangan: "Produksi tidak sebanyak studio besar" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > STUDIOS.length) {
      let lines = []
      lines.push("Database " + STUDIOS.length + " Studio Anime")
      lines.push("")
      STUDIOS.forEach(s => {
        lines.push(s.no + ". " + s.nama + " (" + s.tahun + ")")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animestudio <nomor>")
      lines.push("Contoh: " + usedPrefix + "animestudio 3 (Ghibli)")
      return m.reply(raraWrap("Studio Anime", lines.join("\n")))
    }

    const s = STUDIOS[input - 1]
    return m.reply(raraWrap("Studio: " + s.nama, [
      "Berdiri: " + s.tahun,
      "Negara: " + s.negara,
      "",
      "Karya Terkenal:",
      s.karya,
      "",
      "Kelebihan:",
      s.kelebihan,
      "",
      "Kekurangan:",
      s.kekurangan,
    ].join("\n")))
  } catch (e) {
    return m.reply(raraWrap("Studio Anime", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
