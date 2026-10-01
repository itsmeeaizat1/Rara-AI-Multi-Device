// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// autoweatherrain.js — Notifikasi "akan segera hujan dalam X menit" (request owner
// 15 Sep 2026: "upgrade fitur cuaca klo mau hujan didaerah saya mncul notif
// akan segera hujan dalam x menit mendatang" — konsep notif cuaca Bing,
// data curah hujan per-menit OpenWeatherMap One Call 3.0).
//
// Engine: src/lib/rara-rain-notify.js (anti-spam cooldown 2 jam, cek tiap
// 10 menit, window 30 menit, kalimat saran dibantu AI). Perintah:
//   • .hujannotif on/off — langganan / berhenti di chat ini
//   • .hujannotif set <tempat | lat,lon | reply lokasi WA> — set lokasi
//   • .hujannotif cek — nowcast sekarang (bypass cooldown, tampil aman juga)
//   • .hujannotif status / interval <5-60> / cooldown <30-720>
// Lokasi default mewarisi .weathersystemwatch (weatherScheduler).

import {
  setEnabled, getStatus, isTarget, addTarget, removeTarget,
  getLocation, setLocation, geocodePlace, runRainCheck, rainNowCard,
  setIntervalMenit, setCooldownMenit, setRainSock, syncRainMonitor,
} from "../../src/lib/rara-rain-notify.js";
import { raraError, raraGuide, raraGuideV2, raraSuccess } from "../../src/lib/rara-menu-style.js";

// seam buat e2e offline
const __http = { geocode: null };
export function _setHujanHttpForTest(h) { Object.assign(__http, h); }
export function _resetHujanHttpForTest() { __http.geocode = null; }

const pluginConfig = {
  name: "hujannotif",
  alias: ["hujannotify", "rainnotify", "rainalert", "peringatancuaca", "hujan"],
  category: "cuaca",
  description: "Notif otomatis 'akan segera hujan dalam X menit' — nowcast per-menit (OpenWeatherMap One Call 3.0)",
  usage: ".hujannotif <on/off/set/cek/status/interval/cooldown>",
  example: ".hujannotif set Serang\n.hujannotif on\n.hujannotif cek",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 0,
  isEnabled: true,
};

// reply pesan lokasi WA → koordinat (pola .kiblat: 3 shape)
function resolveQuotedLocation(m) {
  const q = m.quoted;
  if (!q) return null;
  const loc = q.locationMessage || q.message?.locationMessage || q.msg?.locationMessage;
  if (loc && typeof loc.degreesLatitude === "number" && typeof loc.degreesLongitude === "number") {
    return { name: loc.name || "Lokasi WA", lat: loc.degreesLatitude, lon: loc.degreesLongitude };
  }
  return null;
}

function fmtLoc(loc) {
  if (!loc) return "BELUM — set dulu: .hujannotif set <tempat>";
  return loc.name + " (" + Number(loc.lat).toFixed(4) + ", " + Number(loc.lon).toFixed(4) + ")";
}

async function handler(m, { sock, args }) {
  const sub = String(args?.[0] || "").toLowerCase();
  if (sock) setRainSock(sock);

  // ── set lokasi: reply lokasi WA | lat,lon | nama tempat ──
  if (sub === "set" || sub === "lokasi" || sub === "location") {
    await m.react("🛠️");
    const fromLoc = resolveQuotedLocation(m);
    if (fromLoc) {
      setLocation(fromLoc);
      await m.react("🐣");
      return m.reply(raraSuccess(pluginConfig.name, "lokasi nowcast diset dari pesan lokasi WA: *" + fromLoc.name + "* (" + fromLoc.lat.toFixed(4) + ", " + fromLoc.lon.toFixed(4) + ") — notif hujan bakal muncul untuk titik ini"));
    }
    const q = (args?.slice(1).join(" ") || "").trim();
    if (!q) return m.reply(raraGuide(pluginConfig.name, "cara set lokasi: reply pesan lokasi WA, atau ketik nama tempat, atau koordinat 'lat,lon'", ".hujannotif set Serang\n.hujannotif set -6.1203,106.1504\natau reply lokasi WA lalu .hujannotif set"));
    // koordinat langsung "lat,lon"
    const coord = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coord) {
      const loc = { name: "Titik " + Number(coord[1]).toFixed(3) + "," + Number(coord[2]).toFixed(3), lat: Number(coord[1]), lon: Number(coord[2]) };
      setLocation(loc);
      await m.react("🐣");
      return m.reply(raraSuccess(pluginConfig.name, "lokasi nowcast diset ke koordinat *" + loc.name + "*"));
    }
    try {
      const loc = __http.geocode
        ? await __http.geocode(q)
        : await geocodePlace(q);
      if (!loc) {
        await m.react("❌");
        return m.reply(raraError(pluginConfig.name, "tempat '" + q + "' gak ketemu — coba nama yang lebih spesifik (mis. 'Serang, Banten') atau pakai koordinat 'lat,lon'"));
      }
      setLocation(loc);
      await m.react("🐣");
      return m.reply(raraSuccess(pluginConfig.name, "lokasi nowcast diset: *" + loc.name + "* (" + loc.lat.toFixed(4) + ", " + loc.lon.toFixed(4) + ")\n\nsekarang ketik *.hujannotif on* buat mulai langganan notif hujan"));
    } catch (e) {
      await m.react("❌");
      return m.reply(raraError(pluginConfig.name, "gagal cari tempat: " + e.message));
    }
  }

  // ── nowcast manual sekarang ──
  if (sub === "cek" || sub === "now" || sub === "test") {
    await m.react("🔍");
    const loc = getLocation();
    if (!loc) {
      await m.react("❌");
      return m.reply(raraGuide(pluginConfig.name, "lokasi belum diset — ketik .hujannotif set <tempat> dulu", ".hujannotif set Serang"));
    }
    try {
      const card = await rainNowCard(loc);
      await sock.sendMessage(m.chat, {
        text: card.text,
        contextInfo: {
          externalAdReply: {
            title: card.an.willRain ? "AKAN SEGERA HUJAN" : "NOWCAST AMAN",
            body: "rara rain notifier • sumber " + card.source,
            sourceUrl: "https://openweathermap.org/",
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false,
          },
        },
      });
      await m.react("🐣");
    } catch (e) {
      await m.react("❌");
      return m.reply(raraError(pluginConfig.name, "gagal ambil nowcast: " + e.message));
    }
    return;
  }

  if (sub === "on") {
    if (!getLocation()) return m.reply(raraGuide(pluginConfig.name, "set lokasi dulu sebelum langganan", ".hujannotif set Serang\nlalu .hujannotif on"));
    if (isTarget(m.chat)) return m.reply(raraSuccess(pluginConfig.name, "chat ini udah langganan notif hujan"));
    addTarget(m.chat);
    setEnabled(true);
    syncRainMonitor();
    await m.react("🐣");
    return m.reply(
      "🌧️ *SISTEM NOTIF HUJAN AKTIF DI CHAT INI*\n\n" +
      "📍 Lokasi: " + fmtLoc(getLocation()) + "\n" +
      "⏱️ Cek nowcast tiap: " + getStatus().intervalMenit + " menit\n" +
      "🛡️ Anti-spam: 1 notif maks tiap " + getStatus().cooldownMenit + " menit\n" +
      "📡 Sumber: OpenWeatherMap One Call 3.0 (per-menit) → Open-Meteo fallback\n\n" +
      "Notif bakal masuk kalau hujan terdeteksi dalam 30 menit ke depan. Tes manual: *.hujannotif cek*"
    );
  }

  if (sub === "off") {
    removeTarget(m.chat);
    return m.reply(raraSuccess(pluginConfig.name, "chat ini berhenti langganan notif hujan"));
  }

  if (sub === "status") {
    const st = getStatus();
    const lastNotif = st.lastNotified[m.chat]
      ? new Date(st.lastNotified[m.chat]).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      : "belum pernah";
    const lines = [
      "Langganan chat ini: " + (isTarget(m.chat) ? "AKTIF" : "BELUM"),
      "Fitur global: " + (st.enabled ? "ON" : "OFF"),
      "Monitor: " + (st.running ? "JALAN" : "STOP"),
      "Total subscriber: " + st.targets.length + " chat",
      "📍 Lokasi: " + fmtLoc(st.location),
      "⏱️ Interval cek: tiap " + st.intervalMenit + " menit",
      "🛡️ Cooldown anti-spam: " + st.cooldownMenit + " menit",
      "🔑 Key OpenWeather: " + (st.keyOwm ? "ADA (One Call 3.0 per-menit)" : "BELUM — fallback Open-Meteo 15-menit"),
      ...(st.owmError ? ["⚠️ " + st.owmError] : []),
      "Cek terakhir: " + (st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " (" + (st.lastSource || "-") + ")" : "belum pernah"),
      "Notif terakhir chat ini: " + lastNotif,
    ];
    return m.reply("「 ✦ " + pluginConfig.name.toUpperCase() + " ✦ 」\n" + lines.join("\n"));
  }

  if (sub === "interval") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(´･ω･`)",
        sapaan: "cek nowcast sekarang tiap " + st.intervalMenit + " menit — mau diatur?",
        cara: "ketik .hujannotif interval <menit> (5–60)",
        contoh: ".hujannotif interval 5",
        note: "makin kecil interval makin responsif nangkep hujan di awal",
      }));
    }
    const res = setIntervalMenit(val);
    if (!res) return m.reply(raraError(pluginConfig.name, "interval harus 5–60 menit"));
    return m.reply(raraSuccess(pluginConfig.name, "interval cek nowcast sekarang *tiap " + res + " menit*"));
  }

  if (sub === "cooldown") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(´･ω･`)",
        sapaan: "anti-spam sekarang 1 notif maks tiap " + st.cooldownMenit + " menit per chat",
        cara: "ketik .hujannotif cooldown <menit> (30–720)",
        contoh: ".hujannotif cooldown 60",
        note: "cooldown jaga gak dobel notif hujan di chat yang sama",
      }));
    }
    const res = setCooldownMenit(val);
    if (!res) return m.reply(raraError(pluginConfig.name, "cooldown harus 30–720 menit"));
    return m.reply(raraSuccess(pluginConfig.name, "cooldown anti-spam sekarang *" + res + " menit*"));
  }

  return m.reply(
    raraGuide(
      pluginConfig.name,
      "notifikasi otomatis 'akan segera hujan dalam X menit' — nowcast curah hujan per-menit (OpenWeatherMap One Call 3.0, fallback Open-Meteo)",
      ".hujannotif set <tempat|lat,lon> — set lokasi (atau reply lokasi WA)\n.hujannotif on — langganan chat ini\n.hujannotif off — berhenti\n.hujannotif cek — nowcast sekarang\n.hujannotif status — lihat status\n.hujannotif interval <5-60> — kecepatan cek\n.hujannotif cooldown <30-720> — jeda anti-spam",
      "anti-spam: 1 notif maks tiap 2 jam per chat selama hujan berlangsung — notif cuma muncul pas hujan beneran mau turun dalam 30 menit",
    ),
  );
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
