// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-report.js — Auto Daily Report ke Owner
// Tiap hari di jam tertentu, kirim ringkasan: user baru, command terpopuler, error, uptime
import { CronJob } from "cron";
import moment from "moment-timezone";
import { getDatabase } from "./nova-database.js";
import config from "../../config.js";
import { logger } from "./nova-logger.js";
import * as timeHelper from "./nova-time.js";
import { toSC, bracketBox } from "./nova-menu-style.js";

const REPORT_STATE_FILE = path.join(process.cwd(), "src", "data", "autoreport.json");
const TZ = "Asia/Jakarta";

let sockInstance = null;
let activeCronJob = null;

import path from "path";
import fs from "fs";

function loadReportState() {
  try {
    if (fs.existsSync(REPORT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(REPORT_STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: false,
    hour: 23,
    minute: 0,
    lastReport: null,
    reportCount: 0,
  };
}

function saveReportState(state) {
  try {
    const dir = path.dirname(REPORT_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REPORT_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoReport", `Save state failed: ${e.message}`);
  }
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// === Generate report text ===
function generateDailyReport(db) {
  const now = moment.tz(TZ);
  const today = now.format("DD-MM-YYYY");
  const users = db.users || {};
  const groups = db.groups || {};
  const stats = db.stats || {};

  // Total users
  const totalUsers = Object.keys(users).length;
  const totalGroups = Object.keys(groups).length;

  // New users today
  let newToday = 0;
  for (const jid of Object.keys(users)) {
    const u = users[jid];
    const regDate = u.registeredAt || u.lastRegisteredAt;
    if (regDate) {
      const regMoment = moment.tz(regDate, TZ);
      if (regMoment.isValid() && regDate && regMoment.format("DD-MM-YYYY") === today) {
        newToday++;
      }
    }
  }

  // Command stats — ambil top 5
  const commandStats = [];
  for (const [key, val] of Object.entries(stats)) {
    if (key.startsWith("cmd_") || key.startsWith("command_")) {
      const cmdName = key.replace(/^cmd_/, "").replace(/^command_/, "");
      commandStats.push({ name: cmdName, count: val });
    }
  }
  commandStats.sort((a, b) => b.count - a.count);
  const topCmds = commandStats.slice(0, 5);

  // Error count
  const errorCount = stats.errors || stats.errorCount || 0;

  // Uptime & memory
  const uptime = formatUptime(process.uptime());
  const memUsage = formatBytes(process.memoryUsage().heapUsed);
  const memTotal = formatBytes(process.memoryUsage().heapTotal);

  // Build report
  const lines = [
    `${toSC("Tanggal")}: ${now.format("DD MMMM YYYY HH:mm")} WIB`,
    "",
    `${toSC("Stats Hari Ini")}`,
    `👥 ${toSC("Total User")}: ${totalUsers}`,
    `✨ ${toSC("User Baru")}: ${newToday}`,
    `👥 ${toSC("Total Grup")}: ${totalGroups}`,
    "",
  ];

  if (topCmds.length > 0) {
    lines.push(`${toSC("Command Terpopuler")}`);
    topCmds.forEach((c, i) => {
      lines.push(`${i + 1}. .${c.name} (${c.count}x)`);
    });
    lines.push("");
  } else {
    lines.push(`${toSC("Command Terpopuler")}: ${toSC("Belum ada data")}`);
    lines.push("");
  }

  lines.push(`${toSC("Bot Info")}`);
  lines.push(`⏱️ ${toSC("Uptime")}: ${uptime}`);
  lines.push(`💾 ${toSC("Memory")}: ${memUsage} / ${memTotal}`);
  lines.push(`❌ ${toSC("Errors")}: ${errorCount}`);

  return bracketBox("📊", toSC("Daily Report"), lines);
}

// === Send report to owner ===
async function sendReportToOwner() {
  if (!sockInstance) {
    logger.error("AutoReport", "Socket not initialized");
    return false;
  }

  const ownerJid = getOwnerJid();
  if (!ownerJid) {
    logger.error("AutoReport", "No owner number configured");
    return false;
  }

  try {
    const db = getDatabase();
    const reportText = generateDailyReport(db);

    await sockInstance.sendMessage(ownerJid, { text: reportText });

    const state = loadReportState();
    state.lastReport = new Date().toISOString();
    state.reportCount++;
    saveReportState(state);

    logger.success("AutoReport", `Report sent to owner (#${state.reportCount})`);
    return true;
  } catch (error) {
    logger.error("AutoReport", `Send failed: ${error.message}`);
    return false;
  }
}

// === Cron management ===
function startAutoReport(sock) {
  sockInstance = sock;
  const state = loadReportState();
  if (!state.enabled) {
    logger.info("AutoReport", "Auto report is disabled");
    return;
  }

  stopAutoReport();

  const cronExp = `${state.minute} ${state.hour} * * *`;
  activeCronJob = new CronJob(cronExp, sendReportToOwner, null, true, TZ);
  logger.info("AutoReport", `Started at ${state.hour}:${String(state.minute).padStart(2, "0")} WIB (cron: ${cronExp})`);
}

function stopAutoReport() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoReport", "Stopped");
  }
}

function enableAutoReport(hour, minute, sock) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, error: "Invalid time" };
  }

  sockInstance = sock;
  const state = loadReportState();
  state.enabled = true;
  state.hour = hour;
  state.minute = minute;
  saveReportState(state);

  stopAutoReport();
  startAutoReport(sock);

  return { success: true, hour, minute };
}

function disableAutoReport() {
  const state = loadReportState();
  state.enabled = false;
  saveReportState(state);
  stopAutoReport();
  return { success: true };
}

function getReportStatus() {
  const state = loadReportState();
  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    lastReport: state.lastReport,
    reportCount: state.reportCount || 0,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualReport(sock) {
  sockInstance = sock;
  await sendReportToOwner();
}

function initAutoReport(sock) {
  sockInstance = sock;
  startAutoReport(sock);
}

export {
  initAutoReport,
  startAutoReport,
  stopAutoReport,
  enableAutoReport,
  disableAutoReport,
  getReportStatus,
  triggerManualReport,
};
