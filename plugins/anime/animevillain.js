// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "animevillain",
  alias: ["animevillain"],
  aliases: ["animevillain", "animeantagonist", "topvillain", "villainanime"],
  category: "anime",
  description: "Database villain/antagonist anime terbaik",
  usage: ".animevillain | .animevillain <nomor>",
  example: ".animevillain | .animevillain 1",
  isGroupOnly: false,
}

const VILLAINS = [
  { no: 1, nama: "Johan Liebert", anime: "Monster", role: "Antagonist Utama", kejahatan: "Manipulasi psikologis, pembunuhan, menghancurkan kehidupan orang tanpa fisik", motivasi: "Membuktikan bahwa semua orang bisa jadi monster dengan tekanan yang tepat", tingkat: "10/10 - Paling mengerikan karena tidak ada kekuatan super, hanya kata-kata", quote: "Pada akhirnya, satu-satunya hal yang penting adalah: apakah kamu bisa membunuh atau tidak." },
  { no: 2, nama: "Meruem", anime: "Hunter x Hunter", role: "Raja Semut Chimera", kejahatan: "Membantai jutaan manusia, memakan brain, lahir untuk dominasi", motivasi: "Awalnya dominasi murni, tapi berkembang menjadi pencarian makna kehidupan", tingkat: "9/10 - Villain dengan development terbaik, dari monster jadi filosofis", quote: "Aku ingin hidup sebagai manusia. Bukan sebagai Raja." },
  { no: 3, nama: "Muzan Kibutsuji", anime: "Demon Slayer", role: "Raja Iblis", kejahatan: "Membunuh ribuan, mengubah manusia jadi iblis, hidup abadi dengan ketakutan", motivasi: "Keabadian & ketahanan tubuh, takut mati, menindas semua yang lemah", tingkat: "8/10 - Villain murni jahat, tapi punya ketakutan dasar manusia", quote: "Aku tidak takut mati. Aku takut tidak sempurna." },
  { no: 4, nama: "Light Yagami (Kira)", anime: "Death Note", role: "Anti-Hero / Antagonist", kejahatan: "Membunuh ribuan penjahat dengan Death Note, menjadi 'Tuhan' dunia baru", motivasi: "Menciptakan dunia tanpa kejahatan, tapi ego & kekuasaan mengambil alih", tingkat: "9/10 - Villain yang penonton sempat mendukung", quote: "Aku adalah keadilan dunia ini. Aku akan menjadi Tuhan dunia baru." },
  { no: 5, nama: "Griffith (Femto)", anime: "Berserk", role: "Antagonist Utama", kejahatan: "Mengorbankan sahabat-sahabatnya untuk kekuasaan, memperkosa Casca di depan Guts", motivasi: "Ambisi mendapatkan kerajaannya sendiri, apapun harganya", tingkat: "10/10 - Pengkhianatan paling menyakitkan dalam sejarah anime", quote: "Aku tidak akan mengorbankan impianku. Untuk alasan apapun." },
  { no: 6, nama: "Aizen Sousuke", anime: "Bleach", role: "Antagonist Utama", kejahatan: "Manipulasi Soul Society berabad-abad, eksperimen pada orang, berkhianat", motivasi: "Menjadi penguasa tertinggi, mencapai level Tuhan", tingkat: "8/10 - Mastermind dengan rencana sangat panjang", quote: "Sejak kapan kau berpikir aku tidak mengendalikanmu?" },
  { no: 7, nama: "Madara Uchiha", anime: "Naruto Shippuden", role: "Legend / Antagonist", kejahatan: "Memulai perang dunia ninja, mengontrol Bijuu, Infinite Tsukuyomi", motivasi: "Menciptakan perdamaian dengan cara ilusi (semua orang dalam mimpi bahagia)", tingkat: "9/10 - Villain dengan filosofi yang masuk akal", quote: "Perdamaian ada di dalam ilusi. Tapi realitas adalah perang." },
  { no: 8, nama: "Sosuke Aizen", anime: "Bleach", role: "Captain Traitor", kejahatan: "Memanipulasi Soul Society, eksperimen Hollow, menghancurkan kepercayaan", motivasi: "Mencapai kekuatan tertinggi, melampaui Tuhan", tingkat: "8/10 - Cool, kalkulator, tidak pernah panik", quote: "Kesempurnaan butuh pengorbanan. Dan aku tidak akan berkompromi." },
  { no: 9, nama: "Shigaraki Tomura", anime: "My Hero Academia", role: "Leader of Villains", kejahatan: "Membunuh keluarganya sendiri, memimpin League of Villains, menghancurkan kota", motivasi: "Menghancurkan sistem hero yang dianggap munafik, dendam masa kecil", tingkat: "8/10 - Villain dengan trauma mendalam & development", quote: "Aku tidak ingin menjadi pahlawan. Aku ingin menghancurkan segalanya." },
  { no: 10, nama: "Sukuna Ryomen", anime: "Jujutsu Kaisen", role: "Raja Kutukan", kejahatan: "Membantai ribuan di era Heian, menggunakan tubuh Yuji untuk kebebasan", motivasi: "Kekacauan murni, kekuasaan, kemerdekaan tanpa batas", tingkat: "9/10 - Villain yang tidak bisa diredeem, murni jahat & powerful", quote: "Aku adalah kutukan. Dan kau hanyalah wadahku." },
  { no: 11, nama: "Dio Brando", anime: "JoJo's Bizarre Adventure", role: "Antagonist Utama", kejahatan: "Membunuh keluarga Joestar, vampir, manipulasi waktu, kejahatan lintas generasi", motivasi: "Dominasi mutlak, kekuasaan, menjadi Tuhan", tingkat: "9/10 - Ikonik, immortal, villain paling 'DIO' dalam sejarah", quote: "Oh? You're approaching me? Instead of running away, you're coming right to me?" },
  { no: 12, nama: "Enrico Pucci", anime: "JoJo's Bizarre Adventure", role: "Antagonist (Part 6)", kejahatan: "Menciptakan surga sesuai keinginan DIO, mengorbankan banyak nyawa", motivasi: "Mencapai 'Surga' yang dirancang DIO, memanipulasi takdir", tingkat: "8/10 - Villain dengan misi religius yang menegangkan", quote: "Aku mengejar surga. Dan surga adalah milikku." },
  { no: 13, nama: "All For One", anime: "My Hero Academia", role: "Lord of Evil", kejahatan: "Mencuri Quirk orang lain, memanipulasi sejarah, musuh abadi One For All", motivasi: "Dominasi total, mengontrol semua Quirk di dunia", tingkat: "9/10 - Villain paling lama bertahan, mastermind sejati", quote: "Aku akan mengambil segalanya darimu. Seperti yang selalu kulakukan." },
  { no: 14, nama: "Naraku", anime: "Inuyasha", role: "Antagonist Utama", kejahatan: "Manipulasi, memanipulasi emosi Inuyasha & Kikyo, membunuh banyak orang", motivasi: "Mendapatkan Shikon Jewel untuk kekuatan mutlak, keinginan jadi penuh", tingkat: "7/10 - Villain licik & tahan lama", quote: "Aku akan memiliki Shikon Jewel. Apapun yang terjadi." },
  { no: 15, nama: "Kaido", anime: "One Piece", role: "Yonko", kejahatan: "Menjajah Wano, memaksa rakyat kerja, mendominasi dengan takut", motivasi: "Mencari perang terakhir yang epik, mati dengan kehormatan", tingkat: "8/10 - Villain dengan filosofi 'kematian yang mulia'", quote: "Apakah kau bisa membunuhku? Ayo, coba. Aku tidak bisa mati." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > VILLAINS.length) {
      let lines = []
      lines.push("Database " + VILLAINS.length + " Villain Anime Terbaik")
      lines.push("")
      VILLAINS.forEach(v => {
        lines.push(v.no + ". " + v.nama + " (" + v.anime + ")")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animevillain <nomor>")
      lines.push("Contoh: " + usedPrefix + "animevillain 1")
      return m.reply(raraWrap("Villain Anime", lines.join("\n")))
    }

    const v = VILLAINS[input - 1]
    return m.reply(raraWrap("Villain: " + v.nama, [
      "Anime: " + v.anime,
      "Role: " + v.role,
      "",
      "Kejahatan:",
      v.kejahatan,
      "",
      "Motivasi:",
      v.motivasi,
      "",
      "Tingkat Keganasan:",
      v.tingkat,
      "",
      "Quote:",
      '"' + v.quote + '"',
    ].join("\n")))
  } catch (e) {
    return m.reply(raraWrap("Villain Anime", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
