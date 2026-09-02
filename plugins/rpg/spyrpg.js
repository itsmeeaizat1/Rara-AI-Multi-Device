// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Spy — Intai target (reply)
import { ensureRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "spyrpg", alias: ["spyrpg", "spy", "intai"],
  category: "rpg", description: "Intai lokasi & info target (reply target)",
  usage: ".spyrpg (reply target)", example: ".spyrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    if (!m.quoted) return m.reply(claraWrap("spyrpg", "Reply target yang ingin diintai.", "guide"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(claraWrap("spyrpg", "Target belum terdaftar RPG.", "error"));
    const loc = target.location || "tidak diketahui";
    const hp = `${target.hp}/${target.maxHp}`;
    const lvl = target.level || 1;
  await animGeneric(m, sock, "🕵️", "Spying");
    return m.reply(claraWrap("spyrpg", `🕵️ Intel Target:\n📍 Lokasi: *${loc}*\n🎚️ Level: ${lvl}\n❤️ HP: ${hp}`, "success"));
  } catch (e) {
    return m.reply(claraWrap("spyrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
