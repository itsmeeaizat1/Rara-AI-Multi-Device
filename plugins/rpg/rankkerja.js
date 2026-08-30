// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rankkerja.js — Ranking pemain berdasarkan gold
import { getLeaderboard, ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "rankkerja",
  alias: ["rankkerja", "workrank", "leaderboardgold"],
  category: "rpg",
  description: "Ranking pemain berdasarkan total gold",
  usage: ".rankkerja",
  example: ".rankkerja",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("rankkerja", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const board = getLeaderboard("gold", 10);
    if (!board || board.length === 0) return m.reply(claraWrap("rankkerja", "Belum ada data pemain.", "error"));

    const medals = ["🥇", "🥈", "🥉"];
    let msg = `╭──「 *HALL OF FAME* 」\n`;
    msg += `│ 🏆 Top 10 Richest Players\n`;
    msg += `│\n`;
    board.forEach((u, i) => {
      const badge = medals[i] || `#${i + 1}`;
      msg += `│ ${badge} ${u.name || "Unknown"}\n`;
      msg += `│    Lv.${u.level || 1} | 💰 ${(u.gold || 0).toLocaleString("id-ID")}\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("rankkerja error:", err);
    await m.react("❌");
    return m.reply(claraWrap("rankkerja", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
