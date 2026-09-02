// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG WorldEvent — Event dunia acak (owner only)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "worldeventrpg", alias: ["worldeventrpg", "worldevent"],
  category: "rpg", description: "Trigger event dunia acak (owner only)",
  usage: ".worldeventrpg", example: ".worldeventrpg",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 0, isEnabled: true,
};

const EVENTS = [
  { msg: "🌠 Hujan Meteor! Semua player +100 EXP!", exp: 100 },
  { msg: "🌧️ Banjir besar! Semua bank player -20%", bank: 0.8 },
  { msg: "🎁 Harta Karun Muncul! Gunakan .hunt sekarang untuk item langka!", hunt: true },
  { msg: "⚔️ Invasion musuh! Semua pemain wajib siap tempur!", invasion: true },
  { msg: "🌙 Malam Keemasan! EXP & Gold +50% selama 1 jam!", bonus: true },
];

async function handler(m, { sock }) {
  try {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  await animGeneric(m, sock, "🌍", "World Event");
    return m.reply(claraWrap("worldeventrpg", `🌍 *WORLD EVENT TERJADI!*\n\n${event.msg}`, "success"));
  } catch (e) {
    return m.reply(claraWrap("worldeventrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
