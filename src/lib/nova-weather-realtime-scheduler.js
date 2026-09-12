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
  realtimeKey,
} from "./nova-weather-notify.js";
import { evaluateWeatherAlert, formatAlertMessage, buildThresholds } from "./nova-weather-alert.js";

let schedulerInterval = null;
let lastSent = {}; // mode jadwal: { "pagi": "2026-09-02", ... } per key per day
let intervalState = { lastSentMs: 0, lastKey: "" }; // mode interval dedup ala script
// 🔹 MODE OTOMATIS (request owner 12 Sep 2026): cek tiap N menit, kirim
// notifikasi PAS cuaca berubah (realtimeKey beda). Anti-spam: jeda minimal
// antar kirim (minGapMinutes) biar kondisi bolak-balik gak banjir.
let autoState = { lastCheckMs: 0, lastKey: "", lastSentMs: 0, recentKeys: [] };
// Seam e2e: fetch bisa di-inject biar tes mode otomatis deterministik
let weatherFetcher = fetchWeatherForSettings;
// Alert cuaca ekstrem: cek tiap 30 mnt, dedup pemicu sama 3 jam,
// level naik (WASPADA→SIAGA→AWAS) langsung kirim walau belum 3 jam.
let alertState = { lastCheckMs: 0, lastKey: "", lastSentMs: 0 };
const ALERT_CHECK_MS = 30 * 60_000;
const ALERT_DEDUP_MS = 3 * 3600_000;

import { resolveAutoTargets, getAutoTargetConfig } from "./nova-auto-target.js";

// Normalisasi settings lama → field baru (backward compat)
function normalizeSettings(settings) {
  const hasSchedules = Array.isArray(settings.schedules) && settings.schedules.length > 0;
  return {
    ...settings,
    provider: settings.provider || "openmeteo",
    adm4: settings.adm4 || null,
    // FIX 8 Sep 2026 (owner: "knp cuaca otomatis klo di on gak kirim
    // cuaca apapun di grup pdhal cuaca berganti"): dulu default "jadwal" —
    // kalau user `notification on` tanpa pernah set jadwal HH:MM, mode
    // jadwal dengan array kosong gak pernah kirim apa-apa SELAMANYA.
    // Sekarang: jadwal cuma dipakai kalau memang ada schedules-nya,
    // sisanya auto-fallback ke mode interval (ala script, tiap N jam
    // kirim kalau kondisi cuaca berubah).
    notificationMode: settings.notificationMode === "jadwal" && !hasSchedules ? "interval" : (settings.notificationMode || "interval"),
    intervalHours: Number(settings.intervalHours) >= 1 ? Number(settings.intervalHours) : 2,
    // mode otomatis: cek tiap N menit (1-60, default 5) + jeda min antar kirim (default 10)
    autoCheckMinutes: Number(settings.autoCheckMinutes) >= 1 ? Math.min(60, Math.round(Number(settings.autoCheckMinutes))) : 5,
    minGapMinutes: Number(settings.minGapMinutes) >= 1 ? Math.min(120, Math.round(Number(settings.minGapMinutes))) : 10,
    alertEnabled: settings.alertEnabled !== false, // alert ekstrem default ON
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
  if (!raw || !raw.notification || (!raw.target && !getAutoTargetConfig("autoweatherrealtime"))) return { ok: false, reason: "off" };
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

    // Target terpusat (.switch auto autoweatherrealtime set) — kalau ada
    // config, override target tunggal lama: dm / grup terpilih / semua grup.
    let targets = [settings.target].filter(Boolean);
    if (getAutoTargetConfig("autoweatherrealtime")) {
      targets = (await resolveAutoTargets(sock, "autoweatherrealtime")).jids;
    }
    for (const t of targets) {
      await sock.sendMessage(t, { text: message });
    }
    intervalState.lastSentMs = Date.now();
    intervalState.lastKey = key;
    console.log("[weather-realtime] ✅ Sent to", targets.length, "target(s)");
    return { ok: true };
  } catch (e) {
    console.error("[weather-realtime] Send error:", e.message);
    return { ok: false, reason: e.message };
  }
}

// Cek alert cuaca ekstrem (tiap 30 mnt saat notifikasi aktif).
// Exported untuk testing & command `alert test`.
export async function checkWeatherAlert(sock, { force = false } = {}) {
  const db = getDatabase();
  const raw = db.setting("weatherRealtime");
  if (!raw || !raw.notification || !raw.target) return { ok: false, reason: "off" };
  const settings = normalizeSettings(raw);
  if (!settings.alertEnabled && !force) return { ok: false, reason: "alert-off" };

  const now = Date.now();
  if (!force && now - (alertState.lastCheckMs || 0) < ALERT_CHECK_MS) return { ok: false, reason: "throttled" };
  alertState.lastCheckMs = now;

  try {
    const data = await fetchWeatherForSettings(settings);
    const alert = evaluateWeatherAlert(data, buildThresholds(settings.thresholds));
    if (!alert) {
      alertState.lastKey = ""; // kondisi mereda → reset dedup biar siap alert lagi
      return { ok: true, alert: null };
    }
    const isRepeat = alert.key === alertState.lastKey && (now - alertState.lastSentMs) < ALERT_DEDUP_MS;
    if (!force && isRepeat) return { ok: true, alert, sent: false };

    const name = settings.location?.name || "Lokasi";
    await sock.sendMessage(settings.target, { text: formatAlertMessage(alert, data, name) });
    alertState.lastKey = alert.key;
    alertState.lastSentMs = now;
    console.log(`[weather-alert] ✅ Alert ${alert.levelText} terkirim (${alert.key})`);
    return { ok: true, alert, sent: true };
  } catch (e) {
    console.error("[weather-alert] Error:", e.message);
    return { ok: false, reason: e.message };
  }
}

// Di-export untuk testing — dipanggil tiap menit oleh interval.
export async function checkAndSend(sock) {
  const db = getDatabase();
  const raw = db.setting("weatherRealtime");
  if (!raw || !raw.notification || (!raw.target && !getAutoTargetConfig("autoweatherrealtime"))) return;
  const settings = normalizeSettings(raw);
  const now = new Date();

  // ── ALERT CUACA EKSTREM — jalan di SEMUA mode (jadwal & interval),
  //    ala EWS gempa: bahaya gak nunggu jam jadwal ──
  try { await checkWeatherAlert(sock); } catch {}

  // ── MODE OTOMATIS (request owner 12 Sep: "tiap cuaca berubah dia kirim
  //    notifikasi") — cek tiap N menit, kirim SEGERA kalau realtimeKey
  //    (kondisi + suhu) berubah. Jeda min minGapMinutes antar kirim. ──
  if (settings.notificationMode === "otomatis") {
    const checkMs = (settings.autoCheckMinutes || 5) * 60_000;
    const gapMs = (settings.minGapMinutes || 10) * 60_000;
    const now = Date.now();
    if (now - (autoState.lastCheckMs || 0) < checkMs) return;
    autoState.lastCheckMs = now;

    try {
      const data = await weatherFetcher(settings);
      if (!data) return;
      const key = realtimeKey(data);
      // cuaca belum berubah → diam
      if (key === autoState.lastKey) return;
      // ANTI FLIP-FLOP: kondisi yang BARUSAN dikirim (< gap) ditahan — biar
      // Cerah→Hujan→Cerah→Hujan bolak-balik gak banjir. Kondisi BARU beda
      // tetep langsung kirim (maks 1 per siklus cek, makanya gak bisa spam).
      autoState.recentKeys = (autoState.recentKeys || []).filter((r) => now - r.ms < gapMs);
      if (autoState.recentKeys.some((r) => r.key === key)) return;

      const name = settings.provider === "bmkg"
        ? (settings.location?.name || "Wilayah BMKG")
        : (settings.location?.name || "Lokasi");
      const message = formatWeatherUpdate(data, name, settings.intervalHours, { autoMinutes: settings.autoCheckMinutes || 5 });

      let targets = [settings.target].filter(Boolean);
      if (getAutoTargetConfig("autoweatherrealtime")) {
        targets = (await resolveAutoTargets(sock, "autoweatherrealtime")).jids;
      }
      for (const tgt of targets) await sock.sendMessage(tgt, { text: message });
      autoState.lastKey = key;
      autoState.lastSentMs = now;
      autoState.recentKeys = [...(autoState.recentKeys || []), { key, ms: now }];
      console.log("[weather-realtime] ✅ Mode otomatis: cuaca berubah, kirim ke", targets.length, "target");
    } catch (e) {
      console.error("[weather-realtime] Mode otomatis error:", e.message);
    }
    return;
  }

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
    auto: { ...autoState },
    alert: { ...alertState },
  };
}

// Reset state interval (dipanggil pas notification ON — ala script
// boot: kirim cuaca sekarang tanpa nunggu interval habis)
export function resetIntervalState() {
  intervalState = { lastSentMs: 0, lastKey: "" };
}

// Reset dedup alert (dipanggil pas notification on / alert test)
export function resetAlertState() {
  alertState = { lastCheckMs: 0, lastKey: "", lastSentMs: 0 };
}

// Reset state mode otomatis (dipanggil pas notification on / ganti mode)
export function resetAutoState() {
  autoState = { lastCheckMs: 0, lastKey: "", lastSentMs: 0, recentKeys: [] };
}

// Hanya untuk testing (e2e) — set state otomatis langsung
export function _setAutoStateForTest(patch) {
  autoState = { ...autoState, ...patch };
}

// Hanya untuk testing (e2e) — inject fetch cuaca fake
export function _setWeatherFetcherForTest(fn) {
  weatherFetcher = fn || fetchWeatherForSettings;
}

// Hanya untuk testing (e2e) — set state alert langsung
export function _setAlertStateForTest(patch) {
  alertState = { ...alertState, ...patch };
}
