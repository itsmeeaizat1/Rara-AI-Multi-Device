// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-auto-renewal.js — Auto Renewal Reminder
// Kirim reminder ke premium user H-3 sebelum masa premium habis
import { CronJob } from "cron";
import moment from "moment-timezone";
import path from "path";
import fs from "fs";
import config from "../../config.js";
import { logger } from "./rara-logger.js";
import { toSC, bracketBox, tipText } from "./rara-menu-style.js";
import { saluranCtx } from "./rara-context.js";
import * as premiumDb from "./rara-premium-db.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "autorenewal.json");
const TZ = "Asia/Jakarta";

let sockInstance = null;
let activeCronJob = null;

// === State Management ===
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: false,
    hour: 9,
    minute: 0,
    reminderDays: 3, // H-3 sebelum expired
    lastCheck: null,
    totalSent: 0,
    // Track siapa yang sudah dikirimi reminder (reset tiap hari)
    // Format: { "2026-08-28": ["62812xxx", "62813xxx"] }
    sentToday: {},
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoRenewal", `Save state failed: ${e.message}`);
  }
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

// === Cari premium user yang akan expired dalam N hari ===
function findExpiringUsers(reminderDays) {
  const premiumList = premiumDb.getPremiumList();
  const now = moment.tz(TZ);
  const results = [];

  for (const p of premiumList) {
    if (!p.expiredAt) continue;

    const expiry = moment.tz(p.expiredAt, TZ);
    const daysUntilExpiry = expiry.diff(now, "days", true);

    // User yang akan expired dalam exact N hari (H-3, H-2, H-1)
    // Atau sudah expired hari ini (H-0)
    const daysRounded = Math.ceil(daysUntilExpiry);

    if (daysRounded <= reminderDays && daysRounded >= 0) {
      const num = (p.number || p.jid || "").replace(/[^0-9]/g, "");
      if (!num) continue;

      results.push({
        jid: `${num}@s.whatsapp.net`,
        name: p.name || "Friend",
        number: num,
        expiredAt: p.expiredAt,
        daysLeft: daysRounded,
        expiryDate: expiry.format("DD MMMM YYYY"),
      });
    }
  }

  return results;
}

// === Kirim reminder ke premium user ===
async function sendRenewalReminder(sock, user) {
  const name = user.name || "Friend";
  const daysLeft = user.daysLeft;

  let headerText;
  let bodyText;

  if (daysLeft === 0) {
    // Expired hari ini
    headerText = toSC("Premium Expired Hari Ini!");
    bodyText = `${toSC("Masa premium kamu habis hari ini")}. ${toSC("Perpanjang sekarang biar gak kehilangan benefit!")}`;
  } else if (daysLeft === 1) {
    headerText = toSC("Premium Berakhir Besok!");
    bodyText = `${toSC("Masa premium kamu tinggal 1 hari lagi")}. ${toSC("Segera perpanjang ya!")}`;
  } else {
    headerText = toSC("Premium Akan Segera Berakhir");
    bodyText = `${toSC("Masa premium kamu tinggal")} ${daysLeft} ${toSC("hari lagi")}`;
  }

  const lines = [
    `${headerText}, ${name}!`,
    "",
    bodyText,
    "",
    `${toSC("Detail Premium")}:`,
    `📅 ${toSC("Berakhir")}: ${user.expiryDate}`,
    `🕒 ${toSC("Sisa")}: ${daysLeft} ${toSC("hari")}`,
    "",
    `${toSC("Keuntungan Premium")}:`,
    `⚡ ${toSC("Limit energi tidak terbatas")}`,
    `🚀 ${toSC("Akses semua fitur premium")}`,
    `🆓 ${toSC("Bebas iklan & delay")}`,
    "",
    tipText(toSC("Ketik .premium untuk lihat paket perpanjangan")),
  ];

  const text = bracketBox("💎", toSC("Renewal Reminder"), lines);

  try {
    const ctxInfo = saluranCtx();
    // ── target terpusat (.switch auto autorenewal set): reminder dikirim ke
    // target pilihan owner — default tetap ke user yang premium-nya habis ──
    let targetJids = [user.jid];
    try {
      const { resolveAutoTargetsOr } = await import("./rara-auto-target.js");
      targetJids = await resolveAutoTargetsOr(sock, "autorenewal", targetJids);
    } catch { /* target lib gagal → user */ }
    for (const t of targetJids) {
      try { await sock.sendMessage(t, { text, contextInfo: ctxInfo }); }
      catch (e) { logger.error("AutoRenewal", `Send to ${t} failed: ${e.message}`); }
    }
    return true;
  } catch (e) {
    logger.error("AutoRenewal", `Send to ${user.jid} failed: ${e.message}`);
    return false;
  }
}

// === Main check ===
async function doRenewalCheck() {
  try {
    const state = loadState();
    const today = moment.tz(TZ).format("DD-MM-YYYY");

    // Reset sentToday kalau ganti hari
    if (state.lastCheck && moment.tz(state.lastCheck, TZ).format("DD-MM-YYYY") !== today) {
      state.sentToday = {};
    }

    const sentTodaySet = new Set(state.sentToday[today] || []);

    const expiring = findExpiringUsers(state.reminderDays);
    const toNotify = expiring.filter((u) => !sentTodaySet.has(u.number));

    if (toNotify.length === 0) {
      logger.info("AutoRenewal", `No users to notify (${expiring.length} expiring, all contacted)`);
      return;
    }

    logger.info("AutoRenewal", `${toNotify.length} premium users to notify`);

    let sent = 0;
    for (const user of toNotify) {
      const ok = await sendRenewalReminder(sockInstance, user);
      if (ok) {
        sent++;
        sentTodaySet.add(user.number);
      }
      // Delay 3 detik antar kirim
      await new Promise((r) => setTimeout(r, 3000));
    }

    state.lastCheck = new Date().toISOString();
    state.totalSent += sent;
    state.sentToday[today] = Array.from(sentTodaySet);
    saveState(state);

    logger.success("AutoRenewal", `Sent ${sent}/${toNotify.length} renewal reminders`);

    // Notif owner ringkasan
    const ownerJid = getOwnerJid();
    if (ownerJid && sockInstance && sent > 0) {
      const ownerLines = [
        `${toSC("Terkirim")}: ${sent} ${toSC("reminder")}`,
        `${toSC("Total akan expired")}: ${expiring.length}`,
        `${toSC("Reminder H-")}: ${state.reminderDays}`,
        "",
        `${toSC("User yang dikirimi")}:`,
      ];

      toNotify.slice(0, 5).forEach((u, i) => {
        ownerLines.push(`${i + 1}. ${u.name} — H-${u.daysLeft} (${u.expiryDate})`);
      });

      if (toNotify.length > 5) {
        ownerLines.push(`... ${toSC("dan")} ${toNotify.length - 5} ${toSC("lainnya")}`);
      }

      const ownerNotif = bracketBox("💎", toSC("Renewal Report"), ownerLines);
      try {
        await sockInstance.sendMessage(ownerJid, { text: ownerNotif });
      } catch {}
    }
  } catch (error) {
    logger.error("AutoRenewal", `Check failed: ${error.message}`);
  }
}

// === Cron management ===
function startRenewalReminder(sock) {
  sockInstance = sock;
  const state = loadState();
  if (!state.enabled) {
    logger.info("AutoRenewal", "Auto renewal reminder is disabled");
    return;
  }

  stopRenewalReminder();

  const cronExp = `${state.minute} ${state.hour} * * *`;
  activeCronJob = new CronJob(cronExp, doRenewalCheck, null, true, TZ);
  logger.info("AutoRenewal", `Started at ${state.hour}:${String(state.minute).padStart(2, "0")} WIB (H-${state.reminderDays}, cron: ${cronExp})`);
}

function stopRenewalReminder() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoRenewal", "Stopped");
  }
}

function enableRenewalReminder(hour, minute, reminderDays, sock) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, error: "Invalid time" };
  }
  if (reminderDays < 1 || reminderDays > 30) {
    return { success: false, error: "Reminder days harus 1-30" };
  }

  sockInstance = sock;
  const state = loadState();
  state.enabled = true;
  state.hour = hour;
  state.minute = minute;
  state.reminderDays = reminderDays;
  saveState(state);

  stopRenewalReminder();
  startRenewalReminder(sock);

  return { success: true, hour, minute, reminderDays };
}

function disableRenewalReminder() {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  stopRenewalReminder();
  return { success: true };
}

function getRenewalStatus() {
  const state = loadState();
  const expiring = findExpiringUsers(state.reminderDays);
  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    reminderDays: state.reminderDays,
    lastCheck: state.lastCheck,
    totalSent: state.totalSent || 0,
    expiringCount: expiring.length,
    expiring: expiring.slice(0, 10),
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualRenewal(sock) {
  sockInstance = sock;
  await doRenewalCheck();
}

function initRenewalReminder(sock) {
  sockInstance = sock;
  startRenewalReminder(sock);
}

export {
  initRenewalReminder,
  startRenewalReminder,
  stopRenewalReminder,
  enableRenewalReminder,
  disableRenewalReminder,
  getRenewalStatus,
  triggerManualRenewal,
  findExpiringUsers,
};
