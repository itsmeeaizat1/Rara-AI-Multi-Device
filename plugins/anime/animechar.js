// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animechar",
  aliases: ["animechar", "karakteranime", "charinfo", "animecharinfo"],
  category: "anime",
  description: "Database karakter anime terkenal - profil, ability, trivia",
  usage: ".animechar | .animechar <nomor>",
  example: ".animechar | .animechar 1",
  isGroupOnly: false,
}

const CHARS = [
  { no: 1, nama: "Uzumaki Naruto", anime: "Naruto", role: "Protagonis", voice: "Junko Takeuchi", ability: "Rasengan, Sage Mode, Kurama Mode, Baryon Mode", affiliasi: "Konohagakure, Tim 7", deskripsi: "Ninja dari Konoha yang bercita-cita menjadi Hokage. Dulu dibenci karena ada siluman rubah (Kurama) dalam tubuhnya, kini menjadi pahlawan terbesar desa.", trivia: "Hobi makan ramen. Moto hidupnya: 'Dattebayo!'" },
  { no: 2, nama: "Uchiha Sasuke", anime: "Naruto", role: "Deuteragonist", voice: "Noriaki Sugiyama", ability: "Sharingan, Chidori, Susanoo, Rinnegan", affiliasi: "Konoha, Tim 7 (dulu Akatsuki)", deskripsi: "Rival & sahabat Naruto. Klan Uchiha dibantai kakaknya (Itachi). Sasuke sempat jadi musuh tapi kembali melindungi Konoha.", trivia: "Menikah dengan Sakura, punya anak bernama Sarada." },
  { no: 3, nama: "Monkey D. Luffy", anime: "One Piece", role: "Protagonis", voice: "Mayumi Tanaka", ability: "Gomu Gomu no Mi (Hito Hito no Mi Model Nika), Gear 2/3/4/5, Haki", affiliasi: "Bajak Laut Topi Jerami", deskripsi: "Bajak laut muda yang bercita-cita menjadi Pirate King. Memakan buah iblis Gomu Gomu yang membuat tubuhnya karet. Polos, penuh semangat, sangat melindungi teman.", trivia: "Bisa makan tanpa henti. Lemah terhadap pisau & api." },
  { no: 4, nama: "Roronoa Zoro", anime: "One Piece", role: "Wakil Kapten", voice: "Kazuya Nakai", ability: "Santoryu (3 pedang), Haki, Asura", affiliasi: "Bajak Laut Topi Jerami", deskripsi: "Pendekar pedang 3 gaya yang bercita-cita menjadi pendekar terkuat di dunia. Suka tersesat meski jalan lurus. Setia & tekun.", trivia: "Pernah kehilangan 1 mata. Tidur hampir sepanjang hari." },
  { no: 5, nama: "Eren Yeager", anime: "Attack on Titan", role: "Protagonis", voice: "Yuki Kaji", ability: "Titan Shifter (Attack Titan, Founding Titan, War Hammer Titan)", affiliasi: "Pasukan Survey Corps (dulu), Yeagerist", deskripsi: "Pemuda yang bersumpah membasmi semua Titan setelah ibunya dimakan Titan. Evolusi dari anak dendam menjadi pemimpin revolusi.", trivia: "Kekuatan berasal dari mengambil serum Titan ayahnya." },
  { no: 6, nama: "Levi Ackerman", anime: "Attack on Titan", role: "Kapten Pasukan Survey", voice: "Hiroshi Kamiya", ability: "Skill pedang terbaik, kecepatan super, Ackerman power", affiliasi: "Pasukan Survey Corps", deskripsi: "Prajurit terkuat umat manusia. Dingin, disiplin, obsesif terhadap kebersihan, namun sangat melindungi bawahannya.", trivia: "Berasal dari Underworld (bawah tanah). Tinggi 160cm." },
  { no: 7, nama: "Satoru Gojo", anime: "Jujutsu Kaisen", role: "Pengajar", voice: "Yuichi Nakamura", ability: "Six Eyes, Limitless, Infinity, Hollow Purple, Domain Expansion: Unlimited Void", affiliasi: "Jujutsu High Tokyo", deskripsi: "Penyihur terkuat di era modern. Mengenakan penutup mata. Santai, arogan, namun melindungi siswa & sahabat. Dapat membaca aliran energi terbatas.", trivia: "Selalu menutup mata karena Six Eyes membuat otak overload." },
  { no: 8, nama: "Kamado Tanjiro", anime: "Demon Slayer", role: "Protagonis", voice: "Natsuki Hanae", ability: "Sun Breathing (Hinokami Kagura), Water Breathing, Demon Slayer Mark", affiliasi: "Pasukan Demon Slayer", deskripsi: "Anak sulung keluarga Kamado yang dibantai iblis. Adiknya Nezuko berubah jadi iblis. Bercita-cita menyembuhkan adiknya & mengalahkan Muzan.", trivia: "Mampu mencium bau sangat tajam. Ramah & penuh empati." },
  { no: 9, nama: "Light Yagami", anime: "Death Note", role: "Protagonis/Antagonist", voice: "Mamoru Miyano", ability: "Death Note (membunuh dengan menulis nama)", affiliasi: "Task Force (sementara)", deskripsi: "Genius muda yang menemukan buku Death Note. Ingin menciptakan dunia tanpa kejahatan dengan membunuh penjahat. Terobsesi menjadi 'Tuhan dunia baru'.", trivia: "IQ di atas rata-rata. Ego & ambisi menghancurkannya." },
  { no: 10, nama: "L Lawliet", anime: "Death Note", role: "Detektif", voice: "Kappei Yamaguchi", ability: "Genius deduction, profiling, analisa tingkah laku", affiliasi: "Task Force", deskripsi: "Detektif terbaik di dunia yang misterius. Tinggal dengan ryuk. Canggung, suka makan manis, jago menganalisa. Musuh terbesar Light Yagami.", trivia: "Selalu jongkok di kursi. Tidak pernah tidur." },
  { no: 11, nama: "Edward Elric", anime: "Fullmetal Alchemist", role: "Protagonis", voice: "Romi Park", ability: "Alchemy tanpa lingkaran (clapping), transmutasi cepat", affiliasi: "State Alchemist (militer Amestris)", deskripsi: "Alchemist muda yang kehilangan lengan & kakinya dalam eksperimen membangkitkan ibu. Bercita-cita menemukan Philosopher's Stone untuk mengembalikan tubuh adiknya Alphonse.", trivia: "Sensitif soal tinggi badan (makin pendek). Sangat protektif ke adiknya." },
  { no: 12, nama: "Guts", anime: "Berserk", role: "Protagonis", voice: "Nobutoshi Canna / Hiroaki Iwanaga", ability: "Dragon Slayer (pedang raksasa), Berserker Armor", affiliasi: "Band of the Hawk (dulu)", deskripsi: "Pendekar pedang yang lahir di medan perang. Bertahan hidup dari pembantaian yang dilakukan sahabatnya Griffith. Dendam & penderitaan melatarbelakangi perjalanannya.", trivia: "Satu-satunya karakter dengan kemauan baja melawan takdir gelap." },
  { no: 13, nama: "Kurosaki Ichigo", anime: "Bleach", role: "Protagonis", voice: "Masakazu Morita", ability: "Shinigami, Hollow, Quincy, Fullbring, Bankai: Tensa Zangetsu", affiliasi: "Gotei 13, Karakura", deskripsi: "Anak SMA yang bisa melihat hantu. Memperoleh kekuatan Shinigami dari Rukia. Mampu menggunakan kekuatan dari berbagai ras sekaligus.", trivia: "Rambut oranye alami. Suka bertarung & melindungi teman." },
  { no: 14, nama: "Gon Freecss", anime: "Hunter x Hunter", role: "Protagonis", voice: "Megumi Han", ability: "Nen (Enhancer), Jajanken (batu-gunting-kertas)", affiliasi: "Hunter Association", deskripsi: "Anak muda yang mencari ayahnya (Ging) yang merupakan Hunter. Perjalanannya menemukan sahabat, persahabatan, & penderitaan. Penuh rasa penasaran & tekad kuat.", trivia: "Kekuatan Nen naik drastis saat marah (membahayakan diri sendiri)." },
  { no: 15, nama: "Izuku Midoriya", anime: "My Hero Academia", role: "Protagonis", voice: "Daiki Yamashita", ability: "One For All (mewariskan kekuatan), Full Cowling, Shoot Style", affiliasi: "UA High School, Kelas 1-A", deskripsi: "Anak yang lahir tanpa Quirk (kekuatan) tapi diberi One For All oleh idolanya All Might. Dengan keras kepala & empati, ia berlatih menjadi pahlawan terbesar.", trivia: "Mencatat kekuatan hero dalam 13 buku catatan." },
  { no: 16, nama: "Spike Spiegel", anime: "Cowboy Bebop", role: "Protagonis", voice: "Koichi Yamadera", ability: "Martial arts (Jeet Kune Do), tembak jitu, pilot", affiliasi: "Bebop crew (bounty hunter)", deskripsi: "Bounty hunter keren dengan masa lalu gelap. Santai, malas, arogan, tapi trauma masa lalu yang belum selesai. Petualangan menangkap penjahat antar planet.", trivia: "Suka nonton TV kelas berat & makan mie instan." },
  { no: 17, nama: "Makima", anime: "Chainsaw Man", role: "Antagonist", voice: "Tomori Kusunoki", ability: "Control Devil (kontrol siapa pun yang ia anggap lebih rendah)", affiliasi: "Public Safety (dulu)", deskripsi: "Wanita misterius yang mengendalikan Division 4. Dingin, manipulatif, ambisius. Memanfaatkan Denji untuk mencapai tujuannya. Simbol kontrol & dominasi.", trivia: "Dihukum & dibunuh oleh Denji yang memakannya berkali-kali." },
  { no: 18, nama: "Denji", anime: "Chainsaw Man", role: "Protagonis", voice: "Kikunosuke Toya", ability: "Chainsaw Devil (kepala & lengan jadi chainsaw), hybrid form", affiliasi: "Public Safety Division 4", deskripsi: "Pemuda miskin yang menyatu dengan Pochita (Chainsaw Devil). Motivasinya sederhana: makan roti selai, tidur, perempuan. Polos & brutal sekaligus.", trivia: "Pernah jadi pahlawan terkenal #1 di Jepang secara tidak sengaja." },
  { no: 19, nama: "Frieren", anime: "Frieren: Beyond Journey's End", role: "Protagonis", voice: "Atsumi Tanezaki", ability: "Magic tingkat tinggi, analisa sihir cepat, magic barrier", affiliasi: "Kelompok petualang (dulu)", deskripsi: "Elf berusia 1000+ tahun yang mengikuti perjalanan pahlawan yang mengalahkan Raja Iblis. Setelah sahabat-sahabatnya meninggal, ia berjalan untuk memahami manusia.", trivia: "Hobi mengumpulkan sihir 'tidak berguna'. Seperti spongebob: tidak paham emosi manusia." },
  { no: 20, nama: "Thorfinn", anime: "Vinland Saga", role: "Protagonis", voice: "Yuto Uemura", ability: "Pendekar pedang mumpuni, pertarungan berani, bertahan hidup", affiliasi: "Pasukan mercenary (dulu)", deskripsi: "Pemuda Viking yang dibesarkan di medan perang. Ayahnya dibunuh di depan matanya. Dendam & kebencian membuatnya menjadi prajurit. Setelah hukuman, ia mencari Vinland (negeri tanpa perang).", trivia: "Karakter yang melambangkan permusuhan vs perdamaian." },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > CHARS.length) {
      let lines = []
      lines.push("Database " + CHARS.length + " Karakter Anime")
      lines.push("")
      CHARS.forEach(c => {
        lines.push(c.no + ". " + c.nama + " (" + c.anime + ")")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animechar <nomor>")
      lines.push("Contoh: " + usedPrefix + "animechar 5")
      return m.reply(claraWrap("Karakter Anime", lines.join("\n")))
    }

    const c = CHARS[input - 1]
    return m.reply(claraWrap("Karakter: " + c.nama, [
      "Anime: " + c.anime,
      "Role: " + c.role,
      "Voice Actor: " + c.voice,
      "Affiliasi: " + c.affiliasi,
      "",
      "Ability:",
      c.ability,
      "",
      "Deskripsi:",
      c.deskripsi,
      "",
      "Trivia:",
      c.trivia,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Karakter Anime", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
