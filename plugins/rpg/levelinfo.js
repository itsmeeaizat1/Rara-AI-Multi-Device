// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// levelinfo.js — Lihat info level RPG
import { ensureRpg, getPlayerInfo } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox, psStat } from "../../src/lib/nova-games.js";

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
    if (!rpg) return m.reply(novaRpgBox("levelinfo", "RPG belum siap. Ketik .daftar dulu.", "error"));

    let msg = "";
    msg += `👤 ${m.pushName || "Player"}\n`;
    msg += `\n`;
    msg += `📊 Level: ${rpg.level || 1}\n`;
    msg += psStat("✨", "EXP", rpg.exp || 0, rpg.expNext || 100) + "\n";
    msg += `💰 Gold: ${(rpg.gold || 0).toLocaleString("id-ID")}\n`;
    msg += `💎 Gems: ${rpg.gems || 0}\n`;
    msg += `\n`;
    msg += psStat("❤️", "HP", rpg.hp || 0, rpg.maxHp || 100) + "\n";
    msg += psStat("🔮", "Mana", rpg.mana || 0, rpg.maxMana || 50) + "\n";
    msg += psStat("⚡", "Energy", rpg.energy || 0, rpg.maxEnergy || 100) + "\n";
    msg += `\n`;
    msg += `👔 Job: ${rpg.job || "novice"} (Lv.${rpg.jobLevel || 1})\n`;
    msg += psStat("📖", "Job EXP", rpg.jobExp || 0, rpg.jobExpNext || 50) + "\n";
    if (rpg.skill) msg += `🃏 Skill: ${rpg.skill}\n`;

    await m.react("🐣");
    await animGeneric(m, sock, '📊', 'Loading level info');
    return m.reply(msg);
  } catch (err) {
    console.error("levelinfo error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("levelinfo", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };