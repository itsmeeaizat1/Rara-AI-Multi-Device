// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// snakesandladders.js — Game ular tangga (snakes & ladders)
import { novaWrap, novaBox } from "../../src/lib/nova-menu-style.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
import te from "../../src/lib/nova-error.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { rollBonus } from "../../src/lib/nova-game-rewards.js";

const SNAKES = { 29: 7, 24: 12, 72: 36, 90: 56, 75: 64, 91: 72, 97: 78 };
const LADDERS = { 15: 37, 23: 41, 49: 86, 74: 95 };

const pluginConfig = {
  name: "snakesandladders",
  alias: ["ulartangga", "snl", "ular"],
  category: "game",
  description: "Game ular tangga — snake & ladders",
  usage: ".snakesandladders [start/roll/join/end]",
  example: ".snakesandladders start\n.ulartangga roll",
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
      if (games.has(from)) return m.reply(novaWrap("ulartangga", "Game sudah ada! Ketik .snakesandladders join", "guide"));
      games.set(from, {
        players: [sender],
        positions: { [sender]: 1 },
        turn: 0,
        started: false,
      });
      await m.react("🐣");
      return m.reply(novaBox("Ular Tangga", [
        "Game dimulai",
        "---",
        `Pemain: @${sender.split("@")[0]}`,
        "---",
        "Ketik .snakesandladders join untuk ikut",
        "Ketik .snakesandladders roll untuk mulai",
      ]));
    }

    if (action === "join") {
      const game = games.get(from);
      if (!game) return m.reply(novaWrap("ulartangga", "Belum ada game! Ketik .snakesandladders start", "guide"));
      if (game.players.includes(sender)) return m.reply(novaWrap("ulartangga", "Kamu sudah join!", "guide"));
      if (game.started) return m.reply(novaWrap("ulartangga", "Game sudah dimulai!", "guide"));
      game.players.push(sender);
      game.positions[sender] = 1;
      await m.react("🐣");
      return m.reply(novaGameBox({ title: "ulartangga", icon: "🐍", flavor: "🎲 *MASUK ARENA!*", body: `@${sender.split("@")[0]} bergabung!
Total pemain: ${game.players.length}` }));
    }

    if (action === "roll") {
      const game = games.get(from);
      if (!game) return m.reply(novaWrap("ulartangga", "Belum ada game! Ketik .snakesandladders start", "guide"));
      if (!game.players.includes(sender)) return m.reply(novaWrap("ulartangga", "Kamu belum join! Ketik .snakesandladders join", "guide"));
      if (game.turn >= game.players.length) game.turn = 0;
      if (game.players[game.turn] !== sender) return m.reply(novaWrap("ulartangga", `Bukan giliranmu! Giliran @${game.players[game.turn].split("@")[0]}`, "guide"));
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
        if (pos >= 100) { let __cash = { gain: 0, saldo: 0 };
          try { __cash = rollBonus(m, "ulartangga"); } catch {}
          msg += `💵 Uang: +${formatRp(__cash.gain)} (saldo ${formatRp(__cash.saldo)})\n`;
          if (__cash.jackpot) msg += `🎰 JACKPOT! Bonus 3x uang!\n`;
          msg += `🏆 MENANG!\n`;
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
        if (pos >= 100) { let __cash = { gain: 0, saldo: 0 };
          try { __cash = rollBonus(m, "ulartangga"); } catch {}
          msg += `💵 Uang: +${formatRp(__cash.gain)} (saldo ${formatRp(__cash.saldo)})\n`;
          if (__cash.jackpot) msg += `🎰 JACKPOT! Bonus 3x uang!\n`;
          msg += `🏆 MENANG!\n`;
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
      if (pos >= 100) { let __cash = { gain: 0, saldo: 0 };
          try { __cash = rollBonus(m, "ulartangga"); } catch {}
          msg += `💵 Uang: +${formatRp(__cash.gain)} (saldo ${formatRp(__cash.saldo)})\n`;
          if (__cash.jackpot) msg += `🎰 JACKPOT! Bonus 3x uang!\n`;
          msg += `🏆 MENANG!\n`;
          msg += `Yuk main ular tangga lagi kak untuk dadi yang lebih baik 🥳\n`; games.delete(from); }
      return m.reply(msg.trim());
    }

    if (action === "end") {
      games.delete(from);
      await m.react("🐣");
      return m.reply(novaGameBox({ title: "ulartangga", icon: "🐍", flavor: "🏁 *PERMAINAN DIHENTIKAN!*", body: "Papan ditutup, ularnya tidur lagi. Ketik .snakesandladders buat main lagi." }));
    }
  } catch (err) {
    console.error("ulartangga error:", err);
    await m.react("❌");
    return m.reply(novaWrap("ulartangga", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
