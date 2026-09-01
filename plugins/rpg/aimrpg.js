import { ensureRpg, saveRpg, getRpgData, useEnergy } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "aimrpg", alias: ["aimrpg"], aliases: ["aimrpg", "aim", "bidik"],
  category: "rpg", description: "Bidik & serang target (reply musuh, -50 HP, 10 energy)",
  usage: ".aimrpg (reply target)", example: ".aimrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("aimrpg", "RPG belum siap.", "error"));
    if (!m.quoted) return m.reply(claraWrap("aimrpg", "Reply target musuh.", "guide"));
    if (rpg.energy < 10) return m.reply(claraWrap("aimrpg", "Energy tidak cukup.", "error"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(claraWrap("aimrpg", "Target belum terdaftar.", "error"));
    useEnergy(m, 10, sock);
    target.hp = Math.max(0, target.hp - 50);
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("aimrpg", `🎯 Kamu membidik dan menyerang ${targetJid.split("@")[0]}, -50 HP!`, "success"));
  } catch (e) { return m.reply(claraWrap("aimrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
