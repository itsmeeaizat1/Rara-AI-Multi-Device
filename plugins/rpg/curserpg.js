// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Curse — Kutuk musuh (reply target)
import { ensureRpg, saveRpg, useMana, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "curserpg", alias: ["curserpg", "curse", "kutuk"],
  category: "rpg", description: "Kutuk musuh dengan efek negatif (reply target, 20 mana)",
  usage: ".curserpg (reply target)", example: ".curserpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("curserpg", "RPG belum siap.", "error"));
    if (!m.quoted) return m.reply(novaRpgBox("curserpg", "Reply target untuk dikutuk.", "guide"));
    if (rpg.mana < 20) return m.reply(novaRpgBox("curserpg", "Mana tidak cukup. Butuh 20 mana.", "error"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(novaRpgBox("curserpg", "Target belum terdaftar.", "error"));
    useMana(m, 20, sock);
    target.curse = true;
    target.curseExpire = Date.now() + 3600000;
    saveRpg({ sender: targetJid, key: { remoteJid: targetJid } }, target);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "💀", "Casting Curse");
    return m.reply(novaRpgBox("curserpg", `👻 Target telah dikutuk! Efek negatif aktif selama 1 jam.`, "success"));
  } catch (e) {
    return m.reply(novaRpgBox("curserpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
