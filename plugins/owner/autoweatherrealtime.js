// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// .autoweatherrealtime — Unified Weather Control (owner only)
//
// .autoweatherrealtime                → status
// .autoweatherrealtime on             → tampilkan cuaca di info section
// .autoweatherrealtime off            → sembunyikan cuaca dari info section
// .autoweatherrealtime lokasi serang  → set lokasi (nama kota)
// .autoweatherrealtime lokasi -6.12,106.14 → set lokasi (koordinat)
// .autoweatherrealtime notification on  → aktifkan notifikasi cuaca ke grup
// .autoweatherrealtime notification off → matikan notifikasi cuaca
// .autoweatherrealtime jadwal 06:30 12:00 17:00 20:00 → set jadwal notif
// .autoweatherrealtime target <jid>   → set grup target notif
// .autoweatherrealtime test            → test kirim cuaca sekarang
// ============================================================

import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { toSC, novaError } from "../../src/lib/nova-menu-style.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "" manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import { clearWeatherCache, getWeatherFooter, getWeatherAddress } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "autoweatherrealtime",
  alias: ["autoweatherrealtime", "autocuacarealtime"],
  category: "owner",
  description: "Atur cuaca realtime di info section + notifikasi scheduler",
  usage: ".autoweatherrealtime <on/off/lokasi/notification/jadwal/target/test>",
  example: ".autoweatherrealtime on\n.autoweatherrealtime lokasi serang\n.autoweatherrealtime target 62123456789@s.whatsapp.net",
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
      location: config.weather?.location || { name: "Serang", latitude: -6.12, longitude: 106.1443 },
      notification: false,
      schedules: [
        { key: "pagi", label: "Pagi", hour: 6, minute: 30 },
        { key: "siang", label: "Siang", hour: 12, minute: 0 },
        { key: "sore", label: "Sore", hour: 17, minute: 0 },
        { key: "malam", label: "Malam", hour: 20, minute: 0 },
      ],
      target: null, // group JID for notifications
    };
  }
  return s;
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
  const match = String(value || "").match(/^([01]?\d|2[0-3])[:.]([0-5]\d])$/);
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
        "• " + toSC("Jadwal") + " : " + formatSchedules(settings.schedules) + "\n" +
        "• " + toSC("Target") + " : " + (settings.target || toSC("belum diset")) + "\n" +
        "📌 " + toSC("Perintah") + ":\n" +
        "• " + prefix + "autoweatherrealtime on/off\n" +
        "• " + prefix + "autoweatherrealtime lokasi serang\n" +
        "• " + prefix + "autoweatherrealtime notification on\n" +
        "• " + prefix + "autoweatherrealtime jadwal 06:30 12:00\n" +
        "• " + prefix + "autoweatherrealtime target 62123456789@s.whatsapp.net\n" +
        "• " + prefix + "autoweatherrealtime test\n" 
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
          "• " + prefix + "autoweatherrealtime lokasi Serang\n" +
          "• " + prefix + "autoweatherrealtime lokasi -6.12,106.14\n" 
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
        // Auto-set target ke grup sekarang kalau di grup dan belum diset
        if (!settings.target && m.isGroup) {
          settings.target = m.chat;
        }
        saveWRSettings(db2, settings);
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "✅ " + toSC("Notifikasi cuaca AKTIF") + "\n" +
          "• " + toSC("Jadwal") + " : " + formatSchedules(settings.schedules) + "\n" +
          "• " + toSC("Target") + " : " + (settings.target || toSC("belum diset")) + "\n" +
          "📌 " + toSC("Set target") + ": " + prefix + "autoweatherrealtime target 62123456789@s.whatsapp.net\n" +
          "📌 " + toSC("Set jadwal") + ": " + prefix + "autoweatherrealtime jadwal 06:30 12:00\n" 
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
        "• " + prefix + "autoweatherrealtime notification on\n" +
        "• " + prefix + "autoweatherrealtime notification off\n" 
        )
      );
    }

    // ── JADWAL ──
    if (action === "jadwal" || action === "schedule") {
      const times = args.slice(0, 4);
      if (!times.length) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ": " + prefix + "autoweatherrealtime jadwal 06:30 12:00 17:00 20:00\n" 
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
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Jadwal notifikasi diatur") + "\n" +
        "• " + formatSchedules(schedules) + "\n" 
        )
      );
    }

    // ── TARGET ──
    if (action === "target") {
      const target = args.shift();
      if (!target) {
        try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
        return m.reply(
          boxMessage("◆ " + "Weather Realtime" + " ◆",
          "⚠ " + toSC("Format") + ": " + prefix + "autoweatherrealtime target 62123456789@s.whatsapp.net\n" +
          "" + toSC("Atau jalankan di dalam grup untuk auto-set") + "\n" 
          )
        );
      }
      settings.target = target;
      saveWRSettings(db2, settings);
      try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
      return m.reply(
        boxMessage("◆ " + "Weather Realtime" + " ◆",
        "✅ " + toSC("Target notifikasi diatur") + "\n" +
        "• " + target + "\n" 
        )
      );
    }

    // ── TEST ──
    if (action === "test") {
      try {
        // Force refresh
        clearWeatherCache();
        const footer = await getWeatherFooter(true);
        const addr = await getWeatherAddress();
        try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
        if (!footer) {
          return m.reply(
            boxMessage("◆ " + "Weather Realtime" + " ◆",
            "❌ " + toSC("Gagal fetch cuaca") + "\n" +
            "• " + toSC("Lokasi") + " : " + (settings.location?.name || "-") + "\n" 
            )
          );
        }
        return m.reply(
          boxMessage("◆ " + "Weather Realtime Test" + " ◆",
          "" + toSC("Info Section") + ": " + (settings.realtime ? "ON" : "OFF") + "\n" +
          "" + toSC("Lokasi") + " : " + (settings.location?.name || "-") + "\n" +
          "" + toSC("Address") + " : " + (addr || "-") + "\n" +
          footer + "\n" 
          )
        );
      } catch (e) {
        try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
        return m.reply(novaError("Weather Realtime", "Test gagal: " + e.message));
      }
    }

    // ── Unknown command ──
    try { await sock.sendMessage(m.chat, { react: { text: "❗", key: m.key } }); } catch {}
    return m.reply(
      boxMessage("◆ " + "Weather Realtime" + " ◆",
      "⚠ " + toSC("Perintah tidak dikenal") + "\n" +
      "• " + prefix + "autoweatherrealtime status\n" +
      "• " + prefix + "autoweatherrealtime on/off\n" +
      "• " + prefix + "autoweatherrealtime lokasi serang\n" +
      "• " + prefix + "autoweatherrealtime notification on/off\n" +
      "• " + prefix + "autoweatherrealtime jadwal 06:30 12:00\n" +
      "• " + prefix + "autoweatherrealtime target 62123456789@s.whatsapp.net\n" +
      "• " + prefix + "autoweatherrealtime test\n" 
      )
    );
  } catch (e) {
    console.error("[autoweatherrealtime]", e.message);
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    return m.reply(novaError("Weather Realtime", e.message));
  }
}

export { pluginConfig as config, handler };
