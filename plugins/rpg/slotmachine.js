import { getDatabase } from "../../src/lib/nova-database.js";
import { animSlot } from "../../src/lib/nova-rpg-anim.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "slotmachine",
  alias: ["slotmachine", "slot", "slots", "judi"],
  category: "rpg",
  description: "Permainan judi mesin slot 3 reel dengan 6 simbol (🍒🍋🍊🔔⭐💎).",
  usage: ".slotmachine <jumlah_bet>",
  example: ".slotmachine 100",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SYMBOLS = ["🍒", "🍋", "🍊", "🔔", "⭐", "💎"];
const MULTIPLIERS_3 = { "🍒": 2, "🍋": 3, "🍊": 4, "🔔": 5, "⭐": 10, "💎": 50 };
const MIN_BET = 50;
const MAX_BET = 5000;

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

    if (!args[0] || isNaN(parseInt(args[0]))) {
      return m.reply(claraWrap("slotmachine", `Masukkan jumlah taruhan valid! Min *${MIN_BET}*, Max *${MAX_BET}* gold.\nContoh: *${prefix}slotmachine 100*`, "warn"));
    }

    const bet = parseInt(args[0]);
    if (bet < MIN_BET || bet > MAX_BET) {
      return m.reply(claraWrap("slotmachine", `Jumlah taruhan harus antara *${MIN_BET}* dan *${MAX_BET}* gold!`, "warn"));
    }

    const db = await getDatabase();
    const currentGold = await getPlayerGold(db, sender);
    if (currentGold < bet) {
      return m.reply(claraWrap("slotmachine", `Gold kamu tidak cukup! Kamu memiliki *${currentGold} gold*, butuh *${bet} gold*.`, "error"));
    }

    // Spin reels
    const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

    let multiplier = 0;
    let resultMsg = "";
    if (r1 === r2 && r2 === r3) {
      multiplier = MULTIPLIERS_3[r1] || 2;
      resultMsg = `🎉 JACKPOT 3 MATCH (${r1})! Multiplier: *${multiplier}x*`;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      multiplier = 1.5;
      resultMsg = `✨ 2 MATCH! Multiplier: *1.5x*`;
    } else {
      multiplier = 0;
      resultMsg = `❌ ZONK! Semua simbol berbeda.`;
    }

    // Slot spinning animation
    await animSlot(m, sock, [r1, r2, r3]);

    const payout = Math.floor(bet * multiplier);
    const netProfit = payout - bet;
    await updatePlayerGold(db, sender, netProfit);
    const updatedGold = await getPlayerGold(db, sender);

    let stats = (await db.getPlayerData?.(sender, "slotmachine")) || { totalSpins: 0, wins: 0, losses: 0, totalEarned: 0 };
    stats.totalSpins += 1;
    if (netProfit > 0) { stats.wins += 1; stats.totalEarned += netProfit; } else { stats.losses += 1; }
    await db.setPlayerData?.(sender, "slotmachine", stats);

    await m.react("🐣");
    let msg = `╭─「 ✦ sʟᴏᴛ ᴍᴀᴄʜɪɴᴇ ✦ 」\n`;
    msg += `│ 📊 ${resultMsg}\n`;
    msg += `│\n`;
    msg += `│ 💵 Taruhan: *${bet} gold*\n`;
    if (netProfit > 0) {
      msg += `│ 💰 Menang : *+${netProfit} gold*\n`;
    } else {
      msg += `│ 💸 Kalah  : *-${bet} gold*\n`;
    }
    msg += `│ 💼 Sisa Gold: *${updatedGold} gold*\n`;
    msg += `╰──── • ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("slotmachine error:", err);
    await m.react("❌");
    return m.reply(claraWrap("slotmachine", err.message || "Terjadi kesalahan pada slot machine.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
