// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Rank Kerja RPG — Player ranking by total gold

import {
  ensureRpg, getLeaderboard
} from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "rankkerja",
  alias: ["rankkerja", "workrank", "leaderboardgold"],
  category: "rpg",
  description: "Ranking pemain berdasarkan total gold",
  usage: ".rankkerja",
  example: ".rankkerja",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("rankkerja", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Board: default gold | "uang"/"cash" → ranking uang (request owner 8 Sep 2026)
    const mode = (m.args?.[0] || "").toLowerCase();
    const byCash = ["uang", "cash"].includes(mode);
    const leaderboard = getLeaderboard(byCash ? "cash" : "gold", 10);
    if (!leaderboard || leaderboard.length === 0) {
      await m.react("🐣");
  await animGeneric(m, sock, "🏹", "Loading");
      return m.reply(novaRpgBox("rankkerja", "Belum ada pemain RPG yang terdaftar.", "info"));
    }

    const medal = ["🥇", "🥈", "🥉"];
    let msg = "";
    msg += byCash ? `🏆 *TOP 10 UANG (Rp)*

` : `🏆 *TOP 10 PEMAIN TERKAYA (GOLD)

`;

    leaderboard.forEach((player, i) => {
      const rank = medal[i] || `${i + 1}.`;
      const name = player.name || player.number || "Unknown";
      const gold = (player.value || 0).toLocaleString("id-ID");
      const cash = ((byCash ? player.value : player.rpg?.cash) || 0).toLocaleString("id-ID");
      const level = player.rpg?.level || 1;
      msg += `${rank} *${name}*\n`;
      msg += byCash
        ? `💵 Rp ${gold} | 💰 Gold ${(player.rpg?.gold || 0).toLocaleString("id-ID")} | ⚔️ Lv.${level}\n`
        : `💰 Gold ${gold} | 💵 Rp ${cash} | ⚔️ Lv.${level}\n`;
    });


    await m.react("🐣");
    return m.reply(novaRpgBox("rankkerja", msg, "success"));
  } catch (err) {
    console.error("rankkerja error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("rankkerja", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
