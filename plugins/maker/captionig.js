// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "captionig",
  alias: ["captionig"],
  category: 'maker',
  description: 'Generator caption Instagram/medsos berdasarkan mood',
  usage: '.captionig | .captionig <mood>',
  example: '.captionig | .captionig senja',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

const CAPTION = {
  senja: [
    "Senja mengajarkan bahwa indah tidak selamanya. Tapi setiap hari datang lagi.",
    "Matahari terbenam, tapi harapan tidak pernah tenggelam.",
    "Warna oranye langit adalah seni yang tak pernah sama setiap hari.",
    "Senja adalah bukti bahwa berakhirpun bisa terlihat indah.",
    "Kapan terakhir kali kamu menikmati senja tanpa pegang ponsel?",
    "Senja tidak butuh filter. Dia sudah sempurna sejak awal.",
    "Ada ketenangan di senja yang tak bisa dijelaskan kata-kata.",
    "Senja datang, dan tiba-tiba semuanya terasa damai.",
  ],
  pagi: [
    "Pagi baru, semangat baru. Hari ini adalah kanvasmu, lukis dengan indah.",
    "Bangun pagi bukan sekadar rutinitas, tapi pilihan untuk lebih produktif.",
    "Kopi, sarapan, dan niat baik. Resep pagi yang sempurna.",
    "Pagi mengajarkan bahwa setiap hari adalah kesempatan untuk memulai lagi.",
    "Jangan biarkan hari sibuk mengalahkan semangat pagi yang optimis.",
    "Pagi yang baik dimulai dari malam yang cukup. Tidur lebih awal!",
    "Selamat pagi dunia. Hari ini aku akan lebih baik dari kemarin.",
    "Rasakan pagi dengan tenang. Tidak perlu terburu, dunia akan menunggumu.",
  ],
  makan: [
    "Makanan bukan sekadar mengisi perut, tapi juga mengisi hati.",
    "Makanan terbaik dimasak dengan cinta, bukan hanya bumbu.",
    "Tidak ada kata terlalu penuh untuk perut, hanya terlalu banyak pilihan.",
    "Setiap suapan adalah cerita. Apa ceritamu hari ini?",
    "Makanan enak lebih nikmat kalau dinikmati tanpa pikiran beban.",
    "Makan bukan hanya kebutuhan, tapi seni menikmati hidup.",
    "Jangan lupa makan. Perut kosong membuat mood ikut kosong.",
    "Setiap hidangan adalah anugerah. Hargai sebelum menikmati.",
  ],
  jalan: [
    "Bukan tujuan yang membuatmu kuat, tapi perjalanan yang kamu tempuh.",
    "Jalan terbaik adalah jalan yang belum pernah dilewati sebelumnya.",
    "Kadang tersesat adalah cara terbaik untuk menemukan diri.",
    "Perjalanan bukan tentang sampai, tapi tentang siapa kamu saat tiba.",
    "Jalan lurus itu membosankan. Jalan berliku lebih berkesan.",
    "Setiap tikungan adalah kejutan, setiap persimpangan adalah pilihan.",
    "Lebih baik jalan dan menyesal, daripada menunggu dan menyesal.",
    "Jalan tidak harus jauh. Kadang jalan ke dapur cukup untuk membersamai keluarga.",
  ],
  galau: [
    "Malam ini galau. Besok pagi mungkin cerah, mungkin tidak. Tapi tetap lanjut.",
    "Galau datang untuk menguji, bukan untuk menghancurkan.",
    "Jangan biarkan galau menguasai hari. Kamu lebih kuat dari perasaanmu.",
    "Galau bukan lemah. Galau adalah proses untuk memahami diri lebih dalam.",
    "Terkadang diam adalah cara terbaik untuk menyembuhkan galau.",
    "Setiap orang punya galau. Yang membedakan adalah cara mereka bangkit.",
    "Jangan lupa makan saat galau. Perut kenyang, hati tenang.",
    "Galau akan pergi sendiri kalau kamu sibuk membangun diri.",
  ],
  bahagia: [
    "Bahagia sederhana: kenyang, tidur cukup, dan seseorang yang peduli.",
    "Jangan tunggu bahagia datang. Ciptakan dari hal kecil setiap hari.",
    "Bahagia bukan tentang punya segalanya, tapi mensyukuri yang ada.",
    "Senyum paling indah adalah yang muncul tanpa alasan.",
    "Hari bahagia bukan yang tanpa masalah, tapi yang melewati masalah dengan tenang.",
    "Bahagia adalah pilihan, bukan tujuan. Pilih setiap hari.",
    "Sederhana saja: bahagia adalah saat kamu tidak ingin berada di tempat lain.",
    "Kebahagiaan tidak pernah datang dari luar. Ia lahir dari dalam diri.",
  ],
  lucu: [
    "Aku bukan malas, aku sedang menghemat energi untuk hal yang lebih penting.",
    "Diet dimulai besok. Hari ini masih hari terakhir kemarin.",
    "Bukan aku yang berubah, tapi kamu yang tidak ikut berubah bersamaku.",
    "Jangan bedakan orang dari penampilan. Bedakan dari isi dompetnya.",
    "Tiada hari tanpa kopi. Tiada kopi tanpa gula. Tiada gula tanpa gula-gula.",
    "Saya bukan baper, saya hanya sensitif... berlebihan.",
    "Bukan aku yang paling tampan, tapi yang paling berani berdiri di depan cermin.",
    "Tuhan berikan aku kesabaran. Tapi cepat ya, sebelum aku marah.",
  ],
}

const MOOD_LIST = Object.keys(CAPTION)

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      const randomMood = MOOD_LIST[Math.floor(Math.random() * MOOD_LIST.length)]
      const cap = CAPTION[randomMood][Math.floor(Math.random() * CAPTION[randomMood].length)]
      let lines = []
      lines.push("Caption Random")
      lines.push("Mood: " + randomMood)
      lines.push("")
      lines.push(cap)
      lines.push("")
      lines.push("Mood tersedia: " + MOOD_LIST.join(", "))
      return m.reply(claraWrap("Caption IG", lines.join("\n")))
    }

    const mood = MOOD_LIST.find(m => m.includes(input) || m === input)
    if (!mood) {
      return m.reply(claraWrap("Caption IG", "Mood tidak ditemukan: " + input + "\nTersedia: " + MOOD_LIST.join(", ")))
    }

    const cap = CAPTION[mood][Math.floor(Math.random() * CAPTION[mood].length)]
    return m.reply(claraWrap("Caption: " + mood, cap))
  } catch (e) {
    return m.reply(claraWrap("Caption IG", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
