// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animetop",
  aliases: ["animetop", "topanime", "animeranking", "animerank"],
  category: "anime",
  description: "Top 50 anime terbaik sepanjang masa (MyAnimeList ranking)",
  usage: ".animetop | .animetop <page>",
  example: ".animetop | .animetop 2",
  isGroupOnly: false,
}

const TOP_ANIME = [
  { rank: 1, judul: "Fullmetal Alchemist: Brotherhood", score: 9.1, tahun: 2009, studio: "Bones", genre: "Action, Adventure, Drama", status: "Completed" },
  { rank: 2, judul: "Attack on Titan: Final Season", score: 9.0, tahun: 2021, studio: "MAPPA", genre: "Action, Drama, Mystery", status: "Completed" },
  { rank: 3, judul: "Steins;Gate", score: 9.0, tahun: 2011, studio: "White Fox", genre: "Sci-Fi, Thriller", status: "Completed" },
  { rank: 4, judul: "Gintama", score: 8.9, tahun: 2006, studio: "Sunrise", genre: "Action, Comedy, Sci-Fi", status: "Completed" },
  { rank: 5, judul: "Hunter x Hunter (2011)", score: 8.9, tahun: 2011, studio: "Madhouse", genre: "Action, Adventure, Fantasy", status: "Completed" },
  { rank: 6, judul: "Gintama: The Very Final", score: 8.8, tahun: 2021, studio: "Bandai Namco", genre: "Action, Comedy", status: "Completed" },
  { rank: 7, judul: "Demon Slayer: Mugen Train", score: 8.7, tahun: 2020, studio: "ufotable", genre: "Action, Fantasy", status: "Completed" },
  { rank: 8, judul: "Code Geass: Lelouch of the Rebellion", score: 8.7, tahun: 2006, studio: "Sunrise", genre: "Action, Mecha, Sci-Fi", status: "Completed" },
  { rank: 9, judul: "One Piece", score: 8.6, tahun: 1999, studio: "Toei Animation", genre: "Action, Adventure, Comedy", status: "Ongoing" },
  { rank: 10, judul: "Naruto: Shippuden", score: 8.6, tahun: 2007, studio: "Pierrot", genre: "Action, Adventure", status: "Completed" },
  { rank: 11, judul: "Attack on Titan", score: 8.5, tahun: 2013, studio: "WIT Studio", genre: "Action, Drama, Mystery", status: "Completed" },
  { rank: 12, judul: "Death Note", score: 8.5, tahun: 2006, studio: "Madhouse", genre: "Mystery, Thriller", status: "Completed" },
  { rank: 13, judul: "My Hero Academia", score: 8.4, tahun: 2016, studio: "Bones", genre: "Action, Comedy, School", status: "Ongoing" },
  { rank: 14, judul: "Jujutsu Kaisen", score: 8.4, tahun: 2020, studio: "MAPPA", genre: "Action, Fantasy", status: "Ongoing" },
  { rank: 15, judul: "Demon Slayer: Kimetsu no Yaiba", score: 8.4, tahun: 2019, studio: "ufotable", genre: "Action, Fantasy", status: "Completed" },
  { rank: 16, judul: "Bleach: Thousand-Year Blood War", score: 8.4, tahun: 2022, studio: "Pierrot", genre: "Action, Fantasy", status: "Ongoing" },
  { rank: 17, judul: "Haikyuu!!", score: 8.4, tahun: 2014, studio: "Production IG", genre: "Sports, Comedy", status: "Completed" },
  { rank: 18, judul: "Vinland Saga", score: 8.4, tahun: 2019, studio: "WIT Studio", genre: "Action, Adventure, Drama", status: "Completed" },
  { rank: 19, judul: "Tokyo Ghoul", score: 8.0, tahun: 2014, studio: "Pierrot", genre: "Action, Horror, Supernatural", status: "Completed" },
  { rank: 20, judul: "Re:Zero", score: 8.2, tahun: 2016, studio: "White Fox", genre: "Drama, Fantasy, Thriller", status: "Ongoing" },
  { rank: 21, judul: "Mob Psycho 100", score: 8.5, tahun: 2016, studio: "Bones", genre: "Action, Comedy, Supernatural", status: "Completed" },
  { rank: 22, judul: "Made in Abyss", score: 8.7, tahun: 2017, studio: "Kinema Citrus", genre: "Adventure, Drama, Fantasy", status: "Ongoing" },
  { rank: 23, judul: "Your Name (Kimi no Na wa)", score: 8.9, tahun: 2016, studio: "CoMix Wave", genre: "Drama, Romance, Supernatural", status: "Completed" },
  { rank: 24, judul: "A Silent Voice (Koe no Katachi)", score: 8.9, tahun: 2016, studio: "Kyoto Animation", genre: "Drama, Romance, School", status: "Completed" },
  { rank: 25, judul: "Princess Mononoke", score: 8.7, tahun: 1997, studio: "Ghibli", genre: "Action, Adventure, Fantasy", status: "Completed" },
  { rank: 26, judul: "Spirited Away", score: 8.6, tahun: 2001, studio: "Ghibli", genre: "Adventure, Fantasy", status: "Completed" },
  { rank: 27, judul: "Howl's Moving Castle", score: 8.7, tahun: 2004, studio: "Ghibli", genre: "Adventure, Fantasy, Romance", status: "Completed" },
  { rank: 28, judul: "Dragon Ball Z", score: 8.2, tahun: 1989, studio: "Toei Animation", genre: "Action, Adventure", status: "Completed" },
  { rank: 29, judul: "Jojo's Bizarre Adventure", score: 8.3, tahun: 2012, studio: "David Production", genre: "Action, Adventure", status: "Ongoing" },
  { rank: 30, judul: " Chainsaw Man", score: 8.3, tahun: 2022, studio: "MAPPA", genre: "Action, Fantasy, Horror", status: "Completed" },
  { rank: 31, judul: "Spy x Family", score: 8.5, tahun: 2022, studio: "Wit/CloverWorks", genre: "Action, Comedy, Slice of Life", status: "Ongoing" },
  { rank: 32, judul: "Oshi no Ko", score: 8.4, tahun: 2023, studio: "Doga Kobo", genre: "Drama, Supernatural", status: "Ongoing" },
  { rank: 33, judul: "Bocchi the Rock!", score: 8.7, tahun: 2022, studio: "CloverWorks", genre: "Comedy, Music, Slice of Life", status: "Completed" },
  { rank: 34, judul: "Cyberpunk: Edgerunners", score: 8.6, tahun: 2022, studio: "Trigger", genre: "Action, Sci-Fi", status: "Completed" },
  { rank: 35, judul: "Frieren: Beyond Journey's End", score: 9.0, tahun: 2023, studio: "Madhouse", genre: "Adventure, Drama, Fantasy", status: "Ongoing" },
  { rank: 36, judul: "Vinland Saga S2", score: 8.8, tahun: 2023, studio: "MAPPA", genre: "Adventure, Drama", status: "Completed" },
  { rank: 37, judul: "Mushishi", score: 8.7, tahun: 2005, studio: "Artland", genre: "Adventure, Mystery, Slice of Life", status: "Completed" },
  { rank: 38, judul: "Monogatari Series", score: 8.6, tahun: 2009, studio: "Shaft", genre: "Mystery, Romance, Supernatural", status: "Completed" },
  { rank: 39, judul: "Cowboy Bebop", score: 8.7, tahun: 1998, studio: "Sunrise", genre: "Action, Sci-Fi, Space", status: "Completed" },
  { rank: 40, judul: "Samurai Champloo", score: 8.5, tahun: 2004, studio: "Manglobe", genre: "Action, Adventure, Comedy", status: "Completed" },
  { rank: 41, judul: "Berserk (1997)", score: 8.7, tahun: 1997, studio: "OLM", genre: "Action, Adventure, Drama", status: "Completed" },
  { rank: 42, judul: "Neon Genesis Evangelion", score: 8.4, tahun: 1995, studio: "Gainax", genre: "Action, Drama, Mecha", status: "Completed" },
  { rank: 43, judul: "Clannad: After Story", score: 8.9, tahun: 2008, studio: "Kyoto Animation", genre: "Drama, Romance, Slice of Life", status: "Completed" },
  { rank: 44, judul: "Toradora!", score: 8.1, tahun: 2008, studio: "J.C. Staff", genre: "Comedy, Romance, Slice of Life", status: "Completed" },
  { rank: 45, judul: "Anohana", score: 8.3, tahun: 2011, studio: "A-1 Pictures", genre: "Drama, Slice of Life, Supernatural", status: "Completed" },
  { rank: 46, judul: "Erased (Boku dake ga Inai Machi)", score: 8.5, tahun: 2016, studio: "A-1 Pictures", genre: "Mystery, Psychological, Supernatural", status: "Completed" },
  { rank: 47, judul: "Dr. Stone", score: 8.2, tahun: 2019, studio: "TMS Entertainment", genre: "Adventure, Comedy, Sci-Fi", status: "Ongoing" },
  { rank: 48, judul: "Black Clover", score: 8.2, tahun: 2017, studio: "Pierrot", genre: "Action, Comedy, Fantasy", status: "Ongoing" },
  { rank: 49, judul: "Chainsaw Man", score: 8.5, tahun: 2022, studio: "MAPPA", genre: "Action, Fantasy, Horror", status: "Ongoing" },
  { rank: 50, judul: "Solo Leveling", score: 8.5, tahun: 2024, studio: "A-1 Pictures", genre: "Action, Adventure, Fantasy", status: "Ongoing" },
]

const PER_PAGE = 10

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const page = parseInt(args[0]) || 1
    const maxPage = Math.ceil(TOP_ANIME.length / PER_PAGE)

    if (page < 1 || page > maxPage) {
      return m.reply(claraWrap("Top Anime", "Halaman tidak valid. Tersedia 1-" + maxPage + "\nCara: " + usedPrefix + "animetop <halaman>"))
    }

    const start = (page - 1) * PER_PAGE
    const end = start + PER_PAGE
    const list = TOP_ANIME.slice(start, end)

    let lines = []
    lines.push("Top 50 Anime Terbaik (MyAnimeList)")
    lines.push("Halaman " + page + "/" + maxPage)
    lines.push("")
    list.forEach(a => {
      lines.push("#" + a.rank + " " + a.judul)
      lines.push("   Score: " + a.score + " | " + a.tahun + " | " + a.studio)
      lines.push("   Genre: " + a.genre + " | " + a.status)
    })
    lines.push("")
    if (page < maxPage) {
      lines.push("Halaman selanjutnya: " + usedPrefix + "animetop " + (page + 1))
    } else {
      lines.push("Ini halaman terakhir!")
    }

    return m.reply(claraWrap("Top Anime #" + page, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Top Anime", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
