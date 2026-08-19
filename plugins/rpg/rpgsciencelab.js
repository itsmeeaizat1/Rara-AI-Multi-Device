// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Science Lab — Eksperimen sains interaktif untuk belajar konsep ilmiah
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgsciencelab",
  alias: ["rpgsains", "rpglab", "sainsrpg", "rpgexperiment"],
  category: "rpg",
  description: "Science Lab RPG — eksperimen sains dengan tebakan hasil, belajar fisika/kimia/biologi",
  usage: ".rpgsciencelab | .rpgsciencelab status | .rpgsciencelab theory",
  example: ".rpgsciencelab",
  isGroup: true,
  cooldown: 15,
  energi: 6,
  isEnabled: true,
};

const EXPERIMENTS = [
  {
    title: "Percobaan: Air + Garam",
    desc: "Jika kamu melarutkan garam ke dalam air, apa yang terjadi pada titik didih larutan?",
    options: ["Naik", "Turun", "Tetap", "Menguap"],
    answer: "Naik",
    explanation: "Penambahan garam (zat terlarut) meningkatkan titik didih larutan. Ini disebut efek ebullioskopi.",
    category: "Kimia",
  },
  {
    title: "Percobaan: Magnesium + Api",
    desc: "Logam magnesium dibakar akan menghasilkan cahaya putih terang. Reaksi ini termasuk jenis?",
    options: ["Eksoterm", "Endoterm", "Isoterm", "Fotonik"],
    answer: "Eksoterm",
    explanation: "Pembakaran magnesium melepas energi panas dan cahaya. Reaksi yang melepas energi disebut eksoterm.",
    category: "Kimia",
  },
  {
    title: "Percobaan: Bola Jatuh",
    desc: "Sebuah bola dijatuhkan dari ketinggian. Energi potensial berubah menjadi?",
    options: ["Energi kinetik", "Energi kimia", "Energi nuklir", "Energi listrik"],
    answer: "Energi kinetik",
    explanation: "Saat benda jatuh, energi potensial (ketinggian) berubah menjadi energi kinetik (gerak).",
    category: "Fisika",
  },
  {
    title: "Percobaan: Magnet",
    desc: "Dua magnet kutub utara dihadapkan akan?",
    options: ["Tolak menolak", "Tarik menarik", "Menempel", "Tidak terjadi apa-apa"],
    answer: "Tolak menolak",
    explanation: "Kutub yang sama (utara-utara) tolak menolak, kutub berbeda (utara-selatan) tarik menarik.",
    category: "Fisika",
  },
  {
    title: "Percobaan: Tumbuhan",
    desc: "Tumbuhan ditaruh di tempat gelap akan berhenti melakukan?",
    options: ["Fotosintesis", "Respirasi", "Transpirasi", "Tumbuh"],
    answer: "Fotosintesis",
    explanation: "Fotosintesis butuh cahaya matahari. Tanpa cahaya, fotosintesis berhenti, tapi respirasi tetap berjalan.",
    category: "Biologi",
  },
  {
    title: "Percobaan: Es Mencair",
    desc: "Saat es mencair, suhunya tetap 0 derajat Celsius sampai semua es mencair. Panas yang diserap disebut?",
    options: ["Kalor laten", "Kalor sensibel", "Energi dalam", "Entropi"],
    answer: "Kalor laten",
    explanation: "Kalor laten adalah panas yang diserap untuk mengubah wujud tanpa mengubah suhu.",
    category: "Fisika",
  },
  {
    title: "Percobaan: Lemon Battery",
    desc: "Menancapkan seng dan tembaga ke lemon bisa menghasilkan listrik. Ini karena?",
    options: ["Reaksi elektrokimia", "Reaksi nuklir", "Reaksi termal", "Reaksi mekanis"],
    answer: "Reaksi elektrokimia",
    explanation: "Asam lemon bereaksi dengan logam berbeda (seng & tembaga) menghasilkan arus listrik.",
    category: "Kimia",
  },
  {
    title: "Percobaan: Rambut Balon",
    desc: "Menggosok balon ke rambut lalu mendekatkan ke kertas kecil, kertas menempel. Ini karena?",
    options: ["Listrik statis", "Magnet", "Gravitasi", "Pengisap udara"],
    answer: "Listrik statis",
    explanation: "Gesekan balon dan rambut menciptakan muatan listrik statis yang menarik benda ringan.",
    category: "Fisika",
  },
  {
    title: "Percobaan: Gula Fermentasi",
    desc: "Gula + ragi dalam air hangat menghasilkan gas. Gas itu adalah?",
    options: ["Karbondioksida", "Oksigen", "Nitrogen", "Hidrogen"],
    answer: "Karbondioksida",
    explanation: "Ragi (yeast) memfermentasi gula menjadi etanol dan CO2. Itulah cara roti mengembang.",
    category: "Biologi",
  },
  {
    title: "Percobaan: Prisma",
    desc: "Cahaya putih melewati prisma menghasilkan spektrum warna. Ini disebut?",
    options: ["Dispersi", "Refraksi", "Refleksi", "Difraksi"],
    answer: "Dispersi",
    explanation: "Dispersion = penguraian cahaya putih menjadi warna pelangi karena perbedaan indeks bias.",
    category: "Fisika",
  },
  {
    title: "Percobaan: Kapur + Asam",
    desc: "Kapur (CaCO3) dimasukkan ke asam akan menggelembung. Gas yang dihasilkan?",
    options: ["CO2", "O2", "H2", "N2"],
    answer: "CO2",
    explanation: "Reaksi CaCO3 + asam menghasilkan kalsium, air, dan gas karbon dioksida (CO2).",
    category: "Kimia",
  },
  {
    title: "Percobaan: Tinta dalam Air",
    desc: "Tetesan tinta hitam diteteskan ke air. Warna terpisah menjadi beberapa warna. Proses ini disebut?",
    options: ["Kromatografi", "Destilasi", "Filtrasi", "Kristalisasi"],
    answer: "Kromatografi",
    explanation: "Kromatografi memisahkan komponen campuran berdasarkan kecepatan merambat dalam pelarut.",
    category: "Kimia",
  },
  {
    title: "Percobaan: Bayangan",
    desc: "Bayangan terbentuk karena cahaya yang merambat lurus terhalangi benda. Sifat cahaya ini adalah?",
    options: ["Merambat lurus", "Dibiaskan", "Dipantulkan", "Diuraikan"],
    answer: "Merambat lurus",
    explanation: "Cahaya merambat lurus. Saat terhalangi benda tidak tembus cahaya, terbentuk bayangan.",
    category: "Fisika",
  },
  {
    title: "Percobaan: Denyut Nadi",
    desc: "Berolahraga membuat denyut nadi lebih cepat. Ini karena tubuh butuh lebih banyak?",
    options: ["Oksigen", "Gula", "Air", "Protein"],
    answer: "Oksigen",
    explanation: "Otot aktif butuh lebih banyak oksigen. Jantung berdetak lebih cepat untuk mengantarkannya.",
    category: "Biologi",
  },
  {
    title: "Percobaan: Besi Berkarat",
    desc: "Besi yang dibiarkan di udara terbuka lama-lama berkarat. Faktor utama penyebabnya?",
    options: ["Oksigen dan air", "Cahaya matahari", "Suhu tinggi", "Tekanan udara"],
    answer: "Oksigen dan air",
    explanation: "Besi berkarat karena bereaksi dengan oksigen dan air (oksidasi). Coating/cat mencegahnya.",
    category: "Kimia",
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Science Lab", [
        "STATUS SCIENCE LAB",
        "",
        "Level sains: " + (user.sciLevel || 1),
        "Eksperimen benar: " + (user.sciCorrect || 0),
        "Eksperimen salah: " + (user.sciWrong || 0),
        "Eksperimen selesai: " + (user.sciTotal || 0) + "/" + EXPERIMENTS.length,
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgsciencelab untuk mulai eksperimen!",
        "Ketik .rpgsciencelab theory untuk belajar teori",
      ]));
    }

    // THEORY
    if (sub === "theory" || sub === "teori") {
      const exp = EXPERIMENTS[Math.floor(Math.random() * EXPERIMENTS.length)];
      return m.reply(claraWrap("RPG Science Lab", [
        "TEORI SAINS: " + exp.category,
        "",
        exp.title,
        "",
        exp.desc,
        "",
        "Jawaban: " + exp.answer,
        "",
        "Penjelasan: " + exp.explanation,
      ], "info"));
    }

    // START EXPERIMENT
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Science Lab", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const sciLevel = user.sciLevel || 1;
    const numExp = Math.min(4, 2 + Math.floor(sciLevel / 3));

    // Pick random experiments
    const shuffled = [...EXPERIMENTS].sort(() => Math.random() - 0.5).slice(0, numExp);

    let correctCount = 0;
    let lines = [
      "SCIENCE LAB RPG",
      "Level: " + sciLevel,
      "Eksperimen: " + numExp,
      "",
      "EKSPERIMEN:",
      "",
    ];

    shuffled.forEach((exp, i) => {
      lines.push("Eksperimen " + (i + 1) + " [" + exp.category + "]: " + exp.title);
      lines.push(exp.desc);
      lines.push("");
      lines.push("A. " + exp.options[0]);
      lines.push("B. " + exp.options[1]);
      lines.push("C. " + exp.options[2]);
      lines.push("D. " + exp.options[3]);
      const correctIdx = exp.options.indexOf(exp.answer);
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + exp.answer);
      lines.push("Penjelasan: " + exp.explanation);
      if (correctIdx >= 0) correctCount++;
      lines.push("");
    });

    user.energi -= pluginConfig.energi;
    const passed = correctCount >= Math.ceil(numExp * 0.6);
    let reward = 0;
    let expGain = 0;

    if (passed) {
      reward = 60 + (correctCount * 30) + (sciLevel * 5);
      expGain = 20 + (correctCount * 8);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.sciTotal = Math.min(EXPERIMENTS.length, (user.sciTotal || 0) + 1);
      if (user.exp >= (user.sciLevel || 1) * 90) {
        user.sciLevel = (user.sciLevel || 1) + 1;
      }
    }
    user.sciCorrect = (user.sciCorrect || 0) + correctCount;
    user.sciWrong = (user.sciWrong || 0) + (numExp - correctCount);
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL EKSPERIMEN:");
    lines.push("Benar: " + correctCount + "/" + numExp);
    if (passed) {
      lines.push("BERHASIL! Reward: " + reward + " koin, +" + expGain + " EXP");
      lines.push("Level Sains: " + (user.sciLevel || 1));
    } else {
      lines.push("GAGAL! Pelajari teori lagi: .rpgsciencelab theory");
    }
    lines.push("", "Eksperimen selesai: " + (user.sciTotal || 0) + "/" + EXPERIMENTS.length);
    lines.push("Energi: " + user.energi);

    return m.reply(claraWrap("RPG Science Lab", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Science Lab]", e);
    m.reply(claraWrap("RPG Science Lab", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
