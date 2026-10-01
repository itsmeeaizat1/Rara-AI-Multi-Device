// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "spinwheel",
  alias: ["spinwheel"],
  category: "fun",
  description: "Roda putar acak — input pilihan, bot putar dan kasih hasil",
  usage: ".spinwheel <pilihan1,pilihan2,...> — Putar roda\n.spinwheel info — Cara pakai",
  example: ".spinwheel makan a,main game,tidur,mandi\n.spinwheel pizza,burger,sate,sushi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SPIN_ANIMATIONS = [
  "🎲 Memutar...",
  "🛞 Roda berputar cepat...",
  "🎯 Roda melambat...",
  "📍 Roda berhenti...",
  "Hasil keluar!",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    if (args[0]?.toLowerCase() === "info") {
      return m.reply(raraWrap("Spin Wheel", [
        "RODA PUTAR ACAK",
        "Input pilihan dipisah koma, bot putar & kasih hasil",
        "",
        "Contoh: " + usedPrefix + "spinwheel pizza,burger,sate,sushi",
        "Contoh: " + usedPrefix + "spinwheel makan,tidur,main,rebahan",
        "",
        "Min 2 pilihan, max 20 pilihan",
      ], "info"));
    }

    const input = text || args.join(" ");
    if (!input) {
      return m.reply(raraWrap("Spin Wheel", "Masukkan pilihan dipisah koma!\n\n💡 *Contoh:* " + usedPrefix + "spinwheel pizza,burger,sate", "warn"));
    }

    const choices = input.split(",").map(c => c.trim()).filter(Boolean);
    if (choices.length < 2) {
      return m.reply(raraWrap("Spin Wheel", "Min 2 pilihan! Contoh: " + usedPrefix + "spinwheel A,B,C", "warn"));
    }
    if (choices.length > 20) {
      return m.reply(raraWrap("Spin Wheel", "Max 20 pilihan!", "warn"));
    }

    // Spin animation
    for (const anim of SPIN_ANIMATIONS) {
      await new Promise(r => setTimeout(r, 300));
    }

    // Pick winner
    const winner = choices[Math.floor(Math.random() * choices.length)];
    const winIndex = choices.indexOf(winner) + 1;

    await m.react("🐣");
    return m.reply(raraWrap("Spin Wheel", [
      "RODA PUTAR ACAK",
      "",
      "Pilihan (" + choices.length + "):",
      ...choices.map((c, i) => (i + 1) + ". " + c),
      "",
      "RODA BERPUTAR...",
      "🛞🛞🛞",
      "",
      "HASIL: " + winner + " (no " + winIndex + ")",
      "",
      usedPrefix + "spinwheel <pilihan> untuk putar lagi",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Spin Wheel", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
