// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Math Battle — Battle monster dengan menjawab soal matematika
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgmath",
  alias: ["rpgmatematika", "mathrpg", "matematikarpg"],
  category: "rpg",
  description: "Battle monster dengan menjawab soal matematika — asah otak sambil RPG!",
  usage: ".rpgmath | .rpgmath status | .rpgmath practice",
  example: ".rpgmath",
  isGroup: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const MONSTERS = [
  { name: "Goblin Hitung", hp: 30, reward: 50, exp: 15, emoji: "Level 1" },
  { name: "Orc Aritmatika", hp: 50, reward: 80, exp: 25, emoji: "Level 2" },
  { name: "Wizard Aljabar", hp: 70, reward: 120, exp: 35, emoji: "Level 3" },
  { name: "Dragon Geometri", hp: 100, reward: 200, exp: 50, emoji: "Level 4" },
  { name: "Titan Kalkulus", hp: 150, reward: 350, exp: 80, emoji: "Level 5" },
];

function generateMathQuestion(difficulty) {
  const ops = ["+", "-", "*"];
  const d = Math.min(5, Math.max(1, difficulty));

  if (d <= 2) {
    const a = Math.floor(Math.random() * (10 * d)) + 1;
    const b = Math.floor(Math.random() * (10 * d)) + 1;
    const op = ops[Math.floor(Math.random() * (d >= 2 ? 3 : 2))];
    const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
    return { question: a + " " + (op === "*" ? "x" : op) + " " + b + " = ?", answer, type: "Aritmatika Dasar" };
  } else if (d === 3) {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 20) + 5;
    const c = Math.floor(Math.random() * 10) + 1;
    const answer = a * b - c;
    return { question: a + " x " + b + " - " + c + " = ?", answer, type: "Aritmatika Campuran" };
  } else if (d === 4) {
    const a = Math.floor(Math.random() * 10) + 2;
    const b = Math.floor(Math.random() * 10) + 2;
    const c = Math.floor(Math.random() * 10) + 1;
    const answer = a * b + c * c;
    return { question: a + " x " + b + " + " + c + "^2 = ?", answer, type: "Aljabar" };
  } else {
    const a = Math.floor(Math.random() * 15) + 5;
    const b = Math.floor(Math.random() * 10) + 2;
    const c = Math.floor(Math.random() * 10) + 1;
    const answer = (a + b) * c - b;
    return { question: "(" + a + " + " + b + ") x " + c + " - " + b + " = ?", answer, type: "Aljabar Lanjut" };
  }
}

function generateOptions(answer) {
  const options = [answer];
  while (options.length < 4) {
    const fake = answer + Math.floor(Math.random() * 20) - 10;
    if (fake !== answer && !options.includes(fake) && fake >= 0) options.push(fake);
  }
  return options.sort(() => Math.random() - 0.5);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Math Battle", [
        "STATUS MATEMATIKA RPG",
        "",
        "Level matematika: " + (user.mathLevel || 1),
        "Battle menang: " + (user.mathWins || 0),
        "Battle kalah: " + (user.mathLosses || 0),
        "Soal benar: " + (user.mathCorrect || 0),
        "Total soal: " + (user.mathTotal || 0),
        "Akurasi: " + ((user.mathTotal || 0) > 0 ? Math.round(((user.mathCorrect || 0) / (user.mathTotal || 1)) * 100) : 0) + "%",
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgmath untuk mulai battle!",
        "Ketik .rpgmath practice untuk latihan tanpa energi",
      ]));
    }

    // PRACTICE
    if (sub === "practice" || sub === "latihan") {
      const difficulty = user.mathLevel || 1;
      const q = generateMathQuestion(difficulty);
      const options = generateOptions(q.answer);
      let lines = [
        "LATIHAN MATEMATIKA",
        "Level: " + difficulty,
        "Tipe: " + q.type,
        "",
        "Soal: " + q.question,
        "",
        "Pilihan:",
      ];
      options.forEach((o, i) => {
        const letter = ["A", "B", "C", "D"][i];
        lines.push(letter + ". " + o);
      });
      lines.push("", "Jawaban: " + q.answer);
      return m.reply(claraWrap("RPG Math Battle", lines, "info"));
    }

    // BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Math Battle", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const mathLevel = user.mathLevel || 1;
    const monsterIdx = Math.min(MONSTERS.length - 1, Math.floor((mathLevel - 1) / 2));
    const monster = MONSTERS[monsterIdx];

    // Generate 3 questions
    const questions = [];
    for (let i = 0; i < 3; i++) questions.push(generateMathQuestion(mathLevel));

    let correctCount = 0;
    let battleLog = [];

    questions.forEach((q, i) => {
      const options = generateOptions(q.answer);
      battleLog.push("Soal " + (i + 1) + " [" + q.type + "]: " + q.question);
      battleLog.push("A. " + options[0] + "  B. " + options[1]);
      battleLog.push("C. " + options[2] + "  D. " + options[3]);
      battleLog.push("Jawaban: " + q.answer);
      if (options.indexOf(q.answer) >= 0) correctCount++;
      battleLog.push("");
    });

    user.energi -= pluginConfig.energi;
    const won = correctCount >= 2;
    let reward = 0;
    let expGain = 0;

    if (won) {
      reward = monster.reward + (correctCount * 20);
      expGain = monster.exp + (correctCount * 5);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.mathWins = (user.mathWins || 0) + 1;
    } else {
      user.mathLosses = (user.mathLosses || 0) + 1;
    }
    user.mathCorrect = (user.mathCorrect || 0) + correctCount;
    user.mathTotal = (user.mathTotal || 0) + 3;
    if (won && user.exp >= (user.mathLevel || 1) * 100) {
      user.mathLevel = (user.mathLevel || 1) + 1;
    }

    db.data.users[sender] = user;
    await db.save();

    let lines = [
      "BATTLE MATEMATIKA RPG",
      "",
      "Musuh: " + monster.name + " (" + monster.emoji + ")",
      "HP Musuh: " + monster.hp,
      "",
      "SOAL BATTLE:",
      "",
    ];

    battleLog.forEach((l) => lines.push(l));

    lines.push("HASIL BATTLE:");
    lines.push("Jawaban benar: " + correctCount + "/3");
    lines.push(won ? "MENANG! " + monster.name + " dikalahkan!" : "KALAH! Belajar lebih giat!");
    if (won) {
      lines.push("Reward: " + reward + " koin");
      lines.push("EXP: +" + expGain);
      lines.push("Level Matematika: " + (user.mathLevel || 1));
    }
    lines.push("", "Energi tersisa: " + user.energi);
    lines.push("Latihan gratis: .rpgmath practice");

    return m.reply(claraWrap("RPG Math Battle", lines, won ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Math Battle]", e);
    m.reply(claraWrap("RPG Math Battle", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
