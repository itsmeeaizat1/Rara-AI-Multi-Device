// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Unified Switch: Dispatcher untuk semua toggle on/off (channel, group, auto, fitur)
import { getDatabase } from '../../src/lib/rara-database.js'
import { setEnabled as setRainEnabled, isEnabled as isRainEnabled } from '../../src/lib/rara-rain-notify.js'
import {
  getAutoTargetConfig, setAutoTargetConfig, clearAutoTargetConfig,
  describeAutoTarget, listBotGroups, parseGroupPicks, toWaJid
} from '../../src/lib/rara-auto-target.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { pluginStore } from '../../src/lib/rara-plugins.js'
import {
  NOTIFY_EVENTS, getAllNotifyStatus, setNotifyEnabled, isNotifyEnabled
} from '../../src/lib/rara-saluran-broadcast.js'
import fs from 'fs'
import path from 'path'

// Auto feature library imports
import { enableAutoBackup, disableAutoBackup, getBackupStatus } from '../../src/lib/rara-auto-backup.js'
import { enableHealthCheck, disableHealthCheck, getHealthStatus } from '../../src/lib/rara-auto-api-health.js'
import { enableReengage, disableReengage, getReengageStatus } from '../../src/lib/rara-auto-reengage.js'
import { enableRefill, disableRefill, getRefillStatus } from '../../src/lib/rara-auto-refill.js'
import { enableRenewalReminder, disableRenewalReminder, getRenewalStatus } from '../../src/lib/rara-auto-renewal.js'
import { enableAutoReport, disableAutoReport, getReportStatus } from '../../src/lib/rara-auto-report.js'
import { enableAutoBirthday, disableAutoBirthday, getBirthdayStatus } from '../../src/lib/rara-auto-birthday.js'
import { getBmkgStatus, updateBmkgSettings, startBmkgJobs, stopBmkgJobs } from '../../src/lib/rara-bmkg-scheduler.js'
import { getBencanaAutoEnabled, setBencanaAutoEnabled } from '../../src/lib/rara-bencana.js'
import { getStatus as getStatusWebWatch, setEnabled as setWebWatchEnabled } from '../../src/lib/rara-webwatch.js'
import { getStatus as getStatusCryptoAlert, setEnabled as setCryptoAlertEnabled } from '../../src/lib/rara-cryptoalert.js'
import { isEnabled as isAnimeNotifierOn, setEnabled as setAnimeNotifierOn } from '../../src/lib/rara-auto-anime-notifier.js'
import { isEnabled as isMovieNotifierOn, setEnabled as setMovieNotifierOn } from '../../src/lib/rara-movie-notifier.js'
import { isEnabled as isBolaNotifierOn, setBolaNotifierOn } from '../../src/lib/rara-auto-bola-notifier.js'
import { isLinkedInNotifierOn, setLinkedInNotifierOn } from '../../src/lib/rara-linkedin-notify.js'
import { loadState as loadWinbuState, saveState as saveWinbuState, startAutoCheck as startWinbuCheck, stopAutoCheck as stopWinbuCheck, isRunning as isWinbuRunning } from '../../src/lib/rara-auto-anime.js'
import { getSettings as getCleanSettings, updateSettings as updateCleanSettings, startCleaner, stopCleaner } from '../../src/lib/rara-cache-cleaner.js'
import { getLokerStatus, updateLokerSettings, startLokerJobs, stopLokerJob } from '../../src/lib/rara-loker-scheduler.js'
// FIX v24.1.1 — dipakai toggle autoweatherrealtime: pakai default yang SAMA dengan
// scheduler (lokasi dll), supaya nyalain via .switch gak bikin fetch error senyap.
import { normalizeSettings as normalizeWeatherSettings, resetAutoState as resetWeatherAutoState } from '../../src/lib/rara-weather-realtime-scheduler.js'
// FIX v24.1.2 — ngitung subscriber bencana buat peringatan di .switch
// (ON di .switch TIDAK cukup: monitor wajib punya >=1 subscriber).
import { watcherCount as bencanaWatcherCount } from '../../src/lib/rara-bencana.js'
// FIX v24.2.3 — auto berita: toggle sinkron (dulu dynamic import TANPA await →
// balasan "ON" muncul sebelum state tersimpan, dan gagal import senyap total)
// + statusInfo dipakai buat peringatan "belum ada penerima".
import { setBeritaNotifierOn as setBeritaOn, statusInfo as beritaStatusInfo } from '../../src/lib/rara-berita-notifier.js'

const pluginConfig = {
  name: "switch",
  alias: [
    "switch", "enable", "disable", "togglefitur", "onofffitur", "onoff",
    // Auto aliases — semua command auto* lama tetap works
    "autoread", "autotyping", "autojoingc", "autoreadsw", "autoreactsw",
    // Auto* aliases dihapus — masing-masing punya plugin sendiri
    // .switch auto <feature> on/off tetap works via "switch" command
  ],
  category: "owner",
  description: 'Switch on/off semua fitur (channel, group, auto, command)',
  // REWORK 24 Sep (owner: usage terlalu ribet) — cukup pintu masuk panel,
  // detail tiap kategori muncul di dalam panel .switch sendiri.
  usage: '.switch — panel on/off semua fitur',
  example: '.switch\n.switch status all\n.switch channel\n.switch group\n.switch auto\n.switch fitur',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

// ═══════════════════════════════════════════════════════════
// GROUP FEATURES (dari enable.js + disable.js)
// ═══════════════════════════════════════════════════════════
const GROUP_FEATURES = {
  welcome:       { label: "Welcome",        dbKey: "welcome",       on: true,  off: false },
  goodbye:       { label: "Goodbye",        dbKey: "goodbye",       on: true,  off: false },
  autoreaction:  { label: "Auto Reaction",  dbKey: "autoreaction",  on: true,  off: false },
  autosticker:   { label: "Auto Sticker",   dbKey: "autosticker",    on: true,  off: false },
  autoreply:     { label: "Auto Reply",     dbKey: "autoreply",      on: true,  off: false },
  automedia:     { label: "Auto Media",     dbKey: "automedia",      on: true,  off: false },
  autodl:        { label: "Auto Download",  dbKey: "autodl",         on: true,  off: false },
  autosambut:    { label: "Auto Sambut",    dbKey: "autoSambut",     on: true,  off: false },
  autoforward:   { label: "Auto Forward",   dbKey: "autoforward",    on: true,  off: false },
  antilinkgc:    { label: "Anti Link Grup", dbKey: "antilinkgc",     on: "on",  off: "off", modeKey: "antilinkgcMode",  modes: ["kick","remove"] },
  antilinkall:   { label: "Anti Link All",  dbKey: "antilinkall",    on: "on",  off: "off", modeKey: "antilinkallMode", modes: ["kick","remove"] },
  antivn:        { label: "Anti VN",        dbKey: "antivn",         on: true,  off: false },
  antifoto:      { label: "Anti Foto",      dbKey: "antifoto",       on: true,  off: false },
  antivideo:     { label: "Anti Video",     dbKey: "antivideo",      on: true,  off: false },
  antisticker:   { label: "Anti Sticker",   dbKey: "antisticker",    on: "on",  off: "off" },
  antitoxic:     { label: "Anti Toxic",     dbKey: "antitoxic",      on: true,  off: false },
  antikasar:     { label: "Anti Kasar",     dbKey: "antikasar",      on: "on",  off: "off" },
  anti18plus:    { label: "Anti 18+",       dbKey: "anti18plus",     on: "on",  off: "off" },
  antibucin:     { label: "Anti Bucin",     dbKey: "antibucin",      on: "on",  off: "off" },
  antijudol:     { label: "Anti Judol",     dbKey: "antijudol",      on: "on",  off: "off" },
  antiribut:     { label: "Anti Ribut",     dbKey: "antiribut",      on: "on",  off: "off" },
  antibot:       { label: "Anti Bot",       dbKey: "antibot",        on: true,  off: false },
  antiphising:   { label: "Anti Phising",   dbKey: "antiphising",    on: "on",  off: "off" },
  antiswgc:      { label: "Anti SW Grup",   dbKey: "antiswgc",       on: "on",  off: "off" },
  antitagsw:     { label: "Anti Tag SW",    dbKey: "antitagsw",      on: "on",  off: "off" },
  antiremove:    { label: "Anti Delete",    dbKey: "antiremove",     on: "on",  off: "off" },
  anticustom:    { label: "Anti Custom",    dbKey: "anticustom",     on: "on",  off: "off", modeKey: "anticustomMode", modes: ["kick","remove","warn"] },
  antimedia:     { label: "Anti Media",     dbKey: "antimedia",      on: "on",  off: "off" },
  antidocument: { label: "Anti Document",   dbKey: "antidocument",  on: "on",  off: "off" },
  antivirtex:    { label: "Anti Virtex",    dbKey: "antivirtex",     on: true,  off: false },
  antibug:       { label: "Anti Bug",       dbKey: "antibug",         on: true,  off: false },
  antinomorluar: { label: "Anti Nomor Luar", dbKey: "antinomorluar", on: true,  off: false, extraKey: "nomorluarBlock", defaultExtra: "60" },
  antispam:      { label: "Anti Spam",      dbKey: "antispam",       on: "on",  off: "off" },
  mutegc:        { label: "Mute Grup",      dbKey: "mutegc",         on: true,  off: false },
}

const GROUP_ALIASES = {
  antilink: "antilinkgc", antigc: "antilinkgc",
  antiall: "antilinkall", antitagall: "antilinkall",
  asticker: "antisticker", astkr: "antisticker",
  antidelete: "antiremove", antihapus: "antiremove", ar: "antiremove",
  toxic: "antitoxic", kasar: "antikasar",
  nsfw: "anti18plus", "18+": "anti18plus",
  bucin: "antibucin", judol: "antijudol", ribut: "antiribut",
  sambut: "autosambut", forward: "autoforward",
  reaction: "autoreaction", sticker: "autosticker",
  reply: "autoreply", media: "automedia",
  download: "autodl", spam: "antispam",
  bot: "antibot", phising: "antiphising",
  swgc: "antiswgc", tagsw: "antitagsw",
  antivid: "antivideo", novideo: "antivideo", avn: "antivn", voice: "antivn", vn: "antivn",
  foto: "antifoto", image: "antifoto", photo: "antifoto", novid: "antivideo",
  mute: "mutegc", virtex: "antivirtex", virus: "antivirtex", bug: "antibug",
  nomorluar: "antinomorluar", asing: "antinomorluar", foreign: "antinomorluar",
  bye: "goodbye", wb: "welcome",
}

const GROUP_CATEGORIES = {
  "Main":       ["welcome", "goodbye", "autoreaction", "autosticker", "autoreply", "automedia", "autodl", "autosambut", "autoforward"],
  "Anti Link":  ["antilinkgc", "antilinkall"],
  "Anti Media": ["antivn", "antifoto", "antivideo", "antisticker", "antimedia", "antidocument"],
  "Anti Toxic": ["antitoxic", "antikasar", "anti18plus", "antibucin", "antijudol", "antiribut"],
  "Anti Lain":  ["antibot", "antiphising", "antiswgc", "antitagsw", "antiremove", "anticustom", "antispam", "antivirtex", "antibug", "antinomorluar"],
  "Grup":       ["mutegc"],
}

function isOn(value, onValue) {
  return value === onValue || value === true || value === "on"
}

// ═══════════════════════════════════════════════════════════
// AUTO FEATURES REGISTRY
// ═══════════════════════════════════════════════════════════
// Tiap entry: { label, getStatus: () => boolean, toggle: (on) => void }

const AUTO_REGISTRY = {
  autoread: {
    label: "Auto Read",
    getStatus: () => { try { return getDatabase().setting("autoRead") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoRead", on) },
  },
  autotyping: {
    label: "Auto Typing",
    getStatus: () => { try { return getDatabase().setting("autoTyping") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoTyping", on) },
  },
  autojoingc: {
    label: "Auto Join Grup",
    getStatus: () => { try { return getDatabase().setting("autoJoinGc") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoJoinGc", on) },
  },
  autoreadsw: {
    label: "Auto Read Story",
    getStatus: () => { try { return (getDatabase().setting("autoReadSW") || {}).enabled ?? false } catch { return false } },
    toggle: (on) => { const db = getDatabase(); const cur = db.setting("autoReadSW") || {}; db.setting("autoReadSW", { ...cur, enabled: on }) },
  },
  autoreactsw: {
    label: "Auto React Story",
    getStatus: () => { try { return (getDatabase().setting("autoReactSW") || {}).enabled ?? false } catch { return false } },
    toggle: (on) => { const db = getDatabase(); const cur = db.setting("autoReactSW") || { emoji: "🔥" }; db.setting("autoReactSW", { ...cur, enabled: on }) },
  },
  autoberitanotify: {
    label: "Auto Berita Notifier",
    getStatus: () => { try { return getDatabase().setting("beritaNotifier")?.enabled ?? false } catch { return false } },
    // FIX v24.2.3: dulu `import(...).then(...)` TANPA await → balasan "ON"
    // muncul di chat SEBELUM state benar-benar tersimpan (race), dan kalau
    // import gagal tidak ada jejak sama sekali. Sekarang statik & sinkron.
    toggle: (on) => { setBeritaOn(on) },
  },
  autoloker: {
    label: "Auto Loker (Info Lowongan Kerja)",
    // Broadcast loker ke grup — register di .switch biar on/off terpusat
    // (toggler asli .loker aktif/nonaktif tetap works). Target broadcast
    // bisa dioverride via .switch auto autoloker set (target terpusat).
    getStatus: () => { try { return getLokerStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => {
      const settings = updateLokerSettings((cur) => ({ ...cur, enabled: on }))
      if (on) startLokerJobs(settings)
      else stopLokerJob()
    },
  },
  autobackup: {
    label: "Auto Backup DB",
    getStatus: () => { try { return getBackupStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableAutoBackup(intervalStr) WAJIB dikasih interval ("30m"/
    // "6h"/"1d") — dipanggil tanpa argumen bikin parseInterval(undefined)
    // crash "Cannot read properties of undefined (reading 'match')". Toggle
    // unified ini gak punya UI buat nanya interval, jadi pakai interval yang
    // udah kesimpen (getBackupStatus) kalau ada, fallback default "1h".
    toggle: (on) => { on ? enableAutoBackup(getBackupStatus()?.intervalStr || "1h") : disableAutoBackup() },
  },
  autohealth: {
    label: "Auto API Health Check",
    getStatus: () => { try { return getHealthStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableHealthCheck(intervalMinutes) butuh parameter — dipanggil
    // tanpa argumen → intervalMinutes undefined, "undefined < 5" = false (gak
    // crash tapi nyimpen NaN). Pakai nilai tersimpan / default state (30 mnt).
    toggle: (on) => { on ? enableHealthCheck(getHealthStatus()?.intervalMinutes || 30) : disableHealthCheck() },
  },
  autoreengage: {
    label: "Auto Re-engage Users",
    getStatus: () => { try { return getReengageStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableReengage(hour, minute, thresholdDays) butuh 3 parameter —
    // dipanggil tanpa argumen bakal nyimpen NaN/undefined. Pakai nilai
    // tersimpan / default state (10:00, threshold 7 hari).
    toggle: (on) => { const s = getReengageStatus(); on ? enableReengage(s?.hour ?? 10, s?.minute ?? 0, s?.inactiveThresholdDays ?? 7) : disableReengage() },
  },
  autorefill: {
    label: "Auto Refill Limit/Energi",
    getStatus: () => { try { return getRefillStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableRefill(hour, minute) butuh parameter — pakai nilai
    // tersimpan / default state (00:00).
    toggle: (on) => { const s = getRefillStatus(); on ? enableRefill(s?.hour ?? 0, s?.minute ?? 0) : disableRefill() },
  },
  autorenewal: {
    label: "Auto Renewal Reminder",
    getStatus: () => { try { return getRenewalStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableRenewalReminder(hour, minute, reminderDays) butuh 3
    // parameter — pakai nilai tersimpan / default state (09:00, H-3).
    toggle: (on) => { const s = getRenewalStatus(); on ? enableRenewalReminder(s?.hour ?? 9, s?.minute ?? 0, s?.reminderDays ?? 3) : disableRenewalReminder() },
  },
  autoreport: {
    label: "Auto Report Harian",
    getStatus: () => { try { return getReportStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableAutoReport(hour, minute) butuh parameter — pakai nilai
    // tersimpan / default state (23:00).
    toggle: (on) => { const s = getReportStatus(); on ? enableAutoReport(s?.hour ?? 23, s?.minute ?? 0) : disableAutoReport() },
  },
  autoulah: {
    label: "Auto Ucapan Ulang Tahun",
    getStatus: () => { try { return getBirthdayStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX: enableAutoBirthday(hour, minute) butuh parameter — pakai nilai
    // tersimpan / default state (08:00).
    toggle: (on) => { const s = getBirthdayStatus(); on ? enableAutoBirthday(s?.hour ?? 8, s?.minute ?? 0) : disableAutoBirthday() },
  },
  autobmkg: {
    label: "Auto Info Gempa BMKG",
    getStatus: () => { try { return getBmkgStatus()?.enabled ?? false } catch { return false } },
    // BUG FIX 1: updateBmkgSettings butuh UPDATER FUNCTION (cur) => next, bukan
    // objek literal — sebelumnya dikasih { enabled: on } langsung, yang bikin
    // updater(current) di dalam rara-bmkg-scheduler.js manggil objek kayak
    // fungsi → TypeError. Konsisten sama semua pemanggilan lain di autobmkg.js.
    // BUG FIX 2: startBmkgJobs(settings) WAJIB dikasih objek settings (dipakai
    // buat baca .enabled/.schedules/.timezone) — sebelumnya dipanggil tanpa
    // argumen → "Cannot read properties of undefined (reading 'enabled')".
    toggle: (on) => { const s = updateBmkgSettings((cur) => ({ ...cur, enabled: on })); on ? startBmkgJobs(s) : stopBmkgJobs() },
  },
  webwatch: {
    label: "Web Watcher (Pantau URL Berubah)",
    // Status = flag global monitor; subscriber/URL TETAP tersimpan pas OFF.
    getStatus: () => { try { return getStatusWebWatch().enabled } catch { return true } },
    // OFF = monitor pause (interval clear); ON = syncMonitor nyala lagi kalau ada watch.
    toggle: (on) => { setWebWatchEnabled(on) },
  },
  cryptoalert: {
    label: "Crypto Alarm (Alarm Harga Crypto)",
    // Status = flag global monitor; alarm TETAP tersimpan pas OFF.
    getStatus: () => { try { return getStatusCryptoAlert().enabled } catch { return true } },
    // OFF = monitor pause (interval clear); ON = syncMonitor nyala lagi kalau ada alarm.
    toggle: (on) => { setCryptoAlertEnabled(on) },
  },
  bencanawatch: {
    label: "Auto Alert Bencana (Bencanawatch)",
    // Status = flag global auto-alert (bukan jumlah subscriber). Kalau ON tapi
    // monitor gak jalan, berarti belum ada subscriber — itu bukan error.
    getStatus: () => { try { return getBencanaAutoEnabled() } catch { return true } },
    // OFF = polling dipause via stopBencanaMonitor — subscriber, lokasi, radius,
    // mode & jadwal TETAP tersimpan; ON balik → syncBencanaMonitor nyalain lagi.
    toggle: (on) => { setBencanaAutoEnabled(on) },
  },
  autoanime: {
    label: "Auto Anime V1 (Winbu Episode)",
    // V1 = fitur auto anime winbu.net yang udah ada (episode 720p Pixeldrain ke
    // grup) — sekarang ke-register di .switch + auto-resume pas boot.
    getStatus: () => { try { return loadWinbuState().enabled ?? false } catch { return false } },
    // OFF = timer stop + enabled false (grup TETAP tersimpan); ON = nyalain timer
    // pakai interval tersimpan (default 5 mnt).
    toggle: (on, { sock } = {}) => {
      const st = loadWinbuState()
      if (on) {
        if (!sock) throw new Error("sock belum siap — coba lagi sebentar")
        saveWinbuState({ ...st, enabled: true })
        startWinbuCheck(sock, st.interval || 5)
      } else {
        stopWinbuCheck()
        saveWinbuState({ ...st, enabled: false })
      }
    },
  },
  autoanimenotifier: {
    label: "Auto Anime V2 Notifier (AniList)",
    // Status = flag global. ON tapi monitor gak jalan = belum ada chat
    // langganan .animenotify on — bukan error.
    getStatus: () => { try { return isAnimeNotifierOn() } catch { return false } },
    // OFF = polling berhenti, subscriber tetap tersimpan; ON dengan target
    // kosong = auto-add owner (ala TARGET_NUMBER script owner).
    toggle: (on) => { setAnimeNotifierOn(on) },
  },
  automovienotifier: {
    label: "Auto Movie Notifier (IMDbOT → Cinemeta, no key)",
    getStatus: () => { try { return isMovieNotifierOn() } catch { return false } },
    // OFF = polling berhenti, subscriber tetap tersimpan; ON dengan target
    // kosong = auto-add owner (ala TARGET_NUMBER script owner).
    toggle: (on) => { setMovieNotifierOn(on) },
  },
  autobolanotify: {
    label: "Auto Jadwal Bola Notifier (ESPN → TheSportsDB)",
  autolinkedin: {
    label: "Auto LinkedIn Job Notifier (Apify — credit guard)",
    getStatus: () => { try { return isLinkedInNotifierOn() } catch { return false } },
    toggle: (on) => { setLinkedInNotifierOn(on) },
  },
    getStatus: () => { try { return isBolaNotifierOn() } catch { return false } },
    // OFF = polling berhenti, subscriber tetap tersimpan; ON dengan target
    // kosong = auto-add owner (ala TARGET_NUMBER script owner).
    toggle: (on) => { setBolaNotifierOn(on) },
  },
  autoweatherrealtime: {
    label: "Auto Notifikasi Cuaca Realtime",
    getStatus: () => { try { return getDatabase().setting("weatherRealtime")?.notification ?? false } catch { return false } },
    // FIX v24.1.1 — AKAR MASALAH "notif cuaca gak muncul": toggle ini dulu
    // HANYA nge-set `notification:true`. Akibatnya:
    //   1. `location` kosong → fetchWeatherForSettings() THROW "Koordinat
    //      lokasi cuaca belum diatur" (error cuma di console, gak kelihatan
    //      di WhatsApp);
    //   2. `target` kosong → checkAndSend() `return` DIAM (nol pesan, nol error).
    // Sekarang pakai normalizeSettings() — default yang sama dengan scheduler,
    // jadi lokasi ikut keisi. TARGET sengaja TIDAK di-auto-set (owner mau pilih
    // manual); pengingatnya muncul sebagai peringatan + tombol di .switch.
    toggle: (on) => {
      try {
        const db = getDatabase();
        const cur = db.setting("weatherRealtime") || {};
        db.setting("weatherRealtime", normalizeWeatherSettings({ ...cur, notification: on }));
        db.save();
        // dinyalakan → reset state deteksi biar cek pertama langsung kirim
        if (on) { try { resetWeatherAutoState(); } catch { /* abaikan */ } }
      } catch (e) { console.error("[switch] weatherRealtime:", e.message); }
    },
  },
  autorainnotify: {
    label: "Auto Notif Hujan Nowcast",
    // .hujannotif — kirim "akan hujan dalam X menit" (OWM One Call 3.0 /
    // fallback Open-Meteo 15-menit). Register di .switch (request owner
    // 16 Sep 2026: sistem pesan terpusat berlaku di SEMUA fitur otomatis)
    // — toggle asli .hujannotif on/off tetap works.
    getStatus: () => { try { return isRainEnabled() } catch { return false } },
    toggle: (on) => { setRainEnabled(on) }, // setEnabled self-sync monitor
  },
  autocleancache: {
    label: "Auto Clean Cache & Temp",
    getStatus: () => { try { return getCleanSettings()?.enabled ?? false } catch { return false } },
    toggle: (on) => { updateCleanSettings({ enabled: on }); on ? startCleaner() : stopCleaner() },
  },
  autoreactsticker: {
    label: "Auto React Sticker",
    getStatus: () => { try { return getDatabase().setting("autoReactSticker") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoReactSticker", on) },
  },
  autoreactvn: {
    label: "Auto React Voice Note",
    getStatus: () => { try { return getDatabase().setting("autoReactVN") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoReactVN", on) },
  },
  autosholat: {
    label: "Auto Reminder Sholat",
    getStatus: () => { try { return getDatabase().setting("autoSholat") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoSholat", on) },
  },
  autostatusview: {
    label: "Auto View Status/Story",
    getStatus: () => { try { return getDatabase().setting("autoStatusView") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoStatusView", on) },
  },
  autotranslatevn: {
    label: "Auto Translate VN (Speech-to-Text)",
    getStatus: () => { try { return getDatabase().setting("autoTranslateVN") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoTranslateVN", on) },
  },
  autoforward: {
    label: "Auto Forward Message",
    getStatus: () => { try { return getDatabase().setting("autoForward") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoForward", on) },
  },
  autosambut: {
    label: "Auto Sambut Member Baru",
    getStatus: () => { try { return getDatabase().setting("autoSambut") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoSambut", on) },
  },
  automod: {
    label: "Auto Moderation",
    getStatus: () => { try { return getDatabase().setting("autoMod") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoMod", on) },
  },
  autobroadcastchannel: {
    label: "Auto Broadcast ke Saluran",
    getStatus: () => { try { return getDatabase().setting("autoBroadcastChannel") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoBroadcastChannel", on) },
  },
  // REQUEST OWNER 6 Okt 2026: broadcast cpanel (notif saluran serverCreated) bisa
  // diakses dari .switch auto — sinkron dengan toggle .autobroadcastchannel serverCreated.
  autocpanelbroadcast: {
    label: "Broadcast Cpanel ke Saluran",
    getStatus: () => { try { return isNotifyEnabled("serverCreated") ?? false } catch { return false } },
    toggle: (on) => { try { setNotifyEnabled("serverCreated", on) } catch {} },
  },
  autobackupdrive: {
    label: "Auto Backup Google Drive",
    getStatus: () => { try { return getDatabase().setting("autoBackupDrive") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoBackupDrive", on) },
  },
}

const AUTO_ALIASES = {
  read: "autoread", typing: "autotyping", join: "autojoingc", joingc: "autojoingc",
  readsw: "autoreadsw", reactsw: "autoreactsw", backup: "autobackup",
  health: "autohealth", reengage: "autoreengage", refill: "autorefill",
  renewal: "autorenewal", report: "autoreport", ulah: "autoulah", birthday: "autoulah",
  bmkg: "autobmkg", bencana: "bencanawatch", disaster: "bencanawatch", disastersystemwatch: "bencanawatch",
  animenotifier: "autoanimenotifier", animenotify: "autoanimenotifier", anime: "autoanimenotifier", animev2: "autoanimenotifier", bolanotify: "autobolanotify", jadwalbolanotify: "autobolanotify", jadwalnotify: "autobolanotify", footballnotify: "autobolanotify", linkedinnotify: "autolinkedin", lnjobs: "autolinkedin", linkedin: "autolinkedin", lokerlinkedin: "autolinkedin",
  movienotifier: "automovienotifier", movienotify: "automovienotifier", filmnotifier: "automovienotifier", movienotif: "automovienotifier", beritanotify: "autoberitanotify", beritabarak: "autoberitanotify", newsnotify: "autoberitanotify", autonews: "autoberitanotify",
  animev1: "autoanime", winbu: "autoanime", animewinbu: "autoanime", cuacascheduler: "autoweatherrealtime", weatherscheduler: "autoweatherrealtime", weathersystemwatch: "autoweatherrealtime", clean: "autocleancache", cleancache: "autocleancache",
  reactsticker: "autoreactsticker", reactvn: "autoreactvn", sholat: "autosholat",
  statusview: "autostatusview", translatevn: "autotranslatevn", forward: "autoforward",
  sambut: "autosambut", mod: "automod", broadcastchannel: "autobroadcastchannel",
  broadcastcpanel: "autocpanelbroadcast", cpanelbroadcast: "autocpanelbroadcast", cpanel: "autocpanelbroadcast",
  panelbroadcast: "autocpanelbroadcast",
  backupdrive: "autobackupdrive", loker: "autoloker", job: "autoloker", lowongan: "autoloker",
  hujannotif: "autorainnotify", rainnotify: "autorainnotify", nowcasthujan: "autorainnotify"
}

const AUTO_CATEGORIES = {
  "Sistem & Respon": [
    "autoread", "autotyping", "autojoingc", "autoreadsw", "autoreactsw",
    "autostatusview", "autotranslatevn", "autoreactsticker", "autoreactvn"
  ],
  "Pemeliharaan": [
    "autobackup", "autohealth", "autocleancache", "autobackupdrive"
  ],
  "Retensi & Finansial": [
    "autoreengage", "autorefill", "autorenewal", "autoreport", "autoulah"
  ],
  "Info & Utilitas": [
    "bencanawatch", "autoanime", "autoanimenotifier", "automovienotifier", "autobolanotify", "autolinkedin", "autobmkg", "autoweatherrealtime", "autorainnotify", "autosholat", "autoforward",
    "autosambut", "automod", "autobroadcastchannel", "autocpanelbroadcast", "autoloker", "webwatch", "cryptoalert"
  ]
}

const AUTO_KEYS = Object.keys(AUTO_REGISTRY)

// ═══ SCOPE TERPUSAT (request owner 10 Sep 2026) ═══
// Deteksi otomatis KETERSEDIAAN fitur — bisa di-DM juga atau tidak:
//   📍 Grup    → fitur grup (welcome, antilink, dll) — HANYA berlaku di grup
//                (gak bisa ON di DM — dari DM wajib pakai target grup)
//   🌍 Global  → fitur otomatis — berlaku di grup & DM (on/off dari mana aja)
//   📢 Saluran → event notifikasi saluran — broadcast HANYA dikirim ke saluran WA
//                (on/off bisa dari grup/DM, tapi efeknya cuma di saluran)
const FEATURE_SCOPES = {
  grup: { icon: "📍", label: "Grup", desc: "Hanya berlaku di grup — gak bisa aktif di DM" },
  global: { icon: "🌍", label: "Global", desc: "Berlaku di grup & DM — on/off dari mana saja" },
  saluran: { icon: "📢", label: "Saluran", desc: "Broadcast hanya dikirim ke saluran WhatsApp" },
}
function featureScopeInfo(name) {
  const a = String(name || "").toLowerCase()
  if (GROUP_ALIASES[a] || GROUP_FEATURES[a]) return FEATURE_SCOPES.grup
  if (AUTO_ALIASES[a] || AUTO_KEYS.includes(a)) return FEATURE_SCOPES.global
  if (Object.keys(NOTIFY_EVENTS).some((k) => k.toLowerCase() === a)) return FEATURE_SCOPES.saluran
  return null
}
const scopeLine = (scope) => scope ? `${scope.icon} *Berlaku:* ${scope.label} — ${scope.desc}` : null

// ── Format promosi (request owner 9 Okt 2026): seksi bold + emoji, divider
// pendek, bullet ▪ label-value bold — gak pake smallcaps lagi ──
const DIV = '━━━━━━━━━━━━━━'
const secTitle = (emoji, title, count) => `${emoji} *${title.toUpperCase()}${count != null ? ` (${count})` : ''}*`
const stOn = (on) => (on ? '✅ ON' : '❌ OFF')
const scLine = (name, enabled) => `▪ *${name}:* ${stOn(enabled)}`

// ═══════════════════════════════════════════════════════════
// PARSER INTENT & MODE
// ═══════════════════════════════════════════════════════════
function getMode(cmd, args) {
  const c = cmd.toLowerCase()
  const a = (args[0] || '').toLowerCase()

  if (AUTO_KEYS.includes(c) || AUTO_ALIASES[c]) {
    const key = AUTO_ALIASES[c] || c
    return `auto:${key}`
  }

  if (c === 'enable' || c === 'on') {
    if (a && GROUP_FEATURES[GROUP_ALIASES[a] || a]) return 'group:on'
    if (a === 'auto') return 'auto'
    if (a === 'channel') return 'channel'
    return 'group:on'
  }

  if (c === 'disable' || c === 'off') {
    if (a && GROUP_FEATURES[GROUP_ALIASES[a] || a]) return 'group:off'
    if (a === 'auto') return 'auto'
    if (a === 'channel') return 'channel'
    return 'group:off'
  }

  if (c === 'togglefitur' || c === 'onofffitur') return 'fitur'

  if (!a) return 'menu'
  // MASTER: ".switch semua on|off" — SEMUANYA (auto + saluran + group)
  if (a === 'semua' || a === 'all') return 'master'
  if (a === 'channel' || a === 'saluran') return 'channel'
  if (a === 'group' || a === 'grup' || a === 'gc') return 'group'
  if (a === 'auto') {
    const sub = (args[1] || '').toLowerCase()
    const subResolved = AUTO_ALIASES[sub] || (AUTO_KEYS.includes(sub) ? sub : '')
    if (!subResolved) return 'auto'
    // BUG FIX: sebelumnya return `auto:${subResolved}` — handleAuto lalu ambil
    // action dari args[0], yang di jalur INI (".switch auto <key> <action>")
    // adalah STRING "auto", BUKAN aksinya! Akibatnya action selalu jadi "auto"
    // → gak pernah cocok "on"/"off" → toggle() TIDAK PERNAH terpanggil, SELALU
    // jatuh ke branch "tampilkan status" — user ketik "on" berkali-kali, status
    // gak pernah berubah (persis laporan owner: .switch auto autobmkg on gak
    // ngefek, tetep OFF). Sekarang action diambil di SINI (args[2], posisi yang
    // benar) dan di-embed eksplisit ke mode string biar handleAuto gak perlu
    // nebak lagi dari args.
    const explicitAction = (args[2] || '').toLowerCase()
    return `switchauto:${subResolved}:${explicitAction}`
  }
  if (a === 'fitur' || a === 'command' || a === 'cmd') return 'fitur'
  if (a === 'status' || a === 'cek') return 'status'
  // ═══ DIRECT FITUR (request owner 10 Sep 2026): ".switch <fitur> on|off [target]" ═══
  // Fitur apapun bisa di-on/off LANGSUNG tanpa keyword subsistem — terpusat:
  //   .switch welcome on          .switch welcome on all
  //   .switch antilinkgc on <jid> .switch autoread on   .switch sewaRegister off
  if (GROUP_ALIASES[a] || GROUP_FEATURES[a]) return 'direct:group'
  if (AUTO_ALIASES[a] || AUTO_KEYS.includes(a)) return `direct:auto:${AUTO_ALIASES[a] || a}`
  if (Object.keys(NOTIFY_EVENTS).some((k) => k.toLowerCase() === a)) return 'direct:channel'
  return 'menu'
}

// ═══════════════════════════════════════════════════════════
// SALURAN HANDLER
// ═══════════════════════════════════════════════════════════
async function handleChannel(m, { sock, config: cfg, direct }) {
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  const rawSub = direct?.event || args[1]?.toLowerCase()
  // canonical case-insensitive: "sewaregister" → "sewaRegister" (bug lama: key
  // camelCase gak pernah match pas user ketik lowercase di jalur manapun)
  const subCmd = rawSub ? (Object.keys(NOTIFY_EVENTS).find((k) => k.toLowerCase() === rawSub) || rawSub) : rawSub

  if (!subCmd || subCmd === 'status' || subCmd === 'cek') {
    const statuses = getAllNotifyStatus()
    let onCount = 0, offCount = 0
    let text = raraWrap("Switch Channel", [
      `📢 *CHANNEL:* ${cfg?.saluran?.name || "Belum diset nih"}`,
      DIV,
      secTitle("🔔", "EVENT NOTIFIKASI", Object.keys(NOTIFY_EVENTS).length),
      DIV,
    ].join("\n"))

    for (const [, info] of Object.entries(statuses)) {
      text += `\n${scLine(info.label, info.enabled)}`
      if (info.enabled) onCount++; else offCount++
    }
    text += "\n\n" + secTitle("📊", "RINGKASAN") + "\n" + DIV
    text += `\n▪ *Aktif:* ${onCount} | *Mati:* ${offCount} | *Total:* ${onCount + offCount}`
    text += `\n▪ *Atur 1 event:* \`${prefix}switch channel <event> on|off\``
    text += `\n▪ *Semua:* \`${prefix}switch channel all on/off\``
    return m.reply(text)
  }

  if (subCmd === 'all') {
    const action = args[2]?.toLowerCase()
    if (action !== 'on' && action !== 'off')
      return m.reply(raraWrap("Switch Channel", `Gunakan: \`${prefix}switch channel all on\` atau \`${prefix}switch channel all off\``))
    const enabled = action === 'on'
    let count = 0
    for (const key of Object.keys(NOTIFY_EVENTS)) { setNotifyEnabled(key, enabled); count++ }
    return m.reply(raraWrap("Switch Channel", [
        `🔔 *SEMUA EVENT: ${enabled ? "ALL ON" : "ALL OFF"}*`,
        DIV,
        `▪ *Total event:* ${count}`,
        ``,
        `*Cek status:* \`${prefix}switch channel\``,
      ].join("\n")))
  }

  if (NOTIFY_EVENTS[subCmd]) {
    // ON/OFF terpusat (request owner 10 Sep 2026): ".switch channel <event> on|off"
    // eksplisit kayak group/auto — tanpa verb = toggle lama tetap jalan.
    const verb = direct?.verb || (args[2] || '').toLowerCase()
    const current = getAllNotifyStatus()[subCmd].enabled
    const newVal = verb === 'on' ? true : verb === 'off' ? false : !current
    if (newVal === current && (verb === 'on' || verb === 'off'))
      return m.reply(raraWrap("Switch Channel", [
        `🔔 *EVENT: ${NOTIFY_EVENTS[subCmd]}*`,
        DIV,
        `▪ *Status:* ${stOn(newVal)} — sudah dari sebelumnya`,
        `▪ ${scopeLine(FEATURE_SCOPES.saluran)}`,
      ].join("\n")))
    setNotifyEnabled(subCmd, newVal)
    return m.reply(raraWrap("Switch Channel", [
      `🔔 *EVENT: ${NOTIFY_EVENTS[subCmd]}*`,
      DIV,
      `▪ *Status:* ${stOn(newVal)}`,
      `▪ ${scopeLine(FEATURE_SCOPES.saluran)}`,
      ``,
      newVal ? `*Notifikasi akan dikirim ke channel*` : `*Notifikasi dimatikan*`,
      ``,
      `*Cek semua:* \`${prefix}switch channel\``,
    ].join("\n")))
  }

  let list = ""
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) list += `\`${key}\` — ${label}\n`
  return m.reply(raraWrap("Switch Channel", [
    `❗ *EVENT ${subCmd.toUpperCase()} TIDAK ADA*`,
    ``,
    secTitle("📋", "EVENT TERSEDIA"),
    DIV,
    ...list.trim().split("\n").map((l) => `▪ ${l}`),
    ``,
    `*Contoh:* \`${prefix}switch channel sewaRegister\``,
  ], "error"))
}

// ═══════════════════════════════════════════════════════════
// GROUP HANDLER
// ═══════════════════════════════════════════════════════════
// Popup daftar grup tersedia — target terpusat fitur grup
async function sendGroupTargetPicker(m, sock, prefix, feature, featureName, forceOff) {
  let groups = {}
  try { groups = (await sock.groupFetchAllParticipating()) || {} } catch {}
  const list = Object.values(groups)
    .map((g) => ({ jid: g.id, subject: (g.subject || g.id || "").trim(), count: (g.participants || []).length }))
    .sort((a, b) => a.subject.localeCompare(b.subject))

  const text = raraWrap("Switch Group", [
    `📍 *FITUR:* ${feature.label}`,
    DIV,
    `▪ *Mode:* target terpusat`,
    list.length
      ? `▪ *Grup terdeteksi:* ${list.length}`
      : `▪ Bot belum berada di grup mana pun.`,
    ``,
    secTitle("🎯", "CARA AKTIFKAN"),
    DIV,
    `▪ *Semua:* \`${prefix}switch group ${featureName} ${forceOff ? "off" : "on"} all\``,
    `▪ *Manual:* \`${prefix}switch group ${featureName} ${forceOff ? "off" : "on"} <jid-grup>\``,
    ``,
    `📍 Fitur ini hanya berlaku di grup — pilih grup target lewat tombol bawah`,
  ].join("\n"))

  if (!list.length) return m.reply(text)

  const rows = list.slice(0, 50).map((g) => ({
    title: g.subject.slice(0, 25),
    description: `${g.count} member — ${forceOff ? "OFF" : "ON"} di grup ini`,
    id: `${prefix}switch group ${featureName} ${forceOff ? "off" : "on"} ${g.jid}`,
  }))
  try {
    await sock.sendButton(m.chat, null, text, m, {
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: "Pilih Grup",
            sections: [{ title: forceOff ? "Matikan (Off)" : "Aktifkan (On)", rows }],
          }),
        },
      ],
    })
  } catch {
    await m.reply(text + "\n\nDaftar grup:\n" + list.map((g, i) => `${i + 1}. ${g.subject} \`${g.jid}\``).join("\n"))
  }
  return { handled: true }
}

async function handleGroup(m, { sock, config: cfg, forceOff, direct }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  let featureName, mode, target

  if (direct) {
    // ".switch <fitur> on|off [target]" — fitur di args[0], parsing terpusat
    featureName = direct.featureName
    mode = direct.mode
    target = direct.target
    if (mode === 'off' || mode === 'false' || mode === '0') forceOff = true
  } else if (forceOff) {
    // Dari .switch off <fitur> / .disable <fitur>: args = [<fitur>, <target>]
    featureName = (args[0] || '').toLowerCase()
    target = (args[1] || '').toLowerCase()
    mode = null
  } else {
    featureName = (args[1] || '').toLowerCase()
    mode = (args[2] || '').toLowerCase()
    target = (args[3] || '').toLowerCase()
    // Handle ".switch group goodbye off <target>" — off di belakang
    if (mode === 'off' || mode === 'false' || mode === '0') {
      forceOff = true
      mode = null
    }
    // Handle ".switch group off goodbye <target>" — off di depan fitur
    if (featureName === 'off' || featureName === 'false') {
      forceOff = true
      featureName = mode
      mode = null
    }
  }

  if (!featureName) {
    const groupData = db.getGroup(m.chat) || {}
    let txt = ""
    for (const [cat, features] of Object.entries(GROUP_CATEGORIES)) {
      txt += secTitle("🏠", cat, features.length) + "\n" + DIV + "\n"
      for (const feat of features) {
        const f = GROUP_FEATURES[feat]
        if (!f) continue
        const current = groupData[f.dbKey]
        const active = isOn(current, f.on)
        txt += `${scLine(f.label, active)}\n`
      }
      txt += `\n`
    }
    txt += secTitle("🎯", "PERINTAH") + "\n" + DIV
    txt += `\n▪ *ON:* \`${prefix}switch group <fitur>\` | *OFF:* \`${prefix}switch group <fitur> off\``
    txt += `\n▪ *Target:* \`${prefix}switch group <fitur> on <jid-grup>|all|list\``
    txt += `\n▪ *SEMUA fitur:* \`${prefix}switch group all on <target>\``
    return m.reply(txt.trim())
  }

  // ═══ BULK TERPUSAT (request owner 10 Sep 2026): .switch group all on|off [target] ═══
  // SEMUA fitur grup sekaligus, dengan target: <jid-grup> | all | list
  if (featureName === 'all' || featureName === 'semua') {
    const on = !forceOff
    const verb = forceOff ? 'off' : 'on'
    const applyBulk = (groupJid) => {
      for (const f of Object.values(GROUP_FEATURES))
        db.setGroup(groupJid, { [f.dbKey]: on ? f.on : f.off })
    }

    if (target === 'list' || target === 'daftar') {
      return await sendGroupTargetPicker(m, sock, prefix, { label: "SEMUA FITUR GRUP" }, "all", forceOff)
    }
    if (target === 'all' || target === 'semua') {
      let groups = {}
      try { groups = (await sock.groupFetchAllParticipating()) || {} } catch {}
      const list = Object.values(groups)
      if (!list.length)
        return m.reply(raraWrap("Switch Group", [
          `🏠 *SEMUA FITUR GRUP*`,
          DIV,
          `▪ *Target:* semua grup`,
          `▪ Bot belum berada di grup mana pun.`,
        ].join("\n")))
      for (const g of list) applyBulk(g.id)
      return m.reply(raraWrap("Switch Group", [
        `🏠 *SEMUA FITUR GRUP (${Object.keys(GROUP_FEATURES).length})*`,
        DIV,
        `▪ *Status:* ${on ? "✅ ALL ON" : "❌ ALL OFF"}`,
        `▪ *Target:* semua grup (${list.length})`,
      ].join("\n")))
    }
    const isJidLikeBulk = /@g\.us$/.test(target) || /^[0-9-]{8,}$/.test(target.replace(/@.*$/, ""))
    if (target && isJidLikeBulk) {
      let groupJid = target.endsWith('@g.us') ? target : `${target.replace(/[^0-9-]/g, "")}@g.us`
      if (!/^\d[\d-]{7,}@g\.us$/.test(groupJid))
        return m.reply(raraWrap("Switch Group", [
          `❗ *JID GRUP TIDAK VALID: ${groupJid}*`,
          ``,
          `*Contoh benar:* \`${prefix}switch group all ${verb} 12036302xxxxx@g.us\``,
        ].join("\n"), "warn"))
      let subject = groupJid
      try { subject = (await sock.groupMetadata(groupJid))?.subject || groupJid } catch {
        return m.reply(raraWrap("Switch Group", [
          `🏠 *SEMUA FITUR GRUP*`,
          DIV,
          `▪ *Target:* ${groupJid}`,
          `❗ Bot tidak menemukan grup itu`,
          ``,
          `*Lihat daftar:* \`${prefix}switch group all ${verb} list\``,
        ].join("\n")))
      }
      applyBulk(groupJid)
      return m.reply(raraWrap("Switch Group", [
        `🏠 *SEMUA FITUR GRUP (${Object.keys(GROUP_FEATURES).length})*`,
        DIV,
        `▪ *Status:* ${on ? "✅ ALL ON" : "❌ ALL OFF"}`,
        `▪ *Target:* ${subject}`,
      ].join("\n")))
    }
    if (!String(m.chat || "").endsWith("@g.us")) {
      return m.reply(raraWrap("Switch Group", [
        `🏠 *SEMUA FITUR GRUP*`,
        DIV,
        `❗ *Dari DM wajib pakai target:*`,
        ``,
        `▪ \`${prefix}switch group all ${verb} <jid-grup>\``,
        `▪ \`${prefix}switch group all ${verb} all\``,
        `▪ \`${prefix}switch group all ${verb} list\``,
      ].join("\n")))
    }
    applyBulk(m.chat)
    return m.reply(raraWrap("Switch Group", [
      `🏠 *SEMUA FITUR GRUP (${Object.keys(GROUP_FEATURES).length})*`,
      DIV,
      `▪ *Status:* ${on ? "✅ ALL ON" : "❌ ALL OFF"}`,
      `▪ *Grup:* grup ini`,
    ].join("\n")))
  }

  const resolved = GROUP_ALIASES[featureName] || featureName
  const feature = GROUP_FEATURES[resolved]

  if (!feature)
    return m.reply(raraWrap("Switch Group", [
      `❗ *FITUR TIDAK DITEMUKAN: ${featureName}*`,
      ``,
      `*Ketik* \`${prefix}switch group\` *untuk melihat daftar*`,
    ].join("\n"), "error"))

  // ═══ DETEKSI KETERSEDIAAN (request owner 10 Sep 2026) ═══
  // ".switch <fitur>" tanpa on/off → tampilkan scope fitur ini:
  // bisa di DM juga atau cuma grup, status sekarang, cara on/off.
  if (direct && !mode && !target) {
    const inGrpInfo = String(m.chat || "").endsWith("@g.us")
    const gdInfo = inGrpInfo ? (db.getGroup(m.chat) || {}) : {}
    const activeInfo = inGrpInfo ? isOn(gdInfo[feature.dbKey], feature.on) : null
    return m.reply(raraWrap("Info Fitur", [
      `📍 *FITUR:* ${feature.label}`,
      DIV,
      `▪ ${scopeLine(FEATURE_SCOPES.grup)}`,
      ``,
      inGrpInfo
        ? `▪ *Status di grup ini:* ${stOn(activeInfo)}`
        : `▪ *Status:* dari DM — fitur ini gak bisa aktif di DM`,
      ``,
      secTitle("🎯", "PERINTAH"),
      DIV,
      `▪ *Aktifkan:* \`${prefix}switch ${featureName} on\` (di dalam grup)`,
      `▪ *Dari DM:* \`${prefix}switch ${featureName} on <jid-grup>|all|list\``,
      `▪ *Matikan:* \`${prefix}switch ${featureName} off\``,
    ].join("\n")))
  }

  // ═══ TARGET TERPUSAT (request owner 10 Sep 2026) ═══
  // ".switch group <fitur> on <target>" — kayak mode on/off terpusat auto:
  //   on <jid-grup>  → aktif di grup itu saja (dari DM/grup manapun)
  //   on all        → aktif di SEMUA grup yang bot ikuti
  //   on list       → popup daftar grup yang tersedia buat dipilih
  // Tanpa target: di dalam grup = grup ini; dari DM = popup daftar grup
  // (FITLX lama "toggle dari DM nyasar ke jid DM" gak bisa kejadian lagi).
  const isInGroupChat = String(m.chat || "").endsWith("@g.us")

  if (target === 'list' || target === 'daftar' || (target === 'grup' && !isInGroupChat)) {
    return await sendGroupTargetPicker(m, sock, prefix, feature, featureName, forceOff)
  }

  if (target === 'all' || target === 'semua') {
    let groups = {}
    try { groups = (await sock.groupFetchAllParticipating()) || {} } catch {}
    const list = Object.values(groups)
    if (!list.length)
      return m.reply(raraWrap("Switch Group", [
        `📍 *FITUR:* ${feature.label}`,
        DIV,
        `▪ *Target:* semua grup`,
        `▪ Bot belum berada di grup mana pun.`,
      ].join("\n")))
    let count = 0
    for (const g of list) {
      db.setGroup(g.id, forceOff ? { [feature.dbKey]: feature.off } : { [feature.dbKey]: feature.on })
      count++
    }
    return m.reply(raraWrap("Switch Group", [
      `📍 *FITUR:* ${feature.label}`,
      DIV,
      `▪ *Status:* ${forceOff ? "❌ OFF" : "✅ ON"}`,
      `▪ *Target:* semua grup (${count})`,
      `▪ ${scopeLine(FEATURE_SCOPES.grup)}`,
    ].join("\n")))
  }

  // Target = JID grup spesifik (angka / berakhiran @g.us)
  const isJidLikeTarget = /@g\.us$/.test(target) || /^[0-9-]{8,}$/.test(target.replace(/@.*$/, ""))
  if (target && isJidLikeTarget) {
    let groupJid = target.endsWith('@g.us') ? target : `${target.replace(/[^0-9-]/g, "")}@g.us`
    if (!/^\d[\d-]{7,}@g\.us$/.test(groupJid))
      return m.reply(raraWrap("Switch Group", [
          `❗ *JID GRUP TIDAK VALID: ${groupJid}*`,
          ``,
          `*Contoh benar:* \`${prefix}switch group ${featureName} on 12036302xxxxx@g.us\``,
        ].join("\n"), "warn"))
    let subject = groupJid
    try { subject = (await sock.groupMetadata(groupJid))?.subject || groupJid } catch {
      return m.reply(raraWrap("Switch Group", [
        `📍 *FITUR:* ${feature.label}`,
        DIV,
        `▪ *Target:* ${groupJid}`,
        `❗ Bot tidak menemukan grup itu — pastikan bot masuk di grup tersebut dan JID benar`,
        ``,
        `*Lihat daftar:* \`${prefix}switch group ${featureName} on list\``,
      ].join("\n")))
    }
    db.setGroup(groupJid, forceOff ? { [feature.dbKey]: feature.off } : { [feature.dbKey]: feature.on })
    return m.reply(raraWrap("Switch Group", [
      `📍 *FITUR:* ${feature.label}`,
      DIV,
      `▪ *Status:* ${forceOff ? "❌ OFF" : "✅ ON"}`,
      `▪ *Target:* ${subject}`,
      `▪ ${scopeLine(FEATURE_SCOPES.grup)}`,
    ].join("\n")))
  }

  // Tanpa target dari DM → popup daftar grup (jangan nyimpen ke jid DM)
  if (!isInGroupChat) {
    return await sendGroupTargetPicker(m, sock, prefix, feature, featureName, forceOff)
  }

  const groupData = db.getGroup(m.chat) || {}

  if (forceOff) {
    db.setGroup(m.chat, { [feature.dbKey]: feature.off })
    return m.reply(raraWrap("Switch Group", [
      `❌ *${feature.label.toUpperCase()}: OFF*`,
      `▪ ${scopeLine(FEATURE_SCOPES.grup)}`,
    ].join("\n")))
  }

  let update = { [feature.dbKey]: feature.on }
  if (feature.modes && mode && feature.modes.includes(mode))
    update[feature.modeKey] = mode
  if (feature.extraKey && mode && /^\d+$/.test(mode))
    update[feature.extraKey] = mode

  db.setGroup(m.chat, update)
  const onLines = []
  if (feature.modes) {
    const newMode = mode && feature.modes.includes(mode) ? mode : (groupData[feature.modeKey] || feature.modes[0])
    onLines.push(`▪ *Mode:* ${newMode}`)
  }
  onLines.push(`▪ ${scopeLine(FEATURE_SCOPES.grup)}`)
  let txt = raraWrap("Switch Group", [
    `✅ *${feature.label.toUpperCase()}: ON*`,
    ...onLines,
  ].join("\n"))
  return m.reply(txt)
}

// ═══════════════════════════════════════════════════════════
// AUTO HANDLER
// ═══════════════════════════════════════════════════════════
// Fitur otomatis yang punya TARGET pengiriman — dipakai tombol pilih target
// di jalur toggle (biar owner gak perlu ngetik `.switch auto <fitur> set ...`).
const AUTO_TARGETABLE = ['autosholat', 'autobmkg', 'autoweatherrealtime', 'autoloker', 'autoanimenotifier', 'autobolanotify', 'bencanawatch', 'autoanime', 'autoreengage', 'autoulah', 'autoreport', 'autorenewal', 'autoberitanotify', 'automovienotifier', 'autolinkedin', 'autorainnotify', 'webwatch', 'cryptoalert', 'autohealth', 'autorefill', 'autobackup']

async function handleAuto(m, { sock, config: cfg, autoKey, explicitAction }) {
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []

  // 3 kemungkinan pemanggil, masing2 struktur args beda — JANGAN disamain:
  //  a. ".switch auto <key> <action>" → action SUDAH di-resolve di getMode()
  //     dan dikirim eksplisit lewat explicitAction (fix bug: dulu ke-tebak
  //     dari args[0] yang isinya "auto", bukan aksinya — toggle gak pernah jalan)
  //  b. alias langsung ".autoread on/off" → args = ["on"/"off"], action = args[0]
  //  c. ".switch auto" tanpa key → tampilkan semua status, action tak dipakai
  let action
  if (typeof explicitAction === 'string') {
    action = explicitAction
  } else if (autoKey) {
    action = (args[0] || '').toLowerCase()
  } else {
    action = (args[2] || '').toLowerCase()
  }

  // ═══ BULK TERPUSAT (request owner 10 Sep 2026): .switch auto all on|off ═══
  // Sekalian ON/OFF SEMUA fitur otomatis sekaligus.
  if (!autoKey) {
    const sub = (args[1] || '').toLowerCase()
    if (sub === 'all' || sub === 'semua') {
      const act = (args[2] || '').toLowerCase()
      if (act !== 'on' && act !== 'off')
        return m.reply(raraWrap("Switch Auto", [
          `⚡ *SEMUA FITUR OTOMATIS*`,
          DIV,
          `❗ *Gunakan:* \`${prefix}switch auto all on\` atau \`${prefix}switch auto all off\``,
        ].join("\n")))
      const on = act === 'on'
      let ok = 0, fail = 0
      for (const reg of Object.values(AUTO_REGISTRY)) {
        try { reg.toggle(on); ok++ } catch { fail++ }
      }
      return m.reply(raraWrap("Switch Auto", [
        `⚡ *SEMUA FITUR OTOMATIS: ${on ? "ALL ON" : "ALL OFF"}*`,
        DIV,
        `▪ *Berhasil:* ${ok} fitur`,
        fail ? `▪ *Gagal:* ${fail} fitur` : ``,
        ``,
        `*Cek status:* \`${prefix}switch auto\``,
      ].filter(Boolean).join("\n")))
    }
    let txt = ""
    for (const [cat, features] of Object.entries(AUTO_CATEGORIES)) {
      txt += secTitle("⚡", cat, features.length) + "\n" + DIV + "\n"
      for (const key of features) {
        const reg = AUTO_REGISTRY[key]
        if (!reg) continue
        const enabled = reg.getStatus()
        txt += `${scLine(reg.label || key, enabled)}\n`
      }
      txt += `\n`
    }
    txt += secTitle("🎯", "PERINTAH") + "\n" + DIV
    txt += `\n▪ *ON:* \`${prefix}switch auto <nama> on\` | *OFF:* \`${prefix}switch auto <nama> off\``
    txt += `\n▪ *SEMUA:* \`${prefix}switch auto all on/off\``
    return m.reply(raraWrap("Switch Auto", txt.trim()))
  }

  const reg = AUTO_REGISTRY[autoKey]
  if (!reg)
    return m.reply(raraWrap("Switch Auto", [
      `❗ *FITUR TIDAK DITEMUKAN: ${autoKey}*`,
      ``,
      `*Ketik* \`${prefix}switch auto\` *untuk melihat daftar*`,
    ].join("\n"), "error"))

  // ═══ OPSET TARGET (request owner 8 Sep 2026): .switch auto <key> set ═══
  // Fitur notifikasi bisa dikustomisasi targetnya:
  //   set              → lihat target sekarang + daftar opsi
  //   set semua        → kirim ke SEMUA grup yang bot ikuti (default)
  //   set grup         → daftar grup untuk dipilih
  //   set grup <n,n>   → pilih grup tertentu (nomor dari daftar, bisa banyak)
  //   set dm           → opsi DM (nomor tertentu / semua user terdaftar)
  //   set dm <nomor>   → kirim ke DM nomor itu
  //   set dm semua     → kirim ke SEMUA DM user yang sudah mendaftar bot
  //   set reset        → balik ke default (semua grup)
  if (action === 'set' || action === 'target') {
    const argsRaw = (m.args || []).map((a) => String(a || ''))
    const setIdx = argsRaw.findIndex((a) => a.toLowerCase() === 'set' || a.toLowerCase() === 'target')
    const rest = (setIdx >= 0 ? argsRaw.slice(setIdx + 1) : []).map((a) => a.toLowerCase())

    // Fitur subscriber: target terpusat NAMBAH jangkauan (subscriber tetap dapat)
    const SUBSCRIBER_FEATURES = { bencanawatch: '.disastersystemwatch on', autoanime: '.autoanime on', autoanimenotifier: '.animenotify on', automovienotifier: '.movienotify on', autobolanotify: '.jadwalbolanotify on', autolinkedin: '.linkedinnotify on', autoberitanotify: '.beritanotify on', autorainnotify: '.hujannotif on' }
    // SEMUA fitur otomatis yang ngirim notifikasi sekarang punya target terpusat
    // (request owner 8 Sep 2026: "semua fitur yg otomatis ada opsi kirim terpusatnya ini wajib"
    //  + 16 Sep 2026: "pstikna ini jga berlaku di semua fitur otomatis yg ada di switch"
    //  — lengkapi: autobolanotify, automovienotifier, autolinkedin, autorainnotify)
    const TARGETABLE = [
      'autosholat', 'autobmkg', 'autoweatherrealtime', 'autoloker',
      'autoanimenotifier', 'bencanawatch', 'autoanime', 'autoreengage',
      'autoulah', 'autoreport', 'autorenewal', 'autoberitanotify',
      'autobolanotify', 'automovienotifier', 'autolinkedin', 'autorainnotify',
      'webwatch', 'cryptoalert', 'autohealth', 'autorefill', 'autobackup',
    ]
    if (!TARGETABLE.includes(autoKey)) {
      return m.reply(raraWrap("Switch Auto Target", [
        `❗ *${reg.label.toUpperCase()}* gak mengirim notifikasi terjadwal — gak ada target yang bisa diset`,
        ``,
        secTitle("📋", "FITUR YANG BISA DIATUR TARGETNYA", TARGETABLE.length),
        DIV,
        ...TARGETABLE.map((k) => `▪ \`${k}\``),
      ].join("\n")))
    }

    const cfg = getAutoTargetConfig(autoKey)
    const opt = rest[0] || ''

    // ── set reset ──
    if (opt === 'reset' || opt === 'default') {
      clearAutoTargetConfig(autoKey)
      return m.reply(raraWrap("Switch Auto Target", [
        `♻️ *TARGET DIRESET*`,
        DIV,
        `▪ *Fitur:* ${reg.label}`,
        `▪ *Target:* default (semua grup)`,
      ].join("\n")))
    }

    // ── set semua / gabungan (semua grup + semua DM) ──
    if (opt === 'semua' || opt === 'all' || opt === 'semua-grup') {
      setAutoTargetConfig(autoKey, { mode: 'semua', groups: [], dm: null })
      return m.reply(raraWrap("Switch Auto Target", [
        `✅ *TARGET DITERAPKAN*`,
        DIV,
        `▪ *Fitur:* ${reg.label}`,
        `▪ *Target:* SEMUA GRUP yang bot ikuti`,
      ].join("\n")))
    }
    if (opt === 'semua-dm' || opt === 'semuadm' || opt === 'gabungan' || opt === 'kombinasi' || opt === 'semua+dm') {
      setAutoTargetConfig(autoKey, { mode: 'semua-dm', groups: [], dm: 'all' })
      return m.reply(raraWrap("Switch Auto Target", [
        `✅ *TARGET DITERAPKAN*`,
        DIV,
        `▪ *Fitur:* ${reg.label}`,
        `▪ *Target:* SEMUA GRUP + SEMUA DM user terdaftar`,
      ].join("\n")))
    }

    // ── set grup [nomor,nomor] ──
    if (opt === 'grup' || opt === 'group') {
      const groups = await listBotGroups(sock)
      // 🔹 Tombol nav kirim JID langsung; ketik manual pakai nomor list — dua-duanya jalan.
      // JID mentah (dari klik tombol) tetap valid WALAU groupFetchAllParticipating kosong.
      // JID pakai args CASE ASLI (rest di-lowercase — jangan ngerusak jid dari tombol).
      const restRaw = (setIdx >= 0 ? argsRaw.slice(setIdx + 1) : [])
      const pickArg = restRaw[1] || ''
      const rawJids = /@g\.us/.test(pickArg)
        ? pickArg.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => s.endsWith('@g.us'))
        : []
      if (!groups.length && !rawJids.length) {
        return m.reply(`⚠ Bot tidak menemukan grup yang diikutinya.`)
      }
      const picks = rawJids.length
        ? rawJids
        : (pickArg ? parseGroupPicks(pickArg, groups) : [])
      if (picks.length) {
        setAutoTargetConfig(autoKey, { mode: 'grup', groups: picks, dm: null })
        const nama = picks.map((jid) => { const g = groups.find((x) => x.jid === jid); return g ? g.subject : jid })
        return m.reply(raraWrap("Switch Auto Target", [
          `✅ *TARGET DITERAPKAN (${picks.length} GRUP)*`,
          DIV,
          ...nama.map((n, i) => `▪ ${i + 1}. ${n}`),
        ].join("\n")))
      }
      // tanpa nomor → TOMBOT NAV (request owner 12 Sep: tombol biar gampang):
      // single_select daftar grup (kirim JID langsung) + quick_reply nav
      const body = raraWrap("Switch Auto Target", [
        `📍 *FITUR:* ${reg.label}`,
        DIV,
        `▪ *Mode:* pilih grup tujuan`,
        `▪ *Grup terdeteksi:* ${groups.length}`,
        ``,
        `📍 Tekan tombol *Pilih Grup* di bawah, atau ketik \`${prefix}switch auto ${autoKey} set grup <nomor>\` (bisa banyak: 1,3,5)`,
      ].join("\n"))
      const rows = groups.slice(0, 50).map((g) => ({
        title: (g.subject || g.jid).slice(0, 25),
        description: `${g.count} member${g.jid === m.chat ? " — chat ini" : ""}`,
        id: `${prefix}switch auto ${autoKey} set grup ${g.jid}`,
      }))
      try {
        await sock.sendButton(m.chat, null, body, m, {
          buttons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ title: "Pilih Grup", sections: [{ title: reg.label, rows }] }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "🌐 Semua Grup", id: `${prefix}switch auto ${autoKey} set semua` }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "◀️ Menu Target", id: `${prefix}switch auto ${autoKey} set` }) },
          ],
        })
      } catch {
        // fallback: teks polos
        let txt = raraWrap("Switch Auto Target", [
          `🌐 *PILIH GRUP TUJUAN ${reg.label.toUpperCase()}*`,
          DIV,
          ...groups.slice(0, 30).map((g, i) => `▪ ${i + 1}. ${g.subject || g.jid}${g.jid === m.chat ? ' ← (chat ini)' : ''}`),
          ``,
          `*Ketik:* \`${prefix}switch auto ${autoKey} set grup <nomor>\` (bisa banyak: 1,3,5)`,
        ].join("\n"))
        await m.reply(txt)
      }
      return
    }

    // ── set dm [nomor|semua] ──
    if (opt === 'dm' || opt === 'pc') {
      const sub = rest[1] || ''
      if (!sub) {
        // 🔹 TOMBOL NAV (request owner 12 Sep) — pilih via tombol atau ketik manual
        const body = raraWrap("Switch Auto Target", [
          `📍 *FITUR:* ${reg.label}`,
          DIV,
          `▪ *Mode:* pilih target DM`,
          ``,
          `▪ *DM nomor tertentu:* \`${prefix}switch auto ${autoKey} set dm 62812xxxxxxx\``,
          `▪ *Semua DM user terdaftar:* tekan tombol di bawah`,
        ].join("\n"))
        try {
          await sock.sendButton(m.chat, null, body, m, {
            buttons: [
              { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "👥 Semua User DM", id: `${prefix}switch auto ${autoKey} set dm semua` }) },
              { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "◀️ Menu Target", id: `${prefix}switch auto ${autoKey} set` }) },
            ],
          })
        } catch {
          await m.reply(raraWrap("Switch Auto Target", [
            `📮 *PILIH TARGET DM UNTUK ${reg.label.toUpperCase()}*`,
            DIV,
            `▪ *DM nomor tertentu:* \`${prefix}switch auto ${autoKey} set dm 62812xxxxxxx\``,
            `▪ *Semua DM user terdaftar:* \`${prefix}switch auto ${autoKey} set dm semua\``,
          ].join("\n")))
        }
        return
      }
      if (sub === 'semua' || sub === 'all' || sub === 'user' || sub === 'users') {
        setAutoTargetConfig(autoKey, { mode: 'dm', groups: [], dm: 'all' })
        return m.reply(raraWrap("Switch Auto Target", [
          `✅ *TARGET DITERAPKAN*`,
          DIV,
          `▪ *Fitur:* ${reg.label}`,
          `▪ *Target:* SEMUA DM user terdaftar`,
        ].join("\n")))
      }
      const jid = toWaJid(sub)
      if (!jid || jid.replace(/\D/g, '').length < 8) {
        return m.reply(raraWrap("switch", `⚠ Nomor tidak valid. Contoh: \`${prefix}switch auto ${autoKey} set dm 628123456789\``, "guide"))
      }
      setAutoTargetConfig(autoKey, { mode: 'dm', groups: [], dm: jid.replace('@s.whatsapp.net', '') })
      return m.reply(raraWrap("Switch Auto Target", [
        `✅ *TARGET DITERAPKAN*`,
        DIV,
        `▪ *Fitur:* ${reg.label}`,
        `▪ *Target:* DM ${jid}`,
      ].join("\n")))
    }

    // ── set (tanpa opsi) → status + TOMBOL NAV (request owner 12 Sep: "tambah
    // tombol nav agar mempermudah") — pilih DM/grup/global via tombol, fallback teks
    const setCmd = (sub) => `${prefix}switch auto ${autoKey} set ${sub}`
    const body = raraWrap("Switch Auto Target", [
      `📍 *FITUR:* ${reg.label}`,
      DIV,
      `▪ *Target sekarang:* ${describeAutoTarget(cfg)}`,
      ``,
      secTitle("🎯", "PILIH MODE PENGIRIMAN"),
      DIV,
      `▪ *🌐 Semua Grup* — semua grup yang bot ikuti`,
      `▪ *📍 Grup Tertentu* — pilih grup satu per satu`,
      `▪ *📮 DM* — nomor tertentu / semua user terdaftar`,
      `▪ *🔀 Gabungan* — semua grup + semua DM`,
      `▪ *♻️ Reset* — kembali ke default (semua grup)`,
    ].join("\n"))
    try {
      await sock.sendButton(m.chat, null, body, m, {
        buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "🌐 Semua Grup", id: setCmd('semua') }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "📍 Grup Tertentu", id: setCmd('grup') }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "📮 DM", id: setCmd('dm') }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "🔀 Gabungan", id: setCmd('gabungan') }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "♻️ Reset", id: setCmd('reset') }) },
        ],
      })
    } catch {
      await m.reply(raraWrap("Switch Auto Target", [
        `🎯 *TARGET ${reg.label.toUpperCase()}*`,
        DIV,
        `▪ *Sekarang:* ${describeAutoTarget(cfg)}`,
        ``,
        secTitle("📋", "OPSI"),
        DIV,
        `▪ \`${prefix}switch auto ${autoKey} set semua\` — semua grup`,
        `▪ \`${prefix}switch auto ${autoKey} set grup\` — pilih grup tertentu`,
        `▪ \`${prefix}switch auto ${autoKey} set dm\` — DM nomor / semua user`,
        `▪ \`${prefix}switch auto ${autoKey} set gabungan\` — semua grup + semua DM`,
        `▪ \`${prefix}switch auto ${autoKey} set reset\` — kembali ke default`,
      ].join("\n")))
    }
    return
  }

  // No action — show status + usage
  if (!action || (action !== 'on' && action !== 'off')) {
    const current = reg.getStatus()
    let replyTxt = raraWrap("Switch Auto", [
      `⚡ *FITUR:* ${reg.label}`,
      DIV,
      `▪ *Status:* ${stOn(current)}`,
      ``,
      secTitle("🎯", "PERINTAH"),
      DIV,
      `▪ *Aktifkan:* \`${prefix}switch auto ${autoKey} on\``,
      `▪ *Matikan:* \`${prefix}switch auto ${autoKey} off\``,
    ].join("\n"))
    // Fitur targetable: tampilkan target sekarang di status
    const TARGETABLE = ['autosholat', 'autobmkg', 'autoweatherrealtime', 'autoloker', 'autoanimenotifier', 'autobolanotify', 'bencanawatch', 'autoanime', 'autoreengage', 'autoulah', 'autoreport', 'autorenewal', 'autoberitanotify', 'automovienotifier', 'autolinkedin', 'autorainnotify', 'webwatch', 'cryptoalert', 'autohealth', 'autorefill', 'autobackup']
    const SUBSCRIBER_FEATURES = { bencanawatch: 1, autoanime: 1, autoanimenotifier: 1, autobolanotify: 1, autolinkedin: 1, autoberitanotify: 1, automovienotifier: 1, autorainnotify: 1 }
    if (TARGETABLE.includes(autoKey)) {
      const cfg = getAutoTargetConfig(autoKey)
      replyTxt += `\n\n🎯 *Target:* ${describeAutoTarget(cfg)}\n▪ *Atur:* \`${prefix}switch auto ${autoKey} set\`` + (SUBSCRIBER_FEATURES[autoKey] ? '\n▪ ℹ️ Subscriber tetap dapat notif — target terpusat nambah jangkauan' : '')
    }
    return m.reply(replyTxt)
  }

  // Toggle
  const enable = action === 'on'
  try {
    reg.toggle(enable, { sock }) // sock dikasih buat fitur yang butuh (V1 winbu); entry lain nge-ignore

    const base = raraWrap("Switch Auto", [
      `${enable ? "✅" : "❌"} *${reg.label.toUpperCase()}: ${enable ? "ON" : "OFF"}*`,
      `▪ ${scopeLine(FEATURE_SCOPES.global)}`,
    ].join("\n"))

    // ── TOMBOL PILIH TARGET (request owner: "ngetik cmd ribet, mending tombol") ──
    // Begitu fitur ber-target di-ON, langsung tampilkan tombol DM/grup/gabungan
    // — gak perlu hafal `.switch auto <fitur> set ...`.
    if (enable && AUTO_TARGETABLE.includes(autoKey)) {
      const cfgNow = getAutoTargetConfig(autoKey)
      // Peringatan khusus bencana: ON di sini gak cukup, butuh subscriber.
      let extraWarn = ''
      if (autoKey === 'bencanawatch') {
        let n = 0
        try { n = bencanaWatcherCount() } catch { n = 0 }
        if (n === 0) {
          extraWarn = `\n\n⚠️ Belum ada SUBSCRIBER — notifikasi bencana BELUM akan terkirim.\nJalankan \`${prefix}disastersystemwatch on\` di chat/grup target (atau pakai tombol target di bawah).`
        }
      }
      // v24.2.3 — auto berita: `enabled` saja TIDAK cukup, wajib ada PENERIMA.
      // Dulu nyalain via .switch = enabled true tapi subscribers kosong →
      // runCheck balik "gak ada subscriber/target" → 0 pesan (senyap).
      if (autoKey === 'autoberitanotify') {
        let subs = 0, hasTarget = false
        try { subs = (beritaStatusInfo().subscribers || []).length } catch { subs = 0 }
        try { hasTarget = !!getAutoTargetConfig('autoberitanotify') } catch { hasTarget = false }
        if (!subs && !hasTarget) {
          extraWarn = `\n\n⚠️ Belum ada PENERIMA — notifikasi berita BELUM akan terkirim.\n• Pilih target lewat TOMBOL di bawah, ATAU\n• Jalankan \`${prefix}beritanotify on\` di chat/grup yang mau dapat berita.`
        }
      }
      const body = raraWrap("Switch Auto Target", [
        `✅ *${reg.label.toUpperCase()}: ON*`,
        DIV,
        `▪ *Target sekarang:* ${describeAutoTarget(cfgNow)}`,
        ``,
        secTitle("🎯", "MAU DIKIRIM KE MANA?"),
        DIV,
        `▪ *🌐 Semua Grup* — semua grup yang bot ikuti`,
        `▪ *📍 Grup Tertentu* — pilih grup satu per satu`,
        `▪ *📮 DM* — nomor tertentu / semua user terdaftar`,
        `▪ *🔀 Gabungan* — semua grup + semua DM`,
        `▪ *♻️ Reset* — kembali ke default (semua grup)`,
      ].join("\n")) + extraWarn
      const setCmd = (sub) => `${prefix}switch auto ${autoKey} set ${sub}`
      try {
        await sock.sendButton(m.chat, null, body, m, {
          buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "🌐 Semua Grup", id: setCmd('semua') }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "📍 Grup Tertentu", id: setCmd('grup') }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "📮 DM", id: setCmd('dm') }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "🔀 Gabungan", id: setCmd('gabungan') }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "♻️ Reset", id: setCmd('reset') }) },
          ],
        })
        return
      } catch {
        // fallback teks kalau tombol gak didukung di chat ini
        return m.reply(base + `\n\n▪ *Atur target:* \`${prefix}switch auto ${autoKey} set\``)
      }
    }

    return m.reply(base)
  } catch (e) {
    return m.reply(`❌ ${e.message || e}`)
  }
}

// ═══════════════════════════════════════════════════════════
// FITUR HANDLER
// ═══════════════════════════════════════════════════════════
async function handleFitur(m, { sock, config: cfg }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const rawArgs = m.args || []

  // BUG FIX: dulu cuma nerima urutan "<verb> <target>" (fitur off rpg).
  // Owner (dan pattern .switch auto <key> on/off di plugin ini sendiri)
  // wajarnya ketik "<target> <verb>" (fitur maker on) — verb "on"/"off"
  // di posisi akhir KEINJEK, "maker" dikira verb, jatuh ke mode=toggle
  // yang MENGABAIKAN "on" user & malah toggle kategori (kalau lagi aktif
  // jadi nonaktif, kebalikan dari intent user). Sekarang cari token
  // on/off/list DI MANA PUN posisinya — support DUA urutan.
  const args = (rawArgs[0]?.toLowerCase() === 'fitur' || rawArgs[0]?.toLowerCase() === 'command' || rawArgs[0]?.toLowerCase() === 'cmd')
    ? rawArgs.slice(1)
    : rawArgs.slice()
  const lower = args.map((a) => (a || '').toLowerCase())

  const disabledCmds = db.setting("disabledCommands") || []
  const disabledCats = db.setting("disabledCategories") || []

  if (lower.includes('list')) {
    const allCats = [...(pluginStore.categories?.keys() || [])].sort()
    let text = raraWrap("Switch Fitur", [
      `⚙️ *KATEGORI (${allCats.length})*`,
      DIV,
    ].join("\n"))
    for (const cat of allCats) {
      const isOff = disabledCats.includes(cat)
      text += `\n${scLine(cat, !isOff)}`
    }
    if (disabledCmds.length > 0) {
      text += `\n\n` + secTitle("🚫", "COMMAND NONAKTIF", disabledCmds.length) + `\n` + DIV
      for (const cmd of disabledCmds) text += `\n▪ *${cmd}:* ❌ OFF`
    }
    return m.reply(text)
  }

  const verbIdx = lower.findIndex((a) => a === 'on' || a === 'off')
  let action, target
  if (verbIdx !== -1) {
    // Verb ketemu di posisi mana pun — sisa token (selain verb) jadi target.
    // Ambil token pertama yang BUKAN verb (biasanya cuma ada 1 target).
    action = lower[verbIdx]
    target = lower.find((a, i) => i !== verbIdx) || ''
  } else if (lower.length === 1) {
    // Cuma 1 token tanpa verb (".switch fitur rpg") — legacy toggle
    action = lower[0]
    target = ''
  } else {
    action = lower[0] || ''
    target = lower[1] || ''
  }

  if (!action) {
    let text = raraWrap("Switch Fitur", [
      `🎯 *PANDUAN*`,
      DIV,
      `▪ \`${prefix}switch fitur rpg off\` atau \`off rpg\` → matikan kategori`,
      `▪ \`${prefix}switch fitur maker on\` atau \`on maker\` → hidupkan (2 urutan sama-sama jalan)`,
      `▪ \`${prefix}switch fitur list\` → lihat semua status`,
      ``,
      secTitle("🚫", "KATEGORI NONAKTIF"),
      DIV,
      `▪ ${disabledCats.length > 0 ? disabledCats.map((c) => `*${c}*`).join(", ") : "semua kategori aktif"}`,
      ``,
      secTitle("🚫", "COMMAND NONAKTIF"),
      DIV,
      `▪ ${disabledCmds.length > 0 ? disabledCmds.map((c) => `*${c}*`).join(", ") : "semua command aktif"}`,
    ].join("\n"))
    return m.reply(text)
  }

  let mode = '', name = ''
  if (action === 'on') { mode = 'on'; name = target }
  else if (action === 'off') { mode = 'off'; name = target }
  else { mode = 'toggle'; name = action }

  if (!name)
    return m.reply(raraWrap("switch", `Contoh: \`${prefix}switch fitur off rpg\`\nContoh: \`${prefix}switch fitur maker on\``, "guide"))

  const allCats = [...(pluginStore.categories?.keys() || [])].sort()
  const allCmds = [...(pluginStore.commands?.keys() || [])].sort()
  const isCategory = allCats.includes(name)
  const isCommand = allCmds.includes(name)

  if (!isCategory && !isCommand)
    return m.reply(raraWrap("switch", `❌ Tidak ditemukan: ${name}\nKetik \`${prefix}switch fitur list\``, "guide"))
  // GUARD self-lockout: command switch (+ alias togglefitur/onofffitur/enable/
  // disable) DAN kategori "owner" (switch sendiri ada di kategori ini) gak
  // boleh dinonaktifkan mode='off'/'toggle'-ke-off — kalau ke-disable, owner
  // gak punya jalan lagi buat nyalain balik (chicken-egg, .switch dibutuhkan
  // buat nyalain .switch). mode='on' tetap diizinkan (buat bersihin sisa
  // data lama sebelum fix ini).
  const SWITCH_ALIASES = ["switch", "enable", "disable", "togglefitur", "onofffitur", "onoff"]
  const isSwitchLockRisk = (isCommand && SWITCH_ALIASES.includes(name)) || (isCategory && name === 'owner')
  if (isSwitchLockRisk && mode !== 'on')
    return m.reply(raraWrap("Switch Fitur", [
      `🔒 *TIDAK BISA MENONAKTIFKAN ${name.toUpperCase()}*`,
      DIV,
      `▪ Ini akan mengunci owner sendiri dari .switch (self-lockout)`,
      `▪ Command/kategori ini dikecualikan permanen`,
    ].join("\n")))

  const type = isCategory ? "kategori" : "command"
  const list = isCategory ? disabledCats : disabledCmds
  const idx = list.indexOf(name)
  const isCurrentlyOff = idx !== -1
  let newState

  if (mode === 'on') {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else return m.reply(raraWrap("Switch Fitur", [
      `✅ *${type.toUpperCase()} ${name.toUpperCase()} SUDAH AKTIF*`,
    ].join("\n")))
  } else if (mode === 'off') {
    if (!isCurrentlyOff) { list.push(name); newState = true }
    else return m.reply(raraWrap("Switch Fitur", [
      `❌ *${type.toUpperCase()} ${name.toUpperCase()} SUDAH NONAKTIF*`,
    ].join("\n")))
  } else {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else { list.push(name); newState = true }
  }

  if (isCategory) db.setting("disabledCategories", disabledCats)
  else db.setting("disabledCommands", disabledCmds)

  const status = newState ? "Nonaktif" : "Aktif"
  return m.reply(raraWrap("Switch Fitur", [
    `${newState ? "❌" : "✅"} *${type.toUpperCase()} ${name.toUpperCase()}: ${newState ? "NONAKTIF" : "AKTIF"}*`,
  ].join("\n")))
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// MASTER SWITCH (request owner 10 Sep 2026): ".switch semua on|off"
// SEMUANYA sekaligus: auto (semua fitur otomatis) + saluran (semua event)
// + group (semua fitur grup × semua grup yang bot ikuti).
// ═══════════════════════════════════════════════════════════
async function handleMaster(m, { sock, config: cfg }) {
  const prefix = cfg?.command?.prefix || '.'
  const db = getDatabase()
  const action = ((m.args || [])[1] || '').toLowerCase()
  if (action !== 'on' && action !== 'off')
    return m.reply(raraWrap("Switch Semua", [
      `🛑 *MASTER SWITCH TERPUSAT*`,
      DIV,
      `▪ *Auto* — semua fitur otomatis`,
      `▪ *Saluran* — semua event notifikasi`,
      `▪ *Group* — semua fitur grup, semua grup`,
      ``,
      `*Gunakan:* \`${prefix}switch semua on\` atau \`${prefix}switch semua off\``,
      ``,
      `*Butuh lebih halus?* \`${prefix}switch auto all\`, \`${prefix}switch channel all\`, \`${prefix}switch group all\``,
    ].join("\n")))

  const on = action === 'on'

  // 1. SEMUA fitur otomatis
  let autoOk = 0, autoFail = 0
  for (const reg of Object.values(AUTO_REGISTRY)) {
    try { reg.toggle(on); autoOk++ } catch { autoFail++ }
  }

  // 2. SEMUA event saluran
  let channelCount = 0
  for (const key of Object.keys(NOTIFY_EVENTS)) {
    try { setNotifyEnabled(key, on); channelCount++ } catch {}
  }

  // 3. SEMUA fitur grup × semua grup
  let groupCount = 0
  const featureCount = Object.keys(GROUP_FEATURES).length
  let groups = {}
  try { groups = (await sock.groupFetchAllParticipating()) || {} } catch {}
  for (const g of Object.values(groups)) {
    for (const f of Object.values(GROUP_FEATURES)) {
      try { db.setGroup(g.id, { [f.dbKey]: on ? f.on : f.off }) } catch {}
    }
    groupCount++
  }

  return m.reply(raraWrap("Switch Semua", [
    `${on ? "✅" : "❌"} *SEMUA ${on ? "ON" : "OFF"}*`,
    DIV,
    `▪ *Auto:* ${autoOk} fitur${autoFail ? ` (gagal: ${autoFail})` : ""}`,
    `▪ *Saluran:* ${channelCount} event`,
    `▪ *Group:* ${featureCount} fitur × ${groupCount} grup`,
    ``,
    `*Cek detail:* \`${prefix}switch status all\``,
  ].join("\n")))
}

// STATUS ALL (request owner 10 Sep 2026): ".switch status all"
// Tampilkan SEMUA status switch — yang aktif & yang mati:
// auto (semua kategori) + saluran + group (chat ini) + ringkasan fitur
// ═══════════════════════════════════════════════════════════
async function handleStatusAll(m, { sock, config: cfg }) {
  const prefix = cfg?.command?.prefix || '.'
  const db = getDatabase()
  let on = 0, off = 0, total = 0
  let txt = ""

  // ── AUTO: semua kategori (🌍 global — grup & DM) ──
  for (const [cat, features] of Object.entries(AUTO_CATEGORIES)) {
    txt += secTitle("🌍", cat, features.length) + "\n" + DIV + "\n"
    for (const key of features) {
      const reg = AUTO_REGISTRY[key]
      if (!reg) continue
      const enabled = reg.getStatus()
      total++; enabled ? on++ : off++
      txt += `${scLine(reg.label || key, enabled)}\n`
    }
    txt += `\n`
  }

  // ── SALURAN: semua event channel ──
  const statuses = getAllNotifyStatus()
  txt += secTitle("📢", "Saluran", Object.keys(statuses).length) + "\n" + DIV + "\n"
  for (const [, info] of Object.entries(statuses)) {
    total++; info.enabled ? on++ : off++
    txt += `${scLine(info.label, info.enabled)}\n`
  }
  txt += `\n`

  // ── GROUP: fitur grup chat ini (kalau dari dalam grup) ──
  if (String(m.chat || "").endsWith("@g.us")) {
    const groupData = db.getGroup(m.chat) || {}
    txt += secTitle("📍", "Group (Chat Ini)", Object.keys(GROUP_FEATURES).length) + "\n" + DIV + "\n"
    for (const [, features] of Object.entries(GROUP_CATEGORIES)) {
      for (const feat of features) {
        const gf = GROUP_FEATURES[feat]
        if (!gf) continue
        const active = isOn(groupData[gf.dbKey], gf.on)
        total++; active ? on++ : off++
        txt += `${scLine(gf.label, active)}\n`
      }
    }
    txt += `\n`
  }

  // ── FITUR: ringkasan command/kategori yang di-disable ──
  const disabledCmds = db.setting("disabledCommands") || []
  const disabledCats = db.setting("disabledCategories") || []
  txt += secTitle("⚙️", "Fitur & Command") + "\n" + DIV
  txt += `\n▪ *Command nonaktif:* ${disabledCmds.length}`
  txt += `\n▪ *Kategori nonaktif:* ${disabledCats.length}`
  if (disabledCats.length) txt += `\n▪ ${disabledCats.join(", ")}`

  txt += "\n\n" + secTitle("📊", "RINGKASAN") + "\n" + DIV
  txt += `\n▪ *Aktif:* ${on} | *Mati:* ${off} | *Total:* ${total}`
  txt += `\n▪ *Legenda:* 📍 Grup (hanya di grup) | 🌍 Global (grup & DM) | 📢 Saluran (broadcast di saluran WA)`
  txt += `\n▪ *Detail:* \`${prefix}switch auto\` | \`${prefix}switch channel\` | \`${prefix}switch group\` | \`${prefix}switch fitur\``
  return m.reply(raraWrap("Switch Status", txt.trim()))
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const prefix = m.prefix || '.'
  const text = raraWrap("Switch", [
    `🎛️ *PILIH KATEGORI TOGGLE*`,
    DIV,
    `▪ *📢 Saluran* — notifikasi event ke channel WhatsApp → \`${prefix}switch channel\``,
    `▪ *🏠 Group* — fitur grup (welcome, antilink, dll) → \`${prefix}switch group\``,
    `▪ *⚡ Auto* — semua fitur auto (backup, read, BMKG, dll) → \`${prefix}switch auto\``,
    `▪ *⚙️ Fitur* — on/off command atau kategori plugin → \`${prefix}switch fitur\``,
    `▪ *🛑 Semua (master)* — SEMUANYA on/off sekaligus → \`${prefix}switch semua on|off\``,
    `▪ *📊 Status semua* — semua status aktif & mati → \`${prefix}switch status all\``,
    ``,
    `*Alias lama masih works:* .enable .disable .togglefitur .autoread .autobackup dll`,
  ].join("\n"))

  try {
    const thumb = fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'rara.jpg'))
    await sock.sendButton(m.chat, thumb, text, m, {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📢 Channel', id: `${prefix}switch channel` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Group', id: `${prefix}switch group` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⚡ Auto', id: `${prefix}switch auto` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⚙️ Fitur', id: `${prefix}switch fitur` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📊 Status Semua', id: `${prefix}switch status all` }) },
      ],
    })
  } catch {
    await m.reply(text)
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
async function handler(m, { sock, config: cfg }) {
  try {
    const cmd = m.command || ''
    const args = m.args || []
    const mode = getMode(cmd, args)

    if (mode === 'menu') return showMenu(m, sock)
    if (mode === 'channel') return handleChannel(m, { sock, config: cfg })
    if (mode === 'group') return handleGroup(m, { sock, config: cfg })
    if (mode === 'group:on') return handleGroup(m, { sock, config: cfg })
    if (mode === 'group:off') return handleGroup(m, { sock, config: cfg, forceOff: true })
    if (mode === 'fitur') return handleFitur(m, { sock, config: cfg })
    if (mode === 'master') return handleMaster(m, { sock, config: cfg })
    // ═══ DIRECT FITUR: ".switch <fitur> on|off [target]" — terpusat ═══
    if (mode === 'direct:group')
      return handleGroup(m, { sock, config: cfg, direct: {
        featureName: (args[0] || '').toLowerCase(),
        mode: (args[1] || '').toLowerCase(),
        target: (args[2] || '').toLowerCase(),
      } })
    if (mode.startsWith('direct:auto:')) {
      const autoKey = mode.split(':')[2]
      return handleAuto(m, { sock, config: cfg, autoKey, explicitAction: (args[1] || '').toLowerCase() })
    }
    if (mode === 'direct:channel')
      return handleChannel(m, { sock, config: cfg, direct: {
        event: (args[0] || '').toLowerCase(),
        verb: (args[1] || '').toLowerCase(),
      } })
    if (mode === 'status') return handleStatusAll(m, { sock, config: cfg })
    if (mode === 'auto') return handleAuto(m, { sock, config: cfg })
    if (mode.startsWith('auto:')) {
      const autoKey = mode.split(':')[1]
      return handleAuto(m, { sock, config: cfg, autoKey })
    }
    // ".switch auto <key> <action>" — action SUDAH resolved di getMode(),
    // JANGAN diturunkan ulang dari args di handleAuto (itu sumber bug-nya)
    if (mode.startsWith('switchauto:')) {
      const [, autoKey, explicitAction] = mode.split(':')
      return handleAuto(m, { sock, config: cfg, autoKey, explicitAction })
    }

    return showMenu(m, sock)
  } catch (e) {
    return m.reply(`❌ ${e.message || e}`)
  }
}

export { pluginConfig as config, handler }
