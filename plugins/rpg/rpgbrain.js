// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Brain Teaser — Tebak-tebakan logika & puzzle untuk asah otak
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgbrain",
  alias: ["rpgbrain teaser", "rpglogika", "rpgpuzzle", "rpgasahotak", "rpgteka"],
  category: "rpg",
  description: "Brain Teaser RPG — tebak-tebakan logika dan puzzle untuk asah otak",
  usage: ".rpgbrain | .rpgbrain status | .rpgbrain hint",
  example: ".rpgbrain",
  isGroup: true,
  cooldown: 10,
  energi: 4,
  isEnabled: true,
};

const PUZZLES = [
  { q: "Aku punya kunci tapi tak punya pintu. Aku?", opts: ["Kunci keyboard", "Pintu", "Kunci mobil", "Kunci rahasia"], a: "Kunci keyboard", category: "Tebakan" },
  { q: "Aku punya tangan tapi tak punya jari. Aku?", opts: ["Jam", "Patung", "Boneka", "Meja"], a: "Jam", category: "Tebakan" },
  { q: "Aku selalu datang tapi tak pernah sampai. Aku?", opts: ["Besok", "Kemarin", "Hari ini", "Besok lusa"], a: "Besok", category: "Logika" },
  { q: "Semakin banyak kamu ambil, semakin banyak tersisa. Aku?", opts: ["Jejak kaki", "Uang", "Waktu", "Napak tilas"], a: "Jejak kaki", category: "Logika" },
  { q: "Aku punya leher tapi tak punya kepala. Aku?", opts: ["Botol", "Tiara", "Selimut", "Bantal"], a: "Botol", category: "Tebakan" },
  { q: "Aku punya mata tapi tak bisa melihat. Aku?", opts: ["Jarum", "Buku", "Lampu", "Cermin"], a: "Jarum", category: "Tebakan" },
  { q: "Aku punya kaki tapi tak bisa berjalan. Aku?", opts: ["Meja", "Manusia", "Kucing", "Kursi roda"], a: "Meja", category: "Tebakan" },
  { q: "Aku punya gigi tapi tak bisa makan. Aku?", opts: ["Sisir", "Gergaji", "Garpu", "Sendok"], a: "Sisir", category: "Tebakan" },
  { q: "Seorang petani punya 17 domba. Semua mati kecuali 9. Berapa sisanya?", opts: ["9", "8", "17", "0"], a: "9", category: "Logika" },
  { q: "Ada 3 apel, kamu ambil 2. Berapa apel yang kamu punya?", opts: ["2", "3", "1", "5"], a: "2", category: "Logika" },
  { q: "Aku naik tapi tak pernah turun. Aku?", opts: ["Umur", "Harga", "Berat", "Tinggi"], a: "Umur", category: "Logika" },
  { q: "Aku ringan seperti bulu, tapi tak bisa dipegang lama. Aku?", opts: ["Napasmu", "Debu", "Asap", "Bulu"], a: "Napasmu", category: "Logika" },
  { q: "Aku punya jari tapi tak punya tangan. Aku?", opts: ["Sarung tangan", "Cincin", "Gelang", "Kuku"], a: "Sarung tangan", category: "Tebakan" },
  { q: "Aku ada di depan mata tapi tak bisa dilihat. Aku?", opts: ["Masa depan", "Mata", "Cermin", "Kacamata"], a: "Masa depan", category: "Logika" },
  { q: "Aku punya kota tapi tak punya rumah, hutan tapi tak punya pohon, air tapi tak punya ikan. Aku?", opts: ["Peta", "Lukisan", "Buku", "Foto"], a: "Peta", category: "Tebakan" },
  { q: "Jika 5 orang membuat 5 tembok dalam 5 jam, berapa jam 50 orang membuat 50 tembok?", opts: ["5 jam", "50 jam", "10 jam", "1 jam"], a: "5 jam", category: "Matematika Logika" },
  { q: "Aku punya banyak daun tapi bukan pohon. Aku?", opts: ["Buku", "Pohon", "Bambu", "Sayur"], a: "Buku", category: "Tebakan" },
  { q: "Makin gelap makin terang. Aku?", opts: ["Bintang", "Lampu", "Bulan", "Matahari"], a: "Bintang", category: "Tebakan" },
  { q: "Aku mengikutimu siang malam tapi menghilang saat gelap. Aku?", opts: ["Bayangan", "Bulan", "Cermin", "Mata"], a: "Bayangan", category: "Logika" },
  { q: "Aku punya 4 sisi sama, tapi bukan kotak. Aku?", opts: ["Belah ketupat", "Persegi", "Bujur sangkar", "Trapesium"], a: "Belah ketupat", category: "Logika" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Brain Teaser", [
        "STATUS BRAIN TEASER",
        "",
        "Level: " + (user.brLevel || 1),
        "Tebakan benar: " + (user.brCorrect || 0),
        "Tebakan salah: " + (user.brWrong || 0),
        "Streak terbaik: " + (user.brBestStreak || 0),
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgbrain untuk mulai!",
        "Ketik .rpgbrain hint untuk tebak-tebakan gratis",
      ]));
    }

    // HINT (free single puzzle)
    if (sub === "hint" || sub === "contoh" || sub === "teka") {
      const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
      return m.reply(claraWrap("RPG Brain Teaser", [
        "TEBAKAN GRATIS",
        "Kategori: " + puzzle.category,
        "",
        puzzle.q,
        "",
        "A. " + puzzle.opts[0],
        "B. " + puzzle.opts[1],
        "C. " + puzzle.opts[2],
        "D. " + puzzle.opts[3],
        "",
        "Jawaban: " + puzzle.a,
      ], "info"));
    }

    // START BRAIN BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Brain Teaser", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const brLevel = user.brLevel || 1;
    const numPuzzles = Math.min(5, 2 + Math.floor(brLevel / 3));

    // Shuffle and pick
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, numPuzzles);

    let correctCount = 0;
    let streak = 0;
    let bestStreak = 0;

    let lines = [
      "BRAIN TEASER RPG",
      "Level: " + brLevel,
      "Tebakan: " + numPuzzles,
      "",
      "SOAL TEBAKAN:",
      "",
    ];

    shuffled.forEach((p, i) => {
      lines.push("Tebakan " + (i + 1) + " [" + p.category + "]: " + p.q);
      lines.push("A. " + p.opts[0]);
      lines.push("B. " + p.opts[1]);
      lines.push("C. " + p.opts[2]);
      lines.push("D. " + p.opts[3]);
      const correctIdx = p.opts.indexOf(p.a);
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + p.a);
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
    const passed = correctCount >= Math.ceil(numPuzzles * 0.6);
    let reward = 0;
    let expGain = 0;

    if (passed) {
      reward = 40 + (correctCount * 20) + (bestStreak * 10);
      expGain = 15 + (correctCount * 6);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      if (correctCount === numPuzzles) user.brLevel = (user.brLevel || 1) + 1;
    }
    user.brCorrect = (user.brCorrect || 0) + correctCount;
    user.brWrong = (user.brWrong || 0) + (numPuzzles - correctCount);
    if (bestStreak > (user.brBestStreak || 0)) user.brBestStreak = bestStreak;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL BRAIN TEASER:");
    lines.push("Benar: " + correctCount + "/" + numPuzzles);
    lines.push("Best streak: " + bestStreak);
    if (passed) {
      lines.push("LULUS! Reward: " + reward + " koin, +" + expGain + " EXP");
      if (correctCount === numPuzzles) lines.push("SEMPURNA! Level naik!");
    } else {
      lines.push("Belum lulus. Latih logika lagi!");
    }
    lines.push("", "Level: " + (user.brLevel || 1));
    lines.push("Streak terbaik: " + (user.brBestStreak || 0));
    lines.push("Energi: " + user.energi);
    lines.push("", "Tebakan gratis: .rpgbrain hint");

    return m.reply(claraWrap("RPG Brain Teaser", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Brain Teaser]", e);
    m.reply(claraWrap("RPG Brain Teaser", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
