// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Elements — Battle monster dengan jawab soal unsur kimia
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgelements",
  alias: ["rpgkimia", "rpgunsur", "elemenrpg", "kimiarpg"],
  category: "rpg",
  description: "Battle monster dengan menjawab soal unsur periodik — belajar kimia sambil RPG!",
  usage: ".rpgelements | .rpgelements status | .rpgelements study",
  example: ".rpgelements",
  isGroup: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const ELEMENTS = [
  { symbol: "H", name: "Hidrogen", number: 1, group: "Non-logam", fact: "Unsur paling ringan dan paling banyak di alam semesta." },
  { symbol: "He", name: "Helium", number: 2, group: "Gas Mulia", fact: "Gas ringan yang dipakai balon, tidak mudah terbakar." },
  { symbol: "Li", name: "Litium", number: 3, group: "Logam Alkali", fact: "Dipakai di baterai HP dan laptop." },
  { symbol: "C", name: "Karbon", number: 6, group: "Non-logam", fact: "Dasar semua kehidupan, ada di DNA, grafit, dan intan." },
  { symbol: "N", name: "Nitrogen", number: 7, group: "Non-logam", fact: "78% udara bumi adalah nitrogen." },
  { symbol: "O", name: "Oksigen", number: 8, group: "Non-logam", fact: "Penting untuk pernapasan, 21% udara bumi." },
  { symbol: "F", name: "Fluor", number: 9, group: "Halogen", fact: "Paling reaktif, dipakai di pasta gigi (fluoride)." },
  { symbol: "Ne", name: "Neon", number: 10, group: "Gas Mulia", fact: "Dipakai di lampu neon, bersinar oranye-merah." },
  { symbol: "Na", name: "Natrium", number: 11, group: "Logam Alkali", fact: "Dipakai di garam dapur (NaCl), sangat reaktif dengan air." },
  { symbol: "Mg", name: "Magnesium", number: 12, group: "Logam Alkali Tanah", fact: "Dipakai kembang api, bersinar putih terang." },
  { symbol: "Al", name: "Aluminium", number: 13, group: "Logam Lain", fact: "Logam ringan, dipakai kaleng minuman dan kertas aluminium." },
  { symbol: "Si", name: "Silikon", number: 14, group: "Metaloid", fact: "Dasar chip komputer dan panel surya." },
  { symbol: "P", name: "Fosfor", number: 15, group: "Non-logam", fact: "Dipakai di korek api dan pupuk." },
  { symbol: "S", name: "Belerang", number: 16, group: "Non-logam", fact: "Dipakai di kembang api dan baterai asam." },
  { symbol: "Cl", name: "Klor", number: 17, group: "Halogen", fact: "Dipakai sterilisasi air kolam dan pemutih." },
  { symbol: "K", name: "Kalium", number: 19, group: "Logam Alkali", fact: "Penting untuk saraf dan otot, ada di pisang." },
  { symbol: "Ca", name: "Kalsium", number: 20, group: "Logam Alkali Tanah", fact: "Penting untuk tulang dan gigi." },
  { symbol: "Fe", name: "Besi", number: 26, group: "Logam Transisi", fact: "Banyak di inti bumi, penting untuk darah (hemoglobin)." },
  { symbol: "Cu", name: "Tembaga", number: 29, group: "Logam Transisi", fact: "Penghantar listrik baik, dipakai kabel." },
  { symbol: "Zn", name: "Seng", number: 30, group: "Logam Transisi", fact: "Penting untuk sistem imun, dipakai pelapis anti-karat." },
  { symbol: "Ag", name: "Perak", number: 47, group: "Logam Transisi", fact: "Penghantar terbaik, dipakai perhiasan dan elektronik." },
  { symbol: "Au", name: "Emas", number: 79, group: "Logam Transisi", fact: "Tidak berkarat, dipakai perhiasan dan cadangan devisa." },
  { symbol: "Hg", name: "Raksa", number: 80, group: "Logam Transisi", fact: "Satu-satunya logam cair suhu ruang, beracun." },
  { symbol: "Pb", name: "Timbal", number: 82, group: "Logam Lain", fact: "Dulu dipakai pipa dan cat, sekarang dilarang karena beracun." },
  { symbol: "U", name: "Uranium", number: 92, group: "Aktinida", fact: "Bahan bakar nuklir, sangat radioaktif." },
];

const MONSTERS = [
  { name: "Goblin Kimia", hp: 30, reward: 50, exp: 15 },
  { name: "Slime Asam", hp: 50, reward: 80, exp: 25 },
  { name: "Wolf Reaktif", hp: 70, reward: 120, exp: 35 },
  { name: "Golem Besi", hp: 100, reward: 200, exp: 50 },
  { name: "Dragon Radioaktif", hp: 150, reward: 350, exp: 80 },
];

const QUESTION_TYPES = ["symbol_to_name", "name_to_symbol", "number_to_name", "fact_to_name"];

function generateQuestion() {
  const elem = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];

  let question, answer;
  switch (type) {
    case "symbol_to_name":
      question = "Unsur dengan simbol " + elem.symbol + " adalah?";
      answer = elem.name.toLowerCase();
      break;
    case "name_to_symbol":
      question = "Simbol kimia untuk unsur " + elem.name + " adalah?";
      answer = elem.symbol.toLowerCase();
      break;
    case "number_to_name":
      question = "Unsur dengan nomor atom " + elem.number + " adalah?";
      answer = elem.name.toLowerCase();
      break;
    case "fact_to_name":
      question = "Unsur apakah ini? " + elem.fact;
      answer = elem.name.toLowerCase();
      break;
  }
  return { question, answer, element: elem, type };
}

function generateOptions(correct, type) {
  const correctAnswer = type === "name_to_symbol" ? correct.symbol.toLowerCase() : correct.name.toLowerCase();
  const pool = ELEMENTS.filter((e) => e.name !== correct.name);
  const wrong = [];
  while (wrong.length < 3) {
    const rand = pool[Math.floor(Math.random() * pool.length)];
    const wrongAnswer = type === "name_to_symbol" ? rand.symbol.toLowerCase() : rand.name.toLowerCase();
    if (!wrong.find((w) => w === wrongAnswer)) wrong.push(wrongAnswer);
  }
  const options = [correctAnswer, ...wrong].sort(() => Math.random() - 0.5);
  return options;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Elements", [
        "STATUS KIMIA RPG",
        "",
        "Level kimia: " + (user.chemLevel || 1),
        "Battle menang: " + (user.chemWins || 0),
        "Battle kalah: " + (user.chemLosses || 0),
        "Total pertanyaan benar: " + (user.chemCorrect || 0),
        "Unsur dipelajari: " + (user.chemLearned || 0) + "/" + ELEMENTS.length,
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgelements untuk mulai battle!",
        "Ketik .rpgelements study untuk belajar unsur",
      ]));
    }

    // STUDY
    if (sub === "study" || sub === "belajar") {
      const elem = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      if (!user.chemLearned) user.chemLearned = 0;
      user.chemLearned = Math.min(ELEMENTS.length, user.chemLearned + 1);
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Elements", [
        "STUDY UNSUR KIMIA",
        "",
        "Simbol: " + elem.symbol,
        "Nama: " + elem.name,
        "Nomor Atom: " + elem.number,
        "Golongan: " + elem.group,
        "",
        "Fakta: " + elem.fact,
        "",
        "Unsur dipelajari: " + user.chemLearned + "/" + ELEMENTS.length,
      ], "info"));
    }

    // BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Elements", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const chemLevel = user.chemLevel || 1;
    const monsterIdx = Math.min(MONSTERS.length - 1, Math.floor((chemLevel - 1) / 2));
    const monster = MONSTERS[monsterIdx];

    // Generate 3 questions untuk kalahin monster
    const questions = [];
    for (let i = 0; i < 3; i++) questions.push(generateQuestion());

    let correctCount = 0;
    let battleLog = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = generateOptions(q.element, q.type);
      const optText = options.map((o, idx) => (idx + 1) + ". " + o).join("\n");

      battleLog.push("Soal " + (i + 1) + ": " + q.question);
      battleLog.push(optText);
      battleLog.push("Jawaban: " + q.answer.toUpperCase());
      if (q.answer === options.find((o) => o === q.answer)) correctCount++;
    }

    user.energi -= pluginConfig.energi;
    const won = correctCount >= 2;
    let reward = 0;
    let expGain = 0;

    if (won) {
      reward = monster.reward + (correctCount * 20);
      expGain = monster.exp + (correctCount * 5);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.chemWins = (user.chemWins || 0) + 1;
      user.chemCorrect = (user.chemCorrect || 0) + correctCount;
      if (user.exp >= (user.chemLevel || 1) * 100) {
        user.chemLevel = (user.chemLevel || 1) + 1;
      }
    } else {
      user.chemLosses = (user.chemLosses || 0) + 1;
      user.chemCorrect = (user.chemCorrect || 0) + correctCount;
    }

    db.data.users[sender] = user;
    await db.save();

    let lines = [
      "BATTLE KIMIA RPG",
      "",
      "Musuh: " + monster.name + " (HP: " + monster.hp + ")",
      "Level musuh: " + (monsterIdx + 1),
      "",
      "SOAL BATTLE:",
      "",
    ];

    questions.forEach((q, i) => {
      lines.push("Soal " + (i + 1) + ": " + q.question);
      const options = generateOptions(q.element, q.type);
      lines.push("A. " + options[0]);
      lines.push("B. " + options[1]);
      lines.push("C. " + options[2]);
      lines.push("D. " + options[3]);
      lines.push("Jawaban: " + q.answer.toUpperCase() + " (" + (["symbol_to_name", "name_to_symbol", "number_to_name", "fact_to_name"][i % 4]) + ")");
      lines.push("");
    });

    lines.push("HASIL BATTLE:");
    lines.push("Jawaban benar: " + correctCount + "/3");
    lines.push(won ? "MENANG! " + monster.name + " dikalahkan!" : "KALAH! " + monster.name + " terlalu kuat.");
    if (won) {
      lines.push("Reward: " + reward + " koin");
      lines.push("EXP: +" + expGain);
      lines.push("Level Kimia: " + (user.chemLevel || 1));
    } else {
      lines.push("Coba lagi! Belajar lebih banyak unsur.");
    }
    lines.push("", "Energi tersisa: " + user.energi);
    lines.push("", "Belajar unsur: .rpgelements study");

    return m.reply(claraWrap("RPG Elements", lines, won ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Elements]", e);
    m.reply(claraWrap("RPG Elements", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
