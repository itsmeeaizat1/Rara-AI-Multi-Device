// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Soul Forge — Tempa senjata jiwa, gabungkan item untuk senjata unik
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgsoulforge",
  alias: ["soulforgerpg", "tempa", "soulweapon", "tempa jiwa", "forgejiwa"],
  category: "rpg",
  description: "RPG Soul Forge — Tempa senjata jiwa dari material, upgrade ke tier lebih tinggi",
  usage: ".rpgsoulforge — Lihat bengkel\n.rpgsoulforge craft <weaponId> — Tempa senjata\n.rpgsoulforge upgrade <weaponId> — Upgrade senjawa\n.rpgsoulforge list — Daftar senjata\n.rpgsoulforge dismantle <weaponId> — Bongkar senjata",
  example: ".rpgsoulforge craft dagger\n.rpgsoulforge upgrade sword",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 10,
  isEnabled: true,
};

const STAMINA_COST = 10;

const WEAPONS = [
  { id: "dagger", name: "Belati Jiwa", emoji: "🗡️", tier: 1, materials: { iron: 3, wood: 2 }, goldCost: 1000, power: 20, desc: "Senjata dasar" },
  { id: "sword", name: "Pedang Jiwa", emoji: "⚔️", tier: 2, materials: { iron: 8, diamond: 1 }, goldCost: 5000, power: 50, desc: "Senjata menengah" },
  { id: "axe", name: "Kapak Jiwa", emoji: "🪓", tier: 3, materials: { iron: 15, diamond: 3 }, goldCost: 15000, power: 100, desc: "Senjata kuat" },
  { id: "spear", name: "Tombak Jiwa", emoji: "🔱", tier: 4, materials: { iron: 25, diamond: 5, emerald: 2 }, goldCost: 40000, power: 200, desc: "Senjata sangat kuat" },
  { id: "soulblade", name: "Bilah Jiwa", emoji: "💥", tier: 5, materials: { iron: 50, diamond: 10, emerald: 5 }, goldCost: 100000, power: 500, desc: "Senjata LEGENDARY" },
];

const TIER_NAMES = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Soul Forge", [
        "BENGKEL TEMPA JIWA",
        "Tempa senjata dari material, upgrade untuk kekuatan",
        "Stamina: -" + STAMINA_COST + " per tempa",
        "",
        "SENJATA:",
        "🗡️ Belati T1 (3 besi, 2 kayu) 1Kg | 20 power",
        "⚔️ Pedang T2 (8 besi, 1 diamond) 5Kg | 50 power",
        "🪓 Kapak T3 (15 besi, 3 diamond) 15Kg | 100 power",
        "🔱 Tombak T4 (25 besi, 5 diamond, 2 emerald) 40Kg | 200 power",
        "💥 Bilah Jiwa T5 LEGENDARY (50 besi, 10 diamond, 5 emerald) 100Kg | 500 power",
        "",
        "PERINTAH:",
        usedPrefix + "rpgsoulforge list - Daftar senjata",
        usedPrefix + "rpgsoulforge craft <id> - Tempa senjata",
        usedPrefix + "rpgsoulforge upgrade <id> - Upgrade level",
        usedPrefix + "rpgsoulforge dismantle <id> - Bongkar (kembali 50%)",
      ], "info"));
    }

    if (action === "list") {
      const lines = ["DAFTAR SENJATA JIWA", ""];
      WEAPONS.forEach(w => {
        const owned = player.soulWeapons?.[w.id];
        if (owned) {
          lines.push(w.emoji + " " + w.name + " Lv." + owned.level + " (Power: " + (w.power * owned.level) + ")" + (owned.equipped ? " [EQUIPPED]" : ""));
        } else {
          lines.push(w.emoji + " " + w.name + " (T" + w.tier + " " + TIER_NAMES[w.tier] + ")");
          lines.push("   " + Object.entries(w.materials).map(([k, v]) => v + " " + k).join(", ") + " + " + w.goldCost + "g");
          lines.push("   Power: " + w.power + " | " + w.desc);
        }
      });
      return m.reply(claraWrap("RPG Soul Forge", lines, "info"));
    }

    if (action === "craft") {
      const weaponId = args[1]?.toLowerCase();
      const weapon = WEAPONS.find(w => w.id === weaponId);

      if (!weapon) return m.reply(claraWrap("RPG Soul Forge", "Senjata tidak ditemukan", "warn"));
      if (player.soulWeapons?.[weapon.id]) return m.reply(claraWrap("RPG Soul Forge", "Sudah punya " + weapon.name + ". Upgrade: " + usedPrefix + "rpgsoulforge upgrade " + weapon.id, "warn"));
      if ((player.stamina || 100) < STAMINA_COST) return m.reply(claraWrap("RPG Soul Forge", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));

      // Check materials
      for (const [mat, needed] of Object.entries(weapon.materials)) {
        if ((player[mat] || 0) < needed) {
          return m.reply(claraWrap("RPG Soul Forge", "Material kurang! Butuh " + needed + " " + mat + " (punya " + (player[mat] || 0) + ")", "warn"));
        }
      }

      if ((player.gold || 0) < weapon.goldCost) {
        return m.reply(claraWrap("RPG Soul Forge", "Gold kurang! Butuh: " + weapon.goldCost, "warn"));
      }

      // Consume
      addGold(m, -weapon.goldCost);
      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      for (const [mat, needed] of Object.entries(weapon.materials)) {
        player[mat] = (player[mat] || 0) - needed;
      }

      if (!player.soulWeapons) player.soulWeapons = {};
      player.soulWeapons[weapon.id] = { level: 1, equipped: false, craftedAt: Date.now() };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Soul Forge", [
        "SENJATA DITEMPA!",
        weapon.emoji + " " + weapon.name,
        "Tier: " + TIER_NAMES[weapon.tier] + " | Power: " + weapon.power,
        "",
        "Stamina: -" + STAMINA_COST,
        "Equip: " + usedPrefix + "rpgsoulforge upgrade " + weapon.id,
      ], "info"));
    }

    if (action === "upgrade") {
      const weaponId = args[1]?.toLowerCase();
      const weapon = WEAPONS.find(w => w.id === weaponId);

      if (!weapon || !player.soulWeapons?.[weapon.id]) {
        return m.reply(claraWrap("RPG Soul Forge", "Senjata belum dimiliki", "warn"));
      }

      const current = player.soulWeapons[weapon.id];
      const upCost = Math.round(weapon.goldCost * 0.5 * current.level);
      if ((player.gold || 0) < upCost) {
        return m.reply(claraWrap("RPG Soul Forge", "Gold kurang! Upgrade: " + upCost, "warn"));
      }

      addGold(m, -upCost);
      player.soulWeapons[weapon.id].level = current.level + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Soul Forge", [
        "UPGRADE!",
        weapon.emoji + " " + weapon.name + " Lv." + current.level + " -> " + (current.level + 1),
        "Power: " + (weapon.power * current.level) + " -> " + (weapon.power * (current.level + 1)),
        "Biaya: " + upCost + " gold",
      ], "info"));
    }

    if (action === "dismantle") {
      const weaponId = args[1]?.toLowerCase();
      const weapon = WEAPONS.find(w => w.id === weaponId);

      if (!weapon || !player.soulWeapons?.[weapon.id]) {
        return m.reply(claraWrap("RPG Soul Forge", "Senjata belum dimiliki", "warn"));
      }

      const current = player.soulWeapons[weapon.id];
      const refund = Math.round(weapon.goldCost * 0.5);

      // Return 50% materials
      for (const [mat, amount] of Object.entries(weapon.materials)) {
        player[mat] = (player[mat] || 0) + Math.round(amount * 0.5);
      }
      addGold(m, refund);
      delete player.soulWeapons[weapon.id];
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Soul Forge", [
        "SENJATA DIBONGKAR!",
        weapon.emoji + " " + weapon.name,
        "Refund: " + refund + "g + 50% materials",
        "Level: " + current.level + " hilang",
      ], "warn"));
    }

    // Default: show forge
    const weapons = player.soulWeapons || {};
    const weaponCount = Object.keys(weapons).length;

    const lines = [
      "BENGKEL TEMPA JIWA",
      "Senjata dimiliki: " + weaponCount + "/" + WEAPONS.length,
      "Stamina: " + (player.stamina || 100) + "/100",
      "",
    ];

    if (weaponCount === 0) {
      lines.push("Belum punya senjata!");
      lines.push("Tempa: " + usedPrefix + "rpgsoulforge craft dagger");
    } else {
      let totalPower = 0;
      Object.entries(weapons).forEach(([id, data]) => {
        const w = WEAPONS.find(x => x.id === id);
        if (!w) return;
        totalPower += w.power * data.level;
        lines.push(w.emoji + " " + w.name + " Lv." + data.level + " (Power: " + (w.power * data.level) + ")");
      });
      lines.push("");
      lines.push("Total power: " + totalPower);
    }

    lines.push("");
    lines.push("Craft: " + usedPrefix + "rpgsoulforge craft <id>");

    return m.reply(claraWrap("RPG Soul Forge", lines, "info"));
  } catch (e) {
    console.error("[RpgSoulForge]", e);
    return m.reply(claraWrap("RPG Soul Forge", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
