// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animequote",
  alias: ["animequote"],
  aliases: ["animequote", "quotesanime", "quotanime", "kataanime"],
  category: "anime",
  description: "Kumpulan quote anime terkenar - Naruto, One Piece, AoT, dll",
  usage: ".animequote | .animequote <nomor>",
  example: ".animequote | .animequote 1",
  isGroupOnly: false,
}

const QUOTES = [
  { no: 1, anime: "Naruto", karakter: "Uzumaki Naruto", quote: "I'm not gonna run away, I never go back on my word! That's my nindo: my ninja way!", indo: "Aku tidak akan lari, aku tidak pernah mengingkari kata-kataku! Itu jalanku: jalan ninja-ku!" },
  { no: 2, anime: "Naruto", karakter: "Uchiha Itachi", quote: "It is not wise to judge others based on your own preconceptions. When you stop imagining things, you will learn their true nature.", indo: "Tidak bijaksana menilai orang lain berdasarkan prasangka sendiri. Saat kau berhenti membayangkan, kau akan melihat sifat asli mereka." },
  { no: 3, anime: "Naruto", karakter: "Hatake Kakashi", quote: "In the ninja world, those who break the rules are scum, that's true. But those who abandon their friends are worse than scum.", indo: "Di dunia ninja, yang melanggar aturan adalah sampah, itu benar. Tapi yang meninggalkan teman lebih buruk dari sampah." },
  { no: 4, anime: "One Piece", karakter: "Monkey D. Luffy", quote: "If you don't take risks, you can't create a future!", indo: "Jika kau tidak mengambil risiko, kau tidak bisa menciptakan masa depan!" },
  { no: 5, anime: "One Piece", karakter: "Portgas D. Ace", quote: "You should be able to go forward with the things you treasure. Live and die by that belief!", indo: "Kau harus bisa maju dengan hal-hal yang kau syangi. Hidup dan mati dengan keyakinan itu!" },
  { no: 6, anime: "One Piece", karakter: "Dr. Hiluluk", quote: "When do you think people die? When they are forgotten!", indo: "Kapan orang mati? Saat mereka dilupakan!" },
  { no: 7, anime: "Attack on Titan", karakter: "Eren Yeager", quote: "I don't want to die like this! I want to live! I want to keep living!", indo: "Aku tidak ingin mati seperti ini! Aku ingin hidup! Aku ingin terus hidup!" },
  { no: 8, anime: "Attack on Titan", karakter: "Levi Ackerman", quote: "The only thing we're allowed to do is believe that we won't regret the choice we made.", indo: "Satu-satunya yang boleh kita lakukan adalah percaya bahwa kita tidak akan menyesali pilihan yang kita buat." },
  { no: 9, anime: "Attack on Titan", karakter: "Eren Yeager", quote: "If you don't fight, you can't win.", indo: "Jika kau tidak berjuang, kau tidak bisa menang." },
  { no: 10, anime: "Demon Slayer", karakter: "Kamado Tanjiro", quote: "Don't ever give up. Even if it's painful, even if it's agonizing, don't try to take your own life.", indo: "Jangan pernah menyerah. Meski menyakitkan, meski menyiksa, jangan mencoba mengakhiri hidupmu sendiri." },
  { no: 11, anime: "Demon Slayer", karakter: "Rengoku Kyojuro", quote: "Set your heart ablaze! Burn with passion! Let your heart be what guides you!", indo: "Bakar hatimu! Berkobarlah dengan semangat! Biarkan hatimu yang memandumu!" },
  { no: 12, anime: "Jujutsu Kaisen", karakter: "Satoru Gojo", quote: "Love is the most twisted curse of all.", indo: "Cinta adalah kutukan paling terpelintir dari semua." },
  { no: 13, anime: "Jujutsu Kaisen", karakter: "Yuji Itadori", quote: "I'll do what I can. I'll keep fighting until I die.", indo: "Aku akan lakukan yang aku bisa. Aku akan terus berjuang sampai aku mati." },
  { no: 14, anime: "Death Note", karakter: "Yagami Light", quote: "I'll take a potato chip... and eat it!", indo: "Aku akan mengambil keripik kentang... dan memakannya!" },
  { no: 15, anime: "Death Note", karakter: "L Lawliet", quote: "I am justice! I will make the world better!", indo: "Aku adalah keadilan! Aku akan membuat dunia lebih baik!" },
  { no: 16, anime: "Fullmetal Alchemist", karakter: "Edward Elric", quote: "A lesson without pain is meaningless. That's because no one can gain without sacrificing something.", indo: "Pelajaran tanpa rasa sakit tidak ada artinya. Tidak ada yang bisa didapat tanpa pengorbanan." },
  { no: 17, anime: "Fullmetal Alchemist", karakter: "Alphonse Elric", quote: "Even when our eyes are closed, there's a whole world out there that lives inside ourselves.", indo: "Bahkan saat mata kita tertutup, ada seluruh dunia di luar sana yang hidup di dalam diri kita." },
  { no: 18, anime: "Dragon Ball", karakter: "Son Goku", quote: "I am the hope of the universe. I am the answer to all living things that cry out for peace. I am protector of the innocent. I am the light in the darkness.", indo: "Aku adalah harapan semesta. Aku jawaban dari semua makhluk yang berteriak meminta damai. Aku pelindung yang tak berdosa. Aku cahaya dalam kegelapan." },
  { no: 19, anime: "Dragon Ball", karakter: "Vegeta", quote: "Push through the pain. Giving up hurts more.", indo: "Tembus rasa sakit. Menyerah lebih menyakitkan." },
  { no: 20, anime: "Bleach", karakter: "Kurosaki Ichigo", quote: "If I can protect even one person, I won't have to throw anything away.", indo: "Jika aku bisa melindungi bahkan satu orang, aku tidak perlu membuang apa pun." },
  { no: 21, anime: "Hunter x Hunter", karakter: "Gon Freecss", quote: "I want to know what's so important that he'd abandon his own son.", indo: "Aku ingin tahu apa yang begitu penting sampai dia meninggalkan anaknya sendiri." },
  { no: 22, anime: "Hunter x Hunter", karakter: "Killua Zoldyck", quote: "I'm tired of being a killer. I want to be a kid.", indo: "Aku lelah menjadi pembunuh. Aku ingin menjadi anak kecil." },
  { no: 23, anime: "My Hero Academia", karakter: "Izuku Midoriya", quote: "Sometimes I do feel like a failure. But in those moments, I just try to remember that everything happens for a reason.", indo: "Terkadang aku merasa gagal. Tapi di saat itu, aku mencoba mengingat bahwa semuanya terjadi karena alasan." },
  { no: 24, anime: "My Hero Academia", karakter: "All Might", quote: "You can be a hero!", indo: "Kau bisa menjadi pahlawan!" },
  { no: 25, anime: "Haikyuu", karakter: "Shoyo Hinata", quote: "I can fly! Even higher, even higher!", indo: "Aku bisa terbang! Lebih tinggi, lebih tinggi lagi!" },
  { no: 26, anime: "Tokyo Ghoul", karakter: "Ken Kaneki", quote: "The world is wrong. It needs to change.", indo: "Dunia ini salah. Dunia ini perlu berubah." },
  { no: 27, anime: "Violet Evergarden", karakter: "Violet Evergarden", quote: "I want to know what 'I love you' means.", indo: "Aku ingin tahu apa arti 'Aku mencintaimu'." },
  { no: 28, anime: "Code Geass", karakter: "Lelouch Lamperouge", quote: "If the king doesn't move, then his subjects won't follow.", indo: "Jika raja tidak bergerak, rakyatnya tidak akan mengikuti." },
  { no: 29, anime: "Steins;Gate", karakter: "Okabe Rintaro", quote: "This is the choice of Steins Gate!", indo: "Ini adalah pilihan Steins Gate!" },
  { no: 30, anime: "Vinland Saga", karakter: "Thorfinn", quote: "I have no enemies. I don't need to kill anyone. I want to build a peaceful land.", indo: "Aku tidak punya musuh. Aku tidak perlu membunuh siapa pun. Aku ingin membangun negeri yang damai." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > QUOTES.length) {
      // Random quote jika tidak ada argumen
      if (!args[0]) {
        const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
        return m.reply(claraWrap("Anime Quote #" + q.no, [
          '"' + q.quote + '"',
          "",
          "Indonesia:",
          '"' + q.indo + '"',
          "",
          "Anime: " + q.anime,
          "Karakter: " + q.karakter,
        ].join("\n")))
      }

      let lines = []
      lines.push("30 Quote Anime Pilihan")
      lines.push("")
      QUOTES.forEach(q => {
        lines.push(q.no + ". " + q.anime + " - " + q.karakter)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animequote <nomor>")
      lines.push("Atau ketik " + usedPrefix + "animequote untuk random")
      return m.reply(claraWrap("Anime Quote", lines.join("\n")))
    }

    const q = QUOTES[input - 1]
    return m.reply(claraWrap("Anime Quote #" + q.no, [
      '"' + q.quote + '"',
      "",
      "Indonesia:",
      '"' + q.indo + '"',
      "",
      "Anime: " + q.anime,
      "Karakter: " + q.karakter,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Anime Quote", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
