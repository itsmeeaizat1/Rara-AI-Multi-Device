// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 Kiblat (Qibla Direction) — kandidat langka terakhir dari backlog
//   (request owner 13 Sep: "ide fitur yg langka" — kiblat ke-singgut
//   tapi gak sempat dibikin; islami-nya udah 33 plugin tapi gak ada
//   arah kiblat sama sekali).
// 🔹 Fitur: .kiblat — reply pesan LOKASI (WA live location) ATAU
//   .kiblat <nama tempat> (geocode Nominatim) → hitung BEARING
//   great-circle ke Ka'bah (21.4225, 39.8262) → kartu KOMPAS canvas
//   (dial + jarum merah + ikon Ka'bah) + derajat + mata angin + jarak.
// 🔹 Math murni lokal (bearing/haversine) — gak butuh API selain
//   geocode nama tempat (free, no key).
// ============================================================
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { raraWrap, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "kiblat",
  alias: ["kiblat", "qibla", "arahkiblat", "qibladirection", "arahkabah"],
  category: "islami",
  description: "Arah kiblat kompas — reply lokasi atau .kiblat <nama tempat>",
  usage: ".kiblat <nama tempat>\n. kiblat (reply pesan lokasi)",
  example: ".kiblat Masjid Istiqlal Jakarta",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 1, isEnabled: true,
};

// Koordinat Ka'bah (Masjid al-Haram, Makkah)
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

// mata angin 8 arah (ID) — index = round(bearing / 45) % 8
const DIRECTIONS = ["U (Utara)", "TL (Timur Laut)", "T (Timur)", "TG (Tenggara)", "S (Selatan)", "BD (Barat Daya)", "B (Barat)", "BL (Barat Laut)"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, "../../assets/fonts");

// ── seam http buat e2e offline ──
const __kiblatHttp = {};
export function _setKiblatHttpForTest(h) { Object.assign(__kiblatHttp, h); }
export function _resetKiblatHttpForTest() { for (const k of Object.keys(__kiblatHttp)) delete __kiblatHttp[k]; }

// 🔹 geocode nama tempat → { lat, lon, label } (Nominatim free no-key,
// pola sama locationsearch.js)
async function geocodePlace(query) {
  const get = __kiblatHttp.get
    || ((opts) => axios.get("https://nominatim.openstreetmap.org/search", opts));
  const { data } = await get({
    params: { q: query, format: "json", limit: 1, addressdetails: 1 },
    timeout: 15000,
    headers: { "User-Agent": "RaraBot/1.0" },
  });
  if (!Array.isArray(data) || !data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    label: (data[0].display_name || query).split(",").slice(0, 2).join(",").trim(),
  };
}

// 🔹 BEARING great-circle: sudut awal arah Utara sejati ke Ka'bah
export function qiblaBearing(lat, lon) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA_LAT * Math.PI) / 180;
  const Δλ = ((KAABA_LON - lon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

// 🔹 HAVERSINE: jarak permukaan bumi ke Ka'bah (km)
export function distanceToKaaba(lat, lon) {
  const R = 6371;
  const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
  const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat * Math.PI) / 180) * Math.cos((KAABA_LAT * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 🔹 KARTU KOMPAS canvas — dial + ticks + cardinal + jarum bearing
// qiblat + ikon Ka'bah di ujung jarum + data derajat/jarak/koordinat.
export async function renderKiblatCard({ label, lat, lon, bearing, distance, dirLabel }) {
  const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "Anton.ttf"), "Anton");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "Roboto_Medium.ttf"), "Roboto_Medium");

  const W = 720, H = 920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── background: card gelap dengan aksen ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#131a2a");
  bg.addColorStop(1, "#0b0f1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // glow top
  const glow = ctx.createRadialGradient(W / 2, 120, 20, W / 2, 120, 320);
  glow.addColorStop(0, "rgba(212,175,55,0.16)");
  glow.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 320);

  // ── header ──
  ctx.textAlign = "center";
  ctx.fillStyle = "#d4af37";
  ctx.font = "26px Roboto_Medium";
  ctx.fillText("ISLAMIC COMPASS", W / 2, 58);
  ctx.fillStyle = "#ffffff";
  ctx.font = "58px Anton";
  ctx.fillText("ARAH KIBLAT", W / 2, 118);
  ctx.fillStyle = "#8f9bb3";
  ctx.font = "21px Roboto_Medium";
  ctx.fillText(label, W / 2, 158);

  // ── dial ──
  const cx = W / 2, cy = 430, r = 235;
  // lingkaran luar
  ctx.beginPath();
  ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(212,175,55,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.stroke();
  // dial face
  const face = ctx.createRadialGradient(cx, cy - r / 2, 20, cx, cy, r);
  face.addColorStop(0, "#1b2436");
  face.addColorStop(1, "#101625");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // ticks tiap 15° (kecil), 45° (sedang), 90° (besar + label cardinal)
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = ((deg - 90) * Math.PI) / 180; // 0° = atas (Utara)
    const big = deg % 90 === 0;
    const mid = deg % 45 === 0;
    const len = big ? 18 : mid ? 12 : 7;
    const w = big ? 4 : 2;
    const r1 = r - 8;
    const r2 = r1 - len;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
    ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
    ctx.strokeStyle = big ? "#d4af37" : mid ? "#7f8aa3" : "#4b556b";
    ctx.lineWidth = w;
    ctx.stroke();
    if (big) {
      const labels = { 0: "N", 90: "E", 180: "S", 270: "W" };
      ctx.fillStyle = "#ffffff";
      ctx.font = "30px Anton";
      ctx.fillText(labels[deg], cx + Math.cos(rad) * (r - 48), cy + Math.sin(rad) * (r - 48) + 10);
    }
  }

  // ── jarum kiblat (bearing) — merah, ekor abu ──
  const rad = ((bearing - 90) * Math.PI) / 180;
  const tipX = cx + Math.cos(rad) * (r - 26);
  const tipY = cy + Math.sin(rad) * (r - 26);
  const tailX = cx - Math.cos(rad) * (r - 26);
  const tailY = cy - Math.sin(rad) * (r - 26);
  const perpX = Math.sin(rad), perpY = -Math.cos(rad);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(cx + perpX * 16, cy + perpY * 16);
  ctx.lineTo(cx - perpX * 16, cy - perpY * 16);
  ctx.closePath();
  ctx.fillStyle = "#e63946";
  ctx.shadowColor = "rgba(230,57,70,0.5)";
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(cx + perpX * 11, cy + perpY * 11);
  ctx.lineTo(cx - perpX * 11, cy - perpY * 11);
  ctx.closePath();
  ctx.fillStyle = "#55607a";
  ctx.fill();

  // ── ikon Ka'bah di ujung jarum: kotak hitam + pita emas ──
  const ka = 26;
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(rad + Math.PI / 2);
  ctx.fillStyle = "#11131c";
  ctx.fillRect(-ka / 2, -ka, ka, ka);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.strokeRect(-ka / 2, -ka, ka, ka);
  ctx.beginPath();
  ctx.moveTo(-ka / 2, -ka * 0.62);
  ctx.lineTo(ka / 2, -ka * 0.62);
  ctx.stroke();
  ctx.restore();

  // ── derajat besar di tengah bawah dial ──
  ctx.fillStyle = "#e63946";
  ctx.font = "72px Anton";
  ctx.fillText(bearing.toFixed(1) + "°", cx, cy + 88);
  ctx.fillStyle = "#8f9bb3";
  ctx.font = "22px Roboto_Medium";
  ctx.fillText("dari Utara sejati", cx, cy + 118);

  // ── footer info ──
  const fy = H - 118;
  ctx.fillStyle = "#d4af37";
  ctx.font = "22px Roboto_Medium";
  ctx.fillText("MATA ANGIN", W / 4 - 30, fy);
  ctx.fillText("JARAK KE KA'BAH", (3 * W) / 4 + 10, fy);
  ctx.fillStyle = "#ffffff";
  ctx.font = "34px Anton";
  ctx.fillText(dirLabel.split(" (")[0], W / 4 - 30, fy + 42);
  ctx.fillText(Math.round(distance).toLocaleString("id-ID") + " km", (3 * W) / 4 + 10, fy + 42);
  ctx.fillStyle = "#55607a";
  ctx.font = "18px Roboto_Medium";
  ctx.fillText(`📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}  •  🕋 21.4225, 39.8262`, W / 2, fy + 92);

  return canvas.encode("png");
}

// 🔹 resolve koordinat dari reply lokasi WA (bentuk rara-serialize:
// quoted.locationMessage langsung, atau nested .msg / .message)
function resolveQuotedLocation(m) {
  const q = m.quoted;
  if (!q) return null;
  const loc = q.locationMessage || q.message?.locationMessage || q.msg?.locationMessage;
  if (loc && typeof loc.degreesLatitude === "number" && typeof loc.degreesLongitude === "number") {
    return { lat: loc.degreesLatitude, lon: loc.degreesLongitude, label: loc.name || "Lokasi WA" };
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    const query = m.args.join(" ").trim();

    // 1) reply pesan lokasi → koordinat langsung
    const fromLocation = resolveQuotedLocation(m);
    if (!fromLocation && !query) {
      await m.react("❌");
      return m.reply(raraWrap("kiblat", [
        "Mau cek arah kiblat dari mana?",
        "",
        "📍 *Cara 1:* reply pesan lokasi (kirim lokasi di WhatsApp, terus reply dengan .kiblat)",
        "🏙️ *Cara 2:* " + m.prefix + "kiblat <nama tempat>",
        "",
        "Contoh: " + m.prefix + "kiblat Masjid Istiqlal Jakarta",
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    let loc = fromLocation;
    let source = fromLocation ? "lokasi WA" : "nominatim";
    if (!loc) {
      loc = await geocodePlace(query);
    }

    if (!loc) {
      await m.react("❌");
      return m.reply(raraWrap("kiblat", `Tempat "${query}" gak ketemu — coba nama yang lebih spesifik (contoh: ${m.prefix}kiblat Monas Jakarta)`, "error"));
    }

    const bearing = qiblaBearing(loc.lat, loc.lon);
    const distance = distanceToKaaba(loc.lat, loc.lon);
    const dirLabel = DIRECTIONS[Math.round(bearing / 45) % 8];

    await m.react("⚡");

    // ── kartu kompas canvas ──
    let buf = null;
    try {
      buf = await renderKiblatCard({
        label: loc.label, lat: loc.lat, lon: loc.lon,
        bearing, distance, dirLabel,
      });
    } catch (e) { console.error("kiblat canvas error:", e.message); }

    const infoText = [
      `🧭 *Arah Kiblat — ${loc.label}*`,
      "",
      `🕋 Arah: *${bearing.toFixed(1)}°* dari Utara sejati (${dirLabel})`,
      `📏 Jarak ke Ka'bah: *± ${Math.round(distance).toLocaleString("id-ID")} km*`,
      `📍 Koordinat kamu: ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`,
      "",
      `_${source === "nominatim" ? "lokasi via pencarian tempat" : "lokasi dari pesan WA"} • Ka'bah: 21.4225, 39.8262_`,
      tipText("hadapkan jarum merah/kompas ke arah derajat di atas — utara kompas fisik mungkin beda dgn utara sejati, sesuaikan deklinasi lokal"),
    ].join("\n");

    if (buf) {
      await sock.sendMessage(m.chat, { image: buf, caption: infoText }, { quoted: m });
    } else {
      await m.reply(infoText);
    }
    await m.react("🐣");
  } catch (err) {
    console.error("kiblat error:", err);
    await m.react("❌");
    return m.reply(raraWrap("kiblat", "gagal hitung arah kiblat: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "kiblat" };
