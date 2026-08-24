// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "guessnum",
  alias: ["guessnum", "tebakangka", "numgame"],
  category: "future",
  description: "Guess the number - tebak angka 1-100, petunjuk higher/lower",
  usage: ".guessnum <command>",
  example: ".guessnum start",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const ENTRY_COST = 10;

function getConfig(db, gid) {
  const all = db.setting("guessnum") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("guessnum") || {};
  all[gid] = data;
  db.setting("guessnum", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("guessnum") || {};
  delete all[gid];
  db.setting("guessnum", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);
  const user = db.getUser(m.sender);

  if (sub === "start" || sub === "mulai") {
    if (game && game.active && game.player === m.sender) {
      await m.reply(claraWrap("Guess Number", "Kamu masih main! Sisa: " + game.attempts + " tebakan."));
      return { handled: true };
    }
    if (user.coin < ENTRY_COST) {
      await m.reply(claraWrap("Guess Number", "Butuh " + ENTRY_COST + " coins. Coin kamu: " + (user.coin || 0)));
      return { handled: true };
    }
    user.coin -= ENTRY_COST;
    const target = Math.floor(Math.random() * 100) + 1;
    const data = {
      active: true,
      player: m.sender,
      target,
      attempts: 7,
      maxAttempts: 7,
      guesses: [],
      reward: 100,
      startedAt: Date.now(),
    };
    saveConfig(db, gid, data);
    db.setUser(m.sender, user);
    db.save();
    await m.reply(claraWrap("Guess Number", [
      "Game dimulai! (-" + ENTRY_COST + " coins)",
      "",
      "Tebak angka 1-100",
      "Tebakan: " + data.maxAttempts + "x",
      "Reward: " + data.reward + " coins",
      "",
      "Ketik: " + prefix + "guessnum <angka>",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stop" || sub === "berhenti") {
    if (game && game.active && (game.player === m.sender || m.isOwner)) {
      delConfig(db, gid);
      await m.reply(claraWrap("Guess Number", "Game dihentikan. Jawaban: " + game.target));
    } else {
      await m.reply(claraWrap("Guess Number", "Tidak ada game aktif."));
    }
    return { handled: true };
  }

  if (sub === "status" || sub === "cek") {
    if (!game || !game.active) {
      await m.reply(claraWrap("Guess Number", "Belum ada game. Ketik " + prefix + "guessnum start"));
      return { handled: true };
    }
    await m.reply(claraWrap("Guess Number", [
      "Player: @" + game.player.split("@")[0],
      "Sisa tebakan: " + game.attempts + "/" + game.maxAttempts,
      "Tebakan sebelumnya: " + (game.guesses.length > 0 ? game.guesses.join(", ") : "(belum ada)"),
    ].join("\n")), { mentions: [game.player] });
    return { handled: true };
  }

  // Default: try to guess
  const guess = parseInt(sub, 10);
  if (!isNaN(guess)) {
    if (!game || !game.active) {
      await m.reply(claraWrap("Guess Number", "Belum ada game. Ketik " + prefix + "guessnum start"));
      return { handled: true };
    }
    if (game.player !== m.sender) {
      await m.reply(claraWrap("Guess Number", "Bukan game kamu! @" + game.player.split("@")[0] + " yang main."), { mentions: [game.player] });
      return { handled: true };
    }
    if (guess < 1 || guess > 100) {
      await m.reply(claraWrap("Guess Number", "Angka harus 1-100!"));
      return { handled: true };
    }
    if (game.guesses.includes(guess)) {
      await m.reply(claraWrap("Guess Number", "Angka " + guess + " sudah ditebak!"));
      return { handled: true };
    }

    game.guesses.push(guess);
    game.attempts--;

    if (guess === game.target) {
      // Win
      const bonusMultiplier = Math.max(1, game.attempts + 1);
      const reward = game.reward * bonusMultiplier;
      user.coin += reward;
      db.setUser(m.sender, user);
      delConfig(db, gid);
      db.save();
      await m.react("🐣");
      await m.reply(claraWrap("Guess Number - MENANG!", [
        "@" + m.sender.split("@")[0],
        "",
        "Jawaban: " + game.target,
        "Tebakan benar dalam " + (game.maxAttempts - game.attempts) + "x tebak!",
        "Reward: " + reward + " coins (x" + bonusMultiplier + " multiplier)",
        "Coin: " + user.coin,
      ].join("\n")), { mentions: [m.sender] });
      return { handled: true };
    }

    if (game.attempts <= 0) {
      delConfig(db, gid);
      await m.react("❌");
      await m.reply(claraWrap("Guess Number - KALAH", [
        "@" + m.sender.split("@")[0],
        "",
        "Tebakan habis! Jawaban: " + game.target,
        "Tebakan kamu: " + game.guesses.join(", "),
      ].join("\n")), { mentions: [m.sender] });
      return { handled: true };
    }

    const hint = guess < game.target ? "LEBIH BESAR ⬆" : "LEBIH KECIL ⬇";
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Guess Number", [
      "Tebakan: " + guess,
      "Hint: " + hint,
      "Sisa: " + game.attempts + " tebakan",
      "Tebakan: " + game.guesses.join(", "),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Guess Number", [
    "GUESS THE NUMBER",
    "",
    prefix + "guessnum start - mulai (" + ENTRY_COST + " coins, reward 100+)",
    prefix + "guessnum <angka> - tebak (1-100)",
    prefix + "guessnum status - cek game",
    prefix + "guessnum stop - berhenti",
    "",
    "7 tebakan, makin sedikit tebak makin besar reward!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
