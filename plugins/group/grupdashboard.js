// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// grupdashboard — Ringkasan aktivitas grup
// 12 Sep 2026 fix: rewrite total — dulu baca db.data.groupActivity yang GAK
// PERNAH ditulis (mati) + signature legacy (isGroupOnly, conn/usedPrefix, db.save())
// + subcommand "auto" yang gak ada schedulernya (fake feature) → dihapus.
// Sekarang live dari nova-activity-tracker: stats mingguan + top member + jam rame.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getWeeklyStats, getLeaderboard, getHourly } from "../../src/lib/nova-activity-tracker.js";

const pluginConfig = {
  name: "grupdashboard",
  alias: ["grupdashboard", "gdashboard", "gdash"],
  category: "group",
  description: "Ringkasan aktivitas grup minggu ini (live tracker)",
  usage: ".grupdashboard",
  example: ".grupdashboard",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const groupId = m.chat;
    const stats = getWeeklyStats(groupId);
    const board = getLeaderboard(groupId, 5);
    const hourly = getHourly(groupId);

    if (stats.totalMessages === 0) {
      return m.reply(claraWrap("Group Dashboard", [
        "Belum ada aktivitas yang tercatat di grup ini.",
        "Data tercatat otomatis setiap member chat — coba lagi nanti.",
      ].join("\n")));
    }

    const peakIdx = hourly.indexOf(Math.max(...hourly));
    const peakVal = hourly[peakIdx] || 0;

    const topMembers = board.length
      ? board.map((u, i) => `${i + 1}. ${u.name || u.jid.split("@")[0]} — ${u.messageCount} pesan (${u.points}pts)`).join("\n")
      : "Belum ada.";

    const lines = [
      `Total Pesan: ${stats.totalMessages.toLocaleString("id-ID")}`,
      `Total Command: ${stats.totalCommands.toLocaleString("id-ID")}`,
      `Total Media: ${stats.totalMedia.toLocaleString("id-ID")}`,
      `Member Aktif: ${stats.activeMembers}`,
      `Jam Paling Rame: ${peakVal > 0 ? peakIdx.toString().padStart(2, "0") + ":00 WIB (" + peakVal + " pesan)" : "-"}`,
      "",
      "Top Member Aktif:",
      topMembers,
    ].join("\n");

    const since = new Date(stats.weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return m.reply(claraWrap("Group Dashboard", lines + `\n\nPeriode: ${since} - hari ini`));
  } catch (e) {
    console.error("grupdashboard error:", e);
    return m.reply(claraWrap("Group Dashboard", "Gagal membaca statistik: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
