// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Scout — Intai lokasi musuh (reply)
import { getRpgData } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "scoutrpg", alias: ["scoutrpg", "scout"],
  category: "rpg", description: "Intai lokasi musuh (reply target)",
  usage: ".scoutrpg (reply target)", example: ".scoutrpg (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    if (!m.quoted) return m.reply(novaRpgBox("scoutrpg", "Reply target untuk diintai.", "guide"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(novaRpgBox("scoutrpg", "Target belum terdaftar.", "error"));
    const loc = target.location || "rahasia";
  await animGeneric(m, sock, "🔍", "Scouting");
    return m.reply(novaRpgBox("scoutrpg", `🔍 Lokasi musuh: *${loc}*`, "success"));
  } catch (e) {
    return m.reply(novaRpgBox("scoutrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
