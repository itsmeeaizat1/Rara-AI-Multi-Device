// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// .weathersystemwatch — Unified Weather Control (owner only) (rename file owner 15 Sep 2026, wasal .autoweatherrealtime)
//
// .weathersystemwatch                → status
// .weathersystemwatch on             → tampilkan cuaca di info section
// .weathersystemwatch off            → sembunyikan cuaca dari info section
// .weathersystemwatch lokasi serang  → set lokasi (nama kota)
// .weathersystemwatch lokasi -6.12,106.14 → set lokasi (koordinat)
// .weathersystemwatch notification on  → aktifkan notifikasi cuaca ke grup
// .weathersystemwatch notification off → matikan notifikasi cuaca
// .weathersystemwatch jadwal 06:30 12:00 17:00 20:00 → set jadwal notif
// .weathersystemwatch threshold set <key> <nilai> → ubah ambang alert ekstrem
//   (heat/panas, cold/dingin, rain/hujan, wind/angin, storm/badai, humidityHigh/lembap,
//    humidityLow/kering — level Waspada/Siaga/Awas diturunkan otomatis; list/reset)
// .weathersystemwatch alert on/off/test    → alert CUACA EKSTREM (badai petir, hujan lebat,
//                                             angin kencang, panas ekstrem, kabut — level Waspada/Siaga/Awas
//                                             ala EWS, cek tiap 30 mnt, bypass mode jadwal/interval)
// .weathersystemwatch interval 2            → update otomatis tiap 2 jam ala script (off = balik jadwal)
// .weathersystemwatch otomatis [menit]      → MODE OTOMATIS: cek tiap N menit (default 5),
//                                               kirim notifikasi PAS cuaca berubah (off = balik interval)
// .weathersystemwatch provider <openmeteo|bmkg|metno|weatherapi|aggregate> → pilih sumber cuaca notif
//   aggregate = gabungan 4 provider (rata-rata + kondisi dominan + konfidensi)
// .weathersystemwatch adm4 31.71.03.1001    → kode wilayah BMKG (verified live saat diset)
// .weathersystemwatch target <jid>   → set grup target notif
// .weathersystemwatch test            → test kirim cuaca sekarang
// ============================================================

import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { toSC, novaError } from "../../src/lib/nova-menu-style.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "" manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import { clearWeatherCache, getWeatherFooter, getWeatherAddress } from "../../src/lib/nova-weather-footer.js";
import { fetchWeatherForSettings, fetchBmkgNow, formatWeatherUpdate, formatActivationMessage } from "../../src/lib/nova-weather-notify.js";
import { resetIntervalState, resetAlertState, resetAutoState, checkWeatherAlert, setAutoGroupForTest } from "../../src/lib/nova-weather-realtime-scheduler.js";
import { evaluateWeatherAlert, formatAlertMessage, buildThresholds, THRESHOLD_BASE } from "../../src/lib/nova-weather-alert.js";
import { weatherGroupOf } from "../../src/lib/nova-weather-notify.js";

const pluginConfig = {
  name: "weathersystemwatch",
  alias: ["weathersystemwatch"], // rename owner 15 Sep 2026: alias lama (weathersystemwatch/autocuacarealtime) dihapus
  category: "owner",
  description: "Atur cuaca realtime di info section + notifikasi scheduler",
  usage: ".weathersystemwatch <on/off/lokasi/notification/alert/threshold/jadwal/interval/otomatis/tesubah [cerah|mendung|hujan|petir]/provider aggregate|bmkg|metno|weatherapi|openmeteo/adm4/target dm|grup|grup <nomor>|JID/test>",
  example: ".weathersystemwatch on\n.weathersystemwatch lokasi serang\n.weathersystemwatch target 62123456789@s.whatsapp.net",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ── Settings helper ──
function getWRSettings(db) {
  const s = db.setting("weatherRealtime");
  if (!s) {
    // Default: ON, lokasi dari config, notification OFF
    return {
      realtime: true,
      location: config.weather?.location || { name: "Jakarta", latitude: -6.2088, longitude: 106.8456 },
      notification: false,
      schedules: [
        { key: "pagi", label: "Pagi", hour: 6, minute: 30 },
        { key: "siang", label: "Siang", hour: 12, minute: 0 },
        { key: "sore", label: "Sore", hour: 17, minute: 0 },
        { key: "malam", label: "Malam", hour: 20, minute: 0 },
      ],
      target: null, // group JID for notifications
      // ── upgrade ala script owner 8 Sep 2026 ──
      notificationMode: "otomatis", // UPGRADE 15 Sep: default kirim PAS cuaca berganti ("jadwal" | "interval" | "otomatis")
      intervalHours: 2,           // interval mode: tiap N jam (script: 2 jam)
      provider: "openmeteo",      // "openmeteo" | "bmkg" | "metno" | "weatherapi" | "aggregate"
      adm4: null,                 // kode wilayah BMKG (contoh: 31.71.03.1001)
      alertEnabled: true,         // alert cuaca ekstrem (default ON ala EWS)
      thresholds: {},             // override basis threshold alert ({ heat: 38, wind: 45, ... })
    };
  }
  if (!s.notificationMode) s.notificationMode = "otomatis"; // UPGRADE 15 Sep: sesuai harapan owner
  if (!s.intervalHours) s.intervalHours = 2;
  if (!s.autoCheckMinutes) s.autoCheckMinutes = 5;
  if (!s.minGapMinutes) s.minGapMinutes = 10;
  if (!s.provider) s.provider = "openmeteo";
  if (s.adm4 === undefined) s.adm4 = null;
  if (s.alertEnabled === undefined) s.alertEnabled = true;
  if (!s.thresholds) s.thresholds = {};
  return s;
}

// Daftar semua grup yang bot ikuti (buat pilih target grup).
// Sort by subject biar nomor stabil antara ".target grup" & ".target grup <nomor>".
async function getBotGroups(sock) {
  try {
    const res = await sock.groupFetchAllParticipating();
    return Object.values(res || {})
      .map((g) => ({ jid: g.id, subject: g.subject || g.id }))
      .sort((a, b) => String(a.subject).localeCompare(String(b.subject)));
  } catch {
    return [];
  }
}

function saveWRSettings(db, data) {
  db.setting("weatherRealtime", data);
  db.save();
}

// ── Geocode city name ──
async function searchCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: r.name,
    admin1: r.admin1 || "",
    country: r.country || "",
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

// ── Parse time HH:MM ──
function parseTime(value) {
  // FIX 15 Sep 2026: regex lama punya "]" nyasar ([0-5]\d]) — jadwal
  // "06:30" GAK PERNAH valid dari dulu (command jadwal senyap gagal).
  const match = String(value || "").match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

// ── Format schedules ──
function formatSchedules(schedules) {
  return (schedules || [])
    .map(s => (s.label || s.key) + " " + String(s.hour).padStart(2, "0") + ":" + String(s.minute || 0).padStart(2, "0"))
    .join(", ") + " WIB";
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig, db }) {
  try {
    const db2 = getDatabase();
    const args = (m.args || []).map(a => String(a).trim());
    const action = (args.shift() || "").toLowerCase();
    const prefix = botConfig.command?.prefix || ".";

    // React loading
    try { await sock.sendMessage(m.chat, { react: { text: "🕒", key: m.key } }); } catch {}

    let settings = getWRSettings(db2);

    // ── No args → STATUS ──
    if (!action || action === "status") {
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "• " + toSC("Info Section") + " : " + (settings.realtime ? "ON ✅" : "OFF ❌") + "\n" +
        "• " + toSC("Lokasi") + " : " + (settings.location?.name || "-") + "\n" +
        "• " + toSC("Koordinat") + " : " + (settings.location?.latitude || "-") + ", " + (settings.location?.longitude || "-") + "\n" +
        "• " + toSC("Notifikasi") + " : " + (settings.notification ? "ON ✅" : "OFF ❌") + "\n" +
        "• " + toSC("Alert Ekstrem") + " : " + (settings.alertEnabled !== false ? "ON ✅" : "OFF ❌") + "\n" +
        "• " + toSC("Threshold") + " : " + (Object.keys(settings.thresholds || {}).length ? toSC("custom ") + "(" + Object.keys(settings.thresholds).join(", ") + ")" : toSC("default")) + "\n" +
        "• " + toSC("Mode Notif") + " : " + (settings.notificationMode === "otomatis" ? toSC("Otomatis — cek tiap ") + settings.autoCheckMinutes + toSC(" menit, kirim saat cuaca berubah") : settings.notificationMode === "interval" ? toSC("Interval ") + settings.intervalHours + toSC(" jam") : toSC("Jadwal")) + "\n" +
        "• " + toSC("Grup Terakhir") + " : " + (() => { const st = db2.setting("weatherRealtimeAuto"); return st?.lastGroup ? toSC(st.lastCondition || st.lastGroup) : toSC("belum ada (cek pertama bakal kirim cuaca sekarang)"); })() + "\n" +
        "• " + toSC("Jadwal") + " : " + formatSchedules(settings.schedules) + "\n" +
        "• " + toSC("Provider") + " : " + (settings.provider === "bmkg" ? "BMKG" + (settings.adm4 ? " (" + settings.adm4 + ")" : "") : settings.provider === "aggregate" ? toSC("AGGREGATE (4 provider)") : settings.provider === "metno" ? "MET Norway" : settings.provider === "weatherapi" ? "WeatherAPI" : "Open-Meteo") + "\n" +
        "• " + toSC("Target") + " : " + (settings.target || toSC("belum diset")) + "\n" +
        "📌 " + toSC("Perintah") + ":\n" +
        "• " + prefix + "weathersystemwatch on/off\n" +
        "• " + prefix + "weathersystemwatch lokasi serang\n" +
        "• " + prefix + "weathersystemwatch notification on\n" +
        "• " + prefix + "weathersystemwatch jadwal 06:30 12:00\n" +
        "• " + prefix + "weathersystemwatch alert on|off\n" +
        "• " + prefix + "weathersystemwatch threshold list\n" +
        "• " + prefix + "weathersystemwatch interval 2\n" +
        "• " + prefix + "weathersystemwatch provider bmkg|openmeteo\n" +
        "• " + prefix + "weathersystemwatch adm4 31.71.03.1001\n" +
        "• " + prefix + "weathersystemwatch target 62123456789@s.whatsapp.net\n" +
        "• " + prefix + "weathersystemwatch test\n" 
        )
      );
    }

    // ── ON ──
    if (action === "on") {
      settings.realtime = true;
      saveWRSettings(db2, settings);
      clearWeatherCache();
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Cuaca realtime AKTIF di info section") + "\n" +
        "• " + toSC("Lokasi") + " : " + (settings.location?.name || "-") + "\n" 
        )
      );
    }

    // ── OFF ──
    if (action === "off") {
      settings.realtime = false;
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "❌ " + toSC("Cuaca realtime DIMATIKAN") + "\n" +
        "• " + toSC("Cuaca tidak tampil di info section") + "\n" 
        )
      );
    }

    // ── LOKASI ──
    if (action === "lokasi" || action === "location") {
      const query = args.join(" ").trim();
      if (!query) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ":\n" +
          "• " + prefix + "weathersystemwatch lokasi Serang\n" +
          "• " + prefix + "weathersystemwatch lokasi -6.12,106.14\n" 
          )
        );
      }

      // Check if coordinates
      const coordMatch = query.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        settings.location = { name: lat + ", " + lng, latitude: lat, longitude: lng };
        // Sync ke config.weather juga
        if (!config.weather) config.weather = {};
        config.weather.location = settings.location;
        saveWRSettings(db2, settings);
        clearWeatherCache();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Lokasi diatur ke koordinat") + "\n" +
          "• Lat : " + lat + "\n" +
          "• Lng : " + lng + "\n" 
          )
        );
      }

      // Search city
      try {
        const result = await searchCity(query);
        if (!result) {
          try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "❌ " + toSC("Kota") + " \"" + query + "\" " + toSC("tidak ditemukan") + "\n" 
            )
          );
        }
        const fullName = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
        settings.location = { name: result.name, latitude: result.latitude, longitude: result.longitude };
        if (!config.weather) config.weather = {};
        config.weather.location = settings.location;
        saveWRSettings(db2, settings);
        clearWeatherCache();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Lokasi cuaca diatur ke") + "\n" +
          "• " + toSC("Nama") + " : " + fullName + "\n" +
          "• Lat : " + result.latitude + "\n" +
          "• Lng : " + result.longitude + "\n" 
          )
        );
      } catch (e) {
        try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
        return m.reply(novaError("Weather Realtime", "Gagal mencari kota: " + e.message));
      }
    }

    // ── NOTIFICATION ON/OFF ──
    if (action === "notification" || action === "notif") {
      const sub = (args.shift() || "").toLowerCase();
      if (sub === "on") {
        settings.notification = true;
        // Auto-set target ke chat sekarang kalau belum diset (grup ATAU DM —
        // owner yang aktifin di DM berarti mau update masuk ke DM itu)
        if (!settings.target) {
          settings.target = m.chat;
        }
        // UPGRADE 15 Sep 2026 (owner: "notif tiap cuaca berganti gak
        // kekirim"): penyebabnya mode default "jadwal" — notif cuma masuk
        // di jam jadwal (06:30/12:00/17:00/20:00), BUKAN saat cuaca
        // berganti. Sekarang notification on default MODE OTOMATIS:
        // cek tiap autoCheckMinutes menit, kirim pas GRUP cuaca berubah
        // (cerah→hujan dll). Mau mode jam tetap? Set eksplisit:
        // .weathersystemwatch jadwal 06:30 12:00
        if (settings.notificationMode === "jadwal") {
          settings.notificationMode = "otomatis";
        }
        if (!Number(settings.autoCheckMinutes) || Number(settings.autoCheckMinutes) < 1) settings.autoCheckMinutes = 5;
        if (!Number(settings.minGapMinutes) || Number(settings.minGapMinutes) < 1) settings.minGapMinutes = 10;
        saveWRSettings(db2, settings);
        resetIntervalState(); // ala script boot: kirim cuaca sekarang
        resetAlertState();    // alert ekstrem siap cek dari nol
        resetAutoState();     // mode otomatis siap deteksi perubahan dari nol
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}

        // ── ala script: SISTEM NOTIFIKASI CUACA AKTIF + cuaca sekarang ──
        const notifTarget = settings.target || m.chat;
        try {
          await sock.sendMessage(notifTarget, { text: formatActivationMessage(settings, settings.intervalHours) });
          const data = await fetchWeatherForSettings(settings);
          if (data) {
            const name = settings.provider === "bmkg"
              ? (settings.location?.name || "Wilayah BMKG")
              : (settings.location?.name || "Lokasi");
            await sock.sendMessage(notifTarget, { text: formatWeatherUpdate(data, name, settings.intervalHours) });
          }
        } catch (e) {
          console.error("[weathersystemwatch] activation sample:", e.message);
        }

        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Notifikasi cuaca AKTIF") + "\n" +
          "• " + toSC("Mode") + " : " + (settings.notificationMode === "otomatis" ? toSC("Otomatis — cek tiap ") + settings.autoCheckMinutes + toSC(" menit, kirim saat cuaca berubah") : settings.notificationMode === "interval" ? toSC("Interval ") + settings.intervalHours + toSC(" jam") : toSC("Jadwal")) + "\n" +
          "• " + toSC("Jadwal") + " : " + formatSchedules(settings.schedules) + "\n" +
          "• " + toSC("Provider") + " : " + (settings.provider === "bmkg" ? "BMKG" : settings.provider === "aggregate" ? toSC("AGGREGATE (4 provider)") : settings.provider === "metno" ? "MET Norway" : settings.provider === "weatherapi" ? "WeatherAPI" : "Open-Meteo") + "\n" +
          "• " + toSC("Target") + " : " + (settings.target || toSC("belum diset")) + "\n" +
          "📌 " + toSC("Pilih target") + ": " + prefix + "weathersystemwatch target dm (ke DM kamu) | target grup (daftar semua grup)\n" +
          "📌 " + toSC("Set jadwal") + ": " + prefix + "weathersystemwatch jadwal 06:30 12:00\n" +
          "📌 " + toSC("Mode interval") + ": " + prefix + "weathersystemwatch interval 2\n" 
          )
        );
      }
      if (sub === "off") {
        settings.notification = false;
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "❌ " + toSC("Notifikasi cuaca DIMATIKAN") + "\n" 
          )
        );
      }
      try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "⚠ " + toSC("Format") + ":\n" +
        "• " + prefix + "weathersystemwatch notification on\n" +
        "• " + prefix + "weathersystemwatch notification off\n" 
        )
      );
    }

    // ── THRESHOLD (set/list/reset — basis peringatan ekstrem) ──
    if (action === "threshold" || action === "th" || action === "ambang") {
      const sub = (args.shift() || "list").toLowerCase();
      const KEY_ALIAS = {
        heat: "heat", panas: "heat",
        cold: "cold", dingin: "cold",
        rain: "rain", hujan: "rain",
        wind: "wind", angin: "wind",
        storm: "storm", badai: "storm",
        humidityhigh: "humidityHigh", "lembap-tinggi": "humidityHigh", lembap: "humidityHigh",
        humiditylow: "humidityLow", kering: "humidityLow",
      };

      if (sub === "set") {
        const key = KEY_ALIAS[(args.shift() || "").toLowerCase()];
        const val = Number(args.shift());
        const base = key ? THRESHOLD_BASE[key] : null;
        if (!key || !base || !Number.isFinite(val) || val < base.min || val > base.max) {
          try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
          let list = "";
          for (const [k, b] of Object.entries(THRESHOLD_BASE)) {
            list += "• " + prefix + "weathersystemwatch threshold set " + k + " <" + b.min + "-" + b.max + " " + b.unit + "> — " + toSC(b.desc.split("(")[0].trim()) + "\n";
          }
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "⚠ " + toSC("Format threshold — nilai di luar range ditolak") + ":\n" + list +
            "• " + prefix + "weathersystemwatch threshold reset\n" 
            )
          );
        }
        settings.thresholds = { ...(settings.thresholds || {}), [key]: val };
        saveWRSettings(db2, settings);
        resetAlertState();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Threshold disimpan") + ": " + key + " = " + val + " " + base.unit + "\n" +
          "• " + toSC(base.desc) + "\n" +
          "• " + toSC("Level diturunkan otomatis Waspada/Siaga/Awas") + "\n" +
          "• " + toSC("Dedup alert direset — evaluasi ulang pakai threshold baru") + "\n" 
          )
        );
      }

      if (sub === "reset") {
        settings.thresholds = {};
        saveWRSettings(db2, settings);
        resetAlertState();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Threshold kembali ke default") + "\n" 
          )
        );
      }

      // list (default) — tampilkan nilai sekarang (custom atau default)
      const th = buildThresholds(settings.thresholds || {});
      let list = "";
      for (const [k, b] of Object.entries(THRESHOLD_BASE)) {
        const cur = (settings.thresholds || {})[k];
        const mark = cur !== undefined ? " [custom]" : "";
        if (k === "heat") list += "• heat/panas: " + th.heatWaspada + "/" + th.heatSiaga + "/" + th.heatAwas + " " + b.unit + mark + "\n";
        else if (k === "cold") list += "• cold/dingin: " + th.coldWaspada + "/" + th.coldSiaga + "/" + th.coldAwas + " " + b.unit + mark + "\n";
        else if (k === "rain") list += "• rain/hujan: " + th.precipWaspada + "/" + th.precipSiaga + "/" + th.precipAwas + " " + b.unit + mark + "\n";
        else if (k === "wind") list += "• wind/angin: " + th.windWaspada + "/" + th.windSiaga + "/" + th.windAwas + " " + b.unit + mark + "\n";
        else if (k === "storm") list += "• storm/badai: " + th.windWaspada + "/" + th.windSiaga + "/" + th.windAwas + " " + b.unit + mark + "\n";
        else if (k === "humidityHigh") list += "• humidityHigh/lembap: " + th.humidityHigh + b.unit + mark + "\n";
        else if (k === "humidityLow") list += "• humidityLow/kering: " + th.humidityLow + b.unit + mark + "\n";
      }
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime Threshold" + " ◆",
        toSC("Threshold alert ekstrem (Waspada/Siaga/Awas)") + ":\n" + list + "\n" +
        "📌 " + toSC("Ubah") + ": " + prefix + "weathersystemwatch threshold set heat 38\n" +
        "📌 " + toSC("Reset") + ": " + prefix + "weathersystemwatch threshold reset\n" 
        )
      );
    }

    // ── ALERT EKSTREM (on/off/test) ──
    if (action === "alert") {
      const sub = (args.shift() || "").toLowerCase();
      if (sub === "on" || sub === "off") {
        settings.alertEnabled = sub === "on";
        saveWRSettings(db2, settings);
        if (sub === "on") resetAlertState();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          (sub === "on" ? "✅ " + toSC("Alert cuaca ekstrem AKTIF") : "❌ " + toSC("Alert cuaca ekstrem DIMATIKAN")) + "\n" +
          "• " + toSC("Level") + " : " + (sub === "on" ? "🟡 " + toSC("Waspada") + " / 🟠 " + toSC("Siaga") + " / 🔴 " + toSC("Awas") : "-") + "\n" +
          "• " + toSC("Pemicu") + " : " + toSC("badai petir, hujan lebat, angin kencang, panas ekstrem, kabut") + "\n" +
          "• " + toSC("Cek tiap 30 menit saat notifikasi aktif") + "\n" 
          )
        );
      }
      if (sub === "test") {
        // Evaluasi live data sekarang + tampilkan hasil (walau gak ekstrem)
        try {
          const data = await fetchWeatherForSettings(settings);
          const alert = evaluateWeatherAlert(data, buildThresholds(settings.thresholds));
          try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
          if (!alert) {
            return m.reply(
              boxMessage("◆ " + "Weather Realtime" + " ◆",
              "✅ " + toSC("Tidak ada cuaca ekstrem saat ini") + "\n" +
              "• " + toSC("Kondisi sekarang") + " : " + (data?.condition || "-") + ", " + (data?.temperature ?? "-") + "°C\n" +
              "• " + toSC("Sistem alert jalan normal — akan kirim saat threshold tercapai") + "\n" 
              )
            );
          }
          return m.reply(formatAlertMessage(alert, data, settings.location?.name || "Lokasi"), { raw: true });
        } catch (e) {
          try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
          return m.reply(novaError("Weather Realtime", "Alert test gagal: " + e.message));
        }
      }
      try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "⚠ " + toSC("Format") + ":\n" +
        "• " + prefix + "weathersystemwatch alert on\n" +
        "• " + prefix + "weathersystemwatch alert off\n" +
        "• " + prefix + "weathersystemwatch alert test\n" 
        )
      );
    }

    // ── INTERVAL (ala script: update tiap N jam) ──
    // ── OTOMATIS (request owner 12 Sep 2026: "klo mode otomatis aktif tiap
    //    cuaca berubah dia kirim notifikasi — adanya mode jadwal semua") ──
    if (action === "otomatis" || action === "auto" || action === "realtime") {
      const sub = (args.shift() || "").toLowerCase();
      if (sub === "off") {
        // balik ke mode interval (ala script) — jadwal cuma kalau ada schedules
        const hasSchedules = Array.isArray(settings.schedules) && settings.schedules.length > 0;
        settings.notificationMode = hasSchedules ? "jadwal" : "interval";
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Mode otomatis dimatikan") + "\n" +
          "• " + toSC("Sekarang") + " : " + (settings.notificationMode === "jadwal" ? toSC("Jadwal") : toSC("Interval ") + settings.intervalHours + toSC(" jam")) + "\n"
          )
        );
      }
      // `otomatis [menit]` — menit opsional (1-60, default 5)
      const mnt = sub ? parseInt(sub, 10) : 5;
      if (!Number.isFinite(mnt) || mnt < 1 || mnt > 60) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ":\n" +
          "• " + prefix + "weathersystemwatch otomatis\n" +
          "• " + prefix + "weathersystemwatch otomatis 5\n" +
          "• " + prefix + "weathersystemwatch otomatis off\n" +
          "(" + toSC("cek tiap 1-60 menit, default 5 — kirim notif pas cuaca berubah") + ")\n"
          )
        );
      }
      settings.notificationMode = "otomatis";
      settings.autoCheckMinutes = mnt;
      saveWRSettings(db2, settings);
      resetAutoState();
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Mode Otomatis aktif") + "\n" +
        "• " + toSC("Cek cuaca tiap") + " " + mnt + " " + toSC("menit") + "\n" +
        "• " + toSC("Notifikasi terkirim PAS cuaca berubah") + "\n" +
        "• " + toSC("Anti bolak-balik") + " : " + toSC("kondisi barusan dikirim ditahan") + " " + settings.minGapMinutes + " " + toSC("menit") + "\n" +
        "• " + toSC("Cuaca sama") + " : " + toSC("diam, gak kirim ulang") + "\n"
        )
      );
    }

    if (action === "interval") {
      const sub = (args.shift() || "").toLowerCase();
      if (sub === "off") {
        settings.notificationMode = "jadwal";
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Mode kembali ke JADWAL") + "\n" +
          "• " + formatSchedules(settings.schedules) + "\n" 
          )
        );
      }
      const h = parseInt(sub, 10);
      if (!Number.isFinite(h) || h < 1 || h > 12) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ":\n" +
          "• " + prefix + "weathersystemwatch interval 2\n" +
          "• " + prefix + "weathersystemwatch interval off\n" +
          "(" + toSC("1-12 jam, ala script default 2 jam") + ")\n" 
          )
        );
      }
      settings.notificationMode = "interval";
      settings.intervalHours = h;
      saveWRSettings(db2, settings);
      resetIntervalState();
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Update otomatis tiap") + " " + h + " " + toSC("jam") + "\n" +
        "• " + toSC("Kondisi sama dilewati, gak spam") + "\n" +
        "• " + toSC("Target") + " : " + (settings.target || toSC("belum diset")) + "\n" 
        )
      );
    }

    // ── PROVIDER (openmeteo | bmkg | metno | weatherapi | aggregate) ──
    if (action === "provider" || action === "sumber") {
      const sub = (args.shift() || "").toLowerCase();
      const VALID = {
        openmeteo: "openmeteo", "open-meteo": "openmeteo",
        bmkg: "bmkg",
        metno: "metno", met: "metno", norway: "metno",
        weatherapi: "weatherapi", wa: "weatherapi",
        aggregate: "aggregate", multi: "aggregate", gabungan: "aggregate",
      };
      if (!VALID[sub]) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Pilih provider cuaca") + ":\n" +
          "• " + prefix + "weathersystemwatch provider aggregate\n" +
          "  (" + toSC("gabungan 4 provider, otomatis pilih yang akurat") + ")\n" +
          "• " + prefix + "weathersystemwatch provider openmeteo\n" +
          "• " + prefix + "weathersystemwatch provider bmkg\n" +
          "• " + prefix + "weathersystemwatch provider metno\n" +
          "• " + prefix + "weathersystemwatch provider weatherapi\n" +
          "(" + toSC("BMKG butuh adm4; WeatherAPI butuh key di config") + ")\n" 
          )
        );
      }
      const prov = VALID[sub];
      if (prov === "bmkg" && !settings.adm4) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Provider BMKG butuh kode wilayah (adm4)") + "\n" +
          "• " + prefix + "weathersystemwatch adm4 31.71.03.1001\n" +
          "(" + toSC("contoh: 31.71.03.1001 = Kemayoran, Jakarta Pusat") + ")\n" 
          )
        );
      }
      settings.provider = prov;
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      const label = prov === "aggregate" ? toSC("AGGREGATE — gabungan otomatis Open-Meteo, MET Norway, BMKG, WeatherAPI")
        : prov === "bmkg" ? "BMKG" + (settings.adm4 ? " (" + settings.adm4 + ")" : "")
        : prov === "metno" ? "MET Norway"
        : prov === "weatherapi" ? "WeatherAPI"
        : "Open-Meteo";
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Provider cuaca: ") + label + "\n" 
        )
      );
    }

    // ── ADM4 (kode wilayah BMKG) ──
    if (action === "adm4") {
      const code = (args.shift() || "").trim();
      if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(code)) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format kode wilayah: XX.XX.XX.XXXX") + "\n" +
          "• " + prefix + "weathersystemwatch adm4 31.71.03.1001\n" +
          "(" + toSC("contoh: 31.71.03.1001 = Kemayoran, Jakarta Pusat") + ")\n" 
          )
        );
      }
      // Verifikasi kode live ke BMKG
      try {
        const data = await fetchBmkgNow(code);
        settings.adm4 = code;
        settings.provider = "bmkg";
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Kode BMKG tersimpan & verified live") + "\n" +
          "• " + toSC("Kode") + " : " + code + "\n" +
          "• " + toSC("Cuaca sekarang") + " : " + data.condition + ", " + data.temperature + "°C\n" +
          "• " + toSC("Provider otomatis pindah ke BMKG") + "\n" 
          )
        );
      } catch (e) {
        try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
        return m.reply(novaError("Weather Realtime", "Kode wilayah BMKG tidak valid / tidak terdaftar: " + e.message));
      }
    }

    // ── JADWAL ──
    if (action === "jadwal" || action === "schedule") {
      const times = args.slice(0, 4);
      if (!times.length) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ": " + prefix + "weathersystemwatch jadwal 06:30 12:00 17:00 20:00\n" 
          )
        );
      }
      const labels = ["Pagi", "Siang", "Sore", "Malam"];
      const keys = ["pagi", "siang", "sore", "malam"];
      const schedules = [];
      for (let i = 0; i < times.length; i++) {
        const t = parseTime(times[i]);
        if (!t) {
          try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
          return m.reply(novaError("Weather Realtime", "Format waktu salah: " + times[i] + " (gunakan HH:MM)"));
        }
        schedules.push({ ...t, key: keys[i] || "t" + i, label: labels[i] || "Waktu " + (i + 1) });
      }
      settings.schedules = schedules;
      // UPGRADE 15 Sep: set jadwal eksplisit = user minta mode jadwal
      // (default sekarang otomatis — tanpa ini mode gak pindah sendiri)
      settings.notificationMode = "jadwal";
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Jadwal notifikasi diatur") + "\n" +
        "• " + formatSchedules(schedules) + "\n" +
        "📌 " + toSC("Mode aktif") + ": " + toSC("Jadwal — balik ke kirim-saat-berganti") + ": " + prefix + "weathersystemwatch otomatis\n"
        )
      );
    }

    // ── TARGET ──
    if (action === "target") {
      // ── request owner 8 Sep 2026: pilih target DM / grup (bisa pilih grup mana) ──
      const tArg = (args.shift() || "").toLowerCase().trim();

      // tanpa arg → jalankan di chat ini (auto-set, default otomatis)
      if (!tArg) {
        settings.target = m.chat;
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Target notifikasi diatur ke chat ini") + "\n" +
          "• " + toSC("Chat") + " : " + m.chat + "\n" +
          "💡 " + toSC("Pilih DM/grup lain") + ": " + prefix + "weathersystemwatch target dm | target grup\n"
        )
        );
      }

      // ── target dm → kirim ke DM yang ngetik command ──
      if (tArg === "dm" || tArg === "pribadi" || tArg === "saya") {
        settings.target = m.sender;
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Update cuaca dikirim ke DM kamu") + "\n" +
          "• " + toSC("DM") + " : " + m.sender + "\n"
        )
        );
      }

      // ── target grup [nomor] → daftar semua grup yang bot ikuti / pilih ──
      if (tArg === "grup" || tArg === "group" || tArg === "grupnya") {
        const list = await getBotGroups(sock);
        if (!list.length) {
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "⚠ " + toSC("Bot tidak menemukan grup yang diikuti") + "\n" +
            "• " + toSC("Coba") + ": " + prefix + "weathersystemwatch target 62123456789-1234@g.us\n"
          )
          );
        }
        const nomor = parseInt((args.shift() || "").replace(/\D/g, ""), 10);
        // ada nomor → langsung pilih grup ke-N dari daftar
        if (nomor >= 1 && nomor <= list.length) {
          const pilih = list[nomor - 1];
          settings.target = pilih.jid;
          saveWRSettings(db2, settings);
          try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "✅ " + toSC("Update cuaca dikirim ke grup") + "\n" +
            "• " + toSC("Grup") + " : " + pilih.subject + "\n" +
            "• " + pilih.jid + "\n"
          )
          );
        }
        // tanpa nomor valid → tampilin daftar grup untuk dipilih
        let body = "🌐 " + toSC("PILIH GRUP TUJUAN UPDATE CUACA") + "\n\n";
        list.slice(0, 30).forEach((g, i) => {
          body += "  " + (i + 1) + ". " + (g.subject || g.jid) + (g.jid === m.chat ? toSC("  ← (chat ini)") : "") + "\n";
        });
        body += "\n💡 " + toSC("Ketik") + ": " + prefix + "weathersystemwatch target grup <nomor>\n";
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(boxMessage("◆ " + "Weather Realtime" + " ◆", body));
      }

      // ── fallback: JID manual (DM 62...@s.whatsapp.net / grup ...@g.us) ──
      settings.target = tArg;
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Target notifikasi diatur") + "\n" +
        "• " + tArg + "\n"
      )
      );
    }

    // ── TEST ──
    if (action === "test") {
      try {
        // ── ala script !cuaca: cek cuaca sekarang pakai setting aktif ──
        const data = await fetchWeatherForSettings(settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        if (!data) {
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "❌ " + toSC("Gagal fetch cuaca") + "\n" +
            "• " + toSC("Lokasi") + " : " + (settings.location?.name || "-") + "\n" 
            )
          );
        }
        const name = settings.location?.name || "Lokasi";
        const msg = formatWeatherUpdate(data, name, settings.intervalHours);
        // raw: format script punya emoji + bold sendiri, bukan box berkotak
        return m.reply(msg, { raw: true });
      } catch (e) {
        try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
        return m.reply(novaError("Weather Realtime", "Test gagal: " + e.message));
      }
    }

    // ── TESUBAH (UPGRADE 15 Sep 2026 — "tes paksa" dokumen diagnosis):
    //    pura-pura grup terakhir = X (default: beda dari realita) → cek
    //    scheduler berikutnya lihat grup real beda → notif ASLI kekirim.
    //    Bukti jalur kirim jalan tanpa nunggu cuaca beneran berganti.
    if (action === "tesubah" || action === "simulasi") {
      const GRUP_VALID = { cerah: "cerah", mendung: "mendung", hujan: "hujan", petir: "hujan_petir", badai: "hujan_petir" };
      let grp = GRUP_VALID[String(args[0] || "").toLowerCase()] || null;
      if (!grp) {
        // default: paksa grup kebalikan realita sekarang biar pasti beda
        try {
          const data = await fetchWeatherForSettings(settings);
          const real = weatherGroupOf(data);
          grp = real === "cerah" ? "hujan" : "cerah";
        } catch { grp = "cerah"; }
      }
      setAutoGroupForTest(grp, grp === "cerah" ? "Cerah" : grp === "mendung" ? "Berawan/Mendung" : grp === "hujan" ? "Hujan" : "Hujan Petir");
      try { await sock.sendMessage(m.chat, { react: { text: "🛠️", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "🧪 " + toSC("Tes paksa deteksi perubahan") + "\n" +
        "• " + toSC("Grup terakhir dipaksa") + " : " + toSC(grp) + "\n" +
        "• " + toSC("Cek berikutnya") + " : " + toSC(" maksimal " + (Number(settings.autoCheckMinutes) || 5) + " menit lagi") + "\n" +
        "• " + toSC("Grup realita beda") + " → " + toSC("notif CUACA BERUBAH kekirim") + "\n" +
        "📌 " + toSC("Pastikan mode otomatis aktif") + ": " + prefix + "weathersystemwatch otomatis"
        )
      );
    }

    // ── Unknown command ──
    try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
    return m.reply(
      boxMessage("◆ " + "Weather Realtime" + " ◆",
      "⚠ " + toSC("Perintah tidak dikenal") + "\n" +
      "• " + prefix + "weathersystemwatch status\n" +
      "• " + prefix + "weathersystemwatch on/off\n" +
      "• " + prefix + "weathersystemwatch lokasi serang\n" +
      "• " + prefix + "weathersystemwatch notification on/off\n" +
      "• " + prefix + "weathersystemwatch jadwal 06:30 12:00\n" +
      "• " + prefix + "weathersystemwatch alert on|off|test\n" +
      "• " + prefix + "weathersystemwatch threshold set heat 38\n" +
      "• " + prefix + "weathersystemwatch interval 2\n" +
      "• " + prefix + "weathersystemwatch provider bmkg\n" +
      "• " + prefix + "weathersystemwatch adm4 31.71.03.1001\n" +
      "• " + prefix + "weathersystemwatch target 62123456789@s.whatsapp.net\n" +
      "• " + prefix + "weathersystemwatch test\n" 
      )
    );
  } catch (e) {
    console.error("[weathersystemwatch]", e.message);
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    return m.reply(novaError("Weather Realtime", e.message));
  }
}

export { pluginConfig as config, handler };
