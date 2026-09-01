// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tebakangka.js — Tebak angka 1-100 dengan hint lebih besar/kecil (no API)

import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";

const pluginConfig = {
  name: "tebakangka",
  alias: ["tebakangka", "guessnumber", "angka"],
  category: "game",
  description: "Tebak angka 1-100 dengan hint lebih besar/kecil",
  usage: ".tebakangka <mulai/angka>",
  example: ".tebakangka mulai\n.tebakangka 50",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 1,
  isEnabled: true,
};

// Active games: chatId -> { target, attempts, maxAttempts }
const activeGames = new Map();

async function handler(m, { args, prefix }) {
  const chatId = m.chat || m.from;
  const arg = (args[0] || "").toLowerCase().trim();

  // Start game
  if (arg === "mulai" || arg === "start" || !arg) {
    if (activeGames.has(chatId)) {
      return m.reply(novaError("TebakAngka", "Game lagi jalan nih! Ketik angka tebakanmu"));
    }
    const target = Math.floor(Math.random() * 100) + 1;
    activeGames.set(chatId, { target, attempts: 0, maxAttempts: 10 });
    return m.reply(
      "" +
      `┊ 🎯 Aku pilih angka 1-100\n` +
      `┊ 🔄 Kamu punya 10 kesempatan\n` +
      `┊\n` +
      `┊ Ketik ${prefix}tebakangka <angka>\n` +
      `┊ Contoh: ${prefix}tebakangka 50\n` +
      ""
    );
  }

  // Check if game is active
  const game = activeGames.get(chatId);
  if (!game) {
    return m.reply(novaGuide("TebakAngka", "Belum mulai nih! Ketik mulai dulu", ".tebakangka mulai"));
  }

  // Parse guess
  const guess = parseInt(arg);
  if (isNaN(guess) || guess < 1 || guess > 100) {
    return m.reply(novaError("TebakAngka", "Masukin angka 1-100 nih!"));
  }

  game.attempts++;

  if (guess === game.target) {
    const remaining = game.maxAttempts - game.attempts;
    const expGain = 20 + remaining * 5;
    activeGames.delete(chatId);
    try { await addExpWithLevelCheck(m.sender, expGain, m); } catch {}
    return m.reply(
      "" +
      `┊ 🎉 Benar! Angkanya ${game.target}\n` +
      `┊ 🔄 Tebakan ke-${game.attempts} dari ${game.maxAttempts}\n` +
      `┊ 🏆 +${expGain} EXP\n` +
      ""
    );
  }

  if (game.attempts >= game.maxAttempts) {
    activeGames.delete(chatId);
    return m.reply(
      "" +
      `┊ 😭 Kesempatan habis!\n` +
      `┊ Angkanya: ${game.target}\n` +
      `┊ Coba lagi: ${prefix}tebakangka mulai\n` +
      ""
    );
  }

  const hint = guess < game.target ? "lebih besar ⬆️" : "lebih kecil ⬇️";
  const sisa = game.maxAttempts - game.attempts;
  return m.reply(
    "" +
    `┊ 📊 Tebakan: ${guess}\n` +
    `┊ 💡 Hint: ${hint}\n` +
    `┊ 🔄 Sisa: ${sisa} kesempatan\n` +
    ""
  );
}

export { pluginConfig as config, handler };
