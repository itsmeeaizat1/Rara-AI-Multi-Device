// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Scout — Intai lokasi musuh (reply)
import { getRpgData } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "scout", alias: ["scout", "scoutrpg"],
  category: "rpg", description: "Intai lokasi musuh (reply target)",
  usage: ".scout (reply target)", example: ".scout (reply pesan target)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    if (!m.quoted) return m.reply(raraRpgBox("scoutrpg", "Reply target untuk diintai.", "guide"));
    const targetJid = m.quoted.sender;
    const target = getRpgData({ sender: targetJid, key: { remoteJid: targetJid } });
    if (!target) return m.reply(raraRpgBox("scoutrpg", "Target belum terdaftar.", "error"));
    const loc = target.location || "rahasia";
  await animGeneric(m, sock, "🔍", "Scouting");
    return m.reply(raraRpgBox("scoutrpg", `🔍 Lokasi musuh: *${loc}*`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("scoutrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
