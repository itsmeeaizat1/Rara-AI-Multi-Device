// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Always Online / Presence Keepalive — bot kelihatan ONLINE 24 jam.
// Sistem langka bot MD luar sana (Jawad MD, AA MD, KnightBot) yang belum
// ada di NOVA: kirim presence "available" berulang walau bot nganggur.
// .alwaysonline on/off/status (owner) — interval heartbeat bisa diatur.
// Dinyalakan ulang otomatis pas boot (dipanggil dari connection.js open).
import { getDatabase } from "./nova-database.js";

const DEFAULT_INTERVAL_MIN = 10;
const MIN_INTERVAL_MIN = 1;
const MAX_INTERVAL_MIN = 60;

let timer = null;
let lastBeat = 0;
let beatCount = 0;
let _cfgOverride = null;

function cfg() {
  if (_cfgOverride) {
    const intervalMin = Number(_cfgOverride.intervalMin) || DEFAULT_INTERVAL_MIN;
    return { enabled: !!_cfgOverride.enabled, intervalMin };
  }
  try {
    const db = getDatabase();
    const s = db.setting("alwaysOnline") || {};
    let intervalMin = Number(s.intervalMin);
    if (!(intervalMin >= MIN_INTERVAL_MIN)) intervalMin = DEFAULT_INTERVAL_MIN;
    if (intervalMin > MAX_INTERVAL_MIN) intervalMin = MAX_INTERVAL_MIN;
    return { enabled: !!s.enabled, intervalMin };
  } catch {
    return { enabled: false, intervalMin: DEFAULT_INTERVAL_MIN };
  }
}

async function beat(sock) {
  try {
    await sock.sendPresenceUpdate("available");
    lastBeat = Date.now();
    beatCount++;
  } catch {
    /* koneksi lagi sibuk/pindah — heartbeat berikutnya */
  }
}

export function getAlwaysOnlineStatus() {
  const c = cfg();
  return {
    enabled: c.enabled,
    intervalMin: c.intervalMin,
    running: !!timer,
    lastBeat,
    beatCount,
  };
}

export function startAlwaysOnline(sock) {
  stopAlwaysOnline();
  const c = cfg();
  if (!c.enabled || !sock?.sendPresenceUpdate) return false;
  timer = setInterval(
    () => {
      const n = cfg();
      if (!n.enabled) {
        stopAlwaysOnline();
        return;
      }
      beat(sock);
    },
    c.intervalMin * 60 * 1000,
  );
  beat(sock); // heartbeat pertama langsung
  return true;
}

export function stopAlwaysOnline() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// seam e2e: _setAlwaysOnlineForTest({enabled, intervalMin}) override cfg;
// null = kembali ke db asli (timer dibersihin juga).
export function _setAlwaysOnlineForTest(state) {
  _cfgOverride = state && typeof state === "object" ? state : null;
  if (state === null) stopAlwaysOnline();
}
