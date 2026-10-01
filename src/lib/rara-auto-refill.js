// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-auto-refill.js — Auto Restock/Refill Notification
// Notif user saat energi/limit harian di-refill, dengan toggle on/off
import { CronJob } from "cron";
import moment from "moment-timezone";
import { mergeAutoTargets } from "./rara-auto-target.js";
import path from "path";
import fs from "fs";
import { getDatabase } from "./rara-database.js";
import config from "../../config.js";
import { logger } from "./rara-logger.js";
import { toSC, bracketBox, tipText } from "./rara-menu-style.js";
import { saluranCtx } from "./rara-context.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "autorefill.json");
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
    hour: 0,
    minute: 0,
    lastRefill: null,
    totalSent: 0,
    // Track siapa yang sudah dikirimi notif hari ini (reset tiap hari)
    lastNotifDate: null,
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoRefill", `Save state failed: ${e.message}`);
  }
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

// === Kirim notif refill ke semua user ===
async function doRefillNotif() {
  try {
    const db = getDatabase();
    const state = loadState();

    // Ambil config limit
    const defaultLimit = config.limit?.default ?? 25;
    const premiumLimit = config.limit?.premium ?? 1000;
    const defaultEnergi = config.rpg?.defaultEnergi ?? 25;

    // Reset energi semua user
    const resetCount = db.resetAllEnergi(defaultLimit, premiumLimit);
    db.incrementStat("dailyResets");
    db.setting("lastLimitReset", new Date().toISOString());

    logger.success("AutoRefill", `Energi reset: ${resetCount} users`);

    if (!sockInstance) {
      logger.error("AutoRefill", "Socket not initialized");
      return;
    }

    // Kirim notif ke semua user (skip owner — unlimited)
    const users = db.users || {};
    const ownerJids = new Set(
      (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`)
    );

    const notifText = bracketBox("🔋", toSC("Energi Di-refill!"), [
      `${toSC("Energi harian kamu sudah di-refill")}`,
      "",
      `⚡ ${toSC("User gratis")}: ${defaultLimit} ${toSC("energi")}`,
      `💎 ${toSC("User premium")}: ${premiumLimit} ${toSC("energi")}`,
      "",
      tipText(toSC("Langsung bisa pakai lagi! Ketik .menu")),
    ]);

    let sent = 0;
    for (const jid of Object.keys(users)) {
      if (ownerJids.has(jid)) continue;

      const userJid = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
      try {
        const ctxInfo = saluranCtx();
        await sockInstance.sendMessage(userJid, { text: notifText, contextInfo: ctxInfo });
        sent++;
        // Delay 500ms antar kirim biar gak rate limit
        if (sent % 10 === 0) await new Promise((r) => setTimeout(r, 500));
      } catch {}
    }

    state.lastRefill = new Date().toISOString();
    state.lastNotifDate = moment.tz(TZ).format("DD-MM-YYYY");
    state.totalSent += sent;
    saveState(state);

    logger.success("AutoRefill", `Notif sent to ${sent} users`);

    // Notif owner ringkasan
    const ownerJid = getOwnerJid();
    if (ownerJid && sockInstance) {
      const ownerNotif = bracketBox("🔋", toSC("Refill Report"), [
        `${toSC("Total user di-refill")}: ${resetCount}`,
        `${toSC("Notif terkirim")}: ${sent}`,
        `${toSC("Gratis")}: ${defaultLimit} | ${toSC("Premium")}: ${premiumLimit}`,
      ]);
      // TARGET TERPUSAT (v24.2.0): owner tetap dapat; target terpusat ikut.
      let rTargets = [ownerJid];
      try { rTargets = await mergeAutoTargets(sockInstance, "autorefill", [ownerJid]); } catch { /* pakai owner */ }
      for (const jid of rTargets) {
        try { await sockInstance.sendMessage(jid, { text: ownerNotif }); } catch {}
      }
    }
  } catch (error) {
    logger.error("AutoRefill", `Refill failed: ${error.message}`);
  }
}

// === Cron management ===
function startRefill(sock) {
  sockInstance = sock;
  const state = loadState();
  if (!state.enabled) {
    logger.info("AutoRefill", "Auto refill notification is disabled");
    return;
  }

  stopRefill();

  const cronExp = `${state.minute} ${state.hour} * * *`;
  activeCronJob = new CronJob(cronExp, doRefillNotif, null, true, TZ);
  logger.info("AutoRefill", `Started at ${state.hour}:${String(state.minute).padStart(2, "0")} WIB (cron: ${cronExp})`);
}

function stopRefill() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoRefill", "Stopped");
  }
}

function enableRefill(hour, minute, sock) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, error: "Invalid time" };
  }

  sockInstance = sock;
  const state = loadState();
  state.enabled = true;
  state.hour = hour;
  state.minute = minute;
  saveState(state);

  stopRefill();
  startRefill(sock);

  return { success: true, hour, minute };
}

function disableRefill() {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  stopRefill();
  return { success: true };
}

function getRefillStatus() {
  const state = loadState();
  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    lastRefill: state.lastRefill,
    totalSent: state.totalSent || 0,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualRefill(sock) {
  sockInstance = sock;
  await doRefillNotif();
}

function initRefill(sock) {
  sockInstance = sock;
  startRefill(sock);
}

export {
  initRefill,
  startRefill,
  stopRefill,
  enableRefill,
  disableRefill,
  getRefillStatus,
  triggerManualRefill,
};
