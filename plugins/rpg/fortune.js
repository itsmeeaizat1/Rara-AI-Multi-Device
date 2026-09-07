import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "fortune",
  alias: ["fortune", "wheel", "rodafortuna"],
  category: "rpg",
  description: "Roda Keberuntungan untuk memutar hadiah acak bernilai tinggi",
  usage: ".fortune",
  example: ".fortune",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SEGMENTS = [
  { name: "500 Gold", type: "gold", amount: 500, weight: 20, icon: "🪙" },
  { name: "100 Gold", type: "gold", amount: 100, weight: 30, icon: "💰" },
  { name: "50 Energi", type: "energi", amount: 50, weight: 15, icon: "⚡" },
  { name: "1 Diamond", type: "diamond", amount: 1, weight: 5, icon: "💎" },
  { name: "1000 Gold", type: "gold", amount: 1000, weight: 10, icon: "💵" },
  { name: "10 EXP", type: "exp", amount: 10, weight: 15, icon: "⭐" },
  { name: "JACKPOT 5000 Gold", type: "gold", amount: 5000, weight: 2, icon: "🎉" },
  { name: "ZONK (Zonk)", type: "none", amount: 0, weight: 3, icon: "💀" },
];

function spinWheel() {
  const totalWeight = SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  let random = Math.random() * totalWeight;

  for (const seg of SEGMENTS) {
    if (random < seg.weight) {
      return seg;
    }
    random -= seg.weight;
  }
  return SEGMENTS[1];
}

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const spinCost = 200;

    // Load player fortune/user data
    let player = (await db.getPlayerData?.(sender, "fortune")) || {
      gold: 1000,
      energi: 50,
      diamond: 0,
      exp: 0,
    };

    if (typeof player.gold !== "number") player.gold = 1000;

    if (player.gold < spinCost) {
      await m.react('❌');
      return m.reply(
        novaRpgBox(
          "fortune",
          `Gold kamu tidak cukup untuk memutar Fortune Wheel!\n\nBiaya Spin: ${spinCost} Gold | Gold Kamu: ${player.gold} Gold`,
          "error"
        )
      );
    }

    // Deduct cost
    player.gold -= spinCost;

    // Spin
    const result = spinWheel();

    // Apply reward
    if (result.type === "gold") {
      player.gold += result.amount;
    } else if (result.type === "energi") {
      player.energi = (player.energi || 0) + result.amount;
    } else if (result.type === "diamond") {
      player.diamond = (player.diamond || 0) + result.amount;
    } else if (result.type === "exp") {
      player.exp = (player.exp || 0) + result.amount;
    }

    await db.setPlayerData?.(sender, "fortune", player);

    await m.react('🐣');
    return m.reply(novaGameBox({
      title: "fortune", icon: "🥠",
      flavor: result.type === "none"
        ? "💀 *ZONK!*"
        : result.name.startsWith("JACKPOT")
        ? "🎊 *JACKPOT!*"
        : "🎡 *REZEKI NOMPLOK!*",
      body: [
        "🎡 [ 500g | 100g | 50⚡ | 💎1 | 1000g | 10⭐ | 🏆5000g | 💀ZONK ]",
        `│ • 🎯 Hasil putaran : ${result.icon} ${result.name}`,
        `│ • 💰 Biaya spin : -${spinCost} Gold`,
        `│ • 👛 Sisa gold : ${player.gold} Gold`,
      ].join("\n"),
      cta: gameCTA("fortune"),
    }));
  } catch (err) {
    console.error("fortune error:", err);
    await m.react('❌');
    return m.reply(novaRpgBox("fortune", err.message || "Terjadi kesalahan pada Fortune Wheel.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
