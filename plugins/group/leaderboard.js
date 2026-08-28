// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toSC, bracketBox, tipText, formatNumber } from "../../src/lib/nova-menu-style.js";
import {
  trackActivity,
  getLeaderboard,
  getWeeklyStats,
  getRank,
  resetWeekly,
  getActivityStatus,
  setActivityTracking,
} from "../../src/lib/nova-activity-tracker.js";

const pluginConfig = {
  name: "aktifitas",
  alias: ["aktifitas", "aktif", "topaktif", "activity"],
  category: "group",
  description: "Papan peringkat keaktifan member grup minggu ini",
  usage: ".aktifitas [on/off|me|reset|stats]",
  example: ".aktifitas",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

/**
 * Main handler for leaderboard command
 * @param {Object} m - Serialized message object
 * @param {Object} context - Handler context
 * @param {Object} context.sock - Baileys socket connection
 * @param {Array<string>} context.args - Command arguments
 */
async function handler(m, { sock, args = [] }) {
  // Reaction loading state
  if (typeof m.react === "function") {
    try {
      await m.react("🕒");
    } catch {}
  }

  // Ensure message activity is recorded
  trackActivity(m, { isCommand: true });

  const subCommand = args[0]?.toLowerCase();

  // Helper for admin check
  const checkAdmin = async () => {
    const groupMeta = m.groupMetadata || (sock?.groupMetadata ? await sock.groupMetadata(m.chat).catch(() => null) : null);
    const adminJids = groupMeta?.participants?.filter((p) => p.admin === "admin" || p.admin === "superadmin").map((p) => p.id || p.jid) || [];
    return Boolean(m.isAdmin || m.isOwner || adminJids.includes(m.sender));
  };

  try {
    // 1. .aktifitas on / off — Toggle tracking (admin only)
    if (subCommand === "on" || subCommand === "off" || subCommand === "enable" || subCommand === "disable") {
      const isAdmin = await checkAdmin();
      if (!isAdmin) {
        if (typeof m.react === "function") {
          try { await m.react("❌"); } catch {}
        }
        await m.reply(bracketBox("❌", "Akses Ditolak", ["Fitur ini hanya dapat diubah oleh Admin Grup."]));
        return;
      }

      const enable = subCommand === "on" || subCommand === "enable";
      setActivityTracking(m.chat, enable);

      if (typeof m.react === "function") {
        try { await m.react("🐣"); } catch {}
      }

      const statusStr = enable ? "Aktif" : "Nonaktif";
      const descStr = enable
        ? "Pelacakan keaktifan member grup telah diaktifkan."
        : "Pelacakan keaktifan member grup telah dimatikan.";

      await m.reply(
        bracketBox("⚙️", "Status Activity Tracker", [
          `Status : *${statusStr}*`,
          descStr,
        ]) + "\n" + tipText("Ketik .aktifitas untuk melihat papan peringkat.")
      );
      return;
    }

    // 2. .aktifitas me — Show sender rank and stats
    if (subCommand === "me" || subCommand === "saya" || subCommand === "my") {
      const userRank = getRank(m.chat, m.sender);

      if (!userRank || !userRank.memberStats) {
        if (typeof m.react === "function") {
          try { await m.react("🐣"); } catch {}
        }
        await m.reply(
          bracketBox("📊", "Statistik Keaktifan Anda", [
            "Anda belum memiliki data aktivitas minggu ini.",
            "Kirim pesan di grup ini untuk mulai mengumpulkan poin!",
          ]) + "\n" + tipText("Poin: 1/pesan, 2/command, 5/media")
        );
        return;
      }

      const { rank, totalMembers, memberStats, topPercentage } = userRank;
      const senderNum = m.sender.split("@")[0];
      const displayName = memberStats.name || `@${senderNum}`;

      const lines = [
        `Member : ${displayName}`,
        `Peringkat : #${rank} dari ${totalMembers} member (Top ${topPercentage}%)`,
        `Total Poin : ${formatNumber(memberStats.points || 0)} pts`,
        `Total Pesan : ${formatNumber(memberStats.messageCount || 0)} pesan`,
        `Command : ${formatNumber(memberStats.commandCount || 0)}x`,
        `Media : ${formatNumber(memberStats.mediaCount || 0)}x`,
        `Terakhir Aktif : ${memberStats.lastActive ? new Date(memberStats.lastActive).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB" : "-"}`,
      ];

      if (typeof m.react === "function") {
        try { await m.react("🐣"); } catch {}
      }

      await m.reply(
        bracketBox("📊", "Statistik Keaktifan Anda", lines) +
        "\n" + tipText("Kirim lebih banyak pesan & media untuk menaikkan peringkat!")
      );
      return;
    }

    // 3. .aktifitas reset — Reset group leaderboard (admin only)
    if (subCommand === "reset" || subCommand === "clear") {
      const isAdmin = await checkAdmin();
      if (!isAdmin) {
        if (typeof m.react === "function") {
          try { await m.react("❌"); } catch {}
        }
        await m.reply(bracketBox("❌", "Akses Ditolak", ["Hanya Admin Grup yang dapat mereset leaderboard."]));
        return;
      }

      resetWeekly(m.chat);

      if (typeof m.react === "function") {
        try { await m.react("🐣"); } catch {}
      }

      await m.reply(
        bracketBox("🔄", "Reset Leaderboard", [
          "Leaderboard keaktifan grup berhasil direset.",
          "Semua poin member telah dikembalikan ke awal.",
        ]) + "\n" + tipText("Periode mingguan baru dimulai sekarang.")
      );
      return;
    }

    // 4. .aktifitas stats — Show group activity stats
    if (subCommand === "stats" || subCommand === "stat" || subCommand === "info") {
      const stats = getWeeklyStats(m.chat);
      const topName = stats.topMember ? stats.topMember.name || stats.topMember.jid.split("@")[0] : "-";
      const topPts = stats.topMember ? formatNumber(stats.topMember.points || 0) : "0";

      const weekStartStr = stats.weekStart
        ? new Date(stats.weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
        : "-";

      const lines = [
        `Status Tracker : ${stats.trackingEnabled ? "Aktif" : "Nonaktif"}`,
        `Awal Periode : ${weekStartStr}`,
        `Total Pesan : ${formatNumber(stats.totalMessages)}`,
        `Total Poin : ${formatNumber(stats.totalPoints)}`,
        `Total Command : ${formatNumber(stats.totalCommands)}`,
        `Total Media : ${formatNumber(stats.totalMedia)}`,
        `Member Aktif : ${formatNumber(stats.activeMembers)} / ${stats.totalMembersTracked}`,
        `Top Member : ${topName} (${topPts} pts)`,
      ];

      if (typeof m.react === "function") {
        try { await m.react("🐣"); } catch {}
      }

      await m.reply(
        bracketBox("📈", "Statistik Keaktifan Grup", lines) +
        "\n" + tipText("Gunakan .aktifitas untuk melihat top 10 member.")
      );
      return;
    }

    // 5. Default: .aktifitas — Top 10 most active members
    const status = getActivityStatus(m.chat);
    if (!status.trackingEnabled) {
      if (typeof m.react === "function") {
        try { await m.react("❌"); } catch {}
      }
      await m.reply(
        bracketBox("⚠️", "Leaderboard Nonaktif", [
          "Pelacakan keaktifan di grup ini sedang dinonaktifkan.",
          "Admin dapat mengaktifkannya kembali dengan .aktifitas on",
        ])
      );
      return;
    }

    const leaderboard = getLeaderboard(m.chat, 10);
    if (!leaderboard || leaderboard.length === 0) {
      if (typeof m.react === "function") {
        try { await m.react("🐣"); } catch {}
      }
      await m.reply(
        bracketBox("🏆", "Leaderboard Keaktifan Minggu Ini", [
          "Belum ada data keaktifan member minggu ini.",
          "Mulai kirim pesan di grup untuk mencatatkan poin!",
        ]) + "\n" + tipText("Poin: 1/pesan, 2/command, 5/media")
      );
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((item, index) => {
      const icon = medals[index] || `#${index + 1}`;
      const name = item.name || item.jid.split("@")[0];
      return `${icon} ${name} — *${formatNumber(item.points)} pts* (${formatNumber(item.messageCount)} pesan)`;
    });

    if (typeof m.react === "function") {
      try { await m.react("🐣"); } catch {}
    }

    await m.reply(
      bracketBox("🏆", "Leaderboard Keaktifan Minggu Ini", lines) +
      "\n" + tipText("Poin: 1/pesan, 2/command, 5/media | .aktifitas me untuk rank Anda")
    );

  } catch (error) {
    if (typeof m.react === "function") {
      try { await m.react("❌"); } catch {}
    }
    await m.reply(bracketBox("❌", "Error Leaderboard", [`Terjadi kesalahan: ${error.message}`]));
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
