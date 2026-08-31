// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autoweather — Unified Auto Weather System (owner only)
 *
 * 3 mode dalam 1 command:
 * 1. Regular  — .autoweather on/off          → broadcast cuaca harian (wttr.in)
 * 2. Extreme  — .autoweather extreme on/off  → alert cuaca ekstrem BMKG
 * 3. BMKG     — .autoweather bmkg on/off     → broadcast cuaca rinci BMKG-style
 *
 * BMKG mode akan auto-mematikan Regular & Extreme saat diaktifkan.
 * Regular & Extreme bisa jalan bersamaan. BMKG eksklusif.
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getWeatherStatus,
  updateWeatherSettings,
  resolveWeatherLocation,
  fetchWeather,
  formatWeatherMessage,
  refreshWeatherScheduler,
  stopWeatherScheduler,
} from "../../src/lib/nova-weather-scheduler.js";
import {
  getCuacaStatus,
  updateCuacaSettings,
  startCuacaJobs,
  stopCuacaJobs,
  geocodeCity,
  fetchDetailedWeather,
  formatDetailedWeather,
  DEFAULT_LOCATIONS,
} from "../../src/lib/nova-bmkg-cuaca-scheduler.js";
import axios from "axios";

const pluginConfig = {
  name: "autoweather",
  alias: ["autoweather", "autocuaca", "weather"],
  category: "owner",
  description: "Unified Auto Weather — cuaca biasa, alert ekstrem, & BMKG dalam 1 command",
  usage: ".autoweather <on/off/extreme/bmkg/kota/jadwal/lokasi/region/test/cek/status>",
  example: ".autoweather on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// BMKG EXTREME ALERT — CONFIG
// ============================================================
const BMKG_WARN_URL = "https://warningbmkg.mgo.id/api/v1/warning/active";

function getExtremeConfig(db, gid) {
  const all = db.setting("autoweatherExtreme") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, region: "all", lastAlert: 0, alertCount: 0 };
    db.setting("autoweatherExtreme", all);
  }
  return all[gid];
}

function saveExtremeConfig(db, gid, data) {
  const all = db.setting("autoweatherExtreme") || {};
  all[gid] = data;
  db.setting("autoweatherExtreme", all);
  db.save();
}

async function checkBMKG() {
  try {
    const res = await axios.get(BMKG_WARN_URL, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return res.data?.data || res.data?.result || res.data || null;
  } catch {
    return null;
  }
}

// ============================================================
// HELPERS
// ============================================================
function parseTime(value) {
  const match = String(value || "").match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function buildSchedules(args) {
  const labels = ["Pagi", "Siang", "Sore", "Malam"];
  const keys = ["pagi", "siang", "sore", "malam"];
  const times = (args || []).slice(0, 4);
  if (!times.length) return null;
  const result = times.map((v, i) => {
    const t = parseTime(v);
    return t ? { ...t, key: keys[i] || `t${i}`, label: labels[i] || `Waktu ${i + 1}` } : null;
  });
  return result.every(Boolean) ? result : null;
}

function buildBmkgSchedules(args) {
  if (!args.length) return null;
  const schedules = [];
  for (const a of args) {
    const match = a.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    schedules.push({ key: "custom" + h, label: h + ":" + String(m).padStart(2, "0"), hour: h, minute: m });
  }
  return schedules;
}

function formatSchedule(schedules) {
  return (schedules || [])
    .map((s) => (s.label || s.key) + " " + String(s.hour).padStart(2, "0") + ":" + String(s.minute || 0).padStart(2, "0"))
    .join(", ");
}

function formatBmkgSchedule(schedules) {
  return (schedules || [])
    .map((s) => String(s.hour).padStart(2, "0") + ":" + String(s.minute ?? 0).padStart(2, "0"))
    .join(", ");
}

// ============================================================
// HELP / MENU
// ============================================================
function help(m) {
  const p = m.prefix || ".";
  const txt = novaBox("AUTOWEATHER", [
    toSC("Unified Auto Weather System"),
    "",
    "📌 " + toSC("Cuaca Biasa (wttr.in)"),
    p + "autoweather on",
    p + "autoweather off",
    p + "autoweather kota <nama kota>",
    p + "autoweather jadwal 07:00 12:00 17:00",
    p + "autoweather test",
    "",
    "📌 " + toSC("Alert Ekstrem (BMKG)"),
    p + "autoweather extreme on",
    p + "autoweather extreme off",
    p + "autoweather region <provinsi/all>",
    p + "autoweather cek",
    "",
    "📌 " + toSC("BMKG Mode (rinci)"),
    p + "autoweather bmkg on",
    p + "autoweather bmkg off",
    p + "autoweather lokasi add <kota>",
    p + "autoweather lokasi remove <kota>",
    p + "autoweather bmkg test",
    "",
    "📌 " + toSC("Umum"),
    p + "autoweather status",
    "",
    "💡 BMKG mode akan matikan cuaca biasa & extreme",
    "💡 Cuaca biasa & extreme bisa jalan bersamaan",
  ]);
  return m.reply(txt);
}

// ============================================================
// EXTREME CHECK
// ============================================================
async function handleExtremeCheck(m) {
  const data = await checkBMKG();
  if (!data) return m.reply(claraWrap("AutoWeather", toSC("Gagal fetch BMKG, coba lagi.")));
  const warnings = Array.isArray(data) ? data : (data?.warnings || data?.list || []);
  if (warnings.length === 0) {
    return m.reply(claraWrap("AutoWeather", toSC("Tidak ada peringatan cuaca ekstrem saat ini.")));
  }
  const list = warnings.slice(0, 5).map((w, i) => {
    const area = w.area || w.region || w.propinsi || "Tidak diketahui";
    const level = w.level || w.warningLevel || w.category || "-";
    const desc = w.description || w.warning || w.info || "-";
    return (i + 1) + ". " + area + " [" + level + "]\n   " + String(desc).slice(0, 100);
  }).join("\n\n");
  return m.reply(claraWrap("AutoWeather", toSC("Peringatan BMKG") + " (" + warnings.length + "):\n\n" + list));
}

// ============================================================
// BMKG LOCATION HANDLER
// ============================================================
async function handleBmkgLocation(m, args, db) {
  const sub = (args.shift() || "").toLowerCase();

  if (sub === "add") {
    const cityName = args.join(" ").trim();
    if (!cityName) return m.reply(claraWrap("AutoWeather", "Format: .autoweather lokasi add <nama kota>\nContoh: .autoweather lokasi add Yogyakarta"));
    try {
      const loc = await geocodeCity(cityName);
      const settings = updateCuacaSettings((cur) => {
        const exists = cur.locations.some((l) => l.name.toLowerCase() === loc.name.toLowerCase());
        if (exists) return cur;
        return { ...cur, locations: [...cur.locations, loc] };
      });
      if (settings.enabled) startCuacaJobs(settings);
      return m.reply(claraWrap("AutoWeather",
        toSC("Lokasi ditambah") + ": " + loc.name + "\n" +
        toSC("Provinsi") + ": " + loc.province + "\n" +
        toSC("Total lokasi") + ": " + settings.locations.length
      ));
    } catch (err) {
      return m.reply(claraWrap("AutoWeather", toSC("Error") + ": " + err.message));
    }
  }

  if (sub === "remove" || sub === "del" || sub === "hapus") {
    const cityName = args.join(" ").trim();
    if (!cityName) return m.reply(claraWrap("AutoWeather", "Format: .autoweather lokasi remove <nama kota>"));
    const settings = updateCuacaSettings((cur) => ({
      ...cur,
      locations: cur.locations.filter((l) => l.name.toLowerCase() !== cityName.toLowerCase()),
    }));
    if (settings.enabled) startCuacaJobs(settings);
    return m.reply(claraWrap("AutoWeather",
      toSC("Lokasi dihapus") + ": " + cityName + "\n" +
      toSC("Total lokasi") + ": " + settings.locations.length
    ));
  }

  if (sub === "list" || !sub) {
    const status = getCuacaStatus();
    let txt = toSC("Daftar Lokasi BMKG") + "\n\n";
    for (let i = 0; i < status.locations.length; i++) {
      const loc = status.locations[i];
      txt += (i + 1) + ". " + loc.name;
      if (loc.province) txt += " (" + loc.province + ")";
      txt += "\n";
    }
    txt += "\nTambah: .autoweather lokasi add <kota>\n";
    txt += "Hapus: .autoweather lokasi remove <kota>";
    return m.reply(claraWrap("AutoWeather", txt));
  }

  return m.reply(claraWrap("AutoWeather", "Format: .autoweather lokasi <add/remove/list> <kota>"));
}

// ============================================================
// MAIN HANDLER
// ============================================================
async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const args = (m.args || []).map((a) => String(a).trim());
    const action = (args.shift() || "").toLowerCase();
    const jid = m.key?.remoteJid || m.chat;

    if (!action || action === "help" || action === "menu") return help(m);

    // ============================================================
    // STATUS — semua mode
    // ============================================================
    if (action === "status") {
      const wStatus = getWeatherStatus();
      const cStatus = getCuacaStatus();
      const eCfg = getExtremeConfig(db, jid);

      let txt = novaBox("AUTOWEATHER STATUS", [
        "",
        toSC("Cuaca Biasa") + ": " + (wStatus?.enabled ? "ON" : "OFF"),
        toSC("Lokasi") + ": " + (wStatus?.location?.name || "Jakarta"),
        toSC("Jadwal") + ": " + formatSchedule(wStatus?.schedules) + " WIB",
        toSC("Target") + ": " + (wStatus?.targets?.length || 0) + " grup",
        "",
        toSC("Alert Ekstrem") + ": " + (eCfg.enabled ? "ON" : "OFF"),
        toSC("Region") + ": " + eCfg.region,
        toSC("Total Alert") + ": " + eCfg.alertCount,
        "",
        toSC("BMKG Mode") + ": " + (cStatus.enabled ? "ON" : "OFF"),
        toSC("Jadwal") + ": " + formatBmkgSchedule(cStatus.schedules) + " WIB",
        toSC("Lokasi") + ": " + cStatus.locations.length + " kota",
        toSC("Target") + ": " + cStatus.targets.length + " grup",
      ]);
      return m.reply(txt);
    }

    // ============================================================
    // REGULAR WEATHER — on/off/kota/jadwal/test
    // ============================================================
    if (action === "on" || action === "aktif" || action === "enable") {
      if (!m.isGroup) return m.reply(claraWrap("AutoWeather", toSC("Cuaca biasa hanya bisa diaktifkan di grup.")));
      const settings = updateWeatherSettings((cur) => {
        const targets = Array.isArray(cur.targets) ? [...cur.targets] : [];
        if (!targets.includes(jid)) targets.push(jid);
        return { ...cur, enabled: true, targets };
      });
      refreshWeatherScheduler();
      return m.reply(claraWrap("AutoWeather",
        toSC("Cuaca Biasa") + ": ON\n" +
        toSC("Jadwal") + ": " + formatSchedule(settings.schedules) + " WIB\n" +
        toSC("Lokasi") + ": " + (settings.location?.name || "Jakarta")
      ));
    }

    if (action === "off" || action === "nonaktif" || action === "disable") {
      if (m.isGroup) {
        updateWeatherSettings((cur) => {
          const targets = (Array.isArray(cur.targets) ? cur.targets : []).filter((t) => t !== jid);
          return { ...cur, targets, enabled: targets.length > 0 };
        });
        refreshWeatherScheduler();
        return m.reply(claraWrap("AutoWeather", toSC("Cuaca biasa dimatikan untuk grup ini.")));
      }
      stopWeatherScheduler();
      return m.reply(claraWrap("AutoWeather", toSC("Cuaca biasa dimatikan sepenuhnya.")));
    }

    if (action === "kota") {
      const city = args.join(" ").trim();
      if (!city) return m.reply(claraWrap("AutoWeather", "Format: .autoweather kota <nama kota>\nContoh: .autoweather kota Bandung"));
      try {
        const location = await resolveWeatherLocation(city);
        updateWeatherSettings((cur) => ({ ...cur, location }));
        refreshWeatherScheduler();
        return m.reply(claraWrap("AutoWeather",
          toSC("Lokasi cuaca diset") + ": " + location.name + "\n" +
          toSC("Koordinat") + ": " + location.latitude + ", " + location.longitude
        ));
      } catch (e) {
        return m.reply(claraWrap("AutoWeather", toSC("Gagal mencari kota") + ": " + e.message));
      }
    }

    if (action === "jadwal" || action === "schedule") {
      const schedules = buildSchedules(args);
      if (!schedules) return m.reply(claraWrap("AutoWeather", "Format salah. Contoh: .autoweather jadwal 07:00 12:00 17:00"));
      updateWeatherSettings((cur) => ({ ...cur, schedules }));
      refreshWeatherScheduler();
      return m.reply(claraWrap("AutoWeather", toSC("Jadwal cuaca disimpan") + ": " + formatSchedule(schedules) + " WIB"));
    }

    if (action === "test" || action === "preview") {
      try {
        const settings = getWeatherStatus();
        const forecast = await fetchWeather(settings.location, settings.timezone);
        const message = formatWeatherMessage(forecast, settings, { label: "Preview" });
        return m.reply(claraWrap("AutoWeather", message));
      } catch (e) {
        return m.reply(claraWrap("AutoWeather", toSC("Gagal mengambil cuaca") + ": " + e.message));
      }
    }

    // ============================================================
    // EXTREME WEATHER ALERT — extreme on/off/region/cek
    // ============================================================
    if (action === "extreme" || action === "ekstrem") {
      const sub = (args.shift() || "").toLowerCase();

      if (sub === "on" || sub === "aktif" || sub === "enable") {
        const cfg = getExtremeConfig(db, jid);
        const region = args[0] || cfg.region;
        cfg.enabled = true;
        cfg.region = region;
        saveExtremeConfig(db, jid, cfg);
        return m.reply(claraWrap("AutoWeather",
          toSC("Alert Ekstrem") + ": ON\n" +
          toSC("Region") + ": " + region + "\n" +
          toSC("Bot akan kirim alert kalau ada peringatan cuaca ekstrem BMKG")
        ));
      }

      if (sub === "off" || sub === "nonaktif" || sub === "disable") {
        const cfg = getExtremeConfig(db, jid);
        cfg.enabled = false;
        saveExtremeConfig(db, jid, cfg);
        return m.reply(claraWrap("AutoWeather", toSC("Alert Ekstrem dimatikan.")));
      }

      if (sub === "region") {
        const region = args.join(" ").trim();
        if (!region) return m.reply(claraWrap("AutoWeather", "Format: .autoweather extreme region <provinsi/all>"));
        const cfg = getExtremeConfig(db, jid);
        cfg.region = region;
        saveExtremeConfig(db, jid, cfg);
        return m.reply(claraWrap("AutoWeather", toSC("Region diset") + ": " + region));
      }

      if (sub === "cek" || sub === "check" || sub === "status") {
        return handleExtremeCheck(m);
      }

      return m.reply(claraWrap("AutoWeather",
        toSC("Alert Ekstrem") + "\n\n" +
        ".autoweather extreme on [region]\n" +
        ".autoweather extreme off\n" +
        ".autoweather extreme region <provinsi/all>\n" +
        ".autoweather extreme cek"
      ));
    }

    // Cek peringatan ekstrem langsung
    if (action === "cek" || action === "check") {
      return handleExtremeCheck(m);
    }

    if (action === "region") {
      const region = args.join(" ").trim();
      if (!region) return m.reply(claraWrap("AutoWeather", "Format: .autoweather region <provinsi/all>"));
      const cfg = getExtremeConfig(db, jid);
      cfg.region = region;
      saveExtremeConfig(db, jid, cfg);
      return m.reply(claraWrap("AutoWeather", toSC("Region diset") + ": " + region));
    }

    // ============================================================
    // BMKG MODE — bmkg on/off/test/jadwal
    // ============================================================
    if (action === "bmkg") {
      const sub = (args.shift() || "").toLowerCase();

      if (sub === "on" || sub === "aktif" || sub === "enable") {
        // BMKG on → matikan regular & extreme
        updateWeatherSettings((cur) => ({ ...cur, enabled: false }));
        refreshWeatherScheduler();
        const eCfg = getExtremeConfig(db, jid);
        eCfg.enabled = false;
        saveExtremeConfig(db, jid, eCfg);

        const settings = updateCuacaSettings((cur) => ({
          ...cur,
          enabled: true,
          targets: cur.targets.includes(jid) ? cur.targets : [...cur.targets, jid],
        }));
        startCuacaJobs(settings);
        return m.reply(claraWrap("AutoWeather",
          toSC("BMKG Mode") + ": ON\n" +
          toSC("Cuaca biasa & extreme dimatikan") + "\n\n" +
          toSC("Jadwal") + ": " + formatBmkgSchedule(settings.schedules) + " WIB\n" +
          toSC("Lokasi") + ": " + settings.locations.length + " kota"
        ));
      }

      if (sub === "off" || sub === "nonaktif" || sub === "disable") {
        updateCuacaSettings((cur) => ({ ...cur, enabled: false }));
        stopCuacaJobs();
        return m.reply(claraWrap("AutoWeather", toSC("BMKG Mode dimatikan.")));
      }

      if (sub === "test" || sub === "cek" || sub === "preview") {
        const status = getCuacaStatus();
        const loc = status.locations[0] || DEFAULT_LOCATIONS[0];
        try {
          const data = await fetchDetailedWeather(loc);
          const txt = formatDetailedWeather(data, loc, "Test");
          return m.reply(claraWrap("AutoWeather", txt));
        } catch (err) {
          return m.reply(claraWrap("AutoWeather", toSC("Gagal fetch BMKG") + ": " + err.message));
        }
      }

      if (sub === "jadwal" || sub === "schedule") {
        const schedules = buildBmkgSchedules(args);
        if (!schedules) return m.reply(claraWrap("AutoWeather", "Format salah. Contoh: .autoweather bmkg jadwal 06:00 12:00 18:00"));
        const settings = updateCuacaSettings((cur) => ({ ...cur, schedules }));
        if (settings.enabled) startCuacaJobs(settings);
        return m.reply(claraWrap("AutoWeather", toSC("Jadwal BMKG disimpan") + ": " + formatBmkgSchedule(schedules) + " WIB"));
      }

      return m.reply(claraWrap("AutoWeather",
        toSC("BMKG Mode") + "\n\n" +
        ".autoweather bmkg on\n" +
        ".autoweather bmkg off\n" +
        ".autoweather bmkg test\n" +
        ".autoweather bmkg jadwal 06:00 12:00 18:00\n" +
        ".autoweather lokasi add <kota>\n" +
        ".autoweather lokasi remove <kota>"
      ));
    }

    // ============================================================
    // LOKASI — for BMKG (add/remove/list)
    // ============================================================
    if (action === "lokasi" || action === "location") {
      return handleBmkgLocation(m, args, db);
    }

    return help(m);
  } catch (error) {
    return m.reply(claraWrap("AutoWeather", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler, getExtremeConfig, saveExtremeConfig, checkBMKG };
