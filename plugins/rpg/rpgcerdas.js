// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cerdas Cermat — Quiz buzzer style, jawab cepat soal campuran
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgcerdas",
  alias: ["rpgcc", "cerdascermat", "rpgcermat"],
  category: "rpg",
  description: "Cerdas Cermat RPG — quiz buzzer cepat dengan soal campuran (IPA, IPS, Bahasa, Matematika)",
  usage: ".rpgcerdas | .rpgcerdas status | .rpgcerdas category <ipa/ips/bahasa/matematika/campuran>",
  example: ".rpgcerdas\n.rpgcerdas category ipa",
  isGroup: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const QUESTIONS = {
  ipa: [
    { q: "Rumus kimia untuk air adalah?", a: "h2o", opts: ["H2O", "CO2", "O2", "NaCl"] },
    { q: "Satuan gaya dalam SI adalah?", a: "newton", opts: ["Newton", "Joule", "Watt", "Pascal"] },
    { q: "Kecepatan cahaya dalam ruang hampa adalah?", a: "300.000 km/detik", opts: ["300.000 km/detik", "150.000 km/detik", "30.000 km/detik", "3.000 km/detik"] },
    { q: "Hukum Newton ke-3 tentang?", a: "aksi reaksi", opts: ["Aksi-Reaksi", "Kelembaman", "Gaya=F.m.a", "Gravitasi"] },
    { q: "Planet terbesar di tata surya?", a: "jupiter", opts: ["Jupiter", "Saturnus", "Bumi", "Neptunus"] },
    { q: "Gas penyebab efek rumah kaca utama?", a: "karbon dioksida", opts: ["Karbon Dioksida", "Oksigen", "Nitrogen", "Hidrogen"] },
    { q: "Tulang terpanjang di tubuh manusia?", a: "femur", opts: ["Femur", "Tulang belakang", "Tibia", "Humerus"] },
    { q: "Proses tumbuhan menghasilkan makanan?", a: "fotosintesis", opts: ["Fotosintesis", "Respirasi", "Transpirasi", "Fermentasi"] },
    { q: "Jumlah tulang manusia dewasa?", a: "206", opts: ["206", "201", "212", "198"] },
    { q: "Tahap pertama siklus air?", a: "evaporasi", opts: ["Evaporasi", "Kondensasi", "Presipitasi", "Infiltrasi"] },
    { q: "Logam paling penghantar listrik?", a: "perak", opts: ["Perak", "Tembaga", "Emas", "Aluminium"] },
    { q: "Bagian atom yang bermuatan negatif?", a: "elektron", opts: ["Elektron", "Proton", "Neutron", "Nukleus"] },
    { q: "Jenis energi dari matahari?", a: "surya", opts: ["Surya", "Angin", "Air", "Nuklir"] },
    { q: "Organ yang memompa darah?", a: "jantung", opts: ["Jantung", "Paru-paru", "Hati", "Ginjal"] },
    { q: "Teori relativitas dikemukakan oleh?", a: "einstein", opts: ["Einstein", "Newton", "Galileo", "Tesla"] },
  ],
  ips: [
    { q: "Ibu kota Australia?", a: "canberra", opts: ["Canberra", "Sydney", "Melbourne", "Perth"] },
    { q: "Presiden pertama Indonesia?", a: "soekarno", opts: ["Soekarno", "Soeharto", "Habibie", "Megawati"] },
    { q: "Sungai terpanjang di dunia?", a: "nil", opts: ["Nil", "Amazon", "Yangtze", "Mississippi"] },
    { q: "Deklarasi kemerdekaan Indonesia?", a: "17 agustus 1945", opts: ["17 Agustus 1945", "1 Juni 1945", "20 Mei 1908", "28 Oktober 1928"] },
    { q: "Lagu kebangsaan Indonesia?", a: "indonesia raya", opts: ["Indonesia Raya", "Garuda Pancasila", "Halo-Halo Bandung", "Bagimu Negeri"] },
    { q: "Benua terkecil?", a: "australia", opts: ["Australia", "Eropa", "Antartika", "Amerika Selatan"] },
    { q: "Negara dengan populasi terbesar?", a: "tiongkok", opts: ["Tiongkok", "India", "Indonesia", "Amerika"] },
    { q: "Sumpah Pemuda diadakan tahun?", a: "1928", opts: ["1928", "1928", "1945", "1908"] },
    { q: "ASEAN didirikan tahun?", a: "1967", opts: ["1967", "1945", "1955", "1975"] },
    { q: "Mata uang Jepang?", a: "yen", opts: ["Yen", "Won", "Yuan", "Ringgit"] },
    { q: "Selat yang memisahkan Bali dan Lombok?", a: "selat lombok", opts: ["Selat Lombok", "Selat Madura", "Selat Sunda", "Selat Makassar"] },
    { q: "Pahlawan dari Aceh?", a: "cut nyak dhien", opts: ["Cut Nyak Dhien", "R.A. Kartini", "Dewi Sartika", "Fatmawati"] },
    { q: "Borobudur terletak di provinsi?", a: "jawa tengah", opts: ["Jawa Tengah", "Jawa Timur", "DI Yogyakarta", "Bali"] },
    { q: "Indonesia merdeka dari?", a: "belanda", opts: ["Belanda", "Jepang", "Portugis", "Inggris"] },
    { q: "Pancasila terdiri dari sila?", a: "5", opts: ["5", "4", "6", "3"] },
  ],
  bahasa: [
    { q: "Sinonim dari 'indah'?", a: "cantik", opts: ["Cantik", "Buruk", "Jelek", "Kotor"] },
    { q: "Antonim dari 'giat'?", a: "malas", opts: ["Malas", "Rajin", "Cepat", "Kuat"] },
    { q: "Bahasa resmi Indonesia?", a: "bahasa indonesia", opts: ["Bahasa Indonesia", "Bahasa Melayu", "Bahasa Jawa", "Bahasa Sunda"] },
    { q: "Kalimat yang menyatakan perintah disebut?", a: "imperatif", opts: ["Imperatif", "Deklaratif", "Interogatif", "Ekspresif"] },
    { q: "Prefiks 'me-' berfungsi sebagai?", a: "imbuhan awal", opts: ["Imbuhan awal", "Imbuhan akhir", "Imbuhan tengah", "Bukan imbuhan"] },
    { q: "Pantun terdiri dari berapa baris?", a: "4", opts: ["4", "2", "6", "8"] },
    { q: "Tokoh dalam cerita disebut?", a: "karakter", opts: ["Karakter", "Latar", "Sudut pandang", "Tema"] },
    { q: "Surat resmi ditujukan kepada?", a: "instansi", opts: ["Instansi", "Keluarga", "Teman", "Diri sendiri"] },
    { q: "Majas yang membandingkan dua hal dengan 'seperti'?", a: "simile", opts: ["Simile", "Metafora", "Hiperbola", "Personifikasi"] },
    { q: "Kalimat tanya diakhiri dengan?", a: "tanda tanya", opts: ["Tanda tanya", "Tanda seru", "Titik", "Koma"] },
    { q: "Homofon berarti?", a: "bunyi sama beda arti", opts: ["Bunyi sama beda arti", "Bunyi beda arti sama", "Arti sama bunyi beda", "Semua sama"] },
    { q: "Sajak terdiri dari?", a: "baris dan bait", opts: ["Baris dan bait", "Paragraf", "Kalimat", "Halaman"] },
    { q: "Sinonim 'pintar'?", a: "cerdas", opts: ["Cerdas", "Bodoh", "Lambat", "Malas"] },
    { q: "Bahasa yang paling banyak penutur di dunia?", a: "mandarin", opts: ["Mandarin", "Inggris", "Spanyol", "Hindi"] },
    { q: "Gabungan huruf vokal dan konsonan?", a: "suku kata", opts: ["Suku kata", "Kata", "Frasa", "Kalimat"] },
  ],
  matematika: [
    { q: "Hasil 7 x 8?", a: "56", opts: ["56", "54", "58", "64"] },
    { q: "Akar kuadrat dari 144?", a: "12", opts: ["12", "14", "10", "16"] },
    { q: "Luas lingkaran dengan jari-jari 7? (pi=22/7)", a: "154", opts: ["154", "144", "164", "148"] },
    { q: "Sudut dalam segitiga jumlahnya?", a: "180 derajat", opts: ["180 derajat", "90 derajat", "360 derajat", "270 derajat"] },
    { q: "Hasil 15% dari 200?", a: "30", opts: ["30", "20", "25", "35"] },
    { q: "Faktor prima dari 30?", a: "2x3x5", opts: ["2x3x5", "2x5x5", "3x5x5", "2x2x3"] },
    { q: "Keliling persegi dengan sisi 5?", a: "20", opts: ["20", "25", "15", "10"] },
    { q: "Hasil 2 pangkat 10?", a: "1024", opts: ["1024", "512", "256", "2048"] },
    { q: "Bilangan prima pertama?", a: "2", opts: ["2", "1", "3", "5"] },
    { q: "Volume kubus sisi 4?", a: "64", opts: ["64", "48", "32", "16"] },
    { q: "FPB dari 12 dan 18?", a: "6", opts: ["6", "3", "4", "2"] },
    { q: "Hasil 0.25 dalam bentuk pecahan?", a: "1/4", opts: ["1/4", "1/2", "1/3", "2/5"] },
    { q: "Luas segitiga dengan alas 6 dan tinggi 4?", a: "12", opts: ["12", "24", "10", "8"] },
    { q: "Derajat dalam 1 lingkaran penuh?", a: "360", opts: ["360", "180", "270", "90"] },
    { q: "Hasil 999 + 1?", a: "1000", opts: ["1000", "1001", "999", "1010"] },
  ],
};

const CATEGORIES = { ipa: "IPA", ips: "IPS", bahasa: "Bahasa", matematika: "Matematika", campuran: "Campuran" };

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Cerdas Cermat", [
        "STATUS CERDAS CERMAT",
        "",
        "Level: " + (user.ccLevel || 1),
        "Benar: " + (user.ccCorrect || 0),
        "Salah: " + (user.ccWrong || 0),
        "Streak terbaik: " + (user.ccBestStreak || 0),
        "Streak sekarang: " + (user.ccStreak || 0),
        "Total koin: " + (user.koin || 0),
        "",
        "Kategori default: " + (user.ccCategory || "campuran"),
        "",
        "Ketik .rpgcerdas untuk main!",
        "Ketik .rpgcerdas category <ipa/ips/bahasa/matematika/campuran>",
      ]));
    }

    // SET CATEGORY
    if (sub === "category" || sub === "kategori") {
      const cat = (args[1] || "").toLowerCase();
      if (!CATEGORIES[cat]) {
        return m.reply(claraWrap("RPG Cerdas Cermat", "Kategori: ipa, ips, bahasa, matematika, campuran\nContoh: .rpgcerdas category ipa"));
      }
      user.ccCategory = cat;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Cerdas Cermat", "Kategori diubah ke: *" + CATEGORIES[cat] + "*", "success"));
    }

    // START QUIZ
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Cerdas Cermat", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const cat = user.ccCategory || "campuran";
    let pool = [];
    if (cat === "campuran") {
      Object.values(QUESTIONS).forEach((arr) => { pool = pool.concat(arr); });
    } else {
      pool = QUESTIONS[cat] || [];
    }

    // Shuffle
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 5);

    let correctCount = 0;
    let streak = 0;
    let bestStreak = 0;
    let lines = [
      "CERDAS CERMAT RPG",
      "Kategori: " + CATEGORIES[cat],
      "Jumlah soal: " + pool.length,
      "",
      "SOAL-SOAL:",
      "",
    ];

    pool.forEach((item, i) => {
      lines.push("Soal " + (i + 1) + ": " + item.q);
      lines.push("A. " + item.opts[0]);
      lines.push("B. " + item.opts[1]);
      lines.push("C. " + item.opts[2]);
      lines.push("D. " + item.opts[3]);
      const correctLetter = ["A", "B", "C", "D"][item.opts.findIndex((o) => o.toLowerCase() === item.a.toLowerCase())];
      const isCorrect = correctLetter !== undefined;
      if (isCorrect) {
        correctCount++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
      lines.push("Jawaban: " + (correctLetter || "?") + ". " + item.a);
      if (isCorrect) lines.push("BENAR! Streak: " + streak);
      else lines.push("SALAH!");
      lines.push("");
    });

    user.energi -= pluginConfig.energi;
    const passed = correctCount >= 3;
    let reward = 0;
    let expGain = 0;

    if (passed) {
      reward = 50 + (correctCount * 25) + (bestStreak * 10);
      expGain = 20 + (correctCount * 8);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.ccLevel = (user.ccLevel || 1) + (correctCount === 5 ? 1 : 0);
    }
    user.ccCorrect = (user.ccCorrect || 0) + correctCount;
    user.ccWrong = (user.ccWrong || 0) + (pool.length - correctCount);
    user.ccStreak = streak;
    if (bestStreak > (user.ccBestStreak || 0)) user.ccBestStreak = bestStreak;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL:");
    lines.push("Benar: " + correctCount + "/" + pool.length);
    lines.push("Best streak: " + bestStreak);
    if (passed) {
      lines.push("LULUS! Reward: " + reward + " koin, +" + expGain + " EXP");
      if (correctCount === 5) lines.push("SEMPURNA! Level naik!");
    } else {
      lines.push("Belum lulus. Minimal 3/5 benar!");
    }
    lines.push("", "Energi: " + user.energi);
    lines.push("Streak terbaik: " + (user.ccBestStreak || 0));

    return m.reply(claraWrap("RPG Cerdas Cermat", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Cerdas Cermat]", e);
    m.reply(claraWrap("RPG Cerdas Cermat", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
