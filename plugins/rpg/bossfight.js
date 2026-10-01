// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Boss Fight — Global world boss (semua player serang bareng) + final trial

import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animBossFight } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "bossfight",
  alias: ["bossfight", "finaltrial", "worldboss"],
  category: "rpg",
  description: "Global world boss (semua player serang bareng) dan final trial",
  usage: ".bossfight | .finaltrial",
  example: ".bossfight",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 60, energi: 5, isEnabled: true,
};

// Global boss state (in-memory, shared across all players)
let globalBoss = null;
const BOSS_LIST = [
  { name: "Demon Lord Malakor", hp: 5000, atk: 200, reward: { gold: 2000, exp: 2000 } },
  { name: "Ancient Dragon Vorthrax", hp: 8000, atk: 300, reward: { gold: 5000, exp: 3000 } },
  { name: "Shadow Emperor Kael", hp: 12000, atk: 500, reward: { gold: 10000, exp: 5000 } },
];

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("bossfight", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "bossfight" || command === "worldboss") {
      // Spawn boss if none exists
      if (!globalBoss || globalBoss.hp <= 0) {
        const bossDef = BOSS_LIST[Math.floor(Math.random() * BOSS_LIST.length)];
        globalBoss = { ...bossDef, maxHp: bossDef.hp, attackers: [] };
        return m.reply("Boss Spawn: *" + globalBoss.name + "*\nHP: " + globalBoss.hp + "/" + globalBoss.maxHp + "\nATK: " + globalBoss.atk + "\n\nKetik .bossfight untuk serang!");
      }

      // Attack boss
      if ((rpg.energy || 0) < 10) return m.reply(raraRpgBox("bossfight", "Energi tidak cukup. Butuh 10 energi.", "info"));

      await m.react("🕒");
    await animBossFight(m, sock);
      const baseDmg = (rpg.atk || 10) + Math.floor(Math.random() * 50);
      const elementBonus = rpg.element ? 1.1 : 1;
      const dmg = Math.floor(baseDmg * elementBonus);

      globalBoss.hp = Math.max(0, globalBoss.hp - dmg);
      rpg.energy = (rpg.energy || 0) - 10;
      rpg.exp = (rpg.exp || 0) + 20;

      // Track attackers
      if (!globalBoss.attackers.includes(m.sender)) globalBoss.attackers.push(m.sender);

      if (globalBoss.hp <= 0) {
        // Boss defeated — reward all attackers
        const reward = globalBoss.reward;
        rpg.gold = (rpg.gold || 0) + reward.gold;
        rpg.exp = (rpg.exp || 0) + reward.exp;
        rpg.bossKills = (rpg.bossKills || 0) + 1;
        saveRpg(m, rpg);
        await m.react("🐣");
        const bossName = globalBoss.name;
        const totalAttackers = globalBoss.attackers.length;
        globalBoss = null;
        return m.reply("👑 *" + bossName + "* dikalahkan!\nPlayer Bertarung: " + totalAttackers + "\n\nGold: +" + reward.gold + "\nEXP: +" + reward.exp + "\n\nBoss baru akan spawn lain kali");
      }

      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu menyerang *" + globalBoss.name + "*!\nDamage: " + dmg + (rpg.element ? " (Element Bonus!)" : "") + "\nBoss HP: " + globalBoss.hp + "/" + globalBoss.maxHp + "\nSisa Energi: " + rpg.energy);
    }

    if (command === "finaltrial") {
      if (rpg.level < 99) return m.reply(raraRpgBox("finaltrial", "Butuh level 99 untuk ikut ujian akhir.", "info"));
      await m.react("🕒");
      const trials = 3;
      let totalReward = 0;
      for (let i = 0; i < trials; i++) {
        const dmg = Math.floor(Math.random() * 200) + 100;
        if ((rpg.hp || 100) > dmg) {
          rpg.hp = (rpg.hp || 100) - dmg;
          totalReward += 1000;
        } else {
          rpg.hp = 1;
          saveRpg(m, rpg);
          await m.react("❌");
          return m.reply("❌ Kamu gugur di trial ke-" + (i + 1) + "!\nHP Tersisa: 1\nCoba lagi setelah .heal");
        }
      }
      rpg.gold = (rpg.gold || 0) + totalReward;
      rpg.exp = (rpg.exp || 0) + 5000;
      rpg.title = "Champion of the Final Trial";
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("🔥 Ujian selesai!\nBoss Dikalahkan: 3\n\nGold: +" + totalReward + "\nEXP: +5000\nTitle: Champion of the Final Trial");
    }
  } catch (e) {
    console.error("bossfight error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox(m.command || "bossfight", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };