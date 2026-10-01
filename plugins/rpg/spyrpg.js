// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Spy — Intai target (reply)
import { ensureRpg, getRpgData } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "spyrpg", alias: ["spyrpg", "spy", "intai"],
  category: "rpg", description: "Intai lokasi & info target (reply target)",
  usage: ".spyrpg (reply target)", example: ".spyrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    if (!m.quoted) return m.reply(raraRpgBox("spyrpg", "Reply target yang ingin diintai.", "guide"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(raraRpgBox("spyrpg", "Target belum terdaftar RPG.", "error"));
    const loc = target.location || "tidak diketahui";
    const hp = `${target.hp}/${target.maxHp}`;
    const lvl = target.level || 1;
  await animGeneric(m, sock, "🕵️", "Spying");
    return m.reply(raraRpgBox("spyrpg", `🕵️ Intel Target:\n📍 Lokasi: *${loc}*\n🎚️ Level: ${lvl}\n❤️ HP: ${hp}`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("spyrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
