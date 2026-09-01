// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// resetlevel.js — Reset level RPG (owner only)
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "resetlevel",
  alias: ["resetlevel", "resetrpg"],
  category: "rpg",
  description: "Reset level RPG (owner only)",
  usage: ".resetlevel @tag",
  example: ".resetlevel @628xxx",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const rpg = ensureRpg({ sender: target, key: { remoteJid: target } }, target.split("@")[0]);
    if (!rpg) return m.reply(claraWrap("resetlevel", "Target belum terdaftar RPG.", "error"));

    rpg.level = 1;
    rpg.exp = 0;
    rpg.expNext = 100;
    rpg.gold = 0;
    rpg.gems = 0;
    rpg.job = "novice";
    rpg.jobLevel = 1;
    rpg.jobExp = 0;
    rpg.jobExpNext = 50;
    rpg.hp = 100;
    rpg.maxHp = 100;
    rpg.mana = 50;
    rpg.maxMana = 50;
    rpg.energy = 100;
    rpg.maxEnergy = 100;
    rpg.skill = "";
    saveRpg({ sender: target, key: { remoteJid: target } }, rpg);

    await m.react("🐣");
    let msg = "";
    msg += `✅ RPG @${target.split("@")[0]} telah direset!\n`;
    msg += `Level: 1 | Gold: 0 | Job: novice\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("resetlevel error:", err);
    await m.react("❌");
    return m.reply(claraWrap("resetlevel", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
