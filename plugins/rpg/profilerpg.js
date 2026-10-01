import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "rpgprofile", alias: ["profil", "profilerpg", "profilrpg"],
  category: "rpg", description: "Tampilkan profil RPG lengkap",
  usage: ".profil", example: ".profil",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
// Skor game baru (rpg.gamePoin) — poin per game, aturan owner 2026-09-05
function poinSection(rpg) {
  const poin = rpg?.gamePoin || {};
  const keys = Object.keys(poin).filter(k => poin[k] > 0);
  if (!keys.length) return "";
  return `\n🎯 Skor Game: ${keys.map(k => `${k} ${poin[k]}`).join(", ")}`;
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("profilerpg", "RPG belum siap.", "error"));
    await animGeneric(m, sock, '📋', 'Loading profile');
    return m.reply(raraRpgBox("profilerpg",
      `🧍 *PROFIL RPG*\n\n🎖️ Nama: ${m.pushName}\n🆔 ID: ${m.sender.split("@")[0]}\n🧪 Level: ${rpg.level}\n⚔️ Kelas: ${rpg.job || "Belum dipilih"}\n🌀 Elemen: ${rpg.element || "Netral"}\n🧠 Skill: ${(rpg.skills || []).join(", ") || "Belum punya"}\n\n❤️ HP: ${rpg.hp}/${rpg.maxHp}\n💧 Mana: ${rpg.mana}/${rpg.maxMana}\n⚡ Energy: ${rpg.energy}/${rpg.maxEnergy}\n\n💵 Uang: Rp ${(rpg.cash || 0).toLocaleString("id-ID")}\n💰 Gold: ${rpg.gold}\n💎 Gems: ${rpg.gems}\n🪙 Tokens: ${rpg.tokens}\n${poinSection(rpg)}\n\n⚔️ ATK: ${rpg.atk} | 🛡️ DEF: ${rpg.def} | ⚡ SPD: ${rpg.spd}\n🎯 Crit: ${rpg.critRate}% | Evasion: ${rpg.evasion}%\n\n📊 PvP: ${rpg.pvpWins}W/${rpg.pvpLosses}L (Rating: ${rpg.pvpRating})\n💀 Boss Kills: ${rpg.bossKills}\n${rpg.guildId ?`🏰 Guild: ${rpg.guildId}` : ""}`, "info"));
  } catch (e) { return m.reply(raraRpgBox("profilerpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };