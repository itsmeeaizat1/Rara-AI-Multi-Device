// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-birthday.js — Auto Birthday Reminder
// Cek tiap hari di jam tertentu, kirim ucapan ultah ke user yang ultah
import { CronJob } from "cron";
import moment from "moment-timezone";
import path from "path";
import fs from "fs";
import { getDatabase } from "./nova-database.js";
import config from "../../config.js";
import { logger } from "./nova-logger.js";
import { toSC, bracketBox } from "./nova-menu-style.js";
import { saluranCtx } from "./nova-context.js";

const BIRTHDAY_STATE_FILE = path.join(process.cwd(), "database", "autobirthday.json");
const TZ = "Asia/Jakarta";

let sockInstance = null;
let activeCronJob = null;

// === State Management ===
function loadBirthdayState() {
  try {
    if (fs.existsSync(BIRTHDAY_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BIRTHDAY_STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: false,
    hour: 8,
    minute: 0,
    lastCheck: null,
    birthdaysSent: 0,
  };
}

function saveBirthdayState(state) {
  try {
    const dir = path.dirname(BIRTHDAY_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BIRTHDAY_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoBirthday", `Save state failed: ${e.message}`);
  }
}

// === Birthday Data ===
function setBirthday(jid, dateString) {
  try {
    const db = getDatabase();
    // dateString: "DD-MM" or "DD-MM-YYYY"
    const parts = dateString.split("-");
    if (parts.length < 2) return { success: false, error: "Invalid format" };

    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2] || null;

    const birthday = `${day}-${month}`;
    const userData = {
      regBirthday: birthday,
      regBirthYear: year ? parseInt(year) : null,
    };

    db.setUser(jid, userData);

    return {
      success: true,
      birthday: birthday,
      year: year,
      birthdayDisplay: year ? `${day}-${month}-${year}` : birthday,
    };
  } catch (e) {
    logger.error("AutoBirthday", `Set birthday failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

function getBirthday(jid) {
  try {
    const db = getDatabase();
    const user = db.getUser(jid);
    if (!user || !user.regBirthday) return null;

    return {
      birthday: user.regBirthday,
      year: user.regBirthYear || null,
      birthdayDisplay: user.regBirthYear
        ? `${user.regBirthday}-${user.regBirthYear}`
        : user.regBirthday,
    };
  } catch {
    return null;
  }
}

// === Check today's birthdays ===
function checkTodayBirthdays(db) {
  const today = moment.tz(TZ).format("DD-MM");
  const users = db.users || {};
  const results = [];

  for (const jid of Object.keys(users)) {
    const user = users[jid];
    if (user.regBirthday && user.regBirthday === today) {
      results.push({
        jid: jid.includes("@") ? jid : `${jid}@s.whatsapp.net`,
        name: user.regName || user.name || jid,
        birthday: user.regBirthday,
        year: user.regBirthYear || null,
      });
    }
  }

  return results;
}

// === Send birthday wishes ===
async function sendBirthdayWish(sock, user) {
  const jid = user.jid.includes("@") ? user.jid : `${user.jid}@s.whatsapp.net`;
  const name = user.name || "Friend";

  let ageText = "";
  if (user.year) {
    const age = new Date().getFullYear() - user.year;
    if (age > 0 && age < 150) ageText = ` (${age} ${toSC("tahun")})`;
  }

  const wish = bracketBox("🎂", toSC("Selamat Ulang Tahun"), [
    `🎉 ${toSC("Happy Birthday")}, ${name}${ageText}!`,
    `🌟 ${toSC("Semoga panjang umur & sehat selalu")}`,
    `🎁 ${toSC("Semoga semua impian tercapai")}`,
    `💌 ${toSC("Dari")}: Nova AI Bot`,
  ]);

  try {
    const ctxInfo = saluranCtx();
    await sock.sendMessage(jid, { text: wish, contextInfo: ctxInfo });
    return true;
  } catch (e) {
    logger.error("AutoBirthday", `Send wish to ${jid} failed: ${e.message}`);
    return false;
  }
}

// === Main check function ===
async function doBirthdayCheck() {
  try {
    const db = getDatabase();
    const todayBdays = checkTodayBirthdays(db);

    if (todayBdays.length === 0) {
      logger.info("AutoBirthday", "No birthdays today");
      return;
    }

    logger.info("AutoBirthday", `${todayBdays.length} birthday(s) today`);

    let sent = 0;
    for (const user of todayBdays) {
      const ok = await sendBirthdayWish(sockInstance, user);
      if (ok) sent++;
      // Delay 2 detik antar kirim biar gak rate limit
      await new Promise((r) => setTimeout(r, 2000));
    }

    const state = loadBirthdayState();
    state.lastCheck = new Date().toISOString();
    state.birthdaysSent += sent;
    saveBirthdayState(state);

    logger.success("AutoBirthday", `Sent ${sent}/${todayBdays.length} birthday wishes`);
  } catch (error) {
    logger.error("AutoBirthday", `Check failed: ${error.message}`);
  }
}

// === Cron management ===
function startAutoBirthday(sock) {
  sockInstance = sock;
  const state = loadBirthdayState();
  if (!state.enabled) {
    logger.info("AutoBirthday", "Auto birthday is disabled");
    return;
  }

  stopAutoBirthday();

  const cronExp = `${state.minute} ${state.hour} * * *`;
  activeCronJob = new CronJob(cronExp, doBirthdayCheck, null, true, TZ);
  logger.info("AutoBirthday", `Started at ${state.hour}:${String(state.minute).padStart(2, "0")} WIB (cron: ${cronExp})`);
}

function stopAutoBirthday() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoBirthday", "Stopped");
  }
}

function enableAutoBirthday(hour, minute, sock) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, error: "Invalid time" };
  }

  sockInstance = sock;
  const state = loadBirthdayState();
  state.enabled = true;
  state.hour = hour;
  state.minute = minute;
  saveBirthdayState(state);

  stopAutoBirthday();
  startAutoBirthday(sock);

  return { success: true, hour, minute };
}

function disableAutoBirthday() {
  const state = loadBirthdayState();
  state.enabled = false;
  saveBirthdayState(state);
  stopAutoBirthday();
  return { success: true };
}

function getBirthdayStatus() {
  const state = loadBirthdayState();
  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    lastCheck: state.lastCheck,
    birthdaysSent: state.birthdaysSent || 0,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualBirthday(sock) {
  sockInstance = sock;
  await doBirthdayCheck();
}

function initAutoBirthday(sock) {
  sockInstance = sock;
  startAutoBirthday(sock);
}

export {
  initAutoBirthday,
  startAutoBirthday,
  stopAutoBirthday,
  enableAutoBirthday,
  disableAutoBirthday,
  getBirthdayStatus,
  setBirthday,
  getBirthday,
  checkTodayBirthdays,
  triggerManualBirthday,
};
