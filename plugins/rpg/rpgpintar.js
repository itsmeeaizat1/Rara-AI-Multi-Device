// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Indonesia Pintar — Quiz soal kebangsaan, budaya, sejarah, dan pengetahuan umum Indonesia
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgpintar",
  alias: ["rpgindonesiapintar", "pintarindonesia", "rpgwn", "rpgwawasan"],
  category: "rpg",
  description: "Indonesia Pintar RPG — quiz kebangsaan, budaya, sejarah, dan pengetahuan umum Indonesia",
  usage: ".rpgpintar | .rpgpintar status | .rpgpintar category <budaya/sejarah/geografi/bahasa/umum>",
  example: ".rpgpintar\n.rpgpintar category budaya",
  isGroup: true,
  cooldown: 12,
  energi: 5,
  isEnabled: true,
};

const QUESTIONS = {
  budaya: [
    { q: "Tari Saman berasal dari provinsi?", opts: ["Aceh", "Sumatra Barat", "Riau", "Sumatra Utara"], a: "Aceh" },
    { q: "Alat musik Angklung berasal dari?", opts: ["Jawa Barat", "Bali", "Sumatra", "Kalimantan"], a: "Jawa Barat" },
    { q: "Rumah adat Joglo berasal dari?", opts: ["Jawa Tengah", "Jawa Timur", "Yogyakarta", "Bali"], a: "Jawa Tengah" },
    { q: "Batik ditetapkan UNESCO sebagai warisan dunia tahun?", opts: ["2009", "2005", "2010", "2008"], a: "2009" },
    { q: "Tari Kecak berasal dari?", opts: ["Bali", "Lombok", "Papua", "Maluku"], a: "Bali" },
    { q: "Senjata tradisional Rencong dari?", opts: ["Aceh", "Padang", "Riau", "Lampung"], a: "Aceh" },
    { q: "Pakaian adain Baju Bodo berasal dari?", opts: ["Sulawesi Selatan", "Sumatra", "Kalimantan", "Papua"], a: "Sulawesi Selatan" },
    { q: "Upacara Ngaben dilakukan oleh suku?", opts: ["Bali", "Toraja", "Batak", "Sasak"], a: "Bali" },
    { q: "Tarian dengan gerakan tangan cepat dari Aceh adalah?", opts: ["Tari Saman", "Tari Pendet", "Tari Jaipong", "Tari Merak"], a: "Tari Saman" },
    { q: "Rumah adat Rumah Gadang berasal dari?", opts: ["Sumatra Barat", "Aceh", "Riau", "Lampung"], a: "Sumatra Barat" },
  ],
  sejarah: [
    { q: "Budi Utomo didirikan pada tanggal?", opts: ["20 Mei 1908", "28 Oktober 1928", "17 Agustus 1945", "1 Juni 1945"], a: "20 Mei 1908" },
    { q: "Proklamasi Kemerdekaan dibacakan oleh?", opts: ["Soekarno-Hatta", "Soekarno-Sjahrir", "Hatta-Sjahrir", "Soekarno-Tan Malaka"], a: "Soekarno-Hatta" },
    { q: "Organisasi Budi Utomo didirikan oleh?", opts: ["Dr. Sutomo", "Dr. Soetomo", "H.O.S Cokroaminoto", "Ki Hajar Dewantara"], a: "Dr. Sutomo" },
    { q: "Sumpah Pemuda menghasilkan tiga ikrar: satu?", opts: ["Bangsa, bahasa, tanah air", "Rakyat, negara, bahasa", "Bendera, lagu, bahasa", "Ras, bangsa, bahasa"], a: "Bangsa, bahasa, tanah air" },
    { q: "Pangeran Diponegoro memimpin perang melawan?", opts: ["Belanda", "Inggris", "Portugis", "Jepang"], a: "Belanda" },
    { q: "Pendiri Sarekat Islam adalah?", opts: ["H.O.S Cokroaminoto", "Haji Samanhudi", "K.H. Ahmad Dahlan", "K.H. Hasyim Asy'ari"], a: "H.O.S Cokroaminoto" },
    { q: "Jepang menyerah kepada Sekutu pada?", opts: ["15 Agustus 1945", "17 Agustus 1945", "14 Agustus 1945", "2 September 1945"], a: "15 Agustus 1945" },
    { q: "Pemuda yang menyusun naskah proklamasi adalah?", opts: ["Soekarni, Wikana, Aidit", "Sayuti Melik, Sukarni", "Ahmad Soebardjo", "Latief Hendraningrat"], a: "Sayuti Melik, Sukarni" },
    { q: "Konferensi Meja Bundar (KMB) menghasilkan?", opts: ["Kedaulatan RIS 1949", "Kemerdekaan 1945", "Perjanjian Linggarjati", "Perjanjian Renville"], a: "Kedaulatan RIS 1949" },
    { q: "Pahlawan Nasional dari Maluku adalah?", opts: ["Pattimura", "Sultan Hasanudin", "Imam Bonjol", "Pangeran Antasari"], a: "Pattimura" },
  ],
  geografi: [
    { q: "Gunung tertinggi di Indonesia?", opts: ["Puncak Jaya", "Gunung Semeru", "Gunung Kerinci", "Gunung Rinjani"], a: "Puncak Jaya" },
    { q: "Danau terbesar di Indonesia?", opts: ["Danau Toba", "Danau Towuti", "Danau Poso", "Danau Singkarak"], a: "Danau Toba" },
    { q: "Sungai terpanjang di Indonesia?", opts: ["Kapuas", "Mahakam", "Musi", "Barito"], a: "Kapuas" },
    { q: "Pulau terpadat penduduknya?", opts: ["Jawa", "Sumatra", "Kalimantan", "Sulawesi"], a: "Jawa" },
    { q: "Provinsi termuda di Indonesia (2022)?", opts: ["Papua Selatan", "Papua Barat", "Papua Tengah", "Papua Pegunungan"], a: "Papua Selatan" },
    { q: "Selat yang memisahkan Jawa dan Sumatra?", opts: ["Selat Sunda", "Selat Madura", "Selat Bali", "Selat Karimata"], a: "Selat Sunda" },
    { q: "Kota pelabuhan terbesar di Indonesia?", opts: ["Tanjung Priok", "Tanjung Perak", "Belawan", "Makassar"], a: "Tanjung Priok" },
    { q: "Gurun pasir yang ada di Indonesia?", opts: ["Gurun Pesona, NTT", "Gurun Sahara", "Gurun Gobi", "Tidak ada"], a: "Gurun Pesona, NTT" },
    { q: "Ibu kota provinsi Papua?", opts: ["Jayapura", "Manokwari", "Wamena", "Sorong"], a: "Jayapura" },
    { q: "Cagar biosfer di Sumatra yang terkenal?", opts: ["Taman Nasional Gunung Leuser", "Taman Nasional Way Kambas", "Taman Nasional Kerinci", "Taman Nasional Berbak"], a: "Taman Nasional Gunung Leuser" },
  ],
  bahasa: [
    { q: "Kata 'demokrasi' berasal dari bahasa?", opts: ["Yunani", "Latin", "Arab", "Sansakerta"], a: "Yunani" },
    { q: "Bahasa yang banyak mempengaruhi kosakata Indonesia?", opts: ["Sansakerta", "Latin", "Inggris", "Spanyol"], a: "Sansakerta" },
    { q: "Pantun terdiri dari 2 bagian: sampiran dan?", opts: ["Isi", "Isi", "Maksud", "Maksud"], a: "Isi" },
    { q: "Bahasa daerah yang dituturkan paling banyak orang?", opts: ["Jawa", "Sunda", "Madura", "Melayu"], a: "Jawa" },
    { q: "EYD adalah singkatan dari?", opts: ["Ejaan Yang Disempurnakan", "Ejaan Yang Diperbarui", "Ejaan Yang Dikuasai", "Ejaan Yang Dirapikan"], a: "Ejaan Yang Disempurnakan" },
    { q: "Peribahasa 'Tidak ada gading yang tak retak' artinya?", opts: ["Tidak ada yang sempurna", "Hati-hati", "Bersatu kuat", "Sabar"], a: "Tidak ada yang sempurna" },
    { q: "Gabungan kata yang mengandung unsur subordinasi disebut?", opts: ["Frasa", "Klausa", "Kalimat", "Paragraf"], a: "Frasa" },
    { q: "Kalimat yang menyatakan perintah disebut?", opts: ["Imperatif", "Deklaratif", "Interogatif", "Persuasif"], a: "Imperatif" },
    { q: "Majas 'suara menggelegar bagai petir' adalah jenis?", opts: ["Hiperbola", "Simile", "Metafora", "Personifikasi"], a: "Hiperbola" },
    { q: "Kata serapan dari 'computer' dalam bahasa Indonesia?", opts: ["Komputer", "Komputir", "Kompeter", "Komputar"], a: "Komputer" },
  ],
  umum: [
    { q: "Lambang negara Indonesia adalah?", opts: ["Garuda Pancasila", "Burung Merpati", "Bintang", "Pohon Beringin"], a: "Garuda Pancasila" },
    { q: "Warna bendera Indonesia?", opts: ["Merah Putih", "Merah Biru", "Putih Merah", "Merah Kuning"], a: "Merah Putih" },
    { q: "Lagu kebangsaan Indonesia digubah oleh?", opts: ["W.R. Supratman", "Ismail Marzuki", "C. Simanjuntak", "H. Mutahar"], a: "W.R. Supratman" },
    { q: "Bahasa nasional Indonesia adalah?", opts: ["Bahasa Indonesia", "Bahasa Melayu", "Bahasa Jawa", "Bahasa Sunda"], a: "Bahasa Indonesia" },
    { q: "UUD 1945 disahkan pada tanggal?", opts: ["18 Agustus 1945", "17 Agustus 1945", "1 Juni 1945", "22 Juni 1945"], a: "18 Agustus 1945" },
    { q: "Lambang sila ke-1 Pancasila?", opts: ["Bintang", "Rantai", "Pohon Beringin", "Padi Kapas"], a: "Bintang" },
    { q: "Lambang sila ke-3 Pancasila?", opts: ["Pohon Beringin", "Bintang", "Kepala Banteng", "Padi Kapas"], a: "Pohon Beringin" },
    { q: "Semboyan Bhinneka Tunggal Ika artinya?", opts: ["Berbeda-beda tapi tetap satu", "Bersatu kita teguh", "Satu nusa satu bangsa", "Merdeka atau mati"], a: "Berbeda-beda tapi tetap satu" },
    { q: "Hari Sumpah Pemuda diperingati setiap tanggal?", opts: ["28 Oktober", "20 Mei", "17 Agustus", "1 Juni"], a: "28 Oktober" },
    { q: "Hari Pendidikan Nasional diperingati tanggal?", opts: ["2 Mei", "20 Mei", "1 Juni", "28 Oktober"], a: "2 Mei" },
  ],
};

const CATS = { budaya: "Budaya", sejarah: "Sejarah", geografi: "Geografi", bahasa: "Bahasa", umum: "Umum", campuran: "Campuran" };

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Indonesia Pintar", [
        "STATUS INDONESIA PINTAR",
        "",
        "Level wawasan: " + (user.ipLevel || 1),
        "Benar: " + (user.ipCorrect || 0),
        "Salah: " + (user.ipWrong || 0),
        "Streak terbaik: " + (user.ipBestStreak || 0),
        "Koin: " + (user.koin || 0),
        "",
        "Kategori: " + (user.ipCategory || "campuran"),
        "",
        "Ketik .rpgpintar untuk mulai!",
        "Kategori: .rpgpintar category <budaya/sejarah/geografi/bahasa/umum>",
      ]));
    }

    // SET CATEGORY
    if (sub === "category" || sub === "kategori") {
      const cat = (args[1] || "").toLowerCase();
      if (!CATS[cat]) {
        return m.reply(claraWrap("RPG Indonesia Pintar", "Kategori: budaya, sejarah, geografi, bahasa, umum, campuran"));
      }
      user.ipCategory = cat;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Indonesia Pintar", "Kategori: *" + CATS[cat] + "*", "success"));
    }

    // START QUIZ
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Indonesia Pintar", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const cat = user.ipCategory || "campuran";
    let pool = [];
    if (cat === "campuran") {
      Object.values(QUESTIONS).forEach((arr) => { pool = pool.concat(arr); });
    } else {
      pool = QUESTIONS[cat] || [];
    }

    pool = pool.sort(() => Math.random() - 0.5).slice(0, 5);
    let correctCount = 0;
    let streak = 0;
    let bestStreak = 0;

    let lines = [
      "INDONESIA PINTAR RPG",
      "Kategori: " + CATS[cat],
      "Soal: " + pool.length,
      "",
      "SOAL:",
      "",
    ];

    pool.forEach((item, i) => {
      lines.push("Soal " + (i + 1) + ": " + item.q);
      lines.push("A. " + item.opts[0]);
      lines.push("B. " + item.opts[1]);
      lines.push("C. " + item.opts[2]);
      lines.push("D. " + item.opts[3]);
      const correctIdx = item.opts.indexOf(item.a);
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + item.a);
      if (correctIdx >= 0) {
        correctCount++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        lines.push("BENAR! Streak: " + streak);
      } else {
        streak = 0;
        lines.push("SALAH!");
      }
      lines.push("");
    });

    user.energi -= pluginConfig.energi;
    const passed = correctCount >= 3;
    let reward = 0;
    let expGain = 0;

    if (passed) {
      reward = 60 + (correctCount * 25) + (bestStreak * 10);
      expGain = 25 + (correctCount * 8);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      if (correctCount === pool.length) user.ipLevel = (user.ipLevel || 1) + 1;
    }
    user.ipCorrect = (user.ipCorrect || 0) + correctCount;
    user.ipWrong = (user.ipWrong || 0) + (pool.length - correctCount);
    if (bestStreak > (user.ipBestStreak || 0)) user.ipBestStreak = bestStreak;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL:");
    lines.push("Benar: " + correctCount + "/" + pool.length);
    lines.push("Best streak: " + bestStreak);
    if (passed) {
      lines.push("LULUS! Reward: " + reward + " koin, +" + expGain + " EXP");
      if (correctCount === pool.length) lines.push("SEMPURNA! Level naik!");
    } else {
      lines.push("Belum lulus. Minimal 3/5 benar!");
    }
    lines.push("", "Level: " + (user.ipLevel || 1));
    lines.push("Streak terbaik: " + (user.ipBestStreak || 0));
    lines.push("Energi: " + user.energi);

    return m.reply(claraWrap("RPG Indonesia Pintar", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Indonesia Pintar]", e);
    m.reply(claraWrap("RPG Indonesia Pintar", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
