// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "konversinilai",
  alias: ["konversinilai", "konversi"],
  category: "education",
  description: "Konversi nilai - tabel lengkap huruf ke angka, IPK, persentase, predikat",
  usage: ".konversi [nilai]",
  example: ".konversi 85",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 1,
  isEnabled: true,
};

// Grade systems (Indonesian universities)
const GRADE_TABLE = [
  { min: 80, max: 100, letter: "A", gpa: 4.0, predicate: "Sangat Baik" },
  { min: 73, max: 79, letter: "AB", gpa: 3.5, predicate: "Baik Sekali" },
  { min: 66, max: 72, letter: "B", gpa: 3.0, predicate: "Baik" },
  { min: 60, max: 65, letter: "BC", gpa: 2.5, predicate: "Cukup Baik" },
  { min: 50, max: 59, letter: "C", gpa: 2.0, predicate: "Cukup" },
  { min: 40, max: 49, letter: "CD", gpa: 1.5, predicate: "Kurang" },
  { min: 30, max: 39, letter: "D", gpa: 1.0, predicate: "Kurang Sekali" },
  { min: 0, max: 29, letter: "E", gpa: 0.0, predicate: "Gagal" },
];

// Alternative: 4-tier system (some unis)
const GRADE_TABLE_4TIER = [
  { min: 76, max: 100, letter: "A", gpa: 4.0, predicate: "Sangat Baik" },
  { min: 66, max: 75, letter: "B", gpa: 3.0, predicate: "Baik" },
  { min: 56, max: 65, letter: "C", gpa: 2.0, predicate: "Cukup" },
  { min: 41, max: 55, letter: "D", gpa: 1.0, predicate: "Kurang" },
  { min: 0, max: 40, letter: "E", gpa: 0.0, predicate: "Gagal" },
];

function findGrade(score, use4Tier = false) {
  const table = use4Tier ? GRADE_TABLE_4TIER : GRADE_TABLE;
  for (const g of table) {
    if (score >= g.min && score <= g.max) return g;
  }
  return table[table.length - 1];
}

async function handler(m, { sock, args }) {
  const input = args[0]?.trim();

  if (!input || input === "help" || input === "menu") {
    let txt = `Konversi Nilai\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}konversi <angka>\` - Konversi nilai angka ke huruf + IPK\n`;
    txt += `2. \`${m.prefix}konversi tabel\` - Lihat tabel lengkap\n`;
    txt += `3. \`${m.prefix}konversi 4tier\` - Tabel sistem 4-tier (A/B/C/D/E)\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}konversi 85\`\n`;
    txt += `\`${m.prefix}konversi 72\``;
    return await m.reply( txt, { commandName: "konversinilai" });
  }
  try {
    // === TABLE 8-tier ===
    if (input === "tabel" || input === "table" || input === "full") {
      let txt = `Tabel Konversi Nilai (8-Tier)\n\n`;
      txt += `Rentang   Huruf   IPK   Predikat\n`;
      for (const g of GRADE_TABLE) {
        const range = g.min === g.max ? `${g.min}` : `${g.min}-${g.max}`;
        txt += `${range.padEnd(9)} ${g.letter.padEnd(7)} ${String(g.gpa).padEnd(5)} ${g.predicate}\n`;
      }
      txt += `\n_Sistem 8-tier (A, AB, B, BC, C, CD, D, E)_`;
      await m.reply(claraWrap("Konversi Nilai", txt.split("\n")));
      return;
    }

    // === TABLE 4-tier ===
    if (input === "4tier" || input === "simple") {
      let txt = `Tabel Konversi Nilai (4-Tier)\n\n`;
      txt += `Rentang    Huruf   IPK   Predikat\n`;
      for (const g of GRADE_TABLE_4TIER) {
        const range = g.min === g.max ? `${g.min}` : `${g.min}-${g.max}`;
        txt += `${range.padEnd(10)} ${g.letter.padEnd(7)} ${String(g.gpa).padEnd(5)} ${g.predicate}\n`;
      }
      txt += `\n_Sistem 4-tier (A, B, C, D, E) - beberapa kampus_`;
      await m.reply(claraWrap("Konversi Nilai", txt.split("\n")));
      return;
    }

    // === CONVERT SINGLE VALUE ===
    const score = parseFloat(input);
    if (isNaN(score)) {
      return m.reply(`Input gak valid nih! Masukin angka 0-100 atau ketik ${m.prefix}konversi tabel`);
    }

    if (score < 0 || score > 100) {
      return m.reply(claraWrap("Konversinilai", "Nilai harus 0-100!"));
    }

    const grade8 = findGrade(score, false);
    const grade4 = findGrade(score, true);

    let txt = `Konversi Nilai: ${score}\n\n`;
    txt += `Sistem 8-Tier:\n`;
    txt += `  Huruf: *${grade8.letter}*\n`;
    txt += `  IPK: *${grade8.gpa}*\n`;
    txt += `  Predikat: *${grade8.predicate}*\n\n`;
    txt += `Sistem 4-Tier:\n`;
    txt += `  Huruf: *${grade4.letter}*\n`;
    txt += `  IPK: *${grade4.gpa}*\n`;
    txt += `  Predikat: *${grade4.predicate}*\n\n`;
    txt += `_8-tier: A/AB/B/BC/C/CD/D/E\n4-tier: A/B/C/D/E_`;

    await m.reply(claraWrap("Konversi Nilai", txt.split("\n")));
  } catch (e) {
    console.error("[KONVERSINILAI] Error:", e.message);
    await m.reply(claraWrap("konversinilai", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
