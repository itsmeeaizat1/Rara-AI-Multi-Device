// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// levelinfo.js — Lihat info level RPG
import { ensureRpg, getPlayerInfo } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "levelinfo",
  alias: ["levelinfo", "lvlinfo"],
  category: "rpg",
  description: "Lihat info level dan stats RPG",
  usage: ".levelinfo",
  example: ".levelinfo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("levelinfo", "RPG belum siap. Ketik .daftar dulu.", "error"));

    let msg = `╭─「 LEVEL INFO 」\n`;
    msg += `│ 👤 ${m.pushName || "Player"}\n`;
    msg += `│\n`;
    msg += `│ 📊 Level: ${rpg.level || 1}\n`;
    msg += `│ ✨ EXP: ${rpg.exp || 0}/${rpg.expNext || 100}\n`;
    msg += `│ 💰 Gold: ${(rpg.gold || 0).toLocaleString("id-ID")}\n`;
    msg += `│ 💎 Gems: ${rpg.gems || 0}\n`;
    msg += `│\n`;
    msg += `│ ❤️ HP: ${rpg.hp || 100}/${rpg.maxHp || 100}\n`;
    msg += `│ 🔮 Mana: ${rpg.mana || 50}/${rpg.maxMana || 50}\n`;
    msg += `│ ⚡ Energy: ${rpg.energy || 100}/${rpg.maxEnergy || 100}\n`;
    msg += `│\n`;
    msg += `│ 👔 Job: ${rpg.job || "novice"}\n`;
    msg += `│ 📖 Job Lv: ${rpg.jobLevel || 1}\n`;
    msg += `│ 📖 Job EXP: ${rpg.jobExp || 0}/${rpg.jobExpNext || 50}\n`;
    if (rpg.skill) msg += `│ 🃏 Skill: ${rpg.skill}\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("levelinfo error:", err);
    await m.react("❌");
    return m.reply(claraWrap("levelinfo", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
