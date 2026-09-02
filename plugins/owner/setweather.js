// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// .setweather — Set lokasi cuaca untuk info section menu
// .setweather Serang          → cari kota "Serang" via API
// .setweather -6.12,106.14    → set manual lat,lng
// .setweather reset           → kembalikan ke default (Serang)
// .setweather                  → tampilkan lokasi sekarang
// ============================================================

import config from "../../config.js";
import { toSC, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { clearWeatherCache } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "setweather",
  alias: ["setweather"],
  category: "owner",
  description: "Set lokasi cuaca untuk info section menu",
  usage: ".setweather <nama kota> | .setweather lat,lng | .setweather reset",
  example: ".setweather Serang\n.setweather -6.12,106.14\n.setweather reset",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function searchCity(query) {
  // Cari kota via Open-Meteo Geocoding API (gratis, tanpa key)
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

async function handler(m, { sock, config: botConfig, db }) {
  const text = m.args.join(" ").trim();
  const prefix = botConfig.command?.prefix || ".";

  // React loading
  try { await sock.sendMessage(m.chat, { react: { text: "🕒", key: m.key } }); } catch {}

  // No args → tampilkan lokasi sekarang
  if (!text) {
    const loc = config.weather?.location || config.weatherScheduler?.location || {};
    return m.reply(
      "╭─「 ✦ " + toSC("Set Weather") + " ✦ 」\n" +
      "│\n" +
      "│ • " + toSC("Lokasi") + " : " + (loc.name || "-") + "\n" +
      "│ • " + toSC("Latitude") + " : " + (loc.latitude || "-") + "\n" +
      "│ • " + toSC("Longitude") + " : " + (loc.longitude || "-") + "\n" +
      "│ • " + toSC("Provider") + " : " + (config.weather?.provider || "open-meteo") + "\n" +
      "│\n" +
      "│ 📌 " + toSC("Untuk ganti:") + "\n" +
      "│ • " + prefix + "setweather Serang\n" +
      "│ • " + prefix + "setweather -6.12,106.14\n" +
      "│ • " + prefix + "setweather reset\n" +
      "╰────  •  ────"
    );
  }

  // Reset → kembalikan ke Serang
  if (text.toLowerCase() === "reset") {
    if (!config.weather) config.weather = {};
    config.weather.location = {
      name: "Serang",
      latitude: -6.1200,
      longitude: 106.1443,
    };
    clearWeatherCache();
    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
    return m.reply(
      "╭─「 ✦ " + toSC("Set Weather") + " ✦ 」\n" +
      "│\n" +
      "│ ✅ " + toSC("Lokasi direset ke Serang, Banten") + "\n" +
      "│ • " + toSC("Latitude") + " : -6.1200\n" +
      "│ • " + toSC("Longitude") + " : 106.1443\n" +
      "╰────  •  ────"
    );
  }

  // Manual lat,lng
  const coordMatch = text.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
      return m.reply(novaError("Set Weather", "Koordinat tidak valid. Latitude: -90 sampai 90, Longitude: -180 sampai 180."));
    }
    if (!config.weather) config.weather = {};
    config.weather.location = { name: `${lat}, ${lng}`, latitude: lat, longitude: lng };
    clearWeatherCache();
    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
    return m.reply(
      "╭─「 ✦ " + toSC("Set Weather") + " ✦ 」\n" +
      "│\n" +
      "│ ✅ " + toSC("Lokasi cuaca diatur ke koordinat") + "\n" +
      "│ • " + toSC("Latitude") + " : " + lat + "\n" +
      "│ • " + toSC("Longitude") + " : " + lng + "\n" +
      "╰────  •  ────"
    );
  }

  // Search by city name
  try {
    const result = await searchCity(text);
    if (!result) {
      try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
      return m.reply(novaError("Set Weather", `Kota "${text}" tidak ditemukan. Coba nama kota lain atau gunakan format lat,lng.`));
    }

    const fullName = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    if (!config.weather) config.weather = {};
    config.weather.location = {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    };
    clearWeatherCache();

    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}
    return m.reply(
      "╭─「 ✦ " + toSC("Set Weather") + " ✦ 」\n" +
      "│\n" +
      "│ ✅ " + toSC("Lokasi cuaca diatur ke") + "\n" +
      "│ • " + toSC("Nama") + " : " + fullName + "\n" +
      "│ • " + toSC("Latitude") + " : " + result.latitude + "\n" +
      "│ • " + toSC("Longitude") + " : " + result.longitude + "\n" +
      "╰────  •  ────"
    );
  } catch (e) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    return m.reply(novaError("Set Weather", "Gagal mencari kota: " + e.message));
  }
}

export { pluginConfig as config, handler };
