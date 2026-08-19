// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Biology — Lab battle dengan menjawab soal biologi/anatomi
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgbiology",
  alias: ["rpgbiologi", "biologirpg", "rpghewan", "rpganatomi"],
  category: "rpg",
  description: "Lab battle RPG — belajar biologi & anatomi sambil bertarung dengan monster!",
  usage: ".rpgbiology | .rpgbiology status | .rpgbiology lab",
  example: ".rpgbiology",
  isGroup: true,
  cooldown: 20,
  energi: 8,
  isEnabled: true,
};

const QUESTIONS = [
  { q: "Organ tubuh manusia yang memompa darah?", a: "jantung", cat: "Anatomi" },
  { q: "Organ yang bertugas menyaring darah dan menghasilkan urine?", a: "ginjal", cat: "Anatomi" },
  { q: "Bagian sel yang menghasilkan energi (ATP)?", a: "mitokondria", cat: "Sel" },
  { q: "Bagian sel yang menyimpan informasi genetik?", a: "nukleus", cat: "Sel" },
  { q: "Proses tumbuhan membuat makanan sendiri disebut?", a: "fotosintesis", cat: "Tumbuhan" },
  { q: "Hewan terbesar di dunia?", a: "paus biru", cat: "Hewan" },
  { q: "Hewan tercepat di darat?", a: "cheetah", cat: "Hewan" },
  { q: "Berapa jumlah ruas tulang belakang manusia dewasa?", a: "33", cat: "Anatomi" },
  { q: "Organ pernapasan utama manusia?", a: "paru-paru", cat: "Anatomi" },
  { q: "Bagian otak yang mengatur keseimbangan?", a: "serebellum", cat: "Anatomi" },
  { q: "Pembuluh darah yang membawa darah keluar jantung?", a: "arteri", cat: "Anatomi" },
  { q: "Pembuluh darah yang membawa darah kembali ke jantung?", a: "vena", cat: "Anatomi" },
  { q: "Jumlah kromosom manusia normal?", a: "46", cat: "Genetik" },
  { q: "DNA adalah singkatan dari?", a: "deoxyribonucleic acid", cat: "Genetik" },
  { q: "Proses pembelahan sel untuk pertumbuhan?", a: "mitosis", cat: "Sel" },
  { q: "Proses pembelahan sel untuk reproduksi seksual?", a: "meiosis", cat: "Sel" },
  { q: "Pigmen hijau pada tumbuhan disebut?", a: "klorofil", cat: "Tumbuhan" },
  { q: "Hewan yang bisa berubah warna kulit?", a: "bunglon", cat: "Hewan" },
  { q: "Hewan yang tidak punya tulang belakang disebut?", a: "invertebrata", cat: "Klasifikasi" },
  { q: "Hewan yang menyusui anaknya disebut?", a: "mamalia", cat: "Klasifikasi" },
  { q: "Organ pencernaan terbesar di tubuh manusia?", a: "usus halus", cat: "Anatomi" },
  { q: "Kelenjar yang menghasilkan insulin?", a: "pankreas", cat: "Anatomi" },
  { q: "Bagian mata yang peka terhadap cahaya?", a: "retina", cat: "Anatomi" },
  { q: "Bagian telinga yang menjaga keseimbangan?", a: "telinga dalam", cat: "Anatomi" },
  { q: "Sel darah yang membawa oksigen?", a: "sel darah merah", cat: "Anatomi" },
  { q: "Sel darah yang melawan infeksi?", a: "sel darah putih", cat: "Anatomi" },
  { q: "Proses pernapasan tumbuhan pada malam hari?", a: "respirasi", cat: "Tumbuhan" },
  { q: "Gas yang dihasilkan tumbuhan saat fotosintesis?", a: "oksigen", cat: "Tumbuhan" },
  { q: "Gas yang dibutuhkan tumbuhan untuk fotosintesis?", a: "karbon dioksida", cat: "Tumbuhan" },
  { q: "Kingdom terbesar dalam klasifikasi makhluk hidup?", a: "animalia", cat: "Klasifikasi" },
];

const MONSTERS = [
  { name: "Virus Mutan", hp: 30, reward: 50, emoji: "Lv.1" },
  { name: "Bakteri Jahat", hp: 50, reward: 80, emoji: "Lv.2" },
  { name: "Parasit Sel", hp: 70, reward: 120, emoji: "Lv.3" },
  { name: "DNA Corruptor", hp: 100, reward: 200, emoji: "Lv.4" },
  { name: "Chimera Bio", hp: 150, reward: 350, emoji: "Lv.5" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Biology", [
        "STATUS BIOLOGI RPG",
        "",
        "Level biologi: " + (user.bioLevel || 1),
        "Lab battle menang: " + (user.bioWins || 0),
        "Lab battle kalah: " + (user.bioLosses || 0),
        "Soal benar: " + (user.bioCorrect || 0),
        "Total soal: " + (user.bioTotal || 0),
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgbiology untuk mulai lab battle!",
      ]));
    }

    // LAB (study)
    if (sub === "lab" || sub === "belajar") {
      const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      return m.reply(claraWrap("RPG Biology", [
        "LAB STUDY: " + q.cat,
        "",
        "Pertanyaan: " + q.q,
        "",
        "Jawaban: " + q.a,
        "",
        "Pelajari ini untuk battle berikutnya!",
      ], "info"));
    }

    // BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Biology", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const bioLevel = user.bioLevel || 1;
    const monsterIdx = Math.min(MONSTERS.length - 1, Math.floor((bioLevel - 1) / 2));
    const monster = MONSTERS[monsterIdx];
    const numQuestions = 3;

    // Generate questions
    let battleQuestions = [];
    for (let i = 0; i < numQuestions; i++) {
      const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      // Generate wrong options
      const wrongPool = QUESTIONS.filter((qq) => qq.a !== q.a);
      const wrongs = [];
      while (wrongs.length < 3) {
        const rand = wrongPool[Math.floor(Math.random() * wrongPool.length)];
        if (!wrongs.includes(rand.a)) wrongs.push(rand.a);
      }
      const options = [q.a, ...wrongs].sort(() => Math.random() - 0.5);
      battleQuestions.push({ ...q, options });
    }

    let correctCount = 0;
    let lines = [
      "LAB BATTLE RPG BIOLOGI",
      "",
      "Musuh: " + monster.name + " (" + monster.emoji + ")",
      "HP: " + monster.hp,
      "",
      "SOAL LAB BATTLE:",
      "",
    ];

    battleQuestions.forEach((q, i) => {
      lines.push("Soal " + (i + 1) + " [" + q.cat + "]: " + q.q);
      lines.push("A. " + q.options[0]);
      lines.push("B. " + q.options[1]);
      lines.push("C. " + q.options[2]);
      lines.push("D. " + q.options[3]);
      const correctLetter = ["A", "B", "C", "D"][q.options.indexOf(q.a)];
      lines.push("Jawaban: " + correctLetter + ". " + q.a);
      lines.push("");
      if (q.options.includes(q.a)) correctCount++;
    });

    user.energi -= pluginConfig.energi;
    const won = correctCount >= 2;
    let reward = 0;
    let expGain = 0;

    if (won) {
      reward = monster.reward + (correctCount * 25);
      expGain = monster.reward / 2 + (correctCount * 5);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.bioWins = (user.bioWins || 0) + 1;
      if (user.exp >= (user.bioLevel || 1) * 100) {
        user.bioLevel = (user.bioLevel || 1) + 1;
      }
    } else {
      user.bioLosses = (user.bioLosses || 0) + 1;
    }
    user.bioCorrect = (user.bioCorrect || 0) + correctCount;
    user.bioTotal = (user.bioTotal || 0) + numQuestions;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL LAB BATTLE:");
    lines.push("Jawaban benar: " + correctCount + "/" + numQuestions);
    lines.push(won ? "MENANG! " + monster.name + " dikalahkan!" : "KALAH! " + monster.name + " terlalu kuat.");
    if (won) {
      lines.push("Reward: " + reward + " koin");
      lines.push("EXP: +" + Math.round(expGain));
      lines.push("Level Biologi: " + (user.bioLevel || 1));
    }
    lines.push("", "Energi tersisa: " + user.energi);
    lines.push("Belajar gratis: .rpgbiology lab");

    return m.reply(claraWrap("RPG Biology", lines, won ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Biology]", e);
    m.reply(claraWrap("RPG Biology", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
