// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Siege — Penyerangan benteng, attack/defend castle untuk loot
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgsiege",
  alias: ["siegerpg", "serangbenteng", "benteng", "penyerbuan", "attacksiege"],
  category: "rpg",
  description: "RPG Siege — Serang benteng untuk loot & gold",
  usage: ".rpgsiege scout — Lihat benteng tersedia\n.rpgsiege attack <level> — Serang benteng\n.rpgsiege info — Statistik",
  example: ".rpgsiege scout\n.rpgsiege attack 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 15,
  isEnabled: true,
};

const STAMINA_COST = 25;

const CASTLES = [
  { level: 1, name: "Benteng Kayu", emoji: "🏰", hp: 200, atk: 15, goldReward: 1000, expReward: 50, minLevel: 1, loot: { wood: 5, rock: 3 } },
  { level: 2, name: "Benteng Batu", emoji: "🏯", hp: 500, atk: 25, goldReward: 3000, expReward: 150, minLevel: 5, loot: { rock: 8, iron: 3 } },
  { level: 3, name: "Benteng Besi", emoji: "⚔️", hp: 1000, atk: 40, goldReward: 8000, expReward: 400, minLevel: 10, loot: { iron: 8, diamond: 1 } },
  { level: 4, name: "Benteng Naga", emoji: "🐉", hp: 2000, atk: 60, goldReward: 20000, expReward: 1000, minLevel: 20, loot: { diamond: 3, emerald: 1 } },
  { level: 5, name: "Benteng Dewa", emoji: "⚡", hp: 5000, atk: 100, goldReward: 50000, expReward: 3000, minLevel: 35, loot: { diamond: 5, emerald: 3 } },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Siege", [
        "PENYERANGAN BENTENG",
        "Serang benteng untuk gold & loot!",
        "Stamina: -" + STAMINA_COST + " per serangan",
        "",
        "PERINTAH:",
        usedPrefix + "rpgsiege scout - Lihat benteng",
        usedPrefix + "rpgsiege attack <level> - Serang",
        usedPrefix + "rpgsiege info - Statistik",
        "",
        "Makin tinggi level makin besar hadiah",
        "Tapi makin kuat pertahanannya!",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.siegeStats || {};
      const lines = [
        "STATISTIK SIEGE",
        "Total serangan: " + (stats.attacks || 0),
        "Kemenangan: " + (stats.wins || 0),
        "Kekalahan: " + (stats.losses || 0),
        "Total gold: " + (stats.totalGold || 0),
        "Total exp: " + (stats.totalExp || 0),
      ];
      return m.reply(claraWrap("RPG Siege", lines, "info"));
    }

    if (action === "scout") {
      const lines = ["DAFTAR BENTENG", ""];
      CASTLES.forEach(castle => {
        const accessible = (player.level || 0) >= castle.minLevel;
        lines.push(castle.emoji + " Lv." + castle.level + " " + castle.name + (accessible ? " OK" : " (Min Lv " + castle.minLevel + ")"));
        lines.push("   HP:" + castle.hp + " ATK:" + castle.atk);
        lines.push("   Gold:" + castle.goldReward + " Exp:" + castle.expReward);
        lines.push("   Loot: " + Object.entries(castle.loot).map(([k, v]) => v + " " + k).join(", "));
      });
      lines.push("");
      lines.push("Serang: " + usedPrefix + "rpgsiege attack <level>");
      return m.reply(claraWrap("RPG Siege", lines, "info"));
    }

    if (action === "attack") {
      const castleLevel = parseInt(args[1]);
      const castle = CASTLES.find(c => c.level === castleLevel);

      if (!castle) {
        return m.reply(claraWrap("RPG Siege", "Benteng tidak ditemukan (1-5). Scout: " + usedPrefix + "rpgsiege scout", "warn"));
      }

      if ((player.level || 0) < castle.minLevel) {
        return m.reply(claraWrap("RPG Siege", "Level belum cukup! Butuh: " + castle.minLevel, "warn"));
      }

      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Siege", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      // Battle simulation
      const playerPower = (player.level || 1) * 20 + Math.random() * 100;
      const castlePower = castle.hp * 0.3 + castle.atk * 2 + Math.random() * 50;
      const wins = playerPower > castlePower;

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);

      if (!player.siegeStats) player.siegeStats = {};
      player.siegeStats.attacks = (player.siegeStats.attacks || 0) + 1;

      const lines = [
        "PENYERANGAN " + castle.emoji + " " + castle.name,
        "Player Power: " + Math.round(playerPower),
        "Castle Power: " + Math.round(castlePower),
        "",
      ];

      if (wins) {
        // Victory
        addGold(m, castle.goldReward);
        addExp(m, castle.expReward);

        // Give loot
        for (const [item, count] of Object.entries(castle.loot)) {
          player[item] = (player[item] || 0) + count;
        }

        player.siegeStats.wins = (player.siegeStats.wins || 0) + 1;
        player.siegeStats.totalGold = (player.siegeStats.totalGold || 0) + castle.goldReward;
        player.siegeStats.totalExp = (player.siegeStats.totalExp || 0) + castle.expReward;

        lines.push("VICTORY!");
        lines.push("Gold: +" + castle.goldReward);
        lines.push("Exp: +" + castle.expReward);
        lines.push("Loot: " + Object.entries(castle.loot).map(([k, v]) => "+" + v + " " + k).join(", "));
      } else {
        player.siegeStats.losses = (player.siegeStats.losses || 0) + 1;
        const consolationExp = Math.round(castle.expReward * 0.2);
        addExp(m, consolationExp);

        lines.push("DEFEAT! Pertahanan terlalu kuat.");
        lines.push("Consolation exp: +" + consolationExp);
      }

      savePlayer(m, player);
      lines.push("");
      lines.push("Stamina: " + (player.stamina || 0) + "/100");
      lines.push("Gold: " + (player.gold || 0));

      return m.reply(claraWrap("RPG Siege", lines, wins ? "info" : "warn"));
    }

    return m.reply(claraWrap("RPG Siege", "Perintah: scout, attack, info", "warn"));
  } catch (e) {
    console.error("[RpgSiege]", e);
    return m.reply(claraWrap("RPG Siege", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
