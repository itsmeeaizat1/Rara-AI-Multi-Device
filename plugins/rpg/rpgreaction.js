// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Reaction — Tes kecepatan reaksi, makin cepat makin besar hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgreaction",
  alias: ["reactionrpg", "cepatreact", "refleks", "kecepatan", "reacttime"],
  category: "rpg",
  description: "RPG Reaction — Tes kecepatan reaksi, semakin cepat semakin besar hadiah",
  usage: ".rpgreaction <biaya> — Mulai tes reaksi\n.rpgreaction <biaya> now — Jawab saat muncul",
  example: ".rpgreaction 500",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const MIN_COST = 100;
const MAX_COST = 3000;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Reaction", [
        "Tes kecepatan reaksi!",
        "Biaya: " + MIN_COST + " - " + MAX_COST + " gold",
        "",
        "Cara main:",
        "1. Ketik " + usedPrefix + "rpgreaction <biaya>",
        "2. Tunggu simbol GO muncul",
        "3. Ketik " + usedPrefix + "rpgreaction <biaya> now",
        "",
        "Makin cepat jawab, makin besar hadiah!",
        "Under 1 detik: 5x | 1-2s: 3x | 2-4s: 2x | 4-6s: 1x",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Reaction", "Max biaya: " + MAX_COST, "warn"));
    }

    if ((player.gold || 0) < cost) {
      return m.reply(claraWrap("RPG Reaction", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
    }

    // Check if answering
    if (args[1]?.toLowerCase() === "now") {
      const session = player.reactionGame;
      if (!session || !session.startTime) {
        return m.reply(claraWrap("RPG Reaction", "Tidak ada game aktif!", "warn"));
      }

      // Check if GO signal has appeared
      if (Date.now() < session.signalTime) {
        // Too early!
        delete player.reactionGame;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Reaction", [
          "TERLALU CEPAT! Kamu jawab sebelum GO!",
          "Coba lagi.",
        ], "warn"));
      }

      const reactionTime = (Date.now() - session.signalTime) / 1000; // seconds
      delete player.reactionGame;

      // Calculate reward based on reaction time
      let multiplier = 0;
      let rank = "";
      if (reactionTime < 1) {
        multiplier = 5; rank = "LIGHTNING";
      } else if (reactionTime < 2) {
        multiplier = 3; rank = "FAST";
      } else if (reactionTime < 4) {
        multiplier = 2; rank = "NORMAL";
      } else if (reactionTime < 6) {
        multiplier = 1; rank = "SLOW";
      } else {
        multiplier = 0; rank = "TOO SLOW";
      }

      if (multiplier > 0) {
        const winnings = cost * multiplier;
        addGold(m, winnings);
        addExp(m, Math.round(winnings * 0.1));
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Reaction", [
          "HASIL REAKSI",
          "Waktu: " + reactionTime.toFixed(2) + " detik",
          "Rank: " + rank,
          "",
          "Hadiah: +" + winnings + " gold (" + multiplier + "x)",
          "Exp: +" + Math.round(winnings * 0.1),
          "Gold: " + (player.gold || 0),
        ], "info"));
      } else {
        addGold(m, -cost);
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Reaction", [
          "HASIL REAKSI",
          "Waktu: " + reactionTime.toFixed(2) + " detik",
          "Rank: " + rank,
          "Terlalu lambat! -" + cost + " gold",
        ], "warn"));
      }
    }

    // Start new game
    addGold(m, -cost);

    // Random delay 2-6 seconds before GO
    const delay = 2000 + Math.random() * 4000;
    const signalTime = Date.now() + delay;

    player.reactionGame = {
      startTime: Date.now(),
      signalTime: signalTime,
      cost: cost,
    };
    savePlayer(m, player);

    // Send warning
    await m.reply(claraWrap("RPG Reaction", [
      "TES REAKSI DIMULAI",
      "Biaya: " + cost + " gold",
      "",
      "Tunggu simbol GO muncul...",
      "Jangan jawab sebelum GO!",
      "",
      "Saat GO muncul, ketik:",
      usedPrefix + "rpgreaction " + cost + " now",
    ], "info"));

    // Schedule GO signal
    setTimeout(async () => {
      try {
        const cur = getPlayer(m);
        if (cur?.reactionGame?.signalTime === signalTime) {
          await conn.sendMessage(m.key.remoteJid, {
            text: claraWrap("RPG Reaction", [
              "GO! GO! GO!",
              "",
              "Ketik sekarang:",
              usedPrefix + "rpgreaction " + cost + " now",
            ], "info"),
          }, { quoted: m });
        }
      } catch (err) {
        console.error("[RpgReaction] timeout send:", err);
      }
    }, delay);

  } catch (e) {
    console.error("[RpgReaction]", e);
    return m.reply(claraWrap("RPG Reaction", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
