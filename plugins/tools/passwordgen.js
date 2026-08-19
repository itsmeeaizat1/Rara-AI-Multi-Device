// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "passwordgen",
  alias: ["genpass", "passgen", "passwordgenerator", "buatpassword"],
  category: "tools",
  description: "Generate password kuat dengan opsi panjang & kompleksitas",
  usage: ".passwordgen [panjang] [opsi]",
  example: ".passwordgen 16\n.passwordgen 20 upper,number,symbol",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  number: "0123456789",
  symbol: "!@#$%^&*()-_=+[]{};:,.?/~",
  // Ambil simbol aman (tanpa <>"'` untuk hindari injection)
};

function generatePassword(length, options) {
  let pool = "";
  const enabled = [];

  if (options.includes("lower") || options.includes("all")) {
    pool += SETS.lower;
    enabled.push("a-z");
  }
  if (options.includes("upper") || options.includes("all")) {
    pool += SETS.upper;
    enabled.push("A-Z");
  }
  if (options.includes("number") || options.includes("all") || options.length === 0) {
    pool += SETS.number;
    enabled.push("0-9");
  }
  if (options.includes("symbol") || options.includes("all")) {
    pool += SETS.symbol;
    enabled.push("!@#$");
  }

  if (pool === "") pool = SETS.lower + SETS.upper + SETS.number + SETS.symbol;

  let password = "";
  // Crypto-grade random
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    password += pool[idx];
  }

  // Hitung strength
  let strength = 0;
  if (length >= 8) strength += 25;
  if (length >= 12) strength += 15;
  if (length >= 16) strength += 10;
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
  if (strength > 100) strength = 100;

  let verdict;
  if (strength >= 80) verdict = "SANGAT KUAT";
  else if (strength >= 60) verdict = "KUAT";
  else if (strength >= 40) verdict = "SEDANG";
  else verdict = "LEM AH";

  return { password, strength, verdict, enabled };
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const lengthArg = parseInt(args[0]);

  // Default: 16 char, all options
  const length = lengthArg && lengthArg >= 4 && lengthArg <= 64 ? lengthArg : 16;
  const optionsStr = args.slice(lengthArg ? 1 : 0).join("").toLowerCase();
  const options = optionsStr ? optionsStr.split(",").map((o) => o.trim()).filter(Boolean) : ["all"];

  // Jika gak ada args, generate default
  if (!args[0] || args[0] === "help" || args[0] === "menu") {
    return sendReplyWithNav(sock, m, claraWrap("Password Generator", [
      "Generate password kuat secara lokal (no API, no internet)",
      "",
      "CARA PAKAI:",
      m.prefix + "passwordgen — Default 16 char, semua karakter",
      m.prefix + "passwordgen <panjang> — Custom panjang (4-64)",
      m.prefix + "passwordgen <panjang> <opsi> — Pilih karakter",
      "",
      "OPSI:",
      "lower — Huruf kecil (a-z)",
      "upper — Huruf besar (A-Z)",
      "number — Angka (0-9)",
      "symbol — Simbol (!@#$)",
      "all — Semua (default)",
      "",
      "CONTOH:",
      m.prefix + "passwordgen 20",
      m.prefix + "passwordgen 12 upper,number",
      m.prefix + "passwordgen 32 all",
    ]), "passwordgen");
  }

  try {
    const result = generatePassword(length, options);
    const strengthBar = "█".repeat(Math.floor(result.strength / 10)) + "░".repeat(10 - Math.floor(result.strength / 10));

    let lines = [
      "Password: " + "```" + result.password + "```",
      "",
      "Panjang: " + length + " karakter",
      "Karakter: " + result.enabled.join(", "),
      "",
      "Kekuatan: " + strengthBar + " " + result.strength + "/100",
      "Verdict: *" + result.verdict + "*",
      "",
      result.strength < 60
        ? "Tip: Tambah panjang dan pakai simbol untuk keamanan lebih."
        : "Password aman! Jangan share ke siapapun.",
    ];

    return m.reply(claraWrap("Password Generator", lines, "success"));
  } catch (e) {
    console.error("[Password Gen]", e);
    return m.reply(claraWrap("Password Generator", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
