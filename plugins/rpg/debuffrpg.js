// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Debuff — Beri debuff ke musuh (reply target)
import { ensureRpg, saveRpg, useMana, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "debuffrpg", alias: ["debuffrpg", "debuff"],
  category: "rpg", description: "Beri debuff burn ke musuh (reply target, biaya 15 mana)",
  usage: ".debuffrpg (reply target)", example: ".debuffrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("debuffrpg", "RPG belum siap.", "error"));
    if (!m.quoted) return m.reply(claraWrap("debuffrpg", "Reply target untuk diberi debuff.", "guide"));
    if (rpg.mana < 15) return m.reply(claraWrap("debuffrpg", "Mana tidak cukup. Butuh 15 mana.", "error"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(claraWrap("debuffrpg", "Target belum terdaftar RPG.", "error"));
    useMana(m, 15, sock);
    target.debuff = "burn";
    target.debuffExpire = Date.now() + 1800000;
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🤢", "Applying Debuff");
    return m.reply(claraWrap("debuffrpg", `🔥 Musuh terkena efek *burn*! (-5 HP/turn selama 30 menit)`, "success"));
  } catch (e) {
    return m.reply(claraWrap("debuffrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
