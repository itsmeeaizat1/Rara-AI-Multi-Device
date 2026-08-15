// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { CronJob } from "cron";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autopulse",
  alias: ["pulse", "grouppulse", "healthgrup"],
  category: "future",
  description: "Group Health Monitor - Lacak aktivitas grup & auto-report ke saluran",
  usage: ".autopulse <command>",
  example: ".autopulse status",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ==================== Persistence ====================
function getPulseData(db, groupId) {
  const all = db.setting("autopulse") || {};
  return all[groupId] || null;
}

function savePulseData(db, groupId, data) {
  const all = db.setting("autopulse") || {};
  all[groupId] = data;
  db.setting("autopulse", all);
  db.save();
}

function getAllPulseData(db) {
  return db.setting("autopulse") || {};
}

// ==================== Active Cron Jobs ====================
const activeJobs = new Map();

function stopJob(groupId) {
  if (activeJobs.has(groupId)) {
    activeJobs.get(groupId).stop();
    activeJobs.delete(groupId);
  }
}

function startJob(db, groupId, cronExpr, sock) {
  stopJob(groupId);

  const job = new CronJob(
    cronExpr,
    async () => {
      try {
        await generateAndPostReport(db, groupId, sock);
      } catch (err) {
        console.error("[autopulse] Cron error:", err.message);
      }
    },
    null,
    true,
    "Asia/Jakarta"
  );

  activeJobs.set(groupId, job);
}

// ==================== Data Tracking ====================
// Called from messages.upsert — but since we can't inject into connection.js,
// we track via a lightweight in-memory + periodic save approach.
// The plugin itself reads from group metadata + message history.

function ensureTracker(db, groupId) {
  const all = db.setting("autopulse") || {};
  if (!all[groupId]) {
    all[groupId] = {
      enabled: false,
      cron: "0 8 * * 0",
      lastReport: 0,
      stats: {
        totalMessages: 0,
        perUser: {},
        perHour: {},
        perDay: {},
        perWeekday: {},
        keywords: {},
        lastReset: Date.now(),
      },
      history: [],
    };
    db.setting("autopulse", all);
    db.save();
  }
  return all[groupId];
}

// ==================== Track a message (called manually or via stats API) ====================
function trackMessage(db, groupId, sender, timestamp) {
  const data = ensureTracker(db, groupId);
  if (!data.enabled) return;

  const date = new Date(timestamp);
  const hour = date.getHours().toString();
  const day = date.toISOString().slice(0, 10);
  const weekday = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][date.getDay()];

  data.stats.totalMessages = (data.stats.totalMessages || 0) + 1;

  const senderKey = sender.split("@")[0];
  data.stats.perUser[senderKey] = (data.stats.perUser[senderKey] || 0) + 1;

  data.stats.perHour[hour] = (data.stats.perHour[hour] || 0) + 1;
  data.stats.perDay[day] = (data.stats.perDay[day] || 0) + 1;
  data.stats.perWeekday[weekday] = (data.stats.perWeekday[weekday] || 0) + 1;
}

// ==================== Report Generator ====================
async function generateAndPostReport(db, groupId, sock) {
  const data = getPulseData(db, groupId);
  if (!data || !data.enabled) return;

  const stats = data.stats;
  const now = Date.now();
  const since = data.lastReport || (now - 7 * 24 * 60 * 60 * 1000);
  const periodDays = Math.max(1, Math.ceil((now - since) / (24 * 60 * 60 * 1000)));

  // Top active members
  const topUsers = Object.entries(stats.perUser || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Most silent (registered but low activity) — we only know active ones
  // Busiest hours
  const topHours = Object.entries(stats.perHour || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Busiest weekday
  const topWeekdays = Object.entries(stats.perWeekday || {})
    .sort((a, b) => b[1] - a[1]);

  // Top keywords
  const topKeywords = Object.entries(stats.keywords || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Daily breakdown
  const dailyEntries = Object.entries(stats.perDay || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);

  // Build report
  let report = "GROUP HEALTH REPORT\n";
  report += `Periode: ${periodDays} hari terakhir\n`;
  report += `Total pesan: ${stats.totalMessages || 0}\n`;
  report += `Member aktif: ${Object.keys(stats.perUser || {}).length}\n`;
  report += `Rata-rata: ${Math.round((stats.totalMessages || 0) / periodDays)} pesan/hari\n\n`;

  report += "TOP 10 MEMBER AKTIF:\n";
  if (topUsers.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    topUsers.forEach(([user, count], i) => {
      const medal = i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : `${i + 1}`;
      report += `${medal}. @${user} - ${count} pesan\n`;
    });
  }

  report += "\nJAM TERAKTIF:\n";
  if (topHours.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    topHours.forEach(([hour, count]) => {
      report += `  ${hour}:00 - ${count} pesan\n`;
    });
  }

  report += "\nAKTIVITAS HARIAN:\n";
  if (dailyEntries.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    const maxDaily = Math.max(...dailyEntries.map(([, c]) => c), 1);
    dailyEntries.forEach(([day, count]) => {
      const barLen = Math.max(1, Math.round((count / maxDaily) * 10));
      const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
      report += `  ${day} ${bar} ${count}\n`;
    });
  }

  report += "\nHARI TERAMAI:\n";
  if (topWeekdays.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    topWeekdays.forEach(([day, count]) => {
      report += `  ${day} - ${count} pesan\n`;
    });
  }

  if (topKeywords.length > 0) {
    report += "\nKATA KUNCI POPULER:\n";
    topKeywords.forEach(([kw, count]) => {
      report += `  #${kw} (${count}x)\n`;
    });
  }

  // Health score
  const avgPerDay = (stats.totalMessages || 0) / periodDays;
  let healthScore = "Sangat Sepi";
  if (avgPerDay > 200) healthScore = "Sangat Aktif";
  else if (avgPerDay > 100) healthScore = "Aktif";
  else if (avgPerDay > 50) healthScore = "Cukup Aktif";
  else if (avgPerDay > 10) healthScore = "Sepi";

  report += `\nSKOR KESEHATAN: ${healthScore}\n`;
  report += `Dilaporkan oleh Nova AI`;

  // Save to history
  data.history = data.history || [];
  data.history.push({
    timestamp: now,
    totalMessages: stats.totalMessages,
    activeUsers: Object.keys(stats.perUser || {}).length,
    healthScore,
  });
  if (data.history.length > 12) data.history = data.history.slice(-12);

  // Reset stats for next period
  data.lastReport = now;
  data.stats = {
    totalMessages: 0,
    perUser: {},
    perHour: {},
    perDay: {},
    perWeekday: {},
    keywords: {},
    lastReset: now,
  };

  savePulseData(db, groupId, data);

  // Post to saluran
  const saluranId = config.saluran?.id || "";
  const wrappedReport = claraWrap("AutoPulse Report", report);

  if (saluranId && saluranId.includes("@newsletter")) {
    try {
      await sock.sendMessage(saluranId, {
        text: wrappedReport,
        contextInfo: {
          forwardingScore: 9,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: config.saluran?.name || "Nova AI",
            serverMessageId: 127,
          },
        },
      });
      console.log("[autopulse] Report posted to saluran:", saluranId);
    } catch (err) {
      console.error("[autopulse] Failed to post to saluran:", err.message);
    }
  }

  // Also post to the group itself
  try {
    const mentions = topUsers.map(([u]) => `${u}@s.whatsapp.net`);
    await sock.sendMessage(groupId, {
      text: wrappedReport,
      mentions,
    });
  } catch (err) {
    console.error("[autopulse] Failed to post to group:", err.message);
  }
}

// ==================== Manual Report ====================
function generateManualReport(db, groupId) {
  const data = getPulseData(db, groupId);
  if (!data) return "Belum ada data. Aktifkan dengan .autopulse on";

  const stats = data.stats;
  const now = Date.now();
  const since = data.lastReport || (now - 7 * 24 * 60 * 60 * 1000);
  const periodDays = Math.max(1, Math.ceil((now - since) / (24 * 60 * 60 * 1000)));

  const topUsers = Object.entries(stats.perUser || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topHours = Object.entries(stats.perHour || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const dailyEntries = Object.entries(stats.perDay || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);

  let report = `Periode: ${periodDays} hari\n`;
  report += `Total pesan: ${stats.totalMessages || 0}\n`;
  report += `Member aktif: ${Object.keys(stats.perUser || {}).length}\n`;
  report += `Rata-rata: ${Math.round((stats.totalMessages || 0) / periodDays)} pesan/hari\n\n`;

  report += "TOP 10 MEMBER AKTIF:\n";
  if (topUsers.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    topUsers.forEach(([user, count], i) => {
      report += `${i + 1}. @${user} - ${count} pesan\n`;
    });
  }

  report += "\nJAM TERAKTIF:\n";
  if (topHours.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    topHours.forEach(([hour, count]) => {
      report += `  ${hour}:00 - ${count} pesan\n`;
    });
  }

  report += "\nAKTIVITAS HARIAN:\n";
  if (dailyEntries.length === 0) {
    report += "  (belum ada data)\n";
  } else {
    const maxDaily = Math.max(...dailyEntries.map(([, c]) => c), 1);
    dailyEntries.forEach(([day, count]) => {
      const barLen = Math.max(1, Math.round((count / maxDaily) * 10));
      const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
      report += `  ${day} ${bar} ${count}\n`;
    });
  }

  const avgPerDay = (stats.totalMessages || 0) / periodDays;
  let healthScore = "Sangat Sepi";
  if (avgPerDay > 200) healthScore = "Sangat Aktif";
  else if (avgPerDay > 100) healthScore = "Aktif";
  else if (avgPerDay > 50) healthScore = "Cukup Aktif";
  else if (avgPerDay > 10) healthScore = "Sepi";

  report += `\nSkor Kesehatan: ${healthScore}`;

  return report;
}

// ==================== Handler ====================
async function handler(m, { sock, db }) {
  const prefix = m.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const subCmd = (args[1] || "").toLowerCase();
  const groupId = m.chat;

  // ==================== HELP ====================
  if (!subCmd || subCmd === "help" || subCmd === "?" || subCmd === "bantuan") {
    const helpText = [
      "CARA PAKAI AUTOPULSE:",
      "",
      "Aktifkan monitor:",
      `  ${prefix}autopulse on`,
      "",
      "Matikan monitor:",
      `  ${prefix}autopulse off`,
      "",
      "Lihat laporan manual:",
      `  ${prefix}autopulse report`,
      "",
      "Set jadwal auto-report:",
      `  ${prefix}autopulse setcron <cron>`,
      "  Contoh: .autopulse setcron 0 8 * * 0",
      "  (Setiap Minggu jam 08:00)",
      "",
      "Lihat status:",
      `  ${prefix}autopulse status`,
      "",
      "Reset statistik:",
      `  ${prefix}autopulse reset`,
      "",
      "Lihat history:",
      `  ${prefix}autopulse history`,
      "",
      "Track pesan manual (untuk test):",
      `  ${prefix}autopulse track`,
    ].join("\n");
    await m.reply(claraWrap("AutoPulse", helpText));
    return { handled: true };
  }

  // ==================== ON ====================
  if (subCmd === "on" || subCmd === "aktif" || subCmd === "enable") {
    const data = ensureTracker(db, groupId);
    data.enabled = true;
    savePulseData(db, groupId, data);

    // Start cron job
    const cronExpr = data.cron || "0 8 * * 0";
    if (sock) startJob(db, groupId, cronExpr, sock);

    await m.reply(claraWrap("AutoPulse",
      `Monitor aktif!\n\nJadwal auto-report: ${cronExpr}\n(Setiap Minggu jam 08:00 WIB)\n\nBot akan track aktivitas grup dan kirim laporan otomatis ke saluran.`,
      "success"));
    return { handled: true };
  }

  // ==================== OFF ====================
  if (subCmd === "off" || subCmd === "mati" || subCmd === "disable") {
    const data = getPulseData(db, groupId);
    if (!data) {
      await m.reply(claraWrap("AutoPulse", "Monitor belum aktif.", "warn"));
      return { handled: true };
    }
    data.enabled = false;
    savePulseData(db, groupId, data);
    stopJob(groupId);

    await m.reply(claraWrap("AutoPulse", "Monitor dimatikan. Data tersimpan.", "warn"));
    return { handled: true };
  }

  // ==================== REPORT ====================
  if (subCmd === "report" || subCmd === "laporan") {
    const reportText = generateManualReport(db, groupId);
    const data = getPulseData(db, groupId);

    // Get mentions
    const topUsers = Object.entries(data?.stats?.perUser || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const mentions = topUsers.map(([u]) => `${u}@s.whatsapp.net`);

    await sock.sendMessage(m.chat, {
      text: claraWrap("AutoPulse Report", reportText),
      mentions,
    }, { quoted: m });
    return { handled: true };
  }

  // ==================== SETCRON ====================
  if (subCmd === "setcron" || subCmd === "setjadwal" || subCmd === "jadwal") {
    const cronExpr = args.slice(2).join(" ").trim();
    if (!cronExpr) {
      await m.reply(claraWrap("AutoPulse",
        `Format: ${prefix}autopulse setcron <cron>\nContoh: ${prefix}autopulse setcron 0 8 * * 0\n\nFormat cron: menit jam * * hari\n0=Min 1=Sen 2=Sel 3=Rab 4=Kam 5=Jum 6=Sab`,
        "warn"));
      return { handled: true };
    }

    // Validate cron format (basic)
    const parts = cronExpr.split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      await m.reply(claraWrap("AutoPulse", "Format cron tidak valid! Harus 5-6 field.", "error"));
      return { handled: true };
    }

    const data = ensureTracker(db, groupId);
    data.cron = cronExpr;
    savePulseData(db, groupId, data);

    // Restart job if enabled
    if (data.enabled && sock) {
      startJob(db, groupId, cronExpr, sock);
    }

    await m.reply(claraWrap("AutoPulse",
      `Jadwal auto-report diupdate!\nCron: ${cronExpr}\n${data.enabled ? "Monitor aktif, jadwal berlaku." : "Aktifkan dengan .autopulse on"}`,
      "success"));
    return { handled: true };
  }

  // ==================== STATUS ====================
  if (subCmd === "status" || subCmd === "info") {
    const data = getPulseData(db, groupId);
    if (!data) {
      await m.reply(claraWrap("AutoPulse", "Belum di-setup. Ketik .autopulse on untuk mulai.", "warn"));
      return { handled: true };
    }

    const stats = data.stats;
    const lastReportDate = data.lastReport
      ? new Date(data.lastReport).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      : "Belum ada";

    let statusText = [
      `Status: ${data.enabled ? "AKTIF" : "MATI"}`,
      `Cron: ${data.cron || "0 8 * * 0"}`,
      `Laporan terakhir: ${lastReportDate}`,
      `Total pesan tracked: ${stats.totalMessages || 0}`,
      `Member aktif tracked: ${Object.keys(stats.perUser || {}).length}`,
      `History tersimpan: ${(data.history || []).length} laporan`,
      `Cron job running: ${activeJobs.has(groupId) ? "YA" : "TIDAK"}`,
    ].join("\n");

    await m.reply(claraWrap("AutoPulse Status", statusText));
    return { handled: true };
  }

  // ==================== RESET ====================
  if (subCmd === "reset" || subCmd === "clear") {
    const data = getPulseData(db, groupId);
    if (!data) {
      await m.reply(claraWrap("AutoPulse", "Belum ada data untuk direset.", "warn"));
      return { handled: true };
    }

    data.stats = {
      totalMessages: 0,
      perUser: {},
      perHour: {},
      perDay: {},
      perWeekday: {},
      keywords: {},
      lastReset: Date.now(),
    };
    savePulseData(db, groupId, data);

    await m.reply(claraWrap("AutoPulse", "Statistik direset. Tracking dimulai dari nol.", "success"));
    return { handled: true };
  }

  // ==================== HISTORY ====================
  if (subCmd === "history" || subCmd === "riwayat") {
    const data = getPulseData(db, groupId);
    if (!data || !data.history || data.history.length === 0) {
      await m.reply(claraWrap("AutoPulse", "Belum ada history laporan.", "warn"));
      return { handled: true };
    }

    let histText = `Total: ${data.history.length} laporan\n\n`;
    data.history.forEach((h, i) => {
      const date = new Date(h.timestamp).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      histText += `${i + 1}. ${date}\n   ${h.totalMessages} pesan | ${h.activeUsers} aktif | ${h.healthScore}\n`;
    });

    await m.reply(claraWrap("AutoPulse History", histText.trim()));
    return { handled: true };
  }

  // ==================== TRACK (manual test) ====================
  if (subCmd === "track" || subCmd === "catat") {
    const data = ensureTracker(db, groupId);
    if (!data.enabled) {
      await m.reply(claraWrap("AutoPulse", "Monitor belum aktif. Ketik .autopulse on dulu.", "warn"));
      return { handled: true };
    }

    // Track this message as a test
    trackMessage(db, groupId, m.sender, Date.now());

    await m.reply(claraWrap("AutoPulse",
      `Pesan ini di-track!\nTotal tracked: ${data.stats.totalMessages + 1}`,
      "success"));
    return { handled: true };
  }

  // Unknown command
  await m.reply(claraWrap("AutoPulse",
    `Perintah tidak dikenal.\nKetik ${prefix}autopulse help untuk bantuan.`,
    "warn"));
  return { handled: true };
}

// ==================== Export track function for external use ====================
// Import this in connection.js messages.upsert handler:
// import { trackMessage as pulseTrack } from "./plugins/future/autopulse.js";
// Then in messages.upsert:
// pulseTrack(db, groupId, m.sender, Date.now());
export { pluginConfig as config, handler, trackMessage, ensureTracker };

// ================================================================
// CARA INTEGRASI KE connection.js:
//
// 1. Di bagian import atas connection.js, tambahkan:
//    import { trackMessage as pulseTrack, ensureTracker as pulseEnsure } from "../plugins/future/autopulse.js";
//
// 2. Di dalam handler messages.upsert (setelah validasi pesan), tambahkan:
//    try {
//      const db = getDatabase();
//      const gid = msg.key?.remoteJid;
//      if (gid && gid.endsWith("@g.us")) {
//        pulseTrack(db, gid, msg.key?.participant || msg.key?.remoteJid, Date.now());
//      }
//    } catch {}
//
// 3. Set .autopulse on di grup untuk mulai tracking
// 4. Set cron schedule: .autopulse setcron 0 8 * * 0 (Minggu 08:00)
// 5. Laporan otomatis post ke saluran + grup
// ================================================================
