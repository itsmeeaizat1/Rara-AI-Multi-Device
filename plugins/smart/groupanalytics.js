// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// groupanalytics — Analisis statistik grup (owner)
// 12 Sep 2026 fix: dulu baca db.msgStats yang GAK PERNAH ditulis siapapun (mati total)
// → sekarang live dari nova-activity-tracker (hook handler.js) + jam paling rame.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getWeeklyStats, getLeaderboard, getHourly } from "../../src/lib/nova-activity-tracker.js";

const pluginConfig = {
  name: "groupanalytics",
  alias: ["groupanalytics", "ganalytics"],
  category: "smart",
  description: "Analisis statistik grup (live activity tracker)",
  usage: ".groupanalytics",
  example: ".groupanalytics",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase();
    const gid = m.chat;
    const stats = getWeeklyStats(gid);
    const board = getLeaderboard(gid, 5);
    const hourly = getHourly(gid);

    // jam paling rame (WIB)
    const peakIdx = hourly.indexOf(Math.max(...hourly));
    const peakVal = hourly[peakIdx] || 0;

    const lines = [
      `Total Pesan: *${stats.totalMessages.toLocaleString("id-ID")}*`,
      `Total Command: *${stats.totalCommands.toLocaleString("id-ID")}*`,
      `Total Media: *${stats.totalMedia.toLocaleString("id-ID")}*`,
      `Member Aktif: *${stats.activeMembers}* / ${stats.totalMembersTracked} tercatat`,
      `Engagement: *${stats.activeMembers > 0 ? Math.round(stats.totalMessages / stats.activeMembers) : 0}* pesan/member`,
      `Jam Paling Rame: *${peakVal > 0 ? peakIdx.toString().padStart(2, "0") + ":00 WIB (" + peakVal + " pesan)" : "-"}*`,
    ];

    let msg = claraWrap("Group Analytics", lines.join("\n"));

    if (board.length) {
      msg += "\n\n*top members (minggu ini):*\n";
      board.forEach((u, i) => {
        const name = (u.name || u.jid.split("@")[0]).slice(0, 20);
        msg += `${i + 1}. ${name} — ${u.messageCount} pesan (${u.points}pts)\n`;
      });
    }

    const since = new Date(stats.weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    msg += `\n*Periode:* ${since} - hari ini`;
    return m.reply(msg);
  } catch (e) {
    console.error("groupanalytics error:", e);
    return m.reply(claraWrap("Group Analytics", "Gagal membaca statistik: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
