// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Fast Math — Jawab matematika secepat mungkin, makin cepat makin besar reward
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgfastmath",
  alias: ["rpgcepatmat", "fastmathrpg", "rpgcepathitung", "hitangcepat"],
  category: "rpg",
  description: "Fast Math RPG — jawab soal matematika secepat mungkin, makin cepat makin besar reward!",
  usage: ".rpgfastmath | .rpgfastmath status | .rpgfastmath practice",
  example: ".rpgfastmath",
  isGroup: true,
  cooldown: 5,
  energi: 3,
  isEnabled: true,
};

function generateQuestion(level) {
  const d = Math.min(6, Math.max(1, level));
  let a, b, op, answer, type;

  if (d <= 2) {
    a = Math.floor(Math.random() * (10 * d)) + 1;
    b = Math.floor(Math.random() * (10 * d)) + 1;
    op = d >= 2 ? ["+", "-", "x"][Math.floor(Math.random() * 3)] : ["+", "-"][Math.floor(Math.random() * 2)];
    answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
    type = "Dasar";
  } else if (d <= 4) {
    a = Math.floor(Math.random() * (15 * d)) + 5;
    b = Math.floor(Math.random() * (10 * d)) + 2;
    op = ["+", "-", "x", ":"][Math.floor(Math.random() * 4)];
    if (op === ":") { a = a * b; answer = a / b; }
    else answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
    type = "Menengah";
  } else {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * 15) + 3;
    const c = Math.floor(Math.random() * 10) + 1;
    const pat = Math.floor(Math.random() * 3);
    if (pat === 0) { answer = a * b + c; type = "Aljabar+"; }
    else if (pat === 1) { answer = (a + b) * c; type = "Kurung"; }
    else { answer = a * c - b; type = "Campur"; }
  }

  const opDisplay = op === "x" ? "x" : op === ":" ? "/" : op;
  let question;
  if (type === "Aljabar+") question = a + " x " + b + " + " + c + " = ?";
  else if (type === "Kurung") question = "(" + a + " + " + b + ") x " + c + " = ?";
  else if (type === "Campur") question = a + " x " + c + " - " + b + " = ?";
  else question = a + " " + opDisplay + " " + b + " = ?";

  return { question, answer, type };
}

function generateOptions(answer) {
  const options = [answer];
  while (options.length < 4) {
    const fake = answer + Math.floor(Math.random() * 15) - 7;
    if (fake !== answer && fake >= 0 && !options.includes(fake)) options.push(fake);
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
      return m.reply(claraWrap("RPG Fast Math", [
        "STATUS FAST MATH",
        "",
        "Level: " + (user.fmLevel || 1),
        "Best time: " + ((user.fmBestTime || 0) / 1000).toFixed(2) + " detik",
        "Total benar: " + (user.fmCorrect || 0),
        "Total soal: " + (user.fmTotal || 0),
        "Akurasi: " + ((user.fmTotal || 0) > 0 ? Math.round(((user.fmCorrect || 0) / (user.fmTotal || 1)) * 100) : 0) + "%",
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgfastmath untuk main!",
        "Ketik .rpgfastmath practice untuk latihan gratis",
      ]));
    }

    // PRACTICE
    if (sub === "practice" || sub === "latihan") {
      const level = user.fmLevel || 1;
      const q = generateQuestion(level);
      const opts = generateOptions(q.answer);
      return m.reply(claraWrap("RPG Fast Math", [
        "LATIHAN FAST MATH (Gratis)",
        "Level: " + level + " | Tipe: " + q.type,
        "",
        q.question,
        "",
        "A. " + opts[0],
        "B. " + opts[1],
        "C. " + opts[2],
        "D. " + opts[3],
        "",
        "Jawaban: " + q.answer,
      ], "info"));
    }

    // START FAST MATH
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Fast Math", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const level = user.fmLevel || 1;
    const numRounds = 5;
    const startTime = Date.now();

    let correctCount = 0;
    let lines = [
      "FAST MATH RPG",
      "Level: " + level,
      "Ronde: " + numRounds,
      "",
      "RONDE SOAL:",
      "",
    ];

    for (let i = 0; i < numRounds; i++) {
      const q = generateQuestion(level);
      const opts = generateOptions(q.answer);
      lines.push("Ronde " + (i + 1) + " [" + q.type + "]: " + q.question);
      lines.push("A. " + opts[0] + "  B. " + opts[1]);
      lines.push("C. " + opts[2] + "  D. " + opts[3]);
      const correctIdx = opts.indexOf(q.answer);
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + q.answer);
      if (correctIdx >= 0) correctCount++;
      lines.push("");
    }

    const elapsed = Date.now() - startTime;
    user.energi -= pluginConfig.energi;

    // Reward berdasarkan kecepatan + benar
    const speedBonus = Math.max(0, 50 - Math.floor(elapsed / 1000) * 5);
    const baseReward = correctCount * 30;
    const reward = baseReward + speedBonus;
    const expGain = correctCount * 10 + level * 2;

    if (correctCount >= 3) {
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      if (correctCount === numRounds && elapsed < (user.fmBestTime || 999999)) {
        user.fmBestTime = elapsed;
      }
      if (user.exp >= (user.fmLevel || 1) * 80) {
        user.fmLevel = (user.fmLevel || 1) + 1;
      }
    }

    user.fmCorrect = (user.fmCorrect || 0) + correctCount;
    user.fmTotal = (user.fmTotal || 0) + numRounds;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL FAST MATH:");
    lines.push("Benar: " + correctCount + "/" + numRounds);
    lines.push("Waktu: " + (elapsed / 1000).toFixed(2) + " detik");
    lines.push("Speed bonus: " + speedBonus + " koin");
    if (correctCount >= 3) {
      lines.push("Total reward: " + reward + " koin, +" + expGain + " EXP");
      if (correctCount === numRounds) lines.push("SEMPURNA!");
    } else {
      lines.push("Minimal 3/" + numRounds + " benar untuk reward!");
    }
    lines.push("", "Best time: " + ((user.fmBestTime || 0) / 1000).toFixed(2) + " detik");
    lines.push("Level: " + (user.fmLevel || 1));
    lines.push("Energi: " + user.energi);

    return m.reply(claraWrap("RPG Fast Math", lines, correctCount >= 3 ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Fast Math]", e);
    m.reply(claraWrap("RPG Fast Math", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
