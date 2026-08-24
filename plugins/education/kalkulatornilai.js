// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kalkulatornilai",
  alias: ["kalkulatornilai", "hitungnilai", "nilaikalkulator"],
  category: "education",
  description: "Kalkulator nilai - hitung nilai akhir & nilai minimal untuk lulus",
  usage: ".kalkulatornilai <command>",
  example: ".kalkulatornilai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const GRADE_MAP = { "A": 4, "AB": 3.5, "B": 3, "BC": 2.5, "C": 2, "CD": 1.5, "D": 1, "E": 0 };
const GRADE_TO_LETTER = [
  { min: 80, letter: "A", gpa: 4 },
  { min: 70, letter: "AB", gpa: 3.5 },
  { min: 65, letter: "B", gpa: 3 },
  { min: 60, letter: "BC", gpa: 2.5 },
  { min: 50, letter: "C", gpa: 2 },
  { min: 40, letter: "CD", gpa: 1.5 },
  { min: 30, letter: "D", gpa: 1 },
  { min: 0, letter: "E", gpa: 0 },
];

function scoreToLetter(score) {
  for (const g of GRADE_TO_LETTER) {
    if (score >= g.min) return g;
  }
  return GRADE_TO_LETTER[GRADE_TO_LETTER.length - 1];
}

function getPredicate(score) {
  if (score >= 80) return "A - Sangat Baik";
  if (score >= 70) return "AB - Baik Sekali";
  if (score >= 65) return "B - Baik";
  if (score >= 60) return "BC - Cukup Baik";
  if (score >= 50) return "C - Cukup";
  if (score >= 40) return "CD - Kurang";
  if (score >= 30) return "D - Kurang Sekali";
  return "E - Gagal";
}

async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Kalkulator Nilai\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}nilai final <nilai1> <bobot1> <nilai2> <bobot2> ...\` - Hitung nilai akhir\n`;
    txt += `2. \`${m.prefix}nilai needed <target> <nilai_sudah> <bobot_sudah> <bobot_sisa>\` - Nilai minimal untuk lulus\n`;
    txt += `3. \`${m.prefix}nilai convert <huruf>\` - Konversi nilai huruf ke angka\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}nilai final 80 30 75 30 60 40\`\n`;
    txt += `\`${m.prefix}nilai needed 70 75 40 60\`\n`;
    txt += `\`${m.prefix}nilai convert AB\`\n\n`;
    txt += `Bobot dalam persen (total 100). Skala nilai 0-100.`;
    return await m.reply( txt, { commandName: "kalkulatornilai" });
  }

  await m.react("🕒");

  try {
    // === FINAL GRADE ===
    if (cmd === "final" || cmd === "akhir" || cmd === "hitung") {
      const inputArgs = cmdArgs;
      if (inputArgs.length < 2 || inputArgs.length % 2 !== 0) {
        return m.reply(claraWrap("kalkulatornilai", "Format salah!\n\nContoh: `.nilai final 80 30 75 30 60 40`\n\nFormat: <nilai> <bobot%> <nilai> <bobot%> ...\nBobot total harus 100."));
      }

      let totalWeighted = 0;
      let totalWeight = 0;
      let details = [];

      for (let i = 0; i < inputArgs.length; i += 2) {
        const score = parseFloat(inputArgs[i]);
        const weight = parseFloat(inputArgs[i + 1]);
        if (isNaN(score) || score < 0 || score > 100) {
          return m.reply(claraWrap("Kalkulatornilai", `Nilai "${inputArgs[i]}" tidak valid! Harus 0-100.`));
        }
        if (isNaN(weight) || weight < 0) {
          return m.reply(claraWrap("Kalkulatornilai", `Bobot "${inputArgs[i + 1]}" tidak valid!`));
        }
        totalWeighted += score * weight;
        totalWeight += weight;
        details.push({ score, weight, contribution: (score * weight / 100).toFixed(1) });
      }

      if (totalWeight !== 100) {
        return m.reply(claraWrap("Kalkulatornilai", `Total bobot = ${totalWeight}%, harus 100%!\n\nSesuaikan bobot komponen.`));
      }

      const finalScore = totalWeighted / 100;
      const grade = scoreToLetter(finalScore);

      let txt = `Hasil Nilai Akhir\n\n`;
      txt += `Komponen:\n`;
      for (let i = 0; i < details.length; i++) {
        const d = details[i];
        txt += `${i + 1}. Nilai: ${d.score} | Bobot: ${d.weight}% | Kontribusi: ${d.contribution}\n`;
      }
      txt += `\nNilai Akhir: *${finalScore.toFixed(1)}*\n`;
      txt += `Huruf: *${grade.letter}*\n`;
      txt += `Ekuivalen IPK: *${grade.gpa}*\n`;
      txt += `Predikat: *${getPredicate(finalScore)}*`;
      await m.reply(txt);
      await m.react("🐣");
    }

    // === NEEDED GRADE ===
    else if (cmd === "needed" || cmd === "minimal" || cmd === "lulus") {
      const target = parseFloat(cmdArgs[0]);
      const currentScore = parseFloat(cmdArgs[1]);
      const currentWeight = parseFloat(cmdArgs[2]);
      const remainingWeight = parseFloat(cmdArgs[3]);

      if (isNaN(target) || isNaN(currentScore) || isNaN(currentWeight) || isNaN(remainingWeight)) {
        return m.reply(claraWrap("kalkulatornilai", "Format salah!\n\nContoh: `.nilai needed 70 75 40 60`\n\nFormat: <target nilai> <nilai sudah> <bobot sudah %> <bobot sisa %>"));
      }

      if (currentWeight + remainingWeight !== 100) {
        return m.reply(claraWrap("Kalkulatornilai", `Total bobot = ${currentWeight + remainingWeight}%, harus 100%!`));
      }

      // Formula: target = (currentScore * currentWeight + neededScore * remainingWeight) / 100
      // neededScore = (target * 100 - currentScore * currentWeight) / remainingWeight
      const neededScore = (target * 100 - currentScore * currentWeight) / remainingWeight;

      let txt = `Nilai Minimal untuk Lulus\n\n`;
      txt += `Target: ${target}\n`;
      txt += `Nilai sudah: ${currentScore} (bobot ${currentWeight}%)\n`;
      txt += `Bobot sisa: ${remainingWeight}%\n\n`;

      if (neededScore > 100) {
        txt += `*Tidak mungkin mencapai target!*\n`;
        txt += `Butuh nilai: ${neededScore.toFixed(1)}/100\n`;
        txt += `_Saran: turunkan target atau perbaiki komponen lain_`;
      } else if (neededScore < 0) {
        txt += `*Sudah pasti lulus!*\n`;
        txt += `Butuh nilai minimal: 0/100\n`;
        txt += `_Bisa santai untuk komponen sisanya_`;
      } else {
        const grade = scoreToLetter(neededScore);
        txt += `Butuh nilai minimal: *${neededScore.toFixed(1)}/100*\n`;
        txt += `Huruf minimal: *${grade.letter}*\n`;
        txt += `_Semangat belajar! target ${target} masih bisa dicapai_`;
      }
      await m.reply(txt);
      await m.react("🐣");
    }

    // === CONVERT ===
    else if (cmd === "convert" || cmd === "konversi") {
      const grade = cmdArgs[0]?.toUpperCase().replace(".", "");
      if (!grade) {
        return m.reply(claraWrap("Kalkulatornilai", "Masukkan nilai huruf!\n\nContoh: `.nilai convert AB`\n\nPilihan: A, AB, B, BC, C, CD, D, E"));
      }

      const gpa = GRADE_MAP[grade];
      if (gpa === undefined) {
        return m.reply(claraWrap("Kalkulatornilai", `Nilai "${grade}" tidak valid!\n\nPilihan: A, AB, B, BC, C, CD, D, E`));
      }

      let txt = `Konversi Nilai\n\n`;
      txt += `Huruf: ${grade}\n`;
      txt += `Angka (IPK): ${gpa}\n`;
      if (grade === "A") txt += `Rentang: 80-100\n`;
      else if (grade === "AB") txt += `Rentang: 70-79\n`;
      else if (grade === "B") txt += `Rentang: 65-69\n`;
      else if (grade === "BC") txt += `Rentang: 60-64\n`;
      else if (grade === "C") txt += `Rentang: 50-59\n`;
      else if (grade === "CD") txt += `Rentang: 40-49\n`;
      else if (grade === "D") txt += `Rentang: 30-39\n`;
      else if (grade === "E") txt += `Rentang: 0-29`;
      await m.reply(txt);
      await m.react("🐣");
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}nilai help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[KALKULATORNILAI] Error:", e.message);
    await m.reply(claraWrap("kalkulatornilai", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
