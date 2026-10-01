// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Curse — Kutuk musuh (reply target)
import { ensureRpg, saveRpg, useMana, getRpgData } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "curse", alias: ["curse", "curserpg", "kutuk"],
  category: "rpg", description: "Kutuk musuh dengan efek negatif (reply target, 20 mana)",
  usage: ".curse (reply target)", example: ".curse (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("curserpg", "RPG belum siap.", "error"));
    if (!m.quoted) return m.reply(raraRpgBox("curserpg", "Reply target untuk dikutuk.", "guide"));
    if (rpg.mana < 20) return m.reply(raraRpgBox("curserpg", "Mana tidak cukup. Butuh 20 mana.", "error"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(raraRpgBox("curserpg", "Target belum terdaftar.", "error"));
    useMana(m, 20, sock);
    target.curse = true;
    target.curseExpire = Date.now() + 3600000;
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "💀", "Casting Curse");
    return m.reply(raraRpgBox("curserpg", `👻 Target telah dikutuk! Efek negatif aktif selama 1 jam.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("curserpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
