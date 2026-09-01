// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG TimeTravel — Perjalanan waktu harian
import { ensureRpg, saveRpg, addGold } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "timetravelrpg", alias: ["timetravelrpg"], aliases: ["timetravelrpg", "timetravel"],
  category: "rpg", description: "Perjalanan waktu — dapat gold dari masa lalu (cooldown 24 jam)",
  usage: ".timetravelrpg", example: ".timetravelrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 20, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("timetravelrpg", "RPG belum siap.", "error"));
    if (rpg.lastTimetravel && Date.now() - rpg.lastTimetravel < 86400000) return m.reply(claraWrap("timetravelrpg", "⏳ Kamu sudah melakukan perjalanan waktu hari ini.", "info"));
    rpg.lastTimetravel = Date.now();
    const reward = Math.floor(Math.random() * 1000) + 1000;
    addGold(m, reward);
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("timetravelrpg", `🌀 Kamu menjelajah waktu dan menemukan *${reward} gold* dari masa lalu!`, "success"));
  } catch (e) {
    return m.reply(claraWrap("timetravelrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
