import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animRoulette } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "roulette",
  alias: ["roulette", "rlt", "rulet"],
  category: "rpg",
  description: "Permainan taruhan roulette Eropa (0-36).",
  usage: ".roulette <jenis_taruhan> <jumlah_bet>",
  example: ".roulette red 100",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const MIN_BET = 100;

async function getPlayerGold(db, sender) {
  if (typeof db.getUser === "function") {
    const u = db.getUser(sender);
    if (u?.rpg?.gold !== undefined) return u.rpg.gold;
    if (u?.gold !== undefined) return u.gold;
  }
  return 1000;
}

async function updatePlayerGold(db, sender, amount) {
  if (typeof db.addGold === "function") {
    await db.addGold(sender, amount);
  } else if (typeof db.updateCurrency === "function") {
    db.updateCurrency(sender, "gold", amount);
  } else if (typeof db.getUser === "function") {
    const u = db.getUser(sender) || {};
    if (!u.rpg) u.rpg = {};
    u.rpg.gold = Math.max(0, (u.rpg.gold || 0) + amount);
    if (typeof db.setUser === "function") db.setUser(sender, u);
  }
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const sender = m.sender;
    const args = m.args || [];
    const prefix = m.prefix || ".";

    if (args.length < 2) {
      let guide = `Cara Bermain Roulette:\n\n`;
      guide += `*1.* Red / Merah (2x)\n`;
      guide += `*2.* Black / Hitam (2x)\n`;
      guide += `*3.* Even / Genap (2x)\n`;
      guide += `*4.* Odd / Ganjil (2x)\n`;
      guide += `*5.* Low / Kecil (1-18) (2x)\n`;
      guide += `*6.* High / Besar (19-36) (2x)\n`;
      guide += `*7.* Angka Spesifik (0-36) (36x)\n\n`;
      guide += `Contoh: *${prefix}roulette red 100* atau *${prefix}roulette 7 100*`;
      return m.reply(claraWrap("roulette", guide, "info"));
    }

    let betTypeInput = args[0].toLowerCase();
    let betAmountInput = parseInt(args[1]);

    // Handle argument swap if user typed amount first (e.g. .roulette 100 red)
    if (isNaN(betAmountInput) && !isNaN(parseInt(args[0]))) {
      betAmountInput = parseInt(args[0]);
      betTypeInput = args[1].toLowerCase();
    }

    if (isNaN(betAmountInput) || betAmountInput < MIN_BET) {
      return m.reply(
        claraWrap(
          "roulette",
          `Minimal taruhan adalah *${MIN_BET} gold*! Contoh: *${prefix}roulette red 100*`,
          "warn"
        )
      );
    }

    const bet = betAmountInput;
    const db = await getDatabase();
    const currentGold = await getPlayerGold(db, sender);

    if (currentGold < bet) {
      return m.reply(
        claraWrap(
          "roulette",
          `Gold kamu tidak cukup! Punya *${currentGold} gold*, butuh *${bet} gold*.`,
          "error"
        )
      );
    }

    // Spin ball (0-36)
    const winningNumber = Math.floor(Math.random() * 37);
    let winningColor = "🟢";
    let colorName = "Hijau";

    if (RED_NUMBERS.includes(winningNumber)) {
      winningColor = "🔴";
      colorName = "Merah";
    } else if (BLACK_NUMBERS.includes(winningNumber)) {
      winningColor = "⚫";
      colorName = "Hitam";
    }

    let won = false;
    let multiplier = 0;

    // Check bet outcome
    const numChoice = parseInt(betTypeInput);
    if (!isNaN(numChoice) && numChoice >= 0 && numChoice <= 36) {
      if (winningNumber === numChoice) {
        won = true;
        multiplier = 36;
      }
    } else if (["red", "merah"].includes(betTypeInput)) {
      if (RED_NUMBERS.includes(winningNumber)) {
        won = true;
        multiplier = 2;
      }
    } else if (["black", "hitam"].includes(betTypeInput)) {
      if (BLACK_NUMBERS.includes(winningNumber)) {
        won = true;
        multiplier = 2;
      }
    } else if (["even", "genap"].includes(betTypeInput)) {
      if (winningNumber > 0 && winningNumber % 2 === 0) {
        won = true;
        multiplier = 2;
      }
    } else if (["odd", "ganjil"].includes(betTypeInput)) {
      if (winningNumber > 0 && winningNumber % 2 !== 0) {
        won = true;
        multiplier = 2;
      }
    } else if (["low", "kecil"].includes(betTypeInput)) {
      if (winningNumber >= 1 && winningNumber <= 18) {
        won = true;
        multiplier = 2;
      }
    } else if (["high", "besar"].includes(betTypeInput)) {
      if (winningNumber >= 19 && winningNumber <= 36) {
        won = true;
        multiplier = 2;
      }
    } else {
      return m.reply(
        claraWrap(
          "roulette",
          `Jenis taruhan *${betTypeInput}* tidak valid!\nPilih: red, black, even, odd, low, high, atau angka 0-36.`,
          "warn"
        )
      );
    }

    // Roulette animation
    await animRoulette(m, sock);

    const payout = won ? bet * multiplier : 0;
    const netProfit = payout - bet;

    await updatePlayerGold(db, sender, netProfit);
    const updatedGold = await getPlayerGold(db, sender);

    // Update persistence stats
    let stats = (await db.getPlayerData?.(sender, "roulette")) || {
      totalSpins: 0,
      wins: 0,
      losses: 0,
      totalEarned: 0,
    };
    stats.totalSpins += 1;
    if (won) {
      stats.wins += 1;
      stats.totalEarned += netProfit;
    } else {
      stats.losses += 1;
    }
    await db.setPlayerData?.(sender, "roulette", stats);

    await m.react("🐣");

    let properties = [];
    if (winningNumber > 0) {
      properties.push(colorName);
      properties.push(winningNumber % 2 === 0 ? "Genap" : "Ganjil");
      properties.push(winningNumber <= 18 ? "Kecil (1-18)" : "Besar (19-36)");
    } else {
      properties.push("Angka Nol (0)");
    }

    let output = "";
    output += `🎡 Hasil Spin: ${winningColor} *${winningNumber}* (${properties.join(" / ")})\n`;
    output += `🎯 Taruhan: *${betTypeInput.toUpperCase()}*\n`;
    output += `💵 Jumlah Bet: *${bet} gold*\n`;
    output += `
`;
    if (won) {
      output += `🎉 *MENANG!* Multiplier: *${multiplier}x*\n`;
      output += `💰 Total Payout: *+${payout} gold* (Net: +${netProfit})\n`;
    } else {
      output += `❌ *KALAH!* Bola mendarat di ${winningColor} ${winningNumber}\n`;
      output += `💸 Kerugian: *-${bet} gold*\n`;
    }
    output += `💼 Sisa Gold: *${updatedGold} gold*\n`;
    
    return m.reply(output);
  } catch (err) {
    console.error("roulette error:", err);
    await m.react("❌");
    return m.reply(claraWrap("roulette", err.message || "Terjadi kesalahan pada roulette.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
