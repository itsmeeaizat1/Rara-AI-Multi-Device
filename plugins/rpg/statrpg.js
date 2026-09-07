// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Stat — Statistik karakter (tampilan bar interaktif)
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { novaGameBox, gameCTA, psSection, psStat, novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "statrpg", alias: ["statrpg", "stat"],
  category: "rpg", description: "Lihat stat karakter RPG",
  usage: ".statrpg", example: ".statrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("statrpg", "RPG belum siap.", "error"));

    const msg = novaGameBox({
      title: "stat karakter", icon: "📊",
      flavor: `📊 *${(m.pushName || "Player").toUpperCase()} SIAP TEMPUR!*`,
      body: [
        psSection("peranan"),
        `  Nama   : ${m.pushName || "Player"}`,
        `  Level  : ${rpg.level || 1}`,
        "",
        psSection("statistik"),
        psStat("❤️", "HP", rpg.hp, rpg.maxHp),
        psStat("💙", "Mana", rpg.mana, rpg.maxMana),
        psStat("⚡", "Energi", rpg.energy, rpg.maxEnergy),
        "",
        psSection("tempur"),
        `  ⚔️ ATK ${rpg.atk}   🛡️ DEF ${rpg.def}   💨 SPD ${rpg.spd}`,
        `  🎯 Crit ${rpg.critRate || 0}%   💫 Evasion ${rpg.evasion || 0}%`,
        "",
        psSection("pengalaman"),
        psStat("✨", "EXP", rpg.exp, rpg.expNext || 100),
        `  🪙 Gold ${rpg.gold ?? 0}   💎 Gems ${rpg.gems ?? 0}   🎟️ Tokens ${rpg.tokens ?? 0}`,
        "",
        psSection("tersedia"),
        "  .adventure  .meditation  .leaderboard",
      ].join("\n"),
      cta: gameCTA("adventure"),
    });
    return m.reply(msg);
  } catch (e) {
    return m.reply(novaRpgBox("statrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
