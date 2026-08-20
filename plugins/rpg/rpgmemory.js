// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Memory Game — Game ingatan, ingat urutan simbol untuk hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgmemory",
  alias: ["memoryrpg", "ingatan", "gamesimbol", "memorygame", "hafalsimbol"],
  category: "rpg",
  description: "RPG Memory Game — Ingat urutan simbol untuk hadiah gold & exp",
  usage: ".rpgmemory (start game)\n.rpgmemory <urutan> — Jawab dengan urutan angka",
  example: ".rpgmemory\n.rpgmemory 3 1 4 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const SYMBOLS = ["🌸", "🔥", "💧", "⚡", "🌙", "⭐", "🍃", "❄️"];
const MAX_SEQUENCE = 6;
const BASE_GOLD = 200;
const BASE_EXP = 50;
const ENTRY_COST = 100;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const sessionId = m.sender + "_memory";

    // If answering
    if (args.length > 0 && args[0] !== "start" && args[0] !== "help") {
      const session = player.memoryGame;
      if (!session || !session.sequence) {
        return m.reply(claraWrap("RPG Memory", [
          "Tidak ada game aktif!",
          "Ketik " + usedPrefix + "rpgmemory untuk mulai",
        ], "warn"));
      }

      // Expired (60 seconds)
      if (Date.now() - session.startTime > 60000) {
        delete player.memoryGame;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Memory", "Waktu habis! Game berakhir. Coba lagi.", "warn"));
      }

      const answer = args.map(a => parseInt(a)).filter(n => !isNaN(n));
      const correct = session.sequence;

      if (answer.length !== correct.length) {
        return m.reply(claraWrap("RPG Memory", [
          "Jumlah angka salah!",
          "Butuh " + correct.length + " angka, kamu masukkan " + answer.length,
          "Urutan: 1-4 = kotak posisi (kiri ke kanan, atas ke bawah)",
        ], "warn"));
      }

      let correctCount = 0;
      const result = [];
      for (let i = 0; i < correct.length; i++) {
        if (answer[i] === correct[i]) {
          correctCount++;
          result.push(answer[i] + " OK");
        } else {
          result.push(answer[i] + " X (benar: " + correct[i] + ")");
        }
      }

      if (correctCount === correct.length) {
        // Full win
        const level = correct.length - 2; // starts at level 1 (3 symbols)
        const goldReward = BASE_GOLD * level;
        const expReward = BASE_EXP * level;
        addGold(m, goldReward);
        addExp(m, expReward);

        // Try next level or end
        if (correct.length < MAX_SEQUENCE) {
          const newSeq = generateSequence(correct.length + 1);
          player.memoryGame = {
            sequence: newSeq.symbols,
            positions: newSeq.positions,
            startTime: Date.now(),
            level: level + 1,
          };
          savePlayer(m, player);

          const display = buildDisplay(newSeq.symbols);
          return m.reply(claraWrap("RPG Memory", [
            "BENAR SEMUA! Level " + level + " selesai!",
            "Gold: +" + goldReward + " | Exp: +" + expReward,
            "",
            "LEVEL " + (level + 1) + " — INGAT URUTAN:",
            ...display,
            "",
            "Jawab: " + usedPrefix + "rpgmemory <posisi1> <posisi2> ...",
            "Contoh: " + usedPrefix + "rpgmemory 3 1 4 2",
            "Waktu: 60 detik",
          ], "info"));
        } else {
          addGold(m, 5000);
          addExp(m, 1000);
          delete player.memoryGame;
          savePlayer(m, player);
          return m.reply(claraWrap("RPG Memory", [
            "MAX LEVEL! KAMU JUARA!",
            "Menang semua " + MAX_SEQUENCE + " level!",
            "Gold: +" + goldReward + " + bonus 5000",
            "Exp: +" + expReward + " + bonus 1000",
            "Total gold sekarang: " + (player.gold || 0),
          ], "info"));
        }
      } else {
        // Partial or fail
        const partialGold = Math.round(BASE_GOLD * (correctCount / correct.length) * 0.5);
        if (partialGold > 0) addGold(m, partialGold);
        delete player.memoryGame;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Memory", [
          "HASIL: " + correctCount + "/" + correct.length + " benar",
          ...result,
          "",
          partialGold > 0 ? "Consolation: +" + partialGold + " gold" : "Tidak dapat hadiah",
          "Coba lagi: " + usedPrefix + "rpgmemory",
        ], "warn"));
      }
    }

    // Start new game
    if ((player.gold || 0) < ENTRY_COST) {
      return m.reply(claraWrap("RPG Memory", [
        "Biaya main: " + ENTRY_COST + " gold",
        "Punya: " + (player.gold || 0) + " gold",
      ], "warn"));
    }

    addGold(m, -ENTRY_COST);
    const newSeq = generateSequence(3); // Start with 3 symbols
    player.memoryGame = {
      sequence: newSeq.symbols,
      positions: newSeq.positions,
      startTime: Date.now(),
      level: 1,
    };
    savePlayer(m, player);

    const display = buildDisplay(newSeq.symbols);

    return m.reply(claraWrap("RPG Memory", [
      "MEMORY GAME — LEVEL 1",
      "Biaya: " + ENTRY_COST + " gold",
      "",
      "INGAT URUTAN SIMBOL INI:",
      ...display,
      "",
      "Jawab dengan posisi urutan (1-4)",
      "Contoh: " + usedPrefix + "rpgmemory 3 1 4 2",
      "Waktu: 60 detik",
    ], "info"));
  } catch (e) {
    console.error("[RpgMemory]", e);
    return m.reply(claraWrap("RPG Memory", "Error: " + e.message, "error"));
  }
}

function generateSequence(count) {
  // Generate count random symbol positions
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(Math.floor(Math.random() * 4) + 1);
  }
  return { symbols: positions, positions };
}

function buildDisplay(positions) {
  // Show symbols in a 2x2 grid with numbers
  const symbols = positions.map(p => SYMBOLS[(p - 1) % SYMBOLS.length]);
  return [
    "1: " + (symbols[0] || "?") + "  2: " + (symbols[1] || "?"),
    "3: " + (symbols[2] || "?") + "  4: " + (symbols[3] || "?"),
  ];
}

export { pluginConfig as config, handler };
