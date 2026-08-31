// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Prestige — Reset level for permanent stat boost (different from rebirth)

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "prestige",
  alias: ["prestige"],
  aliases: ["prestige", "reincarnate", "reinkarnasi"],
  category: "rpg",
  description: "Prestige (reset Lv.50+) & reinkarnasi (reset Lv.30+) untuk bonus permanen",
  usage: ".prestige | .reincarnate",
  example: ".prestige",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("prestige", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "prestige") {
      if (rpg.level < 50) return m.reply(claraWrap("prestige", "Minimal level 50 untuk prestige.", "info"));

      await m.react("🕒");
      rpg.level = 1;
      rpg.exp = 0;
      rpg.expNext = 100;
      rpg.gold = (rpg.gold || 0) + 1000;
      rpg.statBoost = (rpg.statBoost || 0) + 1;
      rpg.prestigeCount = (rpg.prestigeCount || 0) + 1;
      rpg.atk = (rpg.atk || 10) + 5;
      rpg.def = (rpg.def || 5) + 5;
      rpg.hp = (rpg.hp || 100) + 50;
      rpg.maxHp = (rpg.maxHp || 100) + 50;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ᴘʀᴇsᴛɪɢᴇ* 」\n│ 🏅 Kamu melakukan *Prestige*!\n│\n│ 📊 Prestige ke-" + rpg.prestigeCount + "\n│ 💰 +1000 Gold\n│ 💪 ATK +5 | 🛡️ DEF +5 | ❤️ HP +50\n│ 📌 Stat boost permanen setiap prestige\n╰──────────");
    }

    if (command === "reincarnate" || command === "reinkarnasi") {
      if (rpg.level < 30) return m.reply(claraWrap("reincarnate", "Minimal level 30 untuk reinkarnasi.", "info"));

      await m.react("🕒");
      rpg.level = 1;
      rpg.exp = 0;
      rpg.expNext = 100;
      rpg.gold = 0;
      rpg.reincarnation = (rpg.reincarnation || 0) + 1;
      rpg.passiveBonus = (rpg.passiveBonus || 0) + 5;
      rpg.atk = (rpg.atk || 10) + 3;
      rpg.def = (rpg.def || 5) + 3;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ʀᴇɪɴᴋᴀʀɴᴀsɪ* 」\n│ 🔁 Kamu telah bereinkarnasi!\n│\n│ 📊 Reinkarnasi ke-" + rpg.reincarnation + "\n│ 💪 Passive bonus: +" + rpg.passiveBonus + "% power\n│ 📌 Bonus permanen setiap reinkarnasi\n╰──────────");
    }
  } catch (e) {
    console.error("prestige error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "prestige", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
