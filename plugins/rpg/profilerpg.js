import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "profilerpg", alias: ["profilerpg", "profilrpg"],
  category: "rpg", description: "Tampilkan profil RPG lengkap",
  usage: ".profilerpg", example: ".profilerpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("profilerpg", "RPG belum siap.", "error"));
    await animGeneric(m, sock, '📋', 'Loading profile');
    return m.reply(claraWrap("profilerpg",
      `🧍 *PROFIL RPG*\n\n🎖️ Nama: ${m.pushName}\n🆔 ID: ${m.sender.split("@")[0]}\n🧪 Level: ${rpg.level}\n⚔️ Kelas: ${rpg.job || "Belum dipilih"}\n🌀 Elemen: ${rpg.element || "Netral"}\n🧠 Skill: ${(rpg.skills || []).join(", ") || "Belum punya"}\n\n❤️ HP: ${rpg.hp}/${rpg.maxHp}\n💧 Mana: ${rpg.mana}/${rpg.maxMana}\n⚡ Energy: ${rpg.energy}/${rpg.maxEnergy}\n\n💰 Gold: ${rpg.gold}\n💎 Gems: ${rpg.gems}\n🪙 Tokens: ${rpg.tokens}\n\n⚔️ ATK: ${rpg.atk} | 🛡️ DEF: ${rpg.def} | ⚡ SPD: ${rpg.spd}\n🎯 Crit: ${rpg.critRate}% | ✨ Evasion: ${rpg.evasion}%\n\n📊 PvP: ${rpg.pvpWins}W/${rpg.pvpLosses}L (Rating: ${rpg.pvpRating})\n💀 Boss Kills: ${rpg.bossKills}\n${rpg.guildId ? `🏰 Guild: ${rpg.guildId}` : ""}`, "info"));
  } catch (e) { return m.reply(claraWrap("profilerpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };