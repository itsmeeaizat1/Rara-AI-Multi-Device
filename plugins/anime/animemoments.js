// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animemoments",
  aliases: ["animemoments", "animebestmoments", "topmoments", "momentsanime"],
  category: "anime",
  description: "Momen paling epik & ikonik dalam sejarah anime",
  usage: ".animemoments | .animemoments <nomor>",
  example: ".animemoments | .animemoments 1",
  isGroupOnly: false,
}

const MOMENTS = [
  { no: 1, anime: "Naruto", momen: "Naruto vs Pain", episode: "Episode 166-167", deskripsi: "Narula kembali ke Konoha setelah training Sage Mode, melawan Pain sendirian. Momen Hinata melindungi Naruto & Pain 'membunuh' dia memicu Naruto berubah ke mode 6 ekor Kurama. Pertarungan paling epik dalam Naruto." },
  { no: 2, anime: "Naruto", momen: "Kushina & Minato Mengorbankan Diri", episode: "Episode 328-329", deskripsi: "Orang tua Naruto mengorbankan jiwa mereka untuk menyegel Kurama & melindungi Naruto yang baru lahir. Momen paling emosional dalam Naruto. Kushina berpesan: 'Jangan terlalu banyak makan ramen'." },
  { no: 3, anime: "One Piece", momen: "Luffy Punch Charloss (Celestial Dragon)", episode: "Episode 396", deskripsi: "Luffy memukul Charloss, seorang Celestial Dragon (Tuhan Dunia), karena menembak Hachi. Tidak ada yang berani memukul CD dalam 800 tahun. Luffy melakukannya tanpa ragu. Momen paling 'Luffy' dalam One Piece." },
  { no: 4, anime: "One Piece", momen: "Ace Death di Marineford", episode: "Episode 483", deskripsi: "Ace melindungi Luffy dari pukulan magma Akainu. Saat dia meninggal di pelukan Luffy, dengan senyum & terima kasih. Momen paling menyedihkan dalam One Piece. Luffy patah hati & hancur." },
  { no: 5, anime: "Attack on Titan", momen: "Eren Bangkit di Season 2", episode: "Episode 35", deskripsi: "Eren mengeluarkan kekuatan 'Coordinate' untuk pertama kalinya, mengontrol Titan yang menyerang. Skitar & semua orang terkejut. Momen yang mengubah arah cerita AoT." },
  { no: 6, anime: "Attack on Titan", momen: "Rumbling Mulai", episode: "Episode 78", deskripsi: "Eren menyentuh Zeke, mengaktifkan Founding Titan, & membangunkan semua Colossal Titan di dalam dinding. Rumbling dimulai. Dunia menyaksikan kiamat. Momen paling menegangkan dalam AoT." },
  { no: 7, anime: "Demon Slayer", momen: "Tanjiro vs Rui (Hinokami Kagura)", episode: "Episode 19", deskripsi: "Tanjiro menggunakan Hinokami Kagura (Sun Breathing) untuk pertama kalinya melawan Rui (Lower Moon 5). Animasi ufotable puncak. Momen yang mendefinisikan Demon Slayer & membuatnya viral." },
  { no: 8, anime: "Demon Slayer", momen: "Rengoku vs Akaza", episode: "Movie: Mugen Train", deskripsi: "Rengoku melawan Akaza (Upper Moon 3) sendirian melindungi penumpang. Rengoku kalah tapi tidak menyerah sampai mati. 'Set your heart ablaze!' Momen paling heroik dalam Demon Slayer." },
  { no: 9, anime: "Jujutsu Kaisen", momen: "Gojo vs Sukuna", episode: "Episode 47 (S2)", deskripsi: "Gojo melawan Sukuna dalam Domain Expansion. Hollow Purple, Unlimited Void, domain clash. Pertarungan paling dinanti dalam JJK. Kekuatan penuh Gojo untuk pertama kalinya." },
  { no: 10, anime: "Jujutsu Kaisen", momen: "Toji vs Gojo (Kaibutsu)", episode: "Episode 38", deskripsi: "Toji (yang tidak punya cursed energy) melawan Gojo (terkuat). Toji memenangkan pertarungan pertama, tapi Gojo 'bangkit' dengan Reverse Cursed Technique & menang. Momen paling tidak terduga." },
  { no: 11, anime: "Death Note", momen: "L Death", episode: "Episode 25", deskripsi: "Light memanipulasi Rem untuk membunuh L. L meninggal dengan tersenyum, menghapus buku Death Note Light. Momen paling mengejutkan dalam Death Note. Konfrontasi terbesar berakhir." },
  { no: 12, anime: "Fullmetal Alchemist: Brotherhood", momen: "Hughe's Death", episode: "Episode 25", deskripsi: "Letnan Colonel Hughes dibunuh karena terlalu dekat dengan kebenaran. Saat dia meninggal, dia melihat foto keluarganya & berkata: 'Elicia, aku tidak bisa pergi'. Momen paling menyedihkan dalam FMA." },
  { no: 13, anime: "Hunter x Hunter", momen: "Gon vs Pitou (Adult Gon)", episode: "Episode 131", deskripsi: "Gon kehilangan akal sehat setelah Kite dibunuh Pitou. Dia mengorbankan segalanya untuk kekuatan, berubah jadi 'Adult Gon'. Kekuatan melampaui Netero. Momen paling gelap dalam HxH." },
  { no: 14, anime: "My Hero Academia", momen: "All Might vs All For One", episode: "Episode 76", deskripsi: "All Might (dalam mode kelemahan) melawan All For One dengan kekuatan terakhir. 'United States of Smash!' Momen All Might mengorbankan kekuatannya untuk masa depan. Penonton menangis." },
  { no: 15, anime: "Dragon Ball Z", momen: "Gohan SSJ2 vs Cell", episode: "Episode 184-191", deskripsi: "Gohan pecah marah setelah Android 16 menyuruhnya melawan, berubah jadi SSJ2 untuk pertama kalinya. Momen Gohan melampaui ayahnya. 'You're fighting for yourself' menjadi momen ikonik." },
  { no: 16, anime: "Cowboy Bebop", momen: "Spike Death (Bang)", episode: "Episode 26 (Final)", deskripsi: "Spike & Vicious confrontasi terakhir. Spike mengatakan 'Bang' dengan jari, lalu jatuh. Momen paling ikonik dalam anime klasik. Ending sempurna untuk Spike." },
  { no: 17, anime: "Vinland Saga", momen: "Askeladd Death", episode: "Episode 24", deskripsi: "Askeladd dibunuh Canute di depan Thorfinn. Thorfinn kehilangan tujuan hidupnya. Momen paling penting dalam Vinland Saga, menandai transisi Thorfinn dari dendam ke perdamaian." },
  { no: 18, anime: "Chainsaw Man", momen: "Makima Revealed", episode: "Episode 12", deskripsi: "Makima membunuh Power di depan Denji. Menunjukkan sifat asli Makima sebagai Control Devil. Momen paling mengejutkan dalam Chainsaw Man. Denji patah." },
  { no: 19, anime: "Bleach", momen: "Ichigo vs Aizen (Final Getsuga)", episode: "Episode 308", deskripsi: "Ichigo mengungkap Final Getsuga Tensho (Mugetsu) melawan Aizen. Kekuatan puncak Ichigo, tapi dia kehilangan kekuatan Shinigami. Momen paling epik dalam Bleach." },
  { no: 20, anime: "Your Name (Kimi no Na wa)", momen: "Twilight Meeting", episode: "Movie (Scene terakhir)", deskripsi: "Taki & Mitsuha akhirnya bertemu di tangga setelah bertahun-tahun kehilangan kenangan. 'Aku mencari seseorang.' Momen paling emosional dalam film anime." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > MOMENTS.length) {
      let lines = []
      lines.push("Momen Epik & Ikonik dalam Anime")
      lines.push(MOMENTS.length + " Momen")
      lines.push("")
      MOMENTS.forEach(mm => {
        lines.push(mm.no + ". " + mm.anime + " - " + mm.momen)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animemoments <nomor>")
      lines.push("Contoh: " + usedPrefix + "animemoments 7")
      return m.reply(claraWrap("Momen Anime", lines.join("\n")))
    }

    const mm = MOMENTS[input - 1]
    return m.reply(claraWrap("Momen: " + mm.momen, [
      "Anime: " + mm.anime,
      "Episode: " + mm.episode,
      "",
      "Deskripsi:",
      mm.deskripsi,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Momen Anime", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
