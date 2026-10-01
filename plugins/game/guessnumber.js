// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// guessnumber.js — Tebak angka 1-100 dengan hint lebih besar/kecil (no API)

import { raraError } from "../../src/lib/rara-menu-style.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "│ " manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import { addExpWithLevelCheck } from "../../src/lib/rara-level.js";
import { formatRp } from "../../src/lib/rara-rpg-service.js";
import { rollBonus } from "../../src/lib/rara-game-rewards.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "guessnumber",
  alias: ["tebakangka", "angka"],
  category: "game",
  description: "Tebak angka 1-100 dengan hint lebih besar/kecil",
  usage: ".guessnumber <mulai/angka>",
  example: ".guessnumber mulai\n.tebakangka 50",
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
      return m.reply(raraError("TebakAngka", "Game lagi jalan nih! Ketik angka tebakanmu"));
    }
    const target = Math.floor(Math.random() * 100) + 1;
    activeGames.set(chatId, { target, attempts: 0, maxAttempts: 10 });
    return m.reply(
      "" +
      `🎯 Aku pilih angka 1-100, kamu punya 10 kesempatan!\n\n` +
      `📌 Ketik ${prefix}tebakangka <angka>\n` +
      `💡 Contoh: ${prefix}tebakangka 50` +
      ""
    );
  }

  // Check if game is active
  const game = activeGames.get(chatId);
  if (!game) {
    return m.reply(raraGameBox({
      title: "tebak angka",
      icon: "🔢",
      flavor: "🔢 *TEBAK ANGKA!*",
      body: "Belum ada ronde jalan di chat ini.\nMulai dulu rondenya, terus tebak angka 1-100",
      cta: "Contoh: .guessnumber mulai → .guessnumber 50",
    }));
  }

  // Parse guess
  const guess = parseInt(arg);
  if (isNaN(guess) || guess < 1 || guess > 100) {
    return m.reply(raraError("TebakAngka", "Masukin angka 1-100 nih!"));
  }

  game.attempts++;

  if (guess === game.target) {
    const remaining = game.maxAttempts - game.attempts;
    const expGain = 20 + remaining * 5;
    activeGames.delete(chatId);
    // FIX 8 Sep 2026: dulu addExpWithLevelCheck(m.sender, expGain, m) —
    // urutan argumen SALAH (benernya (sock, m, db, user, exp)) → EXP gak
    // pernah kebayar. Sekalian bayar 💵 uang (semua game harus ada uang).
    let cashRes = { gain: 0, saldo: 0 };
    try {
      const db = getDatabase();
      let user = db?.getUser(m.sender);
      if (db && !user) { db.setUser(m.sender); user = db.getUser(m.sender) || {}; }
      if (db && user) await addExpWithLevelCheck(m, m, db, user, expGain);
    } catch {}
    try { cashRes = rollBonus(m, "tebakangka"); } catch {}
    // teks polos — prefix & pemotongan dijamin boxLeft(), bukan manual
    const e = m.energiInfo;
    const energiLine = e
      ? (e.unlimited
          ? `⚡ Energi: ∞ (unlimited)\n`
          : (e.deducted > 0
              ? (e.game ? `⚡ Energi: -${e.deducted} (sisa ${e.sisa}/${e.max})\n` : `⚡ Energi: -${e.deducted} (sisa ${e.sisa})\n`)
              : `⚡ Energi: gratis\n`))
      : "";
    return m.reply(
      `🎉 Benar! Angkanya ${game.target}\n\n` +
      boxMessage("◆ TEBAK ANGKA ◆",
        `Angka: ${game.target}\n` +
        `Tebakan ke-${game.attempts} dari ${game.maxAttempts}\n` +
        energiLine +
        `✨ EXP: +${expGain}\n` +
        `💵 Uang: +${formatRp(cashRes.gain)} (saldo ${formatRp(cashRes.saldo)})${cashRes.jackpot ? "\n🎰 JACKPOT! Bonus 3x uang!" : ""}`) +
      `\n\nYuk tebak angka lain kak, biar makin jago nebak 🥳`
    );
  }

  if (game.attempts >= game.maxAttempts) {
    activeGames.delete(chatId);
    // teks polos — prefix & pemotongan dijamin boxLeft(), bukan manual
    const e = m.energiInfo;
    const energiLine = e
      ? (e.unlimited
          ? `⚡ Energi: ∞ (unlimited)\n`
          : (e.deducted > 0
              ? (e.game ? `⚡ Energi: -${e.deducted} (sisa ${e.sisa}/${e.max})\n` : `⚡ Energi: -${e.deducted} (sisa ${e.sisa})\n`)
              : `⚡ Energi: gratis\n`))
      : "";
    return m.reply(
      `😭 Kesempatan habis!\n\n` +
      boxMessage("◆ TEBAK ANGKA ◆",
        `Angka: ${game.target}\n` +
        energiLine) +
      `\n\nYuk coba lagi kak, angkanya gak akan kabur 🥳`
    );
  }

  const hint = guess < game.target ? "lebih besar ⬆️" : "lebih kecil ⬇️";
  const sisa = game.maxAttempts - game.attempts;
  return m.reply(
    `📊 Tebakan: ${guess}\n` +
    `💡 Hint: ${hint}\n` +
    `🔄 Sisa: ${sisa} kesempatan`
  );
}

export { pluginConfig as config, handler };
