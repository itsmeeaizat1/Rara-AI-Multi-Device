// ═══════════════════════════════════════════════════════════════════════════
// RARA DAILY BRIEFING ENGINE (25 Sep 2026, owner: "fitur no 2 — daily
// briefing personal, beneran hidup, bukan mock")
//
// Kartu pagi personal per-user, semua bagian dari API LIVE (gak ada data
// bohongan — section gagal ditulis jujur "gagal diambil"):
//   🌅 sapaan + tanggal WIB        (jam lokal WIB)
//   ☁️  cuaca lokasi user           (open-meteo, TANPA key — numpang lib
//                                    rara-bmkg-cuaca-scheduler geocodeCity/getWmo)
//   🌍 gempa 24 jam terakhir        (data.bmkg.go.id gempaterkini.json, TANPA key)
//   ⚽ jadwal bola tim favorit       (ESPN scoreboard per liga, TANPA key)
//   🕒 agenda reminder hari ini      (global.raraReminders, in-memory)
//   ⚔️ saldo RPG + streak           (db user rpg)
//   💡 catatan personal             (rara-memory per-user)
//
// Scheduler: interval 60 dtk, per-user { on, jam "HH:mm" WIB, lokasi, tim[] },
// dedupe per hari via lastDate, resume aman restart. Claim lastDate SEBELUM
// kirim supaya gak dobel-DM kalau kirim sempat error.
// ═══════════════════════════════════════════════════════════════════════════

import { getDatabase } from "./rara-database.js";
import { geocodeCity, getWmo } from "./rara-bmkg-cuaca-scheduler.js";
import { listMemories, isMemoryOn } from "./rara-memory.js";
import { boxLeft } from "./styler.js";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const BMKG_RECENT = "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// liga yang di-scan buat nyari pertandingan tim user (ESPN league code)
const SCAN_LEAGUES = [
  { code: "eng.1", name: "Premier League" },
  { code: "esp.1", name: "LaLiga" },
  { code: "ita.1", name: "Serie A" },
  { code: "ger.1", name: "Bundesliga" },
  { code: "fra.1", name: "Ligue 1" },
  { code: "uefa.champions", name: "UEFA Champions League" },
  { code: "uefa.europa", name: "UEFA Europa League" },
  { code: "idn.1", name: "BRI Super League" },
  { code: "sau.1", name: "Saudi Pro League" },
];

const FETCH_TIMEOUT_MS = 15_000;
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ── seams test ──────────────────────────────────────────────────────────────
let _http = null; // { geocode, forecast, quake, scoreboard }
let _now = null;  // () => Date (waktu WIB fake buat e2e)
export function _setBriefingHttpForTest(x) { _http = x; }
export function _setBriefingNowForTest(fn) { _now = fn; }
export function _resetBriefingSeamsForTest() { _http = null; _now = null; }

/** Waktu sekarang versi WIB. @returns {Date} objek Date dibaca pakai getUTC*.
 * Seam _now = jam ASLI (UTC), engine yang geser +7 — biar e2e nulis tanggal
 * UTC natural dan hasil WIB konsisten (bug awal: seam dibaca langsung →
 * jam "sekarang" minus 7 jam → scheduler gak pernah kekick). */
function wibNow() {
  return new Date((_now ? _now().getTime() : Date.now()) + WIB_OFFSET_MS);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function todayStr() { const d = wibNow(); return d.toISOString().slice(0, 10); }
function jamHHMM() { const d = wibNow(); return pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()); }

function namaHariIndo(d) {
  return HARI_ID[d.getUTCDay()] + ", " + d.getUTCDate() + " " + BULAN_ID[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

function sapaan() {
  const h = wibNow().getUTCHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** fetch dengan timeout terbatas — semua HTTP WAJIB lewat sini.
 * TANPA User-Agent custom: ESPN 403 buat "RaraBot/1.0" (probe 25 Sep —
 * UA default node lolos 200, UA custom ke-blacklist). BMKG juga aman polos. */
async function httpGet(url) {
  const res = await Promise.race([
    fetch(url),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout " + (FETCH_TIMEOUT_MS / 1000) + "s")), FETCH_TIMEOUT_MS)),
  ]);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res;
}

// ── STATE per-user ─────────────────────────────────────────────────────────
export function ensureBriefingUser(db, sender) {
  const d = db.data;
  if (!d.briefing || typeof d.briefing !== "object") d.briefing = { perUser: {} };
  if (!d.briefing.perUser || typeof d.briefing.perUser !== "object") d.briefing.perUser = {};
  if (!d.briefing.perUser[sender] || typeof d.briefing.perUser[sender] !== "object") {
    d.briefing.perUser[sender] = { on: false, jam: "06:00", lokasi: "Jakarta", tim: [], lastDate: "", lastSent: 0 };
  }
  const u = d.briefing.perUser[sender];
  if (!Array.isArray(u.tim)) u.tim = [];
  if (typeof u.jam !== "string" || !/^\d{2}:\d{2}$/.test(u.jam)) u.jam = "06:00";
  if (typeof u.lokasi !== "string" || !u.lokasi.trim()) u.lokasi = "Jakarta";
  return u;
}

export function getBriefingUser(db, sender) { return ensureBriefingUser(db, sender); }

/** validasi "HH:mm" → "HH:mm" normal, null kalau gak valid */
export function parseJam(v) {
  const m = /^(\d{1,2})[:.](\d{1,2})$/.exec(String(v || "").trim());
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return pad2(hh) + ":" + pad2(mm);
}

// ── SECTION 1: cuaca (open-meteo live) ─────────────────────────────────────
async function sectionCuaca(cfg) {
  try {
    const geo = _http?.geocode
      ? await _http.geocode(cfg.lokasi)
      : await geocodeCity(cfg.lokasi);
    const p = new URLSearchParams({
      latitude: String(geo.lat), longitude: String(geo.lon),
      current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
      timezone: "Asia/Jakarta", forecast_days: "1",
    });
    const data = _http?.forecast
      ? await _http.forecast(p.toString())
      : (await (await httpGet(FORECAST_URL + "?" + p.toString())).json());
    // validasi bentuk keras (skill: HTTP 200 bukan sukses — cek isi)
    if (!data || typeof data !== "object" || !data.current || !Array.isArray(data.daily?.time)
      || data.daily.time.length === 0 || !Array.isArray(data.daily.temperature_2m_max)) {
      throw new Error("bentuk respon open-meteo gak dikenal");
    }
    const c = data.current;
    const dmax = data.daily.temperature_2m_max[0], dmin = data.daily.temperature_2m_min[0];
    const hujan = data.daily.precipitation_probability_max?.[0] ?? 0;
    const wmo = getWmo(c.weather_code);
    const lokasi = geo.name || cfg.lokasi;
    const lines = [
      `${wmo.icon} ${lokasi}: ${wmo.desc.toLowerCase()}, suhu ${Math.round(c.temperature_2m)}°C (hari ini ${Math.round(dmin)}–${Math.round(dmax)}°C)`,
      `   hujan ${hujan}% • kelembapan ${c.relative_humidity_2m}% • angin ${c.wind_speed_10m} km/jam`,
    ];
    return { ok: true, text: lines.join("\n") };
  } catch (e) {
    return { ok: false, text: `   ⚠️ cuaca gagal saya ambil: ${e?.message || "error"}` };
  }
}

// ── SECTION 2: gempa 24 jam (BMKG live) ────────────────────────────────────
async function sectionGempa() {
  try {
    const data = _http?.quake ? await _http.quake() : (await (await httpGet(BMKG_RECENT)).json());
    const list = data?.Infogempa?.gempa;
    if (!Array.isArray(list)) throw new Error("bentuk respon BMKG gak dikenal");
    const batas = (_now ? _now().getTime() : Date.now()) - 24 * 60 * 60 * 1000;
    const recent = list.filter((g) => {
      const t = Date.parse(g?.DateTime || "");
      return Number.isFinite(t) && t >= batas;
    });
    if (recent.length === 0) {
      return { ok: true, text: "✅ 24 jam terakhir gak ada gempa bermagnitudo besar. Tenang saja." };
    }
    const lines = recent.slice(0, 3).map((g) => {
      const wil = String(g.Wilayah || "-").replace(/\s+/g, " ").trim();
      const jam = String(g.Jam || "").replace(" WIB", "");
      return `   • M${g.Magnitude} — ${wil}${jam ? " (" + jam + " WIB)" : ""}${g.Potensi && /tsunami/i.test(g.Potensi) ? " ⚠️ potensi tsunami" : ""}`;
    });
    if (recent.length > 3) lines.push(`   …dan ${recent.length - 3} gempa lagi`);
    return { ok: true, text: `🌍 ${recent.length} gempa terakhir 24 jam:\n` + lines.join("\n") };
  } catch (e) {
    return { ok: false, text: `   ⚠️ data gempa gagal saya ambil: ${e?.message || "error"}` };
  }
}

// ── SECTION 3: jadwal bola tim favorit (ESPN live) ─────────────────────────
async function scoreboardLiga(code) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?limit=30`;
  const data = _http?.scoreboard ? await _http.scoreboard(code) : (await (await httpGet(url)).json());
  const events = data?.events;
  if (!Array.isArray(events)) throw new Error("bentuk respon ESPN gak dikenal");
  return events;
}

async function sectionBola(cfg) {
  if (!cfg.tim || cfg.tim.length === 0) return { ok: true, text: null }; // gak di-set → skip senyap
  const hariIni = todayStr(); // YYYY-MM-DD WIB
  try {
    const semua = await Promise.allSettled(SCAN_LEAGUES.map((l) => scoreboardLiga(l.code)));
    // skill 5.6: gak ada satu pun liga yang berhasil → itu KEGAGALAN,
    // bukan "tim gak main" (ESPN down ≠ tenang).
    if (semua.every((r) => r.status === "rejected")) {
      throw new Error("semua sumber ESPN gak bisa dihubungi (" + (semua[0].reason?.message || "?") + ")");
    }
    const hasil = [];
    for (let i = 0; i < SCAN_LEAGUES.length; i++) {
      const r = semua[i];
      if (r.status !== "fulfilled") continue;
      for (const ev of r.value) {
        const tgl = String(ev?.date || "").slice(0, 10); // ISO tanggal pertandingan
        if (tgl !== hariIni) continue;
        const nama = String(ev?.name || "");
        const status = ev?.competitions?.[0]?.status?.type?.shortDetail || "";
        if (!nama) continue;
        for (const tim of cfg.tim) {
          if (nama.toLowerCase().includes(String(tim).toLowerCase())) {
            const jam = ev?.date ? new Date(new Date(ev.date).getTime() + WIB_OFFSET_MS) : null;
            const jamStr = jam ? ` — ${pad2(jam.getUTCHours())}:${pad2(jam.getUTCMinutes())} WIB` : "";
            hasil.push(`   ⚽ ${nama}${jamStr}${status ? " (" + status + ")" : ""} — ${SCAN_LEAGUES[i].name}`);
            break;
          }
        }
      }
    }
    if (hasil.length === 0) {
      const daftar = cfg.tim.map((t) => t.toLowerCase()).join(", ");
      return { ok: true, text: `⚽ Tim favorit kamu (${daftar}) gak main hari ini.` };
    }
    return { ok: true, text: hasil.slice(0, 5).join("\n") };
  } catch (e) {
    return { ok: false, text: `   ⚠️ jadwal bola gagal saya ambil: ${e?.message || "error"}` };
  }
}

// ── SECTION 4: agenda reminder hari ini ────────────────────────────────────
function sectionAgenda(sender) {
  try {
    const list = (global.raraReminders || [])
      .filter((r) => r && !r.fired && r.sender === sender && Number(r.fireAt || 0) > Date.now())
      .sort((a, b) => a.fireAt - b.fireAt);
    if (list.length === 0) return { ok: true, text: null };
    const lines = list.slice(0, 5).map((r) => {
      const d = new Date(Number(r.fireAt));
      const wib = new Date(d.getTime() + WIB_OFFSET_MS);
      return `   🕒 ${pad2(wib.getUTCHours())}:${pad2(wib.getUTCMinutes())} — ${String(r.message || "").slice(0, 60)}`;
    });
    return { ok: true, text: lines.join("\n") };
  } catch { return { ok: true, text: null }; }
}

// ── SECTION 5: RPG ─────────────────────────────────────────────────────────
function sectionRpg(db, sender) {
  try {
    const u = db.getUser(sender);
    const r = u?.rpg;
    if (!r || typeof r !== "object" || (r.level === 1 && !r.gold && !r.cash)) return { ok: true, text: null };
    const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
    const lines = [`   Lv ${r.level} • ⚜️ ${fmt(r.gold)} gold • ${fmt(r.cash)} cash`];
    if (r.dailyStreak) lines.push(`   streak harian ${r.dailyStreak} hari berjalan`);
    return { ok: true, text: lines.join("\n") };
  } catch { return { ok: true, text: null }; }
}

// ── SECTION 6: catatan personal (rara-memory) ─────────────────────────────
function sectionMemory(db, sender) {
  try {
    if (!isMemoryOn(db, sender)) return { ok: true, text: null };
    const list = listMemories(db, sender).slice(0, 3);
    if (list.length === 0) return { ok: true, text: null };
    return { ok: true, text: list.map((x) => `   • ${String(x.text || x).slice(0, 70)}`).join("\n") };
  } catch { return { ok: true, text: null }; }
}

// ── KARTU UTUH ─────────────────────────────────────────────────────────────
/**
 * Bangun kartu briefing. Section live jalan paralel (Promise.all) dan
 * gagal-nya ditulis jujur — GAK ADA data bohongan.
 * @param {string} sender JID user
 * @param {string} [pushName] nama panggilan
 * @param {Object} [cfgOverride] paksa config (buat tes scheduler)
 * @returns {Promise<string>} kartu siap kirim
 */
export async function buildBriefingCard(sender, pushName = "", cfgOverride = null) {
  const db = getDatabase();
  const cfg = cfgOverride || getBriefingUser(db, sender);
  const [cuaca, gempa, bola] = await Promise.all([
    sectionCuaca(cfg), sectionGempa(), sectionBola(cfg),
  ]);
  const agenda = sectionAgenda(sender);
  const rpg = sectionRpg(db, sender);
  const mem = sectionMemory(db, sender);

  const d = wibNow();
  const isi = [];
  isi.push(`${sapaan()}, ${pushName || "Kak"} 🌅`);
  isi.push(namaHariIndo(d));
  isi.push("");
  if (cuaca.text) isi.push(cuaca.text);
  if (gempa.text) { isi.push(""); isi.push(gempa.text); }
  if (bola.text) { isi.push(""); isi.push(bola.text); }
  if (agenda.text) { isi.push(""); isi.push("🗓️ agenda kamu:"); isi.push(agenda.text); }
  if (rpg.text) { isi.push(""); isi.push("⚔️ rpg kamu:"); isi.push(rpg.text); }
  if (mem.text) { isi.push(""); isi.push("💡 yang saya inget soal kamu:"); isi.push(mem.text); }
  isi.push("");
  isi.push("Semangat menjalani hari ya ♡");
  isi.push("_atur kartu ini: .briefing lokasi/tim/jam_");
  return boxLeft("Briefing Pagi", isi.join("\n"));
}

// ── SCHEDULER ──────────────────────────────────────────────────────────────
let _timer = null;

/** jadwalkan semua user yang on dan belum kekirim hari ini */
export async function processBriefingTick(sock, opts = {}) {
  const db = getDatabase();
  const d = db.data;
  if (!d?.briefing?.perUser || typeof d.briefing.perUser !== "object") return { sent: 0 };
  const hari = todayStr();
  const nowJam = jamHHMM();
  let sent = 0;
  for (const [sender, u] of Object.entries(d.briefing.perUser)) {
    if (!u || !u.on) continue;
    if (u.lastDate === hari) continue;
    if (nowJam < String(u.jam || "06:00")) continue; // belum jamnya
    // CLAIM dulu (anti dobel-DM kalau kirim error di tengah jalan)
    u.lastDate = hari;
    try {
      const card = await buildBriefingCard(sender, u.pushName || "");
      if (opts.dryRun) { sent++; continue; }
      const jid = /@s\.whatsapp\.net$/.test(sender) ? sender : sender + "@s.whatsapp.net";
      await sock.sendMessage(jid, { text: card });
      u.lastSent = Date.now();
      sent++;
    } catch (e) {
      u.lastError = String(e?.message || e).slice(0, 120); // jujur: catat error, besok dicoba lagi
    }
  }
  return { sent };
}

export function initBriefingScheduler(sock) {
  if (_timer) return _timer; // idempotent anti dobel registrasi (skill 5.4)
  _timer = setInterval(async () => {
    try { await processBriefingTick(sock); } catch { /* tick gagal → tick berikutnya */ }
  }, 60_000);
  return _timer;
}

export function stopBriefingScheduler() { if (_timer) { clearInterval(_timer); _timer = null; } }
