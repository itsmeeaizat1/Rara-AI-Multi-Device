// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ulartangga.js — Game ular tangga (snakes & ladders)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const SNAKES = { 29: 7, 24: 12, 72: 36, 90: 56, 75: 64, 91: 72, 97: 78 };
const LADDERS = { 15: 37, 23: 41, 49: 86, 74: 95 };

const pluginConfig = {
  name: "ulartangga",
  alias: ["ulartangga", "snl", "ular"],
  category: "game",
  description: "Game ular tangga — snake & ladders",
  usage: ".ulartangga [start/roll/join/end]",
  example: ".ulartangga start\n.ulartangga roll",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 2, isEnabled: true,
};

const games = new Map();

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();
    const sender = m.sender;

    if (!action || action === "start") {
      if (games.has(from)) return m.reply(claraWrap("ulartangga", "Game sudah ada! Ketik .ulartangga join", "guide"));
      games.set(from, {
        players: [sender],
        positions: { [sender]: 1 },
        turn: 0,
        started: false,
      });
      await m.react("🐣");
      return m.reply(`🎲 Game dimulai!
Pemain: @${sender.split("@")[0]}
Ketik .ulartangga join untuk ikut
Ketik .ulartangga roll untuk mulai`);
    }

    if (action === "join") {
      const game = games.get(from);
      if (!game) return m.reply(claraWrap("ulartangga", "Belum ada game! Ketik .ulartangga start", "guide"));
      if (game.players.includes(sender)) return m.reply(claraWrap("ulartangga", "Kamu sudah join!", "guide"));
      if (game.started) return m.reply(claraWrap("ulartangga", "Game sudah dimulai!", "guide"));
      game.players.push(sender);
      game.positions[sender] = 1;
      await m.react("🐣");
      return m.reply(`✅ @${sender.split("@")[0]} bergabung!
Total pemain: ${game.players.length}`);
    }

    if (action === "roll") {
      const game = games.get(from);
      if (!game) return m.reply(claraWrap("ulartangga", "Belum ada game! Ketik .ulartangga start", "guide"));
      if (!game.players.includes(sender)) return m.reply(claraWrap("ulartangga", "Kamu belum join! Ketik .ulartangga join", "guide"));
      if (game.turn >= game.players.length) game.turn = 0;
      if (game.players[game.turn] !== sender) return m.reply(claraWrap("ulartangga", `Bukan giliranmu! Giliran @${game.players[game.turn].split("@")[0]}`, "guide"));
      game.started = true;

      await m.react("🕒");
      const dice = Math.floor(Math.random() * 6) + 1;
      let pos = game.positions[sender] + dice;

      // Check ladders
      if (LADDERS[pos]) {
        pos = LADDERS[pos];
        await m.react("🐣");
        let msg = "";
        msg += `🎲 Dadu: ${dice}\n`;
        msg += `🪜 Tangga! Naik ke ${pos}\n`;
        msg += `📍 @${sender.split("@")[0]} di posisi ${pos}\n`;
        if (pos >= 100) { msg += `🏆 MENANG!\n`;
          msg += `Yuk main ular tangga lagi kak untuk dadi yang lebih baik 🥳\n`; games.delete(from); }
        game.positions[sender] = pos;
        game.turn++;
        return m.reply(msg.trim());
      }

      // Check snakes
      if (SNAKES[pos]) {
        pos = SNAKES[pos];
        await m.react("🐣");
        let msg = "";
        msg += `🎲 Dadu: ${dice}\n`;
        msg += `🐍 Ular! Turun ke ${pos}\n`;
        msg += `📍 @${sender.split("@")[0]} di posisi ${pos}\n`;
        if (pos >= 100) { msg += `🏆 MENANG!\n`;
          msg += `Yuk main ular tangga lagi kak untuk dadi yang lebih baik 🥳\n`; games.delete(from); }
        game.positions[sender] = pos;
        game.turn++;
        return m.reply(msg.trim());
      }

      // Normal move
      if (pos > 100) pos = 100 - (pos - 100);
      game.positions[sender] = pos;
      game.turn++;
      await m.react("🐣");
      let msg = "";
      msg += `🎲 Dadu: ${dice}\n`;
      msg += `📍 @${sender.split("@")[0]} di posisi ${pos}/100\n`;
      if (pos >= 100) { msg += `🏆 MENANG!\n`;
          msg += `Yuk main ular tangga lagi kak untuk dadi yang lebih baik 🥳\n`; games.delete(from); }
      return m.reply(msg.trim());
    }

    if (action === "end") {
      games.delete(from);
      await m.react("🐣");
      return m.reply("Game dihentikan.");
    }
  } catch (err) {
    console.error("ulartangga error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ulartangga", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
