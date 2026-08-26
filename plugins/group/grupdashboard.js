// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "grupdashboard",
  alias: ["grupdashboard"],
  aliases: ["grupdashboard", "gdashboard", "gdash"],
  category: "group",
  description: "Ringkasan aktivitas grup harian/mingguan",
  usage: ".grupdashboard [daily|weekly] | .grupdashboard auto <on|off>",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "daily").toLowerCase();

    if (!db.data.groupActivity) db.data.groupActivity = {};
    if (!db.data.groupActivity[groupId]) {
      db.data.groupActivity[groupId] = {
        totalMessages: 0,
        members: {},
        hourly: new Array(24).fill(0),
        topSticker: 0,
        topVN: 0,
        lastReset: Date.now(),
        weekStart: Date.now(),
        autoPost: false,
      };
      await db.save();
    }

    const stats = db.data.groupActivity[groupId];

    if (sub === "auto") {
      const toggle = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(toggle)) {
        return m.reply(`Cara: ${usedPrefix}grupdashboard auto on|off`);
      }
      stats.autoPost = toggle === "on";
      await db.save();
      return m.reply(claraWrap("Group Dashboard", `Auto-post ${toggle === "on" ? "diaktifkan" : "dimatikan"}. Bot akan post summary harian otomatis.`));
    }

    if (sub === "reset") {
      stats.totalMessages = 0;
      stats.members = {};
      stats.hourly = new Array(24).fill(0);
      stats.topSticker = 0;
      stats.topVN = 0;
      stats.lastReset = Date.now();
      await db.save();
      return m.reply(claraWrap("Group Dashboard", "Statistik berhasil direset."));
    }

    const isWeekly = sub === "weekly";
    const period = isWeekly ? "Mingguan" : "Harian";
    const periodMs = isWeekly ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const sinceTs = Date.now() - periodMs;

    const memberEntries = Object.entries(stats.members || {})
      .filter(([_, d]) => (d.lastActive || 0) > sinceTs)
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0));

    const topMembers = memberEntries.slice(0, 5)
      .map(([jid, d], i) => `${i + 1}. @${jid.split("@")[0]} - ${d.count || 0} pesan`)
      .join("\n") || "Belum ada aktivitas.";

    const peakHour = stats.hourly.indexOf(Math.max(...stats.hourly));
    const peakHourStr = peakHour >= 0 && stats.hourly[peakHour] > 0
      ? `${peakHour.toString().padStart(2, "0")}:00 - ${stats.hourly[peakHour]} pesan`
      : "Belum ada data.";

    const lines = [
      `Periode: ${period}`,
      `Total Pesan: ${stats.totalMessages || 0}`,
      `Peak Hour: ${peakHourStr}`,
      `Top Sticker: ${stats.topSticker || 0}`,
      `Top VN: ${stats.topVN || 0}`,
      "",
      `Top Member Aktif:`,
      topMembers,
      "",
      `Command:`,
      `${usedPrefix}grupdashboard daily|weekly|auto|reset`,
    ].join("\n");

    return m.reply(claraWrap("Group Dashboard", lines));
  } catch (e) {
    console.error("grupdashboard error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
