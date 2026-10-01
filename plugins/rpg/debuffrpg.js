// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Debuff — Beri debuff ke musuh (reply target)
import { ensureRpg, saveRpg, useMana, getRpgData } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "debuff", alias: ["debuff", "debuffrpg"],
  category: "rpg", description: "Beri debuff burn ke musuh (reply target, biaya 15 mana)",
  usage: ".debuff (reply target)", example: ".debuff (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("debuffrpg", "RPG belum siap.", "error"));
    if (!m.quoted) return m.reply(raraRpgBox("debuffrpg", "Reply target untuk diberi debuff.", "guide"));
    if (rpg.mana < 15) return m.reply(raraRpgBox("debuffrpg", "Mana tidak cukup. Butuh 15 mana.", "error"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(raraRpgBox("debuffrpg", "Target belum terdaftar RPG.", "error"));
    useMana(m, 15, sock);
    target.debuff = "burn";
    target.debuffExpire = Date.now() + 1800000;
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🤢", "Applying Debuff");
    return m.reply(raraRpgBox("debuffrpg", `🔥 Musuh terkena efek *burn*! (-5 HP/turn selama 30 menit)`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("debuffrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
