// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autoweeklyreport — Auto Weekly Group Insights
 *
 * Fitur automation "bot masa depan" #2:
 * - Auto-generate laporan mingguan per grup setiap Senin
 * - Member paling aktif, command paling dipakai, engagement trend
 * - Top media contributor, engagement score
 * - Kirim ke grup yang di-enable atau ke PM owner
 * - Bisa set custom waktu kirim (default: Senin 08:00 WIB)
 * - Daily snapshot untuk engagement trend (Naik/Turun/Stabil)
 *
 * Commands:
 *   .autoweeklyreport                        — Dashboard status
 *   .autoweeklyreport on/off                  — Aktifkan/matikan auto-report
 *   .autoweeklyreport now [groupId]           — Generate report sekarang
 *   .autoweeklyreport addgc <groupId>         — Tambah grup ke auto-report
 *   .autoweeklyreport delgc <groupId>         — Hapus grup dari auto-report
 *   .autoweeklyreport listgc                  — Lihat daftar grup yang di-enable
 *   .autoweeklyreport settime HH:MM           — Set jam kirim (default 08:00)
 *   .autoweeklyreport sendto group/owner      — Kirim ke grup atau PM owner
 *   .autoweeklyreport snapshot now            — Take daily snapshot manual
 *   .autoweeklyreport reset                   — Reset semua data
 */

import fs from "fs";
import path from "path";
import { CronJob } from "cron";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaNoInput, novaGuide, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getWeeklyStats,
  getLeaderboard,
  getCurrentWeekStartWIB,
  initActivityTracker,
} from "../../src/lib/nova-activity-tracker.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autoweeklyreport",
  alias: ["autoweeklyreport", "weeklyreport", "weeklyinsights", "groupinsights"],
  category: "owner",
  description: "Auto Weekly Group Insights — laporan mingguan per grup otomatis",
  usage: ".autoweeklyreport <on/off/now/addgc/delgc/listgc/settime/sendto/reset>",
  example: ".autoweeklyreport now",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// STATE
// ============================================================
const SNAPSHOT_FILE = path.join(process.cwd(), "database", "weekly-snapshots.json");
let cronJob = null;

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.weeklyReport) {
    db.db.data.automation.weeklyReport = {
      enabled: false,
      sendTime: "08:00", // Senin 08:00 WIB
      sendTo: "group", // "group" atau "owner"
      groups: [], // array of groupIds yang di-enable
      lastSent: null,
      lastSnapshot: null,
    };
  }
  return db.db.data.automation.weeklyReport;
}

function saveSettings(db) {
  db.markDirty("settings");
  db.db.write?.();
}

// ============================================================
// DAILY SNAPSHOT — untuk engagement trend
// ============================================================
function loadSnapshots() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return {};
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}

function saveSnapshots(data) {
  try {
    const dir = path.dirname(SNAPSHOT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("[weeklyreport] Save snapshot error:", e);
  }
}

/**
 * Take a daily snapshot of all tracked groups
 * Stores: { groupId: { date, totalMessages, totalPoints, activeMembers } }
 */
function takeDailySnapshot() {
  const trackerDB = initActivityTracker();
  const snapshots = loadSnapshots();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  for (const groupId of Object.keys(trackerDB)) {
    const stats = getWeeklyStats(groupId);

    if (!snapshots[groupId]) snapshots[groupId] = [];
    // Avoid duplicate snapshots for the same day
    snapshots[groupId] = snapshots[groupId].filter((s) => !s.date.startsWith(today));
    snapshots[groupId].push({
      date: new Date().toISOString(),
      totalMessages: stats.totalMessages,
      totalPoints: stats.totalPoints,
      activeMembers: stats.activeMembers,
    });
    // Keep last 14 snapshots (2 weeks)
    if (snapshots[groupId].length > 14) {
      snapshots[groupId] = snapshots[groupId].slice(-14);
    }
  }

  saveSnapshots(snapshots);

  const settings = getSettings();
  settings.lastSnapshot = new Date().toISOString();
  const db = getDatabase();
  saveSettings(db);

  return snapshots;
}

/**
 * Get engagement trend from snapshots
 * Compares last 3 days vs previous 3 days
 */
function getEngagementTrend(groupId) {
  const snapshots = loadSnapshots();
  const groupSnaps = snapshots[groupId] || [];

  if (groupSnaps.length < 4) return { trend: "INSUFFICIENT_DATA", change: 0 };

  // Last 3 days vs previous 3 days
  const recent = groupSnaps.slice(-3);
  const previous = groupSnaps.slice(-6, -3);

  if (previous.length === 0) return { trend: "STABIL", change: 0 };

  const recentAvg = recent.reduce((s, d) => s + (d.totalMessages || 0), 0) / recent.length;
  const previousAvg = previous.reduce((s, d) => s + (d.totalMessages || 0), 0) / previous.length;

  if (previousAvg === 0) return { trend: "STABIL", change: 0 };

  const changePct = Math.round(((recentAvg - previousAvg) / previousAvg) * 100);

  let trend;
  if (changePct > 10) trend = "NAIK";
  else if (changePct < -10) trend = "TURUN";
  else trend = "STABIL";

  return { trend, change: changePct };
}

// ============================================================
// REPORT GENERATION
// ============================================================
async function getGroupName(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    return metadata?.subject || groupId.split("@")[0];
  } catch {
    return groupId.split("@")[0];
  }
}

function formatNumber(n) {
  return (n || 0).toLocaleString("id-ID");
}

function timeAgoShort(ts) {
  if (!ts) return "-";
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}h lalu`;
  if (h > 0) return `${h}j lalu`;
  const m = Math.floor(diff / 60000);
  return `${m}m lalu`;
}

/**
 * Generate full weekly report for a group
 */
async function generateReport(sock, groupId) {
  const stats = getWeeklyStats(groupId);
  const groupName = await getGroupName(sock, groupId);
  const leaderboard = getLeaderboard(groupId, 10);
  const trend = getEngagementTrend(groupId);

  // Kalau tidak ada aktivitas
  if (stats.totalMessages === 0) {
    return novaBox(toSC("Weekly Group Insights"), [
      `${toSC("Grup")}: ${groupName}`,
      toSC("Tidak ada aktivitas minggu ini"),
      ``,
      toSC("Tracking belum dimulai atau grup tidak aktif"),
    ]);
  }

  // Header info
  const lines = [
    `${toSC("Grup")}: ${groupName}`,
    `${toSC("Periode")}: ${new Date(stats.weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`,
    ``,
    { sub: toSC("Ringkasan") },
    `Total Pesan: ${formatNumber(stats.totalMessages)}`,
    `Total Command: ${formatNumber(stats.totalCommands)}`,
    `Total Media: ${formatNumber(stats.totalMedia)}`,
    `Member Aktif: ${stats.activeMembers} / ${stats.totalMembersTracked}`,
    `Engagement: ${stats.activeMembers > 0 ? Math.round(stats.totalMessages / stats.activeMembers) : 0} ${toSC("pesan/member")}`,
    `Trend: ${trend.trend} ${trend.change !== 0 ? `(${trend.change > 0 ? "+" : ""}${trend.change}%)` : ""}`,
    ``,
  ];

  // Top 5 most active members
  if (leaderboard.length > 0) {
    lines.push({ sub: toSC("Top Member Aktif") });
    const top5 = leaderboard.slice(0, 5);
    for (const m of top5) {
      const name = (m.name || m.jid.split("@")[0]).slice(0, 20);
      lines.push(`  #${m.rank} ${name} — ${formatNumber(m.points)}pts (${m.messageCount}msg, ${m.commandCount}cmd)`);
    }
    lines.push(``);
  }

  // Top command user
  const topCommander = [...leaderboard].sort((a, b) => (b.commandCount || 0) - (a.commandCount || 0))[0];
  if (topCommander && topCommander.commandCount > 0) {
    lines.push({ sub: toSC("Special Mentions") });
    const cmdName = (topCommander.name || topCommander.jid.split("@")[0]).slice(0, 20);
    lines.push(`  ${toSC("Command King")}: ${cmdName} (${topCommander.commandCount})`);

    const topMedia = [...leaderboard].sort((a, b) => (b.mediaCount || 0) - (a.mediaCount || 0))[0];
    if (topMedia && topMedia.mediaCount > 0) {
      const mediaName = (topMedia.name || topMedia.jid.split("@")[0]).slice(0, 20);
      lines.push(`  ${toSC("Media Star")}: ${mediaName} (${topMedia.mediaCount})`);
    }

    // Most active time
    const lastActive = [...leaderboard].sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))[0];
    if (lastActive && lastActive.lastActive) {
      lines.push(`  ${toSC("Last Active")}: ${timeAgoShort(lastActive.lastActive)}`);
    }
    lines.push(``);
  }

  // Footer
  lines.push(`${toSC("Auto-generated oleh Nova AI")}`);
  lines.push(`${toSC("Lapor mingguan tiap Senin")}`);

  return novaBox(toSC("Weekly Group Insights"), lines);
}

// ============================================================
// CRON SCHEDULER
// ============================================================
function startCron(sock) {
  if (cronJob) cronJob.stop();

  const settings = getSettings();
  if (!settings.enabled) return;

  const [hour, minute] = (settings.sendTime || "08:00").split(":");
  // Cron: Senin (day 1) tiap minggu
  cronJob = new CronJob(
    `0 ${minute || "00"} ${hour || "8"} * * 1}`,
    async () => {
      console.log("[weeklyreport] Cron triggered — generating weekly reports...");
      await sendAllReports(sock);
    },
    null,
    true,
    "Asia/Jakarta"
  );

  console.log(`[weeklyreport] Cron started — Senin ${settings.sendTime} WIB`);
}

function stopCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}

// Daily snapshot cron (tiap hari 23:59 WIB)
let snapshotCron = null;
function startSnapshotCron() {
  if (snapshotCron) snapshotCron.stop();
  snapshotCron = new CronJob(
    "0 59 23 * * *",
    () => {
      console.log("[weeklyreport] Taking daily snapshot...");
      takeDailySnapshot();
    },
    null,
    true,
    "Asia/Jakarta"
  );
}

/**
 * Send reports to all enabled groups
 */
async function sendAllReports(sock) {
  const settings = getSettings();
  if (!settings.enabled || settings.groups.length === 0) return;

  const ownerNums = (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`);
  let sentCount = 0;
  let failCount = 0;

  for (const groupId of settings.groups) {
    try {
      const report = await generateReport(sock, groupId);

      if (settings.sendTo === "owner" && ownerNums.length > 0) {
        for (const num of ownerNums) {
          try {
            await sock.sendMessage(num, { text: report });
          } catch {}
        }
      } else {
        await sock.sendMessage(groupId, { text: report });
      }
      sentCount++;
    } catch (e) {
      console.error(`[weeklyreport] Failed for ${groupId}:`, e.message);
      failCount++;
    }
  }

  settings.lastSent = new Date().toISOString();
  const db = getDatabase();
  saveSettings(db);

  // Notifikasi owner
  if (ownerNums.length > 0) {
    const summary = novaBox(toSC("Weekly Report Sent"), [
      `Sent: ${sentCount} ${toSC("grup")}`,
      `Failed: ${failCount}`,
      `Send to: ${settings.sendTo === "owner" ? "PM Owner" : toSC("Grup")}`,
    ]);
    for (const num of ownerNums) {
      try {
        await sock.sendMessage(num, { text: summary });
      } catch {}
    }
  }
}

// ============================================================
// EXPORT FOR INDEX.JS
// ============================================================
export function startWeeklyReport(sock) {
  const settings = getSettings();
  if (settings.enabled) {
    startCron(sock);
  }
  startSnapshotCron();
  console.log(`[weeklyreport] Monitor started — enabled: ${settings.enabled}, time: ${settings.sendTime}`);
}

export function stopWeeklyReport() {
  stopCron();
  if (snapshotCron) {
    snapshotCron.stop();
    snapshotCron = null;
  }
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
  const args = m.args || [];
  const subCmd = (args[0] || "").toLowerCase();
  const settings = getSettings();
  const db = getDatabase();

  // .autoweeklyreport (no args) — dashboard
  if (!subCmd || subCmd === "status" || subCmd === "dashboard") {
    const lines = [
      `Status: ${settings.enabled ? toSC("AKTIF") : toSC("MATI")}`,
      `Send Time: Senin ${settings.sendTime} WIB`,
      `Send To: ${settings.sendTo === "owner" ? "PM Owner" : toSC("Grup")}`,
      `Groups: ${settings.groups.length}`,
      `Last Sent: ${settings.lastSent ? new Date(settings.lastSent).toLocaleString("id-ID") : "-"}`,
      `Last Snapshot: ${settings.lastSnapshot ? new Date(settings.lastSnapshot).toLocaleString("id-ID") : "-"}`,
      ``,
    ];

    if (settings.groups.length > 0) {
      lines.push({ sub: toSC("Grup Enabled") });
      for (const gid of settings.groups) {
        const name = await getGroupName(sock, gid).catch(() => gid.split("@")[0]);
        lines.push(`  ${name}`);
      }
    } else {
      lines.push(toSC("Belum ada grup yang di-enable"));
      lines.push(`${toSC("Gunakan")} .autoweeklyreport addgc <groupId>`);
    }

    lines.push(``);
    lines.push(`${toSC("Ketik")} .autoweeklyreport now ${toSC("untuk test")}`);

    await m.reply(novaBox(toSC("Weekly Group Insights"), lines));
    return;
  }

  // .autoweeklyreport on
  if (subCmd === "on") {
    settings.enabled = true;
    saveSettings(db);
    startCron(sock);
    startSnapshotCron();
    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      toSC("Auto-report AKTIF"),
      `Schedule: Senin ${settings.sendTime} WIB`,
      `Send to: ${settings.sendTo === "owner" ? "PM Owner" : toSC("Grup")}`,
      ``,
      toSC("Daily snapshot juga diaktifkan"),
    ]));
    return;
  }

  // .autoweeklyreport off
  if (subCmd === "off") {
    settings.enabled = false;
    saveSettings(db);
    stopCron();
    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      toSC("Auto-report DIMATIKAN"),
      toSC("Daily snapshot tetap berjalan"),
    ]));
    return;
  }

  // .autoweeklyreport now [groupId]
  if (subCmd === "now") {
    await m.react("🕒");

    let groupId = args[1];
    if (!groupId && m.isGroup) groupId = m.chat;
    if (!groupId) {
      return m.reply(novaError("autoweeklyreport", "Butuh groupId atau jalankan di dalam grup", ".autoweeklyreport now 1203xxx@g.us"));
    }

    const report = await generateReport(sock, groupId);
    await m.react("🐣");
    await m.reply(report);
    return;
  }

  // .autoweeklyreport addgc <groupId>
  if (subCmd === "addgc") {
    let groupId = args[1];
    if (!groupId && m.isGroup) groupId = m.chat;
    if (!groupId) {
      return m.reply(novaError("autoweeklyreport", "Butuh groupId atau jalankan di dalam grup", ".autoweeklyreport addgc 1203xxx@g.us"));
    }

    if (settings.groups.includes(groupId)) {
      return m.reply(novaError("autoweeklyreport", "Grup sudah ada di daftar", ".autoweeklyreport listgc"));
    }

    settings.groups.push(groupId);
    saveSettings(db);

    const groupName = await getGroupName(sock, groupId).catch(() => groupId.split("@")[0]);
    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      `${toSC("Grup ditambahkan")}: ${groupName}`,
      `Total grup: ${settings.groups.length}`,
    ]));
    return;
  }

  // .autoweeklyreport delgc <groupId>
  if (subCmd === "delgc") {
    let groupId = args[1];
    if (!groupId && m.isGroup) groupId = m.chat;
    if (!groupId) {
      return m.reply(novaError("autoweeklyreport", "Butuh groupId atau jalankan di dalam grup", ".autoweeklyreport delgc 1203xxx@g.us"));
    }

    if (!settings.groups.includes(groupId)) {
      return m.reply(novaError("autoweeklyreport", "Grup tidak ada di daftar", ".autoweeklyreport listgc"));
    }

    settings.groups = settings.groups.filter((g) => g !== groupId);
    saveSettings(db);

    const groupName = await getGroupName(sock, groupId).catch(() => groupId.split("@")[0]);
    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      `${toSC("Grup dihapus")}: ${groupName}`,
      `Total grup: ${settings.groups.length}`,
    ]));
    return;
  }

  // .autoweeklyreport listgc
  if (subCmd === "listgc" || subCmd === "list") {
    if (settings.groups.length === 0) {
      return m.reply(novaBox(toSC("Weekly Group Insights"), [
        toSC("Belum ada grup yang di-enable"),
        `${toSC("Gunakan")} .autoweeklyreport addgc <groupId>`,
      ]));
    }

    const lines = [`${toSC("Total")}: ${settings.groups.length}`, ``];

    for (let i = 0; i < settings.groups.length; i++) {
      const gid = settings.groups[i];
      const name = await getGroupName(sock, gid).catch(() => gid.split("@")[0]);
      const stats = getWeeklyStats(gid);
      lines.push(`  ${i + 1}. ${name}`);
      lines.push(`     ${formatNumber(stats.totalMessages)} msg, ${stats.activeMembers} member aktif`);
    }

    lines.push(``);
    lines.push(`${toSC("Send to")}: ${settings.sendTo === "owner" ? "PM Owner" : toSC("Grup")}`);

    await m.reply(novaBox(toSC("Grup Enabled"), lines));
    return;
  }

  // .autoweeklyreport settime HH:MM
  if (subCmd === "settime") {
    const time = args[1];
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
      return m.reply(novaError("autoweeklyreport", "Format: HH:MM", ".autoweeklyreport settime 08:00"));
    }

    settings.sendTime = time;
    saveSettings(db);

    if (settings.enabled) {
      stopCron();
      startCron(sock);
    }

    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      `Send Time: Senin ${time} WIB`,
      toSC("Schedule updated"),
    ]));
    return;
  }

  // .autoweeklyreport sendto group/owner
  if (subCmd === "sendto") {
    const target = args[1]?.toLowerCase();
    if (target !== "group" && target !== "owner") {
      return m.reply(novaError("autoweeklyreport", "Pilih: group atau owner", ".autoweeklyreport sendto owner"));
    }

    settings.sendTo = target;
    saveSettings(db);

    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      `Send To: ${target === "owner" ? "PM Owner" : toSC("Grup")}`,
    ]));
    return;
  }

  // .autoweeklyreport snapshot now
  if (subCmd === "snapshot") {
    if (args[1]?.toLowerCase() === "now") {
      await m.react("🕒");
      const snaps = takeDailySnapshot();
      const groupCount = Object.keys(snaps).length;
      await m.react("🐣");
      await m.reply(novaBox(toSC("Daily Snapshot"), [
        `${toSC("Snapshot taken")}: ${new Date().toLocaleString("id-ID")}`,
        `${toSC("Grup terlacak")}: ${groupCount}`,
      ]));
      return;
    }
    return m.reply(novaError("autoweeklyreport", "Format: .autoweeklyreport snapshot now", ".autoweeklyreport snapshot now"));
  }

  // .autoweeklyreport reset
  if (subCmd === "reset") {
    saveSnapshots({});
    settings.lastSent = null;
    settings.lastSnapshot = null;
    saveSettings(db);
    await m.reply(novaBox(toSC("Weekly Group Insights"), [
      toSC("Snapshot data direset"),
      toSC("Group list tetap, hanya data snapshot yang dihapus"),
    ]));
    return;
  }

  // Unknown
  return m.reply(novaError("autoweeklyreport", novaGuide(botConfig.command?.prefix || ".", "autoweeklyreport", m.pushName), ".autoweeklyreport now"));
}

export { pluginConfig, handler };
