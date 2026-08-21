// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgrebirth",
  alias: ["lahirlagi", "reinkarnasi", "rpgreincarnate"],
  category: "rpg",
  description: "Rebirth/reinkarnasi untuk reset level tapi dapat bonus permanen",
  usage: ".rpgrebirth | .rpgrebirth status | .rpgrebirth confirm",
  example: ".rpgrebirth",
  isGroup: true,
  isPremium: false,
  cooldown: 300,
  energi: 50,
  isEnabled: true,
};

const REBIRTH_BONUSES = [
  { stat: "energi_max", label: "Max Energi +10", value: 10 },
  { stat: "hp_max", label: "Max HP +50", value: 50 },
  { stat: "mana_max", label: "Max Mana +30", value: 30 },
  { stat: "exp_boost", label: "EXP Boost +10%", value: 10 },
  { stat: "koin_boost", label: "Koin Boost +15%", value: 15 },
  { stat: "attack_boost", label: "Attack +5", value: 5 },
  { stat: "defense_boost", label: "Defense +5", value: 5 },
  { stat: "luck", label: "Luck +5%", value: 5 },
];

const MIN_LEVEL_REBIRTH = 50;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const rebirthCount = user.rebirthCount || 0;
      const level = user.level || 1;
      const canRebirth = level >= MIN_LEVEL_REBIRTH;

      const bonuses = user.rebirthBonuses || [];
      let bonusText = "Belum ada bonus";
      if (bonuses.length > 0) {
        const grouped = {};
        bonuses.forEach((b) => { grouped[b.stat] = (grouped[b.stat] || 0) + b.value; });
        bonusText = Object.entries(grouped).map(([stat, val]) => {
          const label = REBIRTH_BONUSES.find((r) => r.stat === stat)?.label.split(" +")[0] || stat;
          return label + " +" + val;
        }).join("\n");
      }

      return m.reply(claraWrap("RPG Rebirth", [
        "REBIRTH STATUS",
        "",
        "Rebirth count: " + rebirthCount,
        "Level sekarang: " + level + "/" + MIN_LEVEL_REBIRTH + " (minimum)",
        canRebirth ? "*BISA REBIRTH*" : "Butuh level " + MIN_LEVEL_REBIRTH + " untuk rebirth",
        "",
        "BONUS PERMANEN:",
        bonusText,
        "",
        "Cost rebirth: " + pluginConfig.energi + " energi + reset level ke 1",
        "Tapi bonus permanen tetap ada!",
        "",
        canRebirth ? "Ketik .rpgrebirth confirm untuk rebirth!" : "Naik level lagi dulu ya!",
      ]));
    }

    // CONFIRM
    if (sub === "confirm" || sub === "ya" || sub === "ok") {
      const level = user.level || 1;
      if (level < MIN_LEVEL_REBIRTH) {
        return m.reply(claraWrap("RPG Rebirth", "Level kamu belum cukup!\nButuh: Level " + MIN_LEVEL_REBIRTH + "\nLevel kamu: " + level));
      }
      if ((user.energi || 0) < pluginConfig.energi) {
        return m.reply(claraWrap("RPG Rebirth", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
      }

      // Roll bonus
      const bonus = REBIRTH_BONUSES[Math.floor(Math.random() * REBIRTH_BONUSES.length)];

      // Apply rebirth
      user.energi -= pluginConfig.energi;
      user.level = 1;
      user.exp = 0;
      user.hp = (user.maxHp || 100) + (bonus.stat === "hp_max" ? bonus.value : 0);
      user.mana = (user.maxMana || 100) + (bonus.stat === "mana_max" ? bonus.value : 0);
      user.rebirthCount = (user.rebirthCount || 0) + 1;
      if (!user.rebirthBonuses) user.rebirthBonuses = [];
      user.rebirthBonuses.push(bonus);

      // Apply permanent bonuses
      const bonuses = user.rebirthBonuses;
      const totalEnergiBonus = bonuses.filter((b) => b.stat === "energi_max").reduce((a, b) => a + b.value, 0);
      const totalHpBonus = bonuses.filter((b) => b.stat === "hp_max").reduce((a, b) => a + b.value, 0);
      const totalManaBonus = bonuses.filter((b) => b.stat === "mana_max").reduce((a, b) => a + b.value, 0);

      if (totalEnergiBonus > 0) user.energiMax = 100 + totalEnergiBonus;
      if (totalHpBonus > 0) user.maxHp = 100 + totalHpBonus;
      if (totalManaBonus > 0) user.maxMana = 100 + totalManaBonus;

      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Rebirth", [
        "REBIRTH BERHASIL!",
        "",
        "Rebirth ke: " + user.rebirthCount,
        "",
        "BONUS BARU:",
        bonus.label,
        "",
        "Reset: Level ke 1, EXP ke 0",
        "Bonus permanen tetap ada!",
        "",
        "Total bonus permanen:",
        user.rebirthBonuses.map((b) => b.label).join("\n"),
        "",
        "Mulai petualangan baru kamu!",
      ], "success"));
    }

    // PREVIEW / HELP
    const level = user.level || 1;
    const canRebirth = level >= MIN_LEVEL_REBIRTH;

    return m.reply(claraWrap("RPG Rebirth", [
      "REBIRTH / REINKARNASI",
      "",
      "Rebirth = reset level ke 1 tapi dapat bonus permanen!",
      "Semakin sering rebirth, semakin kuat!",
      "",
      "STATUS:",
      "Level: " + level + "/" + MIN_LEVEL_REBIRTH,
      "Rebirth count: " + (user.rebirthCount || 0),
      "Energi: " + (user.energi || 0) + "/" + (user.energiMax || 100),
      "",
      "COST: " + pluginConfig.energi + " energi + reset level",
      "",
      "BONUS RANDOM yang bisa didapat:",
      "1. Max Energi +10",
      "2. Max HP +50",
      "3. Max Mana +30",
      "4. EXP Boost +10%",
      "5. Koin Boost +15%",
      "6. Attack +5",
      "7. Defense +5",
      "8. Luck +5%",
      "",
      canRebirth ? "*Kamu BISA rebirth sekarang!*" : "Butuh level " + MIN_LEVEL_REBIRTH + " untuk rebirth",
      canRebirth ? "Ketik .rpgrebirth confirm untuk konfirmasi" : "Tingkatkan level kamu dulu!",
      "",
      "Ketik .rpgrebirth status untuk lihat bonus permanen",
    ]));
  } catch (e) {
    console.error("[RPG Rebirth]", e);
    m.reply(claraWrap("RPG Rebirth", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
