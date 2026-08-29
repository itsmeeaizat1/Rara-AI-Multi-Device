// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "memorygame",
  alias: ["memorygame"],
  category: "future",
  description: "Memory game - tes daya ingat, ingat urutan yang makin panjang",
  usage: ".memorygame <command>",
  example: ".memorygame start",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const SYMBOLS = ["🔴", "🟢", "🔵", "🟡", "🟣", "🟠", "⚪", "⚫", "🔺", "⭐"];

function getConfig(db, gid) {
  const all = db.setting("memorygame") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("memorygame") || {};
  all[gid] = data;
  db.setting("memorygame", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("memorygame") || {};
  delete all[gid];
  db.setting("memorygame", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.active && game.player === m.sender) {
      await m.reply(claraWrap("Memory Game", "Kamu masih main! Ketik " + prefix + "memorygame answer <urutan>"));
      return { handled: true };
    }
    // Generate first sequence (3 symbols)
    const sequence = [];
    for (let i = 0; i < 3; i++) {
      sequence.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    const data = {
      active: true,
      player: m.sender,
      sequence,
      level: 1,
      score: 0,
      round: 1,
      maxRound: 10,
      showing: true,
      startedAt: Date.now(),
      bestScore: game?.bestScore || 0,
      bestPlayer: game?.bestPlayer || null,
    };
    saveConfig(db, gid, data);
    const seqDisplay = sequence.join(" ");
    await m.reply(claraWrap("Memory Game", [
      "Game dimulai!",
      "",
      "Level: " + data.level + " | Round: " + data.round + "/" + data.maxRound,
      "",
      "INGAT URUTAN INI:",
      seqDisplay,
      "",
      "Ketik: " + prefix + "memorygame answer " + seqDisplay.replace(/\s+/g, ""),
      "",
      "Contoh: " + prefix + "memorygame answer " + sequence.map(s => s).join(""),
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "answer" || sub === "jawab" || sub === "cek") {
    if (!game || !game.active) {
      await m.reply(claraWrap("Memory Game", "Belum ada game. Ketik " + prefix + "memorygame start"));
      return { handled: true };
    }
    if (game.player !== m.sender) {
      await m.reply(claraWrap("Memory Game", "Bukan game kamu! @" + game.player.split("@")[0] + " yang main."), { mentions: [game.player] });
      return { handled: true };
    }

    const answer = args.slice(2).join("").trim();
    // Remove spaces
    const cleanAnswer = answer.replace(/\s+/g, "");
    // Extract emojis from answer
    const answerEmojis = [];
    let current = "";
    for (const char of cleanAnswer) {
      current += char;
      if (SYMBOLS.includes(current)) {
        answerEmojis.push(current);
        current = "";
      }
    }
    if (current) answerEmojis.push(current);

    const correct = game.sequence.join("") === answerEmojis.join("");

    if (correct) {
      game.score += game.level * 10;
      // Next round - add 1 more symbol
      if (game.round >= game.maxRound) {
        // Game complete
        const isBest = game.score > (game.bestScore || 0);
        if (isBest) {
          game.bestScore = game.score;
          game.bestPlayer = m.sender;
        }
        saveConfig(db, gid, game);
        await m.reply(claraWrap("Memory Game - SELESAI!", [
          "@" + m.sender.split("@")[0],
          "",
          "Score: " + game.score,
          "Level: " + game.level,
          "Rounds: " + game.maxRound + "/" + game.maxRound,
          "",
          isBest ? "NEW HIGH SCORE!" : "Best: " + (game.bestScore || 0),
        ].join("\n")), { mentions: [m.sender] });
        delConfig(db, gid);
        return { handled: true };
      }

      game.round++;
      game.level++;
      // Add one more symbol to sequence
      game.sequence.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

      if (game.level > 7) {
        // Cap at 7 symbols max
        game.level = 7;
      }

      saveConfig(db, gid, game);
      const seqDisplay = game.sequence.join(" ");
      await m.reply(claraWrap("Memory Game - BENAR!", [
        "Score: " + game.score,
        "Level: " + game.level + " | Round: " + game.round + "/" + game.maxRound,
        "",
        "URUTAN BARU:",
        seqDisplay,
        "",
        "Jawab: " + prefix + "memorygame answer " + seqDisplay.replace(/\s+/g, ""),
      ].join("\n")));
    } else {
      const isBest = game.score > (game.bestScore || 0);
      if (isBest) {
        game.bestScore = game.score;
        game.bestPlayer = m.sender;
      }
      saveConfig(db, gid, game);
      await m.reply(claraWrap("Memory Game - KALAH", [
        "@" + m.sender.split("@")[0],
        "",
        "Jawaban salah!",
        "Urutan benar: " + game.sequence.join(" "),
        "",
        "Score: " + game.score,
        "Level: " + game.level,
        isBest ? "NEW HIGH SCORE!" : "Best: " + (game.bestScore || 0),
      ].join("\n")), { mentions: [m.sender] });
      delConfig(db, gid);
    }
    return { handled: true };
  }

  if (sub === "best" || sub === "highscore") {
    if (!game || !game.bestScore) {
      await m.reply(claraWrap("Memory Game", "Belum ada high score. Ketik " + prefix + "memorygame start"));
      return { handled: true };
    }
    await m.reply(claraWrap("Memory Game High Score", "Best: " + game.bestScore + " by @" + (game.bestPlayer || "").split("@")[0]), { mentions: game.bestPlayer ? [game.bestPlayer] : [] });
    return { handled: true };
  }

  if (sub === "stop" || sub === "berhenti") {
    if (game && game.active) {
      delConfig(db, gid);
      await m.reply(claraWrap("Memory Game", "Game dihentikan. Score: " + (game.score || 0)));
    } else {
      await m.reply(claraWrap("Memory Game", "Tidak ada game aktif."));
    }
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game || !game.active) {
      await m.reply(claraWrap("Memory Game", [
        "MEMORY GAME",
        "",
        prefix + "memorygame start - mulai game",
        prefix + "memorygame answer <urutan> - jawab",
        prefix + "memorygame best - high score",
        prefix + "memorygame stop - berhenti",
        "",
        "Ingat urutan emoji, makin panjang makin susah!",
      ].join("\n")));
      return { handled: true };
    }
    await m.reply(claraWrap("Memory Game Status", [
      "Player: @" + game.player.split("@")[0],
      "Level: " + game.level,
      "Round: " + game.round + "/" + game.maxRound,
      "Score: " + game.score,
    ].join("\n")), { mentions: [game.player] });
    return { handled: true };
  }

  await m.reply(claraWrap("Memory Game", [
    "MEMORY GAME",
    "",
    prefix + "memorygame start - mulai game",
    prefix + "memorygame answer <urutan> - jawab",
    prefix + "memorygame best - high score",
    prefix + "memorygame stop - berhenti",
    "",
    "Ingat urutan emoji, makin panjang makin susah!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
