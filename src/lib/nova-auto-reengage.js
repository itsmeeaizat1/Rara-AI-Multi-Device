// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-reengage.js — Auto Follow-up / Re-engagement
// Cek user yang sudah lama tidak aktif, kirim pesan personal buat nge-boost engagement
import { CronJob } from "cron";
import moment from "moment-timezone";
import path from "path";
import fs from "fs";
import { getDatabase } from "./nova-database.js";
import config from "../../config.js";
import { logger } from "./nova-logger.js";
import { toSC, bracketBox, tipText } from "./nova-menu-style.js";
import { saluranCtx } from "./nova-context.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "autoreengage.json");
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
    hour: 10,
    minute: 0,
    inactiveThresholdDays: 7,
    lastCheck: null,
    totalSent: 0,
    contactedUsers: [], // JID yang sudah dikirimi pesan re-engage (hindari spam berulang)
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("ReEngage", `Save state failed: ${e.message}`);
  }
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

// === Cari user yang sudah lama tidak aktif ===
function findInactiveUsers(db, thresholdDays) {
  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const users = db.users || {};
  const inactive = [];

  for (const jid of Object.keys(users)) {
    const user = users[jid];
    // Skip owner
    const ownerJids = (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`);
    const userJid = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
    if (ownerJids.includes(userJid)) continue;

    // Skip yang belum daftar
    if (!user.isRegistered) continue;

    // Cek lastSeen
    const lastSeen = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
    if (lastSeen === 0) continue; // Tidak ada data

    const inactiveMs = now - lastSeen;
    if (inactiveMs >= thresholdMs) {
      inactive.push({
        jid: userJid,
        name: user.regName || "Friend",
        daysInactive: Math.floor(inactiveMs / (24 * 60 * 60 * 1000)),
        lastSeen: user.lastSeen,
      });
    }
  }

  return inactive;
}

// === Kirim pesan re-engagement ===
async function sendReengageMessage(sock, user) {
  const name = user.name || "Friend";
  const days = user.daysInactive;

  // Random pesan supaya gak monoton
  const messages = [
    {
      header: toSC("Kangen nih"),
      body: `${toSC("Sudah")} ${days} ${toSC("hari kamu gak chat aku")}. ${toSC("Ada banyak fitur baru lho!")}`,
    },
    {
      header: toSC("Lama gak ketemu"),
      body: `${toSC("Hey")} ${name}! ${toSC("Kamu udah")} ${days} ${toSC("hari gak main ke bot. Miss kamu!")}`,
    },
    {
      header: toSC("Ada yang baru nih"),
      body: `${toSC("Sudah")} ${days} ${toSC("hari berlalu. Aku update banyak fitur baru, mau coba?")}`,
    },
  ];

  const pick = messages[Math.floor(Math.random() * messages.length)];

  const lines = [
    `${pick.header}, ${name}!`,
    "",
    pick.body,
    "",
    `${toSC("Fitur baru tersedia")}:`,
    `📥 ${toSC("Download")} — .alldl <url>`,
    `🧠 ${toSC("Tanya AI")} — .tanyaai`,
    `🎂 ${toSC("Set Ultah")} — .setultah DD-MM`,
    "",
    tipText(toSC("Ketik .menu buat lihat semua fitur!")),
  ];

  const text = bracketBox("👋", toSC("Re-engagement"), lines);

  try {
    const ctxInfo = saluranCtx();
    await sock.sendMessage(user.jid, { text, contextInfo: ctxInfo });
    return true;
  } catch (e) {
    logger.error("ReEngage", `Send to ${user.jid} failed: ${e.message}`);
    return false;
  }
}

// === Main check ===
async function doReengageCheck() {
  try {
    const db = getDatabase();
    const state = loadState();
    const inactive = findInactiveUsers(db, state.inactiveThresholdDays);

    // Filter yang sudah pernah dikirimi (hindari spam berulang)
    const contacted = new Set(state.contactedUsers || []);
    const toContact = inactive.filter((u) => !contacted.has(u.jid));

    if (toContact.length === 0) {
      logger.info("ReEngage", `No users to re-engage (${inactive.length} inactive, all contacted)`);
      return;
    }

    logger.info("ReEngage", `${toContact.length} users to re-engage`);

    let sent = 0;
    // ── target terpusat (.switch auto autoreengage set): pesan re-engage
    // dikirim ke target pilihan owner (grup/DM) — override daftar user dormant ──
    let targetList = null;
    try {
      const { resolveAutoTargetsOr } = await import("./nova-auto-target.js");
      targetList = await resolveAutoTargetsOr(sockInstance, "autoreengage", null);
    } catch { /* target lib gagal → default per-user */ }
    if (targetList) {
      for (const jid of targetList) {
        const user = toContact.find((u) => u.jid === jid) || { jid, name: "Sahabat", daysInactive: "?" };
        const ok = await sendReengageMessage(sockInstance, user);
        if (ok) sent++;
        await new Promise((r) => setTimeout(r, 3000));
      }
    } else {
    for (const user of toContact) {
      const ok = await sendReengageMessage(sockInstance, user);
      if (ok) {
        sent++;
        contacted.add(user.jid);
      }
      // Delay 3 detik antar kirim biar gak rate limit
      await new Promise((r) => setTimeout(r, 3000));
    }
    }

    state.lastCheck = new Date().toISOString();
    state.totalSent += sent;
    state.contactedUsers = Array.from(contacted).slice(-200); // Keep last 200
    saveState(state);

    logger.success("ReEngage", `Sent ${sent}/${toContact.length} re-engagement messages`);

    // Notif owner
    const ownerJid = getOwnerJid();
    if (ownerJid && sockInstance && sent > 0) {
      const notif = bracketBox("👋", toSC("Re-engagement Report"), [
        `${toSC("Terkirim")}: ${sent} ${toSC("pesan")}`,
        `${toSC("Total user inactive")}: ${inactive.length}`,
        `${toSC("Threshold")}: ${state.inactiveThresholdDays} ${toSC("hari")}`,
      ]);
      try {
        await sockInstance.sendMessage(ownerJid, { text: notif });
      } catch {}
    }
  } catch (error) {
    logger.error("ReEngage", `Check failed: ${error.message}`);
  }
}

// === Cron management ===
function startReengage(sock) {
  sockInstance = sock;
  const state = loadState();
  if (!state.enabled) {
    logger.info("ReEngage", "Re-engagement is disabled");
    return;
  }

  stopReengage();

  const cronExp = `${state.minute} ${state.hour} * * *`;
  activeCronJob = new CronJob(cronExp, doReengageCheck, null, true, TZ);
  logger.info("ReEngage", `Started at ${state.hour}:${String(state.minute).padStart(2, "0")} WIB (cron: ${cronExp})`);
}

function stopReengage() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("ReEngage", "Stopped");
  }
}

function enableReengage(hour, minute, thresholdDays, sock) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, error: "Invalid time" };
  }
  if (thresholdDays < 1) {
    return { success: false, error: "Threshold minimal 1 hari" };
  }

  sockInstance = sock;
  const state = loadState();
  state.enabled = true;
  state.hour = hour;
  state.minute = minute;
  state.inactiveThresholdDays = thresholdDays;
  saveState(state);

  stopReengage();
  startReengage(sock);

  return { success: true, hour, minute, thresholdDays };
}

function disableReengage() {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  stopReengage();
  return { success: true };
}

function getReengageStatus() {
  const state = loadState();
  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    inactiveThresholdDays: state.inactiveThresholdDays,
    lastCheck: state.lastCheck,
    totalSent: state.totalSent || 0,
    contactedCount: (state.contactedUsers || []).length,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualReengage(sock) {
  sockInstance = sock;
  await doReengageCheck();
}

// === Reset contacted list (biar bisa kirim ulang ke user yang sama) ===
function resetContacted() {
  const state = loadState();
  state.contactedUsers = [];
  saveState(state);
  return { success: true };
}

function initReengage(sock) {
  sockInstance = sock;
  startReengage(sock);
}

export {
  initReengage,
  startReengage,
  stopReengage,
  enableReengage,
  disableReengage,
  getReengageStatus,
  triggerManualReengage,
  resetContacted,
  findInactiveUsers,
};
