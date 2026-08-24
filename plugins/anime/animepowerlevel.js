// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "animepowerlevel",
  aliases: ["animepowerlevel", "powerlevel", "scalinganime", "animescaling"],
  category: "anime",
  description: "Power level/scaling karakter anime dari lemah hingga dewa",
  usage: ".animepowerlevel | .animepowerlevel <nomor>",
  example: ".animepowerlevel | .animepowerlevel 1",
  isGroupOnly: false,
}

const TIERS = [
  { no: 1, tier: "Tier-S: God Level", deskripsi: "Karakter dengan kekuatan dewa/dapat menghancurkan semesta", contoh: [
    "Saitama (One Punch Man) - Punch normal bisa menghancurkan hal apa pun",
    "Zeno (Dragon Ball Super) - Bisa menghapus seluruh universe dengan satu tangan",
    "Rimuru Tempest (Tensura) - Akhir seri bisa menghancurkan ribuan dimensi",
    "Featherine (Umineko) - Penulis realitas, meta-fiction level",
    "Goku Mastered Ultra Instinct (DBS) - Mengalahkan dewa kehancuran",
  ]},
  { no: 2, tier: "Tier-S+: Universe Busters", deskripsi: "Mampu menghancurkan tata surya, galaksi, atau universe", contoh: [
    "Goku (DBS) - Super Saiyan Blue + Ultra Instinct",
    "Vegeta (DBS) - Ultra Ego, sebanding Goku",
    "Jiren (DBS) - Melampaui dewa kehancuran",
    "Whis & Vados (DBS) - Malaikat, pelatih dewa",
    "Anti-Spiral (Gurren Lagann) - Menciptakan & menghancurkan dimensi",
  ]},
  { no: 3, tier: "Tier-S: Planetary/Multi-Planetary", deskripsi: "Kekuatan menghancurkan planet atau tata surya", contoh: [
    "Naruto (Baryon Mode) - Kekuatan melampaui dewa (Issai)", 
    "Sasuke (Rinnegan Susanoo) - Sebanding Naruto",
    "Madara Uchiha (Jinchuriki Juubi) - Menghancurkan meteor dengan mudah",
    "Gojo Satoru (Domain Expansion) - Unlimited Void, info overload",
    "Sukuna (Heian Era Form) - Dapat menghancurkan kota dengan satu slash",
  ]},
  { no: 4, tier: "Tier-A: Continental", deskripsi: "Kekuatan skala benua, sangat mengancam satu negara/benua", contoh: [
    "Eren Yeager (Founding Titan + Rumbling) - Jutaan Colossal Titan",
    "Luffy (Gear 5 / Nika) - Reality manipulation terbatas",
    "All Might (Prime) - Mengubah cuaca dengan pukulan",
    "Escanor (The One) - Melawan dewa dengan satu pukulan",
    "Ichigo (True Bankai) - Mengalahkan Yhwach (sementara)",
  ]},
  { no: 5, tier: "Tier-A-: City/Mountain Level", deskripsi: "Mampu menghancurkan kota/gunung", contoh: [
    "Tanjiro (Demon Slayer Mark) - Membunuh Upper Moon dengan Sun Breathing",
    "Deku (100% Full Cowl) - Menghancurkan kota dengan Smash",
    "Meliodas (Assault Mode) - Menghancurkan kota dengan satu serangan",
    "Bakugo (Howitzer Impact) - Ledakan skala kota",
    "Todoroki (Half-Cold Half-Hot) - Membeku & membakar area luas",
  ]},
  { no: 6, tier: "Tier-B: Building Level", deskripsi: "Kekuatan menghancurkan gedung/bangunan", contoh: [
    "Eren Yeager (Attack Titan normal) - Bisa menghancurkan bangunan",
    "Levi Ackerman - Skill pedang terbaik, melawan Titan tapi tetap manusia",
    "Gon (Adult Gon, sacrifice) - Sementara melampaui tier, tapi kehilangan nyawa",
    "Killua (Godspeed) - Petir bisa menghancurkan bangunan",
    "Yuji Itadori (Chainsaw Mode) - Melawan iblis kelas menengah",
  ]},
  { no: 7, tier: "Tier-C: Human Peak/Superhuman", deskripsi: "Puncak kekuatan manusia normal, melampaui batas manusia biasa", contoh: [
    "Guts (Berserk) - Manusia murni dengan skill pedang & Berserker Armor",
    "Thorfinn (Vinland Saga) - Prajurit Viking, tanpa kekuatan super",
    "Spike Spiegel (Cowboy Bebop) - Petarung & pilot terbaik",
    "Revy (Black Lagoon) - Penembak jitu profesional",
    "Kaneki (Tokyo Ghoul) - Hybrid, setengah ghoul, setengah manusia",
  ]},
  { no: 8, tier: "Tier-D: Normal Human", deskripsi: "Karakter manusia biasa dengan keahlian spesifik", contoh: [
    "Light Yagami (Death Note) - Genius tapi manusia biasa, butuh buku",
    "L Lawliet - Detektif genius, manusia biasa",
    "Conan Edogawa - Detective genius, anak kecil",
    "Haruhi Suzumiya - Bisa mengubah realitas tanpa sadar (God tier latent)",
    "Shinji Ikari - Anak SMA yang terpaksa jadi pilot EVA",
  ]},
  { no: 9, tier: "Tier-F: Weak/Below Human", deskripsi: "Karakter lemah, lebih mungkin jadi korban", contoh: [
    "Yamcha (Dragon Ball) - Meme mati pertama, manusia lemah",
    "Krilin (Dragon Ball) - Lebih kuat dari Yamcha tapi tetap lemah di tier DB",
    "Zenitsu (Demon Slayer) - Kuat tapi hanya saat tidur",
    "Usopp (One Piece) - Penembak jitu, pengecut, tapi berani saat krisis",
    "Jiraiya (Naruto) - Genius tapi sering jadi bahan komedi",
  ]},
  { no: 10, tier: "Tier-X: Hax/Broken Abilities", deskripsi: "Tidak dinilai dari kekuatan fisik, tapi ability yang 'mengcurang'", contoh: [
    "Korosensei (Assassination Classroom) - Kecepatan Mach 20, tidak bisa dibunuh normal",
    "Giorno Giovanna (Gold Experience Requiem) - Membatalkan aksi musuh selamanya",
    "Kumagawa (Medaka Box) - All Fiction, menghapus realitas",
    "Kira Yoshikage (JoJo) - Bites the Dust, mengulang waktu",
    "Diavolo (JoJo) - King Crimson, skip waktu, tidak bisa diintercept",
    "Homura Akemi (Madoka) - Mengontrol waktu, mengulang hidup berulang-ulang",
  ]},
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > TIERS.length) {
      let lines = []
      lines.push("Power Level Scaling Karakter Anime")
      lines.push("Dari Tier-S (Dewa) hingga Tier-F (Lemah)")
      lines.push("")
      TIERS.forEach(t => {
        lines.push(t.no + ". " + t.tier)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "animepowerlevel <nomor>")
      lines.push("Contoh: " + usedPrefix + "animepowerlevel 1")
      return m.reply(claraWrap("Power Level Anime", lines.join("\n")))
    }

    const t = TIERS[input - 1]
    let lines = []
    lines.push(t.tier)
    lines.push("")
    lines.push("Deskripsi:")
    lines.push(t.deskripsi)
    lines.push("")
    lines.push("Contoh Karakter:")
    t.contoh.forEach((c, i) => {
      lines.push((i + 1) + ". " + c)
    })
    return m.reply(claraWrap("Power Level Tier #" + t.no, lines.join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Power Level Anime", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
