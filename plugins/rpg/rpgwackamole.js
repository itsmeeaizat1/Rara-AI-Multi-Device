// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Whack-a-Mole — Pukul tikus, makin cepat makin banyak gold
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgwackamole",
  alias: ["wackamole", "pukultikus", "whackmole", "tikusmuncul", "pukulmol"],
  category: "rpg",
  description: "RPG Whack-a-Mole — Pukul tikus yang muncul, reaksi cepat untuk gold",
  usage: ".rpgwackamole <biaya> — Mulai game\n.rpgwackamole <biaya> <posisi 1-9> — Pukul posisi",
  example: ".rpgwackamole 500\n.rpgwackamole 500 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const MIN_COST = 200;
const MAX_COST = 3000;
const ROUNDS = 10;
const ROUND_TIMEOUT = 10000; // 10 seconds per round

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Whack-a-Mole", [
        "PUKUL TIKUS RPG",
        "Tikus muncul di posisi acak, pukul cepat!",
        "",
        "Grid 3x3 (posisi 1-9):",
        "1 2 3",
        "4 5 6",
        "7 8 9",
        "",
        "Cara main:",
        "1. Mulai: " + usedPrefix + "rpgwackamole <biaya>",
        "2. Tikus muncul, pukul: " + usedPrefix + "rpgwackamole <biaya> <posisi>",
        "",
        "10 ronde | Tiap hit = gold | Miss = zonk",
        "Min: " + MIN_COST + " | Max: " + MAX_COST,
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Whack-a-Mole", "Max: " + MAX_COST, "warn"));
    }

    const position = parseInt(args[1]);

    // Start new game
    if (!position || position < 1 || position > 9) {
      if ((player.gold || 0) < cost) {
        return m.reply(claraWrap("RPG Whack-a-Mole", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
      }

      addGold(m, -cost);

      const molePos = Math.floor(Math.random() * 9) + 1;
      player.wackGame = {
        cost,
        round: 1,
        hits: 0,
        misses: 0,
        molePos,
        roundStart: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Whack-a-Mole", [
        "GAME DIMULAI!",
        "Biaya: " + cost + " gold | " + ROUNDS + " ronde",
        "",
        "Ronde 1/" + ROUNDS,
        buildGrid(molePos),
        "",
        "Tikus di posisi " + molePos + "!",
        "Pukul: " + usedPrefix + "rpgwackamole " + cost + " " + molePos,
        "Waktu: " + (ROUND_TIMEOUT / 1000) + " detik",
      ], "info"));
    }

    // Hit mole
    const session = player.wackGame;
    if (!session) {
      return m.reply(claraWrap("RPG Whack-a-Mole", "Tidak ada game aktif. Mulai: " + usedPrefix + "rpgwackamole " + cost, "warn"));
    }

    // Check timeout
    if (Date.now() - session.roundStart > ROUND_TIMEOUT) {
      session.misses++;
      lines = ["Waktu habis! Ronde " + session.round + " miss!"];
    }

    if (Date.now() - session.roundStart > ROUND_TIMEOUT) {
      if (session.round >= ROUNDS) {
        return endGame(m, player, session, usedPrefix, cost);
      }
      session.round++;
      session.molePos = Math.floor(Math.random() * 9) + 1;
      session.roundStart = Date.now();
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Whack-a-Mole", [
        "Timeout! Tikus kabur.",
        "Ronde " + session.round + "/" + ROUNDS,
        buildGrid(session.molePos),
        "",
        "Pukul: " + usedPrefix + "rpgwackamole " + cost + " " + session.molePos,
      ], "warn"));
    }

    if (position === session.molePos) {
      session.hits++;
      const hitGold = Math.round(cost / ROUNDS * 2);
      addGold(m, hitGold);

      if (session.round >= ROUNDS) {
        return endGame(m, player, session, usedPrefix, cost);
      }

      session.round++;
      session.molePos = Math.floor(Math.random() * 9) + 1;
      session.roundStart = Date.now();
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Whack-a-Mole", [
        "HIT! +" + hitGold + " gold",
        "Hits: " + session.hits + " | Misses: " + session.misses,
        "",
        "Ronde " + session.round + "/" + ROUNDS,
        buildGrid(session.molePos),
        "",
        "Pukul: " + usedPrefix + "rpgwackamole " + cost + " " + session.molePos,
      ], "info"));
    } else {
      session.misses++;

      if (session.round >= ROUNDS) {
        return endGame(m, player, session, usedPrefix, cost);
      }

      session.round++;
      session.molePos = Math.floor(Math.random() * 9) + 1;
      session.roundStart = Date.now();
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Whack-a-Mole", [
        "MISS! Tikus di " + session.molePos + ", kamu pukul " + position,
        "Hits: " + session.hits + " | Misses: " + session.misses,
        "",
        "Ronde " + session.round + "/" + ROUNDS,
        buildGrid(session.molePos),
        "",
        "Pukul: " + usedPrefix + "rpgwackamole " + cost + " " + session.molePos,
      ], "warn"));
    }
  } catch (e) {
    console.error("[RpgWackAMole]", e);
    return m.reply(claraWrap("RPG Whack-a-Mole", "Error: " + e.message, "error"));
  }
}

function buildGrid(molePos) {
  const cells = [];
  for (let i = 1; i <= 9; i++) {
    cells.push(i === molePos ? "🐭" : "🕳️");
  }
  return cells[0] + cells[1] + cells[2] + "\n" + cells[3] + cells[4] + cells[5] + "\n" + cells[6] + cells[7] + cells[8];
}

function endGame(m, player, session, usedPrefix, cost) {
  delete player.wackGame;

  const accuracy = Math.round((session.hits / ROUNDS) * 100);
  let bonus = 0;
  let rank = "";

  if (session.hits === ROUNDS) { bonus = cost * 5; rank = "PERFECT!"; }
  else if (session.hits >= 8) { bonus = cost * 3; rank = "GREAT!"; }
  else if (session.hits >= 6) { bonus = cost * 2; rank = "GOOD"; }
  else if (session.hits >= 4) { bonus = cost; rank = "OK"; }
  else { rank = "BAD"; }

  if (bonus > 0) {
    addGold(m, bonus);
    addExp(m, Math.round(bonus * 0.1));
  }
  savePlayer(m, player);

  const lines = [
    "GAME SELESAI!",
    "Hits: " + session.hits + "/" + ROUNDS + " | Misses: " + session.misses,
    "Akurasi: " + accuracy + "%",
    "Rank: " + rank,
    "",
    bonus > 0 ? "Bonus: +" + bonus + " gold" : "Tidak ada bonus",
    bonus > 0 ? "Exp: +" + Math.round(bonus * 0.1) : "",
  ].filter(l => l !== "");

  return m.reply(claraWrap("RPG Whack-a-Mole", lines, bonus > 0 ? "info" : "warn"));
}

export { pluginConfig as config, handler };
