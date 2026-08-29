// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
/**
 * plugins/owner/weather.js
 * Command .weather — konfigurasi scheduler cuaca otomatis (owner only).
 * Kirim info cuaca real-time ke grup pada jadwal pagi, siang, sore.
 */

import {
  getWeatherStatus,
  updateWeatherSettings,
  resolveWeatherLocation,
  fetchWeather,
  formatWeatherMessage,
  refreshWeatherScheduler,
} from "../../src/lib/nova-weather-scheduler.js";

const pluginConfig = {
  name: "weather2",
  alias: ["weather2", "weather"],
  category: "owner",
  description: "Atur pengiriman info cuaca otomatis ke grup",
  usage: ".weather <aksi>",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function help(m) {
  const p = m.prefix || ".";
  const lines = [
    "*PENGATURAN CUACA OTOMATIS*",
    "",
    "`" + p + "weather aktif`",
    "  Aktifkan broadcast cuaca di grup ini.",
    "",
    "`" + p + "weather nonaktif`",
    "  Matikan broadcast cuaca untuk grup ini.",
    "",
    "`" + p + "weather kota <nama kota>`",
    "  Set lokasi cuaca.",
    "  Contoh: " + p + "weather kota Jakarta",
    "",
    "`" + p + "weather jadwal 06:30 12:00 17:00 20:00`",
    "  Atur jam broadcast (maks 4 waktu: pagi, siang, sore, malam).",
    "",
    "`" + p + "weather test`",
    "  Kirim preview cuaca sekarang ke chat ini.",
    "",
    "`" + p + "weather status`",
    "  Lihat konfigurasi aktif.",
    "",
    "Sumber: wttr.in (gratis, realtime, tanpa API key).",
  ];
  return m.reply(lines.join("\n"));
}

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

function formatSchedule(schedules) {
  return (schedules || [])
    .map((s) => (s.label || s.key) + " " + String(s.hour).padStart(2, "0") + ":" + String(s.minute || 0).padStart(2, "0"))
    .join(", ");
}

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => String(a).trim()).filter(Boolean);
  const action = (args.shift() || "help").toLowerCase();

  if (action === "help" || action === "menu") return help(m);

  // AKTIF
  if (action === "aktif" || action === "on" || action === "enable") {
    if (!m.isGroup) {
      return m.reply(claraWrap("Weather", "⚠️ Command ini hanya bisa dipakai di dalam grup."));
    }
    const jid = m.chat;
    const settings = updateWeatherSettings((cur) => {
      const targets = Array.isArray(cur.targets) ? [...cur.targets] : [];
      if (!targets.includes(jid)) targets.push(jid);
      return { ...cur, enabled: true, targets };
    });
    refreshWeatherScheduler();
    return m.reply("✅ Cuaca otomatis diaktifkan di grup ini.\n" +
      "Jadwal: " + formatSchedule(settings.schedules) + " WIB\n" +
      "Lokasi: " + (settings.location?.name || "Jakarta"));
  }

  // NONAKTIF
  if (action === "nonaktif" || action === "off" || action === "disable") {
    if (!m.isGroup) {
      return m.reply(claraWrap("Weather", "⚠️ Command ini hanya bisa dipakai di dalam grup."));
    }
    const jid = m.chat;
    const settings = updateWeatherSettings((cur) => {
      const targets = (Array.isArray(cur.targets) ? cur.targets : []).filter((t) => t !== jid);
      return { ...cur, targets, enabled: targets.length > 0 };
    });
    refreshWeatherScheduler();
    return m.reply(settings.targets.length
        ? "✅ Broadcast cuaca dinonaktifkan untuk grup ini."
        : "✅ Broadcast cuaca dinonaktifkan (tidak ada grup tersisa).");
  }

  // KOTA
  if (action === "kota" || action === "lokasi" || action === "location") {
    const city = args.join(" ").trim();
    if (!city) return m.reply( claraWrap("Weather", "❌ Masukkan nama kota. Contoh: .weather kota Bandung"), { commandName: "weather" });
    try {
      const location = await resolveWeatherLocation(city);
      const settings = updateWeatherSettings((cur) => ({ ...cur, location }));
      refreshWeatherScheduler();
      return m.reply(
        "✅ Lokasi cuaca diset: " + location.name + "\n" +
        "Koordinat: " + location.latitude + ", " + location.longitude
      );
    } catch (e) {
      return m.reply("❌ Gagal mencari kota: " + e.message);
    }
  }

  // JADWAL
  if (action === "jadwal" || action === "schedule") {
    const schedules = buildSchedules(args);
    if (!schedules) return m.reply( claraWrap("Weather", "❌ Format jadwal salah. Contoh: .weather jadwal 07:00 12:00 17:00"), { commandName: "weather" });
    const settings = updateWeatherSettings((cur) => ({ ...cur, schedules }));
    refreshWeatherScheduler();
    return m.reply("✅ Jadwal cuaca disimpan: " + formatSchedule(schedules) + " WIB");
  }

  // TEST
  if (action === "test") {
    try {
      const settings = getWeatherStatus();
      const forecast = await fetchWeather(settings.location, settings.timezone);
      const message = formatWeatherMessage(forecast, settings, { label: "Preview" });
      return m.reply(claraWrap("weather2", message));
    } catch (e) {
      return m.reply("❌ Gagal mengambil cuaca: " + e.message);
    }
  }

  // STATUS
  if (action === "status") {
    const status = getWeatherStatus();
    const enabled = status?.enabled ? "Ya" : "Tidak";
    const targets = Array.isArray(status?.targets) && status.targets.length
      ? status.targets.join(", ")
      : "(kosong)";
    const locName = status?.location?.name || "Jakarta";
    return m.reply("*STATUS CUACA OTOMATIS*\n\n" +
      "Aktif: " + enabled + "\n" +
      "Lokasi: " + locName + "\n" +
      "Jadwal: " + formatSchedule(status?.schedules) + " WIB\n" +
      "Target: " + targets);
  }

  return help(m);
}

export { pluginConfig as config, handler };
