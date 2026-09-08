// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Scheduler notifikasi cuaca (.autoweatherrealtime notification on)
// — upgrade 8 Sep 2026 ala script standalone owner:
//   * MODE JADWAL  : kirim di jam set (default lama, tetap jalan)
//   * MODE INTERVAL: update tiap N jam (default 2 jam ala script) +
//                    dedup kondisi (kondisi sama → gak kirim ulang)
//   * PROVIDER     : Open-Meteo (global) | BMKG (adm4, khusus Indonesia)
//   * FORMAT       : emoji fields ala script (UPDATE CUACA - <lokasi>)
// Cek tiap 1 menit.

import { getDatabase } from "./nova-database.js";
import {
  fetchWeatherForSettings,
  formatWeatherUpdate,
  conditionKey,
} from "./nova-weather-notify.js";

let schedulerInterval = null;
let lastSent = {}; // mode jadwal: { "pagi": "2026-09-02", ... } per key per day
let intervalState = { lastSentMs: 0, lastKey: "" }; // mode interval dedup ala script

// Normalisasi settings lama → field baru (backward compat)
function normalizeSettings(settings) {
  return {
    ...settings,
    provider: settings.provider || "openmeteo",
    adm4: settings.adm4 || null,
    notificationMode: settings.notificationMode || "jadwal",
    intervalHours: Number(settings.intervalHours) >= 1 ? Number(settings.intervalHours) : 2,
  };
}

export function startWeatherRealtimeScheduler(sock) {
  if (schedulerInterval) return; // already running

  console.log("[weather-realtime] Scheduler started");
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndSend(sock);
    } catch (e) {
      console.error("[weather-realtime] Error:", e.message);
    }
  }, 60_000); // cek tiap 1 menit
}

export function stopWeatherRealtimeScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[weather-realtime] Scheduler stopped");
  }
}

// Kirim cuaca SEKARANG + return status (dipakai command `test`,
// `notification on` ala script boot checkAndNotify, dan tick interval)
export async function sendWeatherNow(sock, { force = false } = {}) {
  const db = getDatabase();
  const raw = db.setting("weatherRealtime");
  if (!raw || !raw.notification || !raw.target) return { ok: false, reason: "off" };
  const settings = normalizeSettings(raw);

  try {
    const data = await fetchWeatherForSettings(settings);
    if (!data) return { ok: false, reason: "nodata" };

    const key = conditionKey(data);
    // Dedup ala script: kondisi sama → skip (kecuali force dari command test)
    if (!force && intervalState.lastKey === key) {
      return { ok: false, reason: "same" };
    }

    const name = settings.provider === "bmkg"
      ? (settings.location?.name || "Wilayah BMKG")
      : (settings.location?.name || "Lokasi");
    const message = formatWeatherUpdate(data, name, settings.intervalHours);

    await sock.sendMessage(settings.target, { text: message });
    intervalState.lastSentMs = Date.now();
    intervalState.lastKey = key;
    console.log("[weather-realtime] ✅ Sent to", settings.target);
    return { ok: true };
  } catch (e) {
    console.error("[weather-realtime] Send error:", e.message);
    return { ok: false, reason: e.message };
  }
}

// Di-export untuk testing — dipanggil tiap menit oleh interval.
export async function checkAndSend(sock) {
  const db = getDatabase();
  const raw = db.setting("weatherRealtime");
  if (!raw || !raw.notification || !raw.target) return;
  const settings = normalizeSettings(raw);

  const now = new Date();

  // ── MODE INTERVAL — ala script: tiap N jam cek, kirim kalau kondisi beda ──
  if (settings.notificationMode === "interval") {
    const intervalMs = settings.intervalHours * 3600_000;
    const elapsed = Date.now() - (intervalState.lastSentMs || 0);
    if (elapsed >= intervalMs) {
      await sendWeatherNow(sock); // dedup di dalam (kondisi sama → skip)
    }
    return;
  }

  // ── MODE JADWAL — kirim di jam set (perilaku lama) ──
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  for (const sched of (settings.schedules || [])) {
    if (sched.hour === hour && sched.minute === minute) {
      const key = sched.key || `${hour}:${minute}`;
      if (lastSent[key] === today) continue;
      lastSent[key] = today;

      console.log(`[weather-realtime] Sending ${sched.label} notification to ${settings.target}`);
      const res = await sendWeatherNow(sock, { force: true });
      if (!res.ok) console.log("[weather-realtime] skip:", res.reason);
    }
  }
}

export function getSchedulerStatus() {
  return {
    running: !!schedulerInterval,
    lastSent: { ...lastSent },
    interval: { ...intervalState },
  };
}

// Reset state interval (dipanggil pas notification ON — ala script
// boot: kirim cuaca sekarang tanpa nunggu interval habis)
export function resetIntervalState() {
  intervalState = { lastSentMs: 0, lastKey: "" };
}
