// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Skill Tree — Alokasi skill point untuk buff permanen
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { findLevel } from "../../src/lib/nova-rpg.js";

const pluginConfig = {
  name: "rpgskilltree",
  alias: ["skilltree", "skillrpg", "talentrpg", "talenttree", "pohonskill"],
  category: "rpg",
  description: "RPG Skill Tree — Alokasi skill point untuk buff permanen",
  usage: ".rpgskilltree — Lihat skill tree & status\n.rpgskilltree invest <branch> <jumlah> — Invest point\n.rpgskilltree reset — Reset (biaya 5000 gold)",
  example: ".rpgskilltree\n.rpgskilltree invest warrior 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const RESET_COST = 5000;

// Skill branches with 5 levels each
const BRANCHES = [
  {
    id: "warrior",
    name: "Warrior",
    emoji: "⚔️",
    desc: "Bonus attack & damage",
    levels: [
      { name: "Power Strike I", bonus: "+5 atk", desc: "Damage hunt +5%" },
      { name: "Power Strike II", bonus: "+10 atk", desc: "Damage hunt +10%" },
      { name: "Power Strike III", bonus: "+15 atk", desc: "Damage hunt +15%" },
      { name: "Warrior Mastery", bonus: "+25 atk", desc: "Damage hunt +25%" },
      { name: "Warrior Legend", bonus: "+40 atk", desc: "Damage hunt +40%" },
    ],
  },
  {
    id: "mage",
    name: "Mage",
    emoji: "🔮",
    desc: "Bonus exp gain",
    levels: [
      { name: "Mana Flow I", bonus: "+5% exp", desc: "Exp semua aksi +5%" },
      { name: "Mana Flow II", bonus: "+10% exp", desc: "Exp +10%" },
      { name: "Mana Flow III", bonus: "+15% exp", desc: "Exp +15%" },
      { name: "Arcane Mastery", bonus: "+25% exp", desc: "Exp +25%" },
      { name: "Archmage", bonus: "+40% exp", desc: "Exp +40%" },
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    emoji: "🏹",
    desc: "Bonus gold & luck",
    levels: [
      { name: "Lucky Find I", bonus: "+5% gold", desc: "Gold semua aksi +5%" },
      { name: "Lucky Find II", bonus: "+10% gold", desc: "Gold +10%" },
      { name: "Lucky Find III", bonus: "+15% gold", desc: "Gold +15%" },
      { name: "Treasure Hunter", bonus: "+25% gold", desc: "Gold +25%" },
      { name: "Fortune Seeker", bonus: "+40% gold", desc: "Gold +40%" },
    ],
  },
  {
    id: "tank",
    name: "Tank",
    emoji: "🛡️",
    desc: "Bonus HP & stamina",
    levels: [
      { name: "Iron Body I", bonus: "+10 HP", desc: "Max HP +10" },
      { name: "Iron Body II", bonus: "+20 HP", desc: "Max HP +20" },
      { name: "Iron Body III", bonus: "+30 HP", desc: "Max HP +30" },
      { name: "Fortress", bonus: "+50 HP, +10 stam", desc: "Max HP +50, Stamina +10" },
      { name: "Bastion", bonus: "+80 HP, +20 stam", desc: "Max HP +80, Stamina +20" },
    ],
  },
];

const MAX_BRANCH_LEVEL = 5;

function getAvailableSkillPoints(player) {
  const level = player.level || findLevel(player.exp || 0);
  const spent = BRANCHES.reduce((sum, b) => sum + (player.skills?.[b.id] || 0), 0);
  return level - spent;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help" || action === "info") {
      const available = getAvailableSkillPoints(player);

      const lines = [
        "RPG SKILL TREE",
        "Alokasi skill point untuk buff permanen",
        "Skill points tersedia: " + available,
        "",
        "CABANG SKILL:",
      ];

      BRANCHES.forEach((branch) => {
        const currentLevel = player.skills?.[branch.id] || 0;
        lines.push(branch.emoji + " " + branch.name + " (Lv " + currentLevel + "/" + MAX_BRANCH_LEVEL + ")");
        lines.push("   " + branch.desc);

        if (currentLevel > 0) {
          lines.push("   Aktif: " + branch.levels[currentLevel - 1].bonus);
        }
        if (currentLevel < MAX_BRANCH_LEVEL) {
          lines.push("   Next: " + branch.levels[currentLevel]?.bonus + " (-1 skill point)");
        }
        lines.push("");
      });

      lines.push("PERINTAH:");
      lines.push(usedPrefix + "rpgskilltree invest <branch> <jumlah>");
      lines.push(usedPrefix + "rpgskilltree reset (biaya " + RESET_COST + " gold)");
      lines.push("");
      lines.push("Branch: warrior, mage, ranger, tank");
      lines.push("Skill point didapat tiap naik level");

      return m.reply(claraWrap("RPG Skill Tree", lines, "info"));
    }

    if (action === "invest" || action === "add") {
      const branchId = args[1]?.toLowerCase();
      let amount = parseInt(args[2]) || 1;

      const branch = BRANCHES.find(b => b.id === branchId);
      if (!branch) {
        return m.reply(claraWrap("RPG Skill Tree", [
          "Cabang tidak ditemukan: " + (branchId || "?"),
          "Tersedia: warrior, mage, ranger, tank",
        ], "warn"));
      }

      if (!player.skills) player.skills = {};
      const currentLevel = player.skills[branch.id] || 0;
      const maxInvest = MAX_BRANCH_LEVEL - currentLevel;
      amount = Math.min(amount, maxInvest);

      if (amount < 1) {
        return m.reply(claraWrap("RPG Skill Tree", branch.name + " sudah max level!", "warn"));
      }

      const available = getAvailableSkillPoints(player);
      if (available < amount) {
        return m.reply(claraWrap("RPG Skill Tree", [
          "Skill point tidak cukup!",
          "Butuh: " + amount + " | Tersedia: " + available,
          "Naik level untuk dapat lebih banyak",
        ], "warn"));
      }

      // Invest
      player.skills[branch.id] = currentLevel + amount;
      savePlayer(m, player);

      const newLevel = player.skills[branch.id];
      const newSkill = branch.levels[newLevel - 1];

      return m.reply(claraWrap("RPG Skill Tree", [
        "SKILL DI-INVEST!",
        branch.emoji + " " + branch.name + " Lv " + newLevel,
        "Skill baru: " + newSkill.name,
        "Bonus: " + newSkill.bonus,
        "Desc: " + newSkill.desc,
        "",
        "Sisa skill point: " + getAvailableSkillPoints(player),
      ], "info"));
    }

    if (action === "reset") {
      if (!player.skills || Object.keys(player.skills).length === 0) {
        return m.reply(claraWrap("RPG Skill Tree", "Belum ada skill yang di-invest", "warn"));
      }

      if ((player.gold || 0) < RESET_COST) {
        return m.reply(claraWrap("RPG Skill Tree", [
          "Gold tidak cukup! Butuh: " + RESET_COST,
          "Punya: " + (player.gold || 0),
        ], "warn"));
      }

      addGold(m, -RESET_COST);
      delete player.skills;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Skill Tree", [
        "Skill tree di-reset!",
        "Semua skill point dikembalikan",
        "Biaya: " + RESET_COST + " gold",
        "Skill point tersedia: " + getAvailableSkillPoints(player),
      ], "info"));
    }

    return m.reply(claraWrap("RPG Skill Tree", "Perintah: invest, reset. Ketik .rpgskilltree help", "warn"));
  } catch (e) {
    console.error("[RpgSkillTree]", e);
    return m.reply(claraWrap("RPG Skill Tree", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
