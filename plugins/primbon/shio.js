// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "shio",
  aliases: ["shio", "sifatshio", "karaktershio", "shioinfo"],
  category: "primbon",
  description: "Info 12 Shio lengkap - sifat, keberuntungan, jodoh, karier",
  usage: ".shio | .shio <nama shio>",
  example: ".shio | .shio tikus",
  isGroupOnly: false,
}

const SHIO = [
  { nama: "Tikus", tahun: "2020, 2008, 1996, 1984, 1972, 1960", elemen: "Air", positif: ["Cerdas", "Penuh strategi", "Ambisius", "Adaptif", "Hemat"], negatif: ["Kikir", "Curiga", "Suka mengkritik", "Pendendam"], jodoh: "Ox, Naga, Monyet", karier: "Wiraswasta, akuntan, peneliti, trader", keberuntungan: "Angka 2, 3. Warna biru, emas. Arah utara.", kekuatan: "Kemampuan bertahan hidup & melihat peluang" },
  { nama: "Kerbau (Ox)", tahun: "2021, 2009, 1997, 1985, 1973, 1961", elemen: "Tanah", positif: ["Tabah", "Pekerja keras", "Setia", "Jujur", "Dapat diandalkan"], negatif: ["Keras kepala", "Kaku", "Mudah cemburu", "Terlalu serius"], jodoh: "Tikus, Ayam, Ular", karier: "Tani, insinyur, arsitek, dokter, hakim", keberuntungan: "Angka 1, 9. Warna merah, kuning. Arah tenggara.", kekuatan: "Keteguhan hati & kesabaran luar biasa" },
  { nama: "Macan", tahun: "2022, 2010, 1998, 1986, 1974, 1962", elemen: "Kayu", positif: ["Berani", "Pemimpin", "Percaya diri", "Mudah adaptasi", "Penuh gairah"], negatif: ["Sombong", "Reckless", "Agresif", "Suka konflik"], jodoh: "Kuda, Anjing, Babi", karier: "Militer, polisi, atlet, CEO, pengacara", keberuntungan: "Angka 1, 3, 4. Warna biru, abu-abu. Arah timur.", kekuatan: "Keberanian & insting pemimpin alami" },
  { nama: "Kelinci", tahun: "2023, 2011, 1999, 1987, 1975, 1963", elemen: "Kayu", positif: ["Lemah lembut", "Penuh simpati", "Diplomatis", "Sopan", "Kreatif"], negatif: ["Pemalu", "Ragu-ragu", "Terlalu hati-hati", "Suka menghindar"], jodoh: "Kambing, Babi, Anjing", karier: "Seniman, diplomat, guru, konselor, perawat", keberuntungan: "Angka 3, 4, 6. Warna merah, hijau. Arah selatan.", kekuatan: "Diplomasi & ketenangan batin" },
  { nama: "Naga", tahun: "2024, 2012, 2000, 1988, 1976, 1964", elemen: "Tanah", positif: ["Bersemangat", "Visioner", "Karismatik", "Sukses", "Penuh ide"], negatif: ["Sombong", "Terlalu percaya diri", "Tidak sabar", "Tuntutan tinggi"], jodoh: "Tikus, Monyet, Ayam", karier: "CEO, pengusaha, aktor, politisi, investor", keberuntungan: "Angka 1, 6, 7. Warna emas, perak. Arah barat.", kekuatan: "Kewibawaan & kemampuan mewujudkan impian" },
  { nama: "Ular", tahun: "2025, 2013, 2001, 1989, 1977, 1965", elemen: "Api", positif: ["Bijaksana", "Intuitif", "Elegan", "Pendiam tapi cerdas", "Misterius"], negatif: ["Cemburu", "Curiga", "Suka menahan dendam", "Manipulatif"], jodoh: "Kerbau, Ayam, Monyet", karier: "Filsuf, psikolog, detektif, peneliti, peramal", keberuntungan: "Angka 2, 8, 9. Warna merah, hitam. Arah selatan.", kekuatan: "Intuisi & kebijaksanaan mendalam" },
  { nama: "Kuda", tahun: "2014, 2002, 1990, 1978, 1966, 1954", elemen: "Api", positif: ["Energik", "Mandiri", "Percaya diri", "Penuh semangat", "Ramah"], negatif: ["Tidak sabar", "Suka konflik", "Egois", "Sulit diatur"], jodoh: "Macan, Anjing, Kambing", karier: "Atlet, tour guide, sales, jurnalis, tentara", keberuntungan: "Angka 2, 3, 7. Warna coklat, kuning. Arah selatan.", kekuatan: "Kebebasan & energi tak terbatas" },
  { nama: "Kambing", tahun: "2015, 2003, 1991, 1979, 1967, 1955", elemen: "Tanah", positif: ["Penuh kasih", "Kreatif", "Lemah lembut", "Sopan", "Pemaaf"], negatif: ["Pemalu", "Pesimis", "Terlalu sensitif", "Suka mengeluh"], jodoh: "Kelinci, Kuda, Babi", karier: "Seniman, desainer, guru, dokter anak, musisi", keberuntungan: "Angka 3, 9, 4. Warna ungu, merah. Arah utara.", kekuatan: "Empati & kreativitas tinggi" },
  { nama: "Monyet", tahun: "2016, 2004, 1992, 1980, 1968, 1956", elemen: "Logam", positif: ["Cerdas", "Lucu", "Penuh ide", "Fleksibel", "Sosial"], negatif: ["Sombong", "Suka iri", "Tidak fokus", "Terlalu liar"], jodoh: "Tikus, Naga, Ular", karier: "Komedian, programmer, trader, marketing, penemu", keberuntungan: "Angka 4, 9. Warna putih, emas. Arah barat.", kekuatan: "Kecerdasan & kemampuan memecahkan masalah" },
  { nama: "Ayam", tahun: "2017, 2005, 1993, 1981, 1969, 1957", elemen: "Logam", positif: ["Teliti", "Pekerja keras", "Percaya diri", "Teratur", "Jujur"], negatif: ["Kritis", "Sombong", "Kaku", "Suka pamer"], jodoh: "Kerbau, Ular, Naga", karier: "Akuntan, dokter, militer, editor, konsultan", keberuntungan: "Angka 5, 7, 8. Warna emas, coklat. Arah barat.", kekuatan: "Ketelitian & integritas tinggi" },
  { nama: "Anjing", tahun: "2018, 2006, 1994, 1982, 1970, 1958", elemen: "Tanah", positif: ["Setia", "Jujur", "Adil", "Penuh kasih", "Pelindung"], negatif: ["Cemas", "Keras kepala", "Suka menggonggong", "Mudah curiga"], jodoh: "Kelinci, Kuda, Macan", karier: "Polisi, pengacara, dokter, guru, aktivis", keberuntungan: "Angka 3, 4, 9. Warna hijau, merah. Arah timur.", kekuatan: "Kesetiaan & keadilan" },
  { nama: "Babi", tahun: "2019, 2007, 1995, 1983, 1971, 1959", elemen: "Air", positif: ["Jujur", "Murah hati", "Penuh kasih", "Sopan", "Tekun"], negatif: ["Naif", "Materialis", "Suka makan", "Mudah ditipu"], jodoh: "Kelinci, Kambing, Kuda", karier: "Koki, dokter, pengacara, hotelier, filantropis", keberuntungan: "Angka 2, 5, 8. Warna kuning, abu. Arah utara.", kekuatan: "Kemurahan hati & ketulusan" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      let lines = []
      lines.push("12 Shio - Sifat, Jodoh, Karier")
      lines.push("")
      SHIO.forEach((s, i) => {
        lines.push((i + 1) + ". " + s.nama + " (" + s.tahun + ")")
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "shio <nama shio>")
      lines.push("Contoh: " + usedPrefix + "shio naga")
      return m.reply(claraWrap("12 Shio", lines.join("\n")))
    }

    const shio = SHIO.find(s => s.nama.toLowerCase().includes(input))

    if (!shio) {
      return m.reply(claraWrap("Shio", "Shio tidak ditemukan: " + input + "\nKetik " + usedPrefix + "shio untuk lihat list."))
    }

    return m.reply(claraWrap("Shio " + shio.nama, [
      "Tahun: " + shio.tahun,
      "Elemen: " + shio.elemen,
      "",
      "Sifat Positif:",
      shio.positif.join(", "),
      "",
      "Sifat Negatif:",
      shio.negatif.join(", "),
      "",
      "Jodoh: " + shio.jodoh,
      "Karier cocok: " + shio.karier,
      "Keberuntungan: " + shio.keberuntungan,
      "Kekuatan: " + shio.kekuatan,
    ].join("\n")))
  } catch (e) {
    return m.reply(claraWrap("Shio", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
