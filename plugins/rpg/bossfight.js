// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Boss Fight — Global world boss (semua player serang bareng) + final trial

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bossfight",
  alias: ["bossfight"],
  aliases: ["bossfight", "finaltrial", "worldboss"],
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
    if (!rpg) return m.reply(claraWrap("bossfight", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "bossfight" || command === "worldboss") {
      // Spawn boss if none exists
      if (!globalBoss || globalBoss.hp <= 0) {
        const bossDef = BOSS_LIST[Math.floor(Math.random() * BOSS_LIST.length)];
        globalBoss = { ...bossDef, maxHp: bossDef.hp, attackers: [] };
        return m.reply("╭──「 *ᴡᴏʀʟᴅ ʙᴏss* 」\n│ 👹 Boss spawn: *" + globalBoss.name + "*\n│ ❤️ HP: " + globalBoss.hp + "/" + globalBoss.maxHp + "\n│ 💪 ATK: " + globalBoss.atk + "\n│\n│ 📌 Ketik .bossfight untuk serang!\n╰──────────");
      }

      // Attack boss
      if ((rpg.energy || 0) < 10) return m.reply(claraWrap("bossfight", "Energi tidak cukup. Butuh 10 energi.", "info"));

      await m.react("🕒");
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
        return m.reply("╭──「 *ʙᴏss ᴅᴇғᴇᴀᴛᴇᴅ* 」\n│ 👑 *" + bossName + "* dikalahkan!\n│ 📊 " + totalAttackers + " player ikut bertarung\n│\n│ 💰 +" + reward.gold + " Gold | ⭐ +" + reward.exp + " EXP\n│\n│ 📌 Boss baru akan spawn lain kali\n╰──────────");
      }

      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ʙᴏss ғɪɢʜᴛ* 」\n│ ⚔️ Kamu menyerang *" + globalBoss.name + "*!\n│ 💥 Damage: " + dmg + (rpg.element ? " (Element Bonus!)" : "") + "\n│ ❤️ Boss HP: " + globalBoss.hp + "/" + globalBoss.maxHp + "\n│ ⚡ Sisa energi: " + rpg.energy + "\n╰──────────");
    }

    if (command === "finaltrial") {
      if (rpg.level < 99) return m.reply(claraWrap("finaltrial", "Butuh level 99 untuk ikut ujian akhir.", "info"));
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
          return m.reply("╭──「 *ғɪɴᴀʟ ᴛʀɪᴀʟ* 」\n│ ❌ Kamu gugur di trial ke-" + (i + 1) + "!\n│ 💔 HP tersisa: 1\n│ 📌 Coba lagi setelah .heal\n╰──────────");
        }
      }
      rpg.gold = (rpg.gold || 0) + totalReward;
      rpg.exp = (rpg.exp || 0) + 5000;
      rpg.title = "Champion of the Final Trial";
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ғɪɴᴀʟ ᴛʀɪᴀʟ* 」\n│ 🔥 Ujian selesai!\n│ 📊 3 boss dikalahkan\n│\n│ 💰 +" + totalReward + " Gold\n│ ⭐ +5000 EXP\n│ 👑 Title: Champion of the Final Trial\n╰──────────");
    }
  } catch (e) {
    console.error("bossfight error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "bossfight", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
