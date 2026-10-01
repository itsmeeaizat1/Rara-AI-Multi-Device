// NOVA ALARM ENGINE — alarm HH:MM harian yang BENERAN bunyi + persist di db.
// (Plugin .alarm lama cuma nyimpen ke array tanpa scheduler — gak pernah
// bunyi sama sekali, dan ilang pas restart. Rombak total 13 Sep 2026.)
import { getDatabase } from "./nova-database.js";
import { novaWrap } from "./nova-menu-style.js";

const KEY = "novaAlarms";
if (!global.alarms) global.alarms = {};

function safeDb() {
  try { return getDatabase(); } catch { return null; }
}

export function loadAlarms(db = null) {
  const d = db || safeDb();
  try {
    const saved = d?.setting(KEY);
    if (saved && typeof saved === "object") global.alarms = saved;
  } catch {}
  return global.alarms;
}

export function saveAlarms(db = null) {
  const d = db || safeDb();
  try { d?.setting(KEY, global.alarms); } catch {}
}

const pad = (n) => String(n).padStart(2, "0");
function wibNow() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return {
    hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    ymd: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
  };
}

/**
 * Scheduler: cek tiap 30 detik — alarm HH:MM (WIB) bunyi 1x per hari per
 * alarm (guard lastFiredYmd). Dipasang sekali per proses di connection.js.
 */
export function initAlarmScheduler(sock) {
  if (global.__novaAlarmTimer) return false;
  global.__novaAlarmTimer = setInterval(async () => {
    try {
      const alarms = loadAlarms();
      const { hm, ymd } = wibNow();
      for (const [sender, list] of Object.entries(alarms)) {
        if (!Array.isArray(list)) continue;
        for (const a of list) {
          if (!a || !a.active || a.lastFiredYmd === ymd) continue;
          if (a.time !== hm) continue;
          a.lastFiredYmd = ymd;
          saveAlarms();
          const num = String(sender).split("@")[0];
          const text = novaWrap("Alarm Berbunyi", [
            `@${num}`,
            ``,
            `⏰ Waktu: *${a.time}* WIB`,
            `Pesan: ${a.message || "Alarm!"}`,
          ]);
          await sock.sendMessage(a.chat || sender, { text, mentions: [sender] });
        }
      }
    } catch {}
  }, 30_000);
  if (global.__novaAlarmTimer.unref) global.__novaAlarmTimer.unref();
  return true;
}
