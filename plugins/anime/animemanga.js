// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animemanga",
  aliases: ["animemanga", "mangainfo", "mangasearch", "mangadatabase"],
  category: "anime",
  description: "Database manga terbaik & rekomendasi berdasarkan genre",
  usage: ".animemanga | .animemanga <nomor>",
  example: ".animemanga | .animemanga 1",
  isGroupOnly: false,
}

const MANGA = [
  { no: 1, judul: "Berserk", mangaka: "Kentaro Miura", tahun: "1989-2021", chapter: "364+", status: "Ongoing (dilanjutkanStudio Gaga)", genre: "Dark Fantasy, Action, Drama", score: 10, sinopsis: "Guts, prajurit yang kehilangan segalanya, melawan takdir & iblis. Dunia gelap, brutal, filosofis. Manga dark fantasy terbaik sepanjang masa." },
  { no: 2, judul: "One Piece", mangaka: "Eiichiro Oda", tahun: "1997-sekarang", chapter: "1100+", status: "Ongoing", genre: "Adventure, Comedy, Action", score: 10, sinopsis: "Luffy & kru Topi Jerami mencari harta karun One Piece untuk menjadi Pirate King. Dunia terluas & paling detail dalam manga. Petualangan tak ada habisnya." },
  { no: 3, judul: "Monster", mangaka: "Naoki Urasawa", tahun: "1994-2001", chapter: "162", status: "Completed", genre: "Psychological, Thriller, Mystery", score: 10, sinopsis: "Dr. Kenzo Tenma menyelamatkan anak yang ternyata menjadi monster psikopat. Thriller psikologis terbaik, villain Johan Liebert paling mengerikan." },
  { no: 4, judul: "Vagabond", mangaka: "Takehiko Inoue", tahun: "1998-sekarang", chapter: "379", status: "Hiatus", genre: "Historical, Action, Drama", score: 9, sinopsis: "Kisah Miyamoto Musashi, pendekar pedang legendaris Jepang. Seni luar biasa, filosofi mendalam tentang hidup & pedang." },
  { no: 5, judul: "Vinland Saga", mangaka: "Makoto Yukimura", tahun: "2005-sekarang", chapter: "200+", status: "Ongoing", genre: "Historical, Action, Drama", score: 9, sinopsis: "Thorfinn, Viking yang mencari Vinland (negeri tanpa perang). Dari dendam ke perdamaian. Manga dengan development karakter terbaik." },
  { no: 6, judul: "Fullmetal Alchemist", mangaka: "Hiromu Arakawa", tahun: "2001-2010", chapter: "108", status: "Completed", genre: "Action, Adventure, Fantasy", score: 10, sinopsis: "Edward & Alphonse Elric mencari Philosopher's Stone untuk mengembalikan tubuh mereka. Cerita sempurna, ending memuaskan, tema pengorbanan & ekuivalen." },
  { no: 7, judul: "Slam Dunk", mangaka: "Takehiko Inoue", tahun: "1990-1996", chapter: "31 vol", status: "Completed", genre: "Sports, Comedy, Drama", score: 9, sinopsis: "Hanamichi Sakuragi, anak delinquen yang masuk basket demi pacar. Basket manga paling berpengaruh, membuat basket populer di Jepang." },
  { no: 8, judul: "20th Century Boys", mangaka: "Naoki Urasawa", tahun: "1999-2006", chapter: "162", status: "Completed", genre: "Mystery, Thriller, Sci-Fi", score: 9, sinopsis: "Sekelompok anak yang dulu mimpikan kiamat kini harus mencegahnya saat dewasa. Mystery yang melibatkan masa lalu, kult, & manipulasi." },
  { no: 9, judul: "Kingdom", mangaka: "Yasuhisa Hara", tahun: "2006-sekarang", chapter: "700+", status: "Ongoing", genre: "Historical, Action, Strategy", score: 9, sinopsis: "Era Negara Berperang Tiongkok, Xin (Shin) bercita-cita menjadi jenderal terbesar. Strategi perang & sejarah epik." },
  { no: 10, judul: "Berserk", mangaka: "Kentaro Miura", tahun: "1989-2021", chapter: "364+", status: "Ongoing", genre: "Dark Fantasy", score: 10, sinopsis: "Sudah ada di #1, tapi perlu ditegaskan: manga terbaik sepanjang masa. Baca jika berani." },
  { no: 11, judul: "Chainsaw Man", mangaka: "Tatsuki Fujimoto", tahun: "2018-sekarang", chapter: "150+", status: "Ongoing", genre: "Action, Horror, Fantasy", score: 9, sinopsis: "Denji menyatu dengan Pochita (Chainsaw Devil). Brutal, gila, tapi emosional. Manga paling unik & inovatif saat ini." },
  { no: 12, judul: "Jujutsu Kaisen", mangaka: "Gege Akutami", tahun: "2018-sekarang", chapter: "240+", status: "Ongoing", genre: "Action, Supernatural, Fantasy", score: 8, sinopsis: "Yuji Itadori menelan jari Sukuna untuk menyelamatkan teman. Action, system cursed energy terbaik, plot twist brutal." },
  { no: 13, judul: "Demon Slayer (Kimetsu no Yaiba)", mangaka: "Koyoharu Gotouge", tahun: "2016-2020", chapter: "205", status: "Completed", genre: "Action, Fantasy, Historical", score: 8, sinopsis: "Tanjiro berlatih menjadi Demon Slayer untuk menyelamatkan adiknya Nezuko. Cerita lengkap, ending memuaskan." },
  { no: 14, judul: "Vagabond", mangaka: "Takehiko Inoue", tahun: "1998-sekarang", chapter: "379", status: "Hiatus", genre: "Historical, Action", score: 9, sinopsis: "Sudah ada di #4. Karya seni tertinggi dalam manga. Baca untuk mengagumi seni." },
  { no: 15, judul: "Oyasumi Punpun", mangaka: "Inio Asano", tahun: "2007-2013", chapter: "146", status: "Completed", genre: "Slice of Life, Drama, Psychological", score: 9, sinopsis: "Kehidupan Punpun dari anak hingga dewasa. Depresi, cinta, kegagalan. Manga paling realistis & menyakitkan tentang tumbuh dewasa." },
  { no: 16, judul: "Goodnight Punpun", mangaka: "Inio Asano", tahun: "2007-2013", chapter: "146", status: "Completed", genre: "Slice of Life, Drama", score: 9, sinopsis: "Sama dengan #15 (judul alternatif). Manga yang menghancurkan batin pembaca." },
  { no: 17, judul: "Made in Abyss", mangaka: "Akihito Tsukushi", tahun: "2012-sekarang", chapter: "70+", status: "Ongoing", genre: "Adventure, Fantasy, Horror", score: 9, sinipsis: "Riko & Reg turun ke Abyss, jurang misterius berbahaya. Lucu tapi brutal. Dunia fantasi paling unik." },
  { no: 18, judul: "Tower of God", mangaka: "SIU", tahun: "2010-sekarang", chapter: "600+", status: "Hiatus", genre: "Action, Fantasy, Mystery", score: 8, sinopsis: "Bam masuk Menara untuk menemukan Rachel. Setiap lantai adalah ujian. Webtoon terbaik dari Korea." },
  { no: 19, judul: "Solo Leveling", mangaka: "Chugong (novel) / Dubu", tahun: "2016-2021", chapter: "179", status: "Completed", genre: "Action, Fantasy, RPG", score: 8, sinopsis: "Sung Jinwoo, hunter terlemah, tiba-tiba dapat sistem untuk menjadi terkuat. Dari nol ke pahlawan. Webtoon paling populer." },
  { no: 20, judul: "The Breaker", mangaka: "Jeon Geuk-jin & Park Jin-hwan", tahun: "2007-sekarang", chapter: "250+", status: "Ongoing", genre: "Action, Martial Arts, Drama", score: 8, sinopsis: "Shioon, siswa yang di-bully, menjadi murid master bela diri. Aksi & martial arts terbaik dari webtoon Korea." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > MANGA.length) {
      let lines = []
      lines.push("Database " + MANGA.length + " Manga Terbaik")
      lines.push("")
      MANGA.forEach(mg => {
        lines.push(mg.no + ". " + mg.judul + " [" + mg.genre.split(",")[0] + "]")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animemanga <nomor>")
      lines.push("Contoh: " + usedPrefix + "animemanga 1")
      return m.reply(claraWrap("Database Manga", lines.join("\n")))
    }

    const mg = MANGA[input - 1]
    return m.reply(claraWrap("Manga: " + mg.judul, [
      "Mangaka: " + mg.mangaka,
      "Tahun: " + mg.tahun,
      "Chapter: " + mg.chapter,
      "Status: " + mg.status,
      "Genre: " + mg.genre,
      "Score: " + mg.score + "/10",
      "",
      "Sinopsis:",
      mg.sinopsis,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Database Manga", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
