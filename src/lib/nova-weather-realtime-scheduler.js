// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Scheduler notifikasi cuaca (.weathersystemwatch notification on)
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
  weatherGroupOf,
  formatWeatherChange,
} from "./nova-weather-notify.js";
import { evaluateWeatherAlert, formatAlertMessage, buildThresholds } from "./nova-weather-alert.js";

let schedulerInterval = null;
let lastSent = {}; // mode jadwal: { "pagi": "2026-09-02", ... } per key per day
let intervalState = { lastSentMs: 0, lastKey: "" }; // mode interval dedup ala script
// 🔹 MODE OTOMATIS (request owner 12 Sep 2026): cek tiap N menit, kirim
// notifikasi PAS cuaca berubah. UPGRADE 15 Sep 2026 (diagnosis owner:
// "notif gak kekirim tiap cuaca berganti"):
//   * DETEKSI PER GRUP CUACA (cerah/mendung/hujan/petir) — bukan per
//     suhu/kondisi mentah. Cerah→Cerah Berawan = satu grup, gak usah
//     notif. Cerah→Hujan = beda grup → kirim. (kunci dokumen diagnosis)
//   * PERSIST ke db.setting("weatherRealtimeAuto") — state grup terakhir
//     tersimpan di database, TAHAN RESTART (dulu variabel RAM, hilang
//     tiap restart — penyebab #1 dokumen diagnosis). Cuaca berganti
//     pas bot mati → langsung kekirim begitu bot nyala.
let autoState = { lastCheckMs: 0, lastGroup: "", lastCondition: "", lastSentMs: 0, recentKeys: [], loaded: false };
const AUTO_DB_KEY = "weatherRealtimeAuto";

// Muat state grup terakhir dari database (sekali, lazy — dipanggil di
// awal branch otomatis biar import-time gak butuh db siap).
function loadAutoStateFromDb() {
  if (autoState.loaded) return;
  autoState.loaded = true;
  try {
    const db = getDatabase();
    const saved = db.setting(AUTO_DB_KEY);
    if (saved && typeof saved === "object") {
      autoState.lastGroup = saved.lastGroup || "";
      autoState.lastCondition = saved.lastCondition || "";
      autoState.lastSentMs = Number(saved.lastSentMs) || 0;
      // recentKeys expired dibuang (clock restart beda jauh)
      const now = Date.now();
      autoState.recentKeys = (Array.isArray(saved.recentKeys) ? saved.recentKeys : []).filter((r) => r && now - (r.ms || 0) < 24 * 3600_000);
      if (saved.lastGroup) console.log("[weather-realtime] State grup dipulihkan dari db:", saved.lastGroup);
    }
  } catch (e) {
    console.error("[weather-realtime] Gagal pulihkan state otomatis:", e.message);
  }
}

// Simpan state grup ke database — dipanggil tiap kali state berubah
// (kirim notif / deteksi grup baru) biar restart gak kehilangan jejak.
function saveAutoStateToDb() {
  try {
    getDatabase().setting(AUTO_DB_KEY, {
      lastGroup: autoState.lastGroup,
      lastCondition: autoState.lastCondition,
      lastSentMs: autoState.lastSentMs,
      recentKeys: autoState.recentKeys,
      savedAt: Date.now(),
    });
  } catch (e) {
    console.error("[weather-realtime] Gagal simpan state otomatis:", e.message);
  }
}
// Seam e2e: fetch bisa di-inject biar tes mode otomatis deterministik
let weatherFetcher = fetchWeatherForSettings;
// Alert cuaca ekstrem: cek tiap 30 mnt, dedup pemicu sama 3 jam,
// level naik (WASPADA→SIAGA→AWAS) langsung kirim walau belum 3 jam.
let alertState = { lastCheckMs: 0, lastKey: "", lastSentMs: 0 };
const ALERT_CHECK_MS = 30 * 60_000;
const ALERT_DEDUP_MS = 3 * 3600_000;

import { resolveAutoTargets, getAutoTargetConfig } from "./nova-auto-target.js";

// FIX 16 Sep 2026 (owner: "fitur cuaca otomatis tambah sistem pesan
// terpusat — dm/grup/global"): scheduler dulu baca config target
// terpusat pakai key "weathersystemwatch", padahal .switch auto nyimpen
// di key "autoweatherrealtime" (key registry + alias map) → target
// terpusat GAK PERNAH aktif buat cuaca. Sekarang: canonical =
// "autoweatherrealtime"; key lama tetap dibaca (kalau ada yang sempat
// nyetel langsung lewat db).
function weatherTargetCfg() {
  return getAutoTargetConfig("autoweatherrealtime") || getAutoTargetConfig("weathersystemwatch");
}
function weatherTargetKey() {
  return getAutoTargetConfig("autoweatherrealtime") ? "autoweatherrealtime" : "weathersystemwatch";
}

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
    // UPGRADE 15 Sep: fallback otomatis (notif pas cuaca berganti) —
    // sesuai harapan owner, bukan interval 2 jam lagi
    notificationMode: settings.notificationMode === "jadwal" && !hasSchedules ? "otomatis" : (settings.notificationMode || "otomatis"),
    intervalHours: Number(settings.intervalHours) >= 1 ? Number(settings.intervalHours) : 2,
    // mode otomatis: cek tiap N menit (1-60, default 5) + jeda min antar kirim (default 10)
    autoCheckMinutes: Number(settings.autoCheckMinutes) >= 1 ? Math.min(60, Math.round(Number(settings.autoCheckMinutes))) : 5,
    minGapMinutes: Number(settings.minGapMinutes) >= 1 ? Math.min(120, Math.round(Number(settings.minGapMinutes))) : 10,
    alertEnabled: settings.alertEnabled !== false, // alert ekstrem default ON
  };
}

// FIX 19 Sep 2026 (owner: "auto cuaca gak respon / notif kadang gak
// bekerja"): dulu `sock` ditangkap di CLOSURE interval pas start pertama.
// Bot reconnect tiap 10-30 menit → sock BARU gak pernah masuk → scheduler
// nyala tapi ngirim ke koneksi MATI → notifikasi cuaca gagal senyap
// sampai restart berikutnya (gejala: jalan pas baru boot, lalu diam).
// Sekarang: sock module-level, di-refresh TIAP kali connection open
// memanggil startWeatherRealtimeScheduler (idempotent), interval selalu
// pakai sock termutakhir.
let currentSock = null;

export function startWeatherRealtimeScheduler(sock) {
  const replaced = currentSock && currentSock !== sock && schedulerInterval;
  currentSock = sock;
  if (schedulerInterval) {
    if (replaced) console.log("[weather-realtime] 🔁 sock WA DIPERBARUI (reconnect) — notifikasi lanjut pakai koneksi baru");
    return; // interval sudah jalan — cukup refresh sock di atas
  }

  console.log("[weather-realtime] Scheduler started");
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndSend(currentSock);
    } catch (e) {
      console.error("[weather-realtime] Error:", e.message);
    }
  }, 60_000); // cek tiap 1 menit
}

// Sehat/diagnosa: umur sock yang dipakai scheduler (.wsw status)
export function getSockFreshness() {
  return { hasSock: !!currentSock };
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
  if (!raw || !raw.notification || (!raw.target && !weatherTargetCfg())) return { ok: false, reason: "off" };
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

    // Target terpusat (.switch auto weathersystemwatch set) — kalau ada
    // config, override target tunggal lama: dm / grup terpilih / semua grup.
    let targets = [settings.target].filter(Boolean);
    if (weatherTargetCfg()) {
      targets = (await resolveAutoTargets(sock, weatherTargetKey())).jids;
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
export async function checkWeatherAlert(sockParam, { force = false } = {}) {
  // FIX 19 Sep 2026: (1) sock param kosong → pakai sock termutakhir dari
  // scheduler (reconnect-safe); (2) alert ekstrem dulu BATAL kalau target
  // cuma diatur lewat .switch auto (gak ada raw.target manual) — sekarang
  // target terpusat ikut dihitung, samain sama jalur utama.
  const sock = sockParam || currentSock;
  const db = getDatabase();
  const raw = db.setting("weatherRealtime");
  if (!raw || !raw.notification || (!raw.target && !weatherTargetCfg())) return { ok: false, reason: "off" };
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
    let targets = [settings.target].filter(Boolean);
    if (weatherTargetCfg()) {
      targets = (await resolveAutoTargets(sock, weatherTargetKey())).jids;
    }
    for (const t of targets) await sock.sendMessage(t, { text: formatAlertMessage(alert, data, name) });
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
  if (!raw || !raw.notification || (!raw.target && !weatherTargetCfg())) return;
  const settings = normalizeSettings(raw);
  const now = new Date();

  // ── ALERT CUACA EKSTREM — jalan di SEMUA mode (jadwal & interval),
  //    ala EWS gempa: bahaya gak nunggu jam jadwal ──
  try { await checkWeatherAlert(sock); } catch {}

  // ── MODE OTOMATIS (request owner 12 Sep: "tiap cuaca berubah dia kirim
  //    notifikasi") — cek tiap N menit, kirim SEGERA kalau realtimeKey
  //    (kondisi + suhu) berubah. Jeda min minGapMinutes antar kirim. ──
  if (settings.notificationMode === "otomatis") {
    loadAutoStateFromDb(); // pulihkan state grup dari db (tahan restart)
    const checkMs = (settings.autoCheckMinutes || 5) * 60_000;
    const gapMs = (settings.minGapMinutes || 10) * 60_000;
    const now = Date.now();
    if (now - (autoState.lastCheckMs || 0) < checkMs) return;
    autoState.lastCheckMs = now;

    try {
      const data = await weatherFetcher(settings);
      if (!data) return;
      // DETEKSI PER GRUP (upgrade 15 Sep 2026): grup = cerah/mendung/
      // hujan/hujan_petir. Suhu naik-turun 1°C atau kode 61→63 gak
      // memicu apa-apa — cuma GRUP yang berubah yang dikirim.
      const grp = weatherGroupOf(data);
      const cond = data.condition || grp;
      console.log(`[weather-realtime] Cek otomatis: grup=${grp} kondisi=${cond} | sebelumnya=${autoState.lastGroup || "(belum ada)"}`);
      // grup belum berubah → diam (cuma refresh kondisi terakhir)
      if (grp === autoState.lastGroup) return;
      // ANTI FLIP-FLOP: grup yang BARUSAN dikirim (< gap) ditahan — biar
      // Cerah→Hujan→Cerah→Hujan bolak-balik gak banjir. Grup BARU beda
      // tetep langsung kirim (maks 1 per siklus cek, makanya gak bisa spam).
      autoState.recentKeys = (autoState.recentKeys || []).filter((r) => now - r.ms < gapMs);
      if (autoState.recentKeys.some((r) => r.key === grp)) return;

      const name = settings.provider === "bmkg"
        ? (settings.location?.name || "Wilayah BMKG")
        : (settings.location?.name || "Lokasi");
      // Pesan format dokumen diagnosis: CUACA BERUBAH + Dari/Ke + suhu
      const message = formatWeatherChange(data, name, autoState.lastGroup, autoState.lastCondition);

      let targets = [settings.target].filter(Boolean);
      if (weatherTargetCfg()) {
        targets = (await resolveAutoTargets(sock, weatherTargetKey())).jids;
      }
      for (const tgt of targets) await sock.sendMessage(tgt, { text: message });
      console.log("[weather-realtime] ✅ Mode otomatis: grup cuaca berubah", autoState.lastGroup || "-", "→", grp, "— kirim ke", targets.length, "target");
      autoState.lastGroup = grp;
      autoState.lastCondition = cond;
      autoState.lastSentMs = now;
      autoState.recentKeys = [...(autoState.recentKeys || []), { key: grp, ms: now }];
      saveAutoStateToDb();
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
  autoState = { lastCheckMs: 0, lastGroup: "", lastCondition: "", lastSentMs: 0, recentKeys: [], loaded: true };
  try { getDatabase().setting(AUTO_DB_KEY, null); } catch { /* diam */ }
}

// Set state grup manual (command .weathersystemwatch tesubah — tes paksa
// dari dokumen diagnosis: pura-pura grup terakhir cerah, cek berikutnya
// kalau realita beda grup → notif ASLI kekirim).
export function setAutoGroupForTest(group, condition) {
  loadAutoStateFromDb();
  autoState.lastGroup = String(group || "cerah");
  autoState.lastCondition = condition || autoState.lastGroup;
  autoState.lastCheckMs = 0; // biar cek berikutnya langsung jalan
  autoState.recentKeys = [];
  saveAutoStateToDb();
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
