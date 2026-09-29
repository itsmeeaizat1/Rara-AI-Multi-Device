// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// wxalert.js — Alert Cuaca AS (NWS) + Siklon Tropis (NHC) + EWS v2 AUTO-PUSH.
// Versi bot dari wxrundown.com (riset 24 Sep 2026: wxrundown = app Base44 yang
// datanya numpang API publik gratis — jadi Aina bangun langsung dari sumber asli):
// • api.weather.gov/alerts/active — alert aktif NWS seluruh AS (TANPA KEY)
// • www.nhc.noaa.gov/CurrentStorms.json — siklon tropis aktif Atlantik/Pasifik
//
// EWS v2 (request owner 24 Sep 2026: "aku mau tambah sebagai fitur cuaca otomatis
// dan ews v2 … upgrade kodenya jgn kyk v1 biar beneran hidup fitur berfungsi
// notifikasinya") — BEDA DARI EWS v1 (.dsw):
//   • PUSH PER-ALERT — tiap alert baru dikirim SENDIRI (gak digejuk 1 pesan),
//     max 8/tick, sisanya jadi digest biar gak banjir.
//   • SAMPEL AKTIVASI — pas .wxalert on, kondisi SERIUS yang lagi aktif SEKARANG
//     langsung dikirim sebagai bukti notifikasi jalan (dan di-mark seen biar gak dobel).
//   • .wxalert tes — kirim alert contoh ke chat ini detik itu juga (bukti jalur kirim hidup).
//   • .wxalert health (owner) — last tick/push/error/watcher, transparan kalau macet.
//   • RETRY kirim 1x + db.save() eksplisit tiap mutasi + first-poll 15 dtk pasca-boot
//     (gak nunggu 5 menit pertama) + error tick gak bunuh interval.
// Langganan: .wxalert on [nasional|tropis|<state>…] · off · status · tes · health.
// Dedupe per alert id (seen cap 300/watcher), severity Severe/Extreme doang di-push.
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { logger } from "../../src/lib/nova-logger.js";

const NWS = "https://api.weather.gov/alerts/active";
const NHC = "https://www.nhc.noaa.gov/CurrentStorms.json";
const POLL_MS = 5 * 60 * 1000;
const SEEN_CAP = 300;
const PUSH_CAP = 8; // max pesan alert per watcher per tick

// ── SEAM TEST ──────────────────────────────────────────────
let _http = null; // async (url) => {status, data}
export function _setHttpForTest(fn) { _http = fn; }
export function _resetSeamsForTest() { _http = null; _cache = null; }
let _sock = null;

async function fetchJson(url) {
  if (_http) return _http(url);
  const res = await axios.get(url, {
    timeout: 30000, validateStatus: () => true,
    headers: { "User-Agent": "NovaBot/1.0 (Aizat)", "Accept": "application/json" },
  });
  return { status: res.status, data: res.data };
}

// ── CACHE NASIONAL (payload ~2.3MB, query + monitor share) ──
let _cache = null; // { ts, feats }
function cacheValid(now = Date.now()) { return _cache && now - _cache.ts < 5 * 60 * 1000; }

const SEV_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
const SEV_EMOJI = { Extreme: "🚨", Severe: "⚠️", Moderate: "🔸", Minor: "▫️", Unknown: "▫️" };

// negara bagian + wilayah AS (kode yang diterima param area= NWS)
const STATES = {
  al: "AL", alabama: "AL", ak: "AK", alaska: "AK", az: "AZ", arizona: "AZ", ar: "AR", arkansas: "AR",
  ca: "CA", california: "CA", "kalifornia": "CA", co: "CO", colorado: "CO", ct: "CT", "connecticut": "CT",
  de: "DE", delaware: "DE", dc: "DC", "washington dc": "DC", fl: "FL", florida: "FL", ga: "GA", georgia: "GA",
  hi: "HI", hawaii: "HI", id: "ID", idaho: "ID", il: "IL", illinois: "IL", in: "IN", indiana: "IN",
  ia: "IA", iowa: "IA", ks: "KS", kansas: "KS", ky: "KY", kentucky: "KY", la: "LA", louisiana: "LA",
  me: "ME", "maine": "ME", md: "MD", maryland: "MD", ma: "MA", massachusetts: "MA", mi: "MI", michigan: "MI",
  mn: "MN", minnesota: "MN", ms: "MS", mississippi: "MS", mo: "MO", missouri: "MO", mt: "MT", montana: "MT",
  ne: "NE", nebraska: "NE", nv: "NV", nevada: "NV", "nh": "NH", "new hampshire": "NH", nj: "NJ", "new jersey": "NJ",
  nm: "NM", "new mexico": "NM", ny: "NY", "new york": "NY", nc: "NC", "north carolina": "NC",
  nd: "ND", "north dakota": "ND", oh: "OH", ohio: "OH", ok: "OK", oklahoma: "OK", or: "OR", oregon: "OR",
  pa: "PA", pennsylvania: "PA", ri: "RI", "rhode island": "RI", sc: "SC", "south carolina": "SC",
  sd: "SD", "south dakota": "SD", tn: "TN", tennessee: "TN", tx: "TX", texas: "TX", ut: "UT", utah: "UT",
  vt: "VT", vermont: "VT", va: "VA", virginia: "VA", wa: "WA", "washington": "WA", wv: "WV", "west virginia": "WV",
  wi: "WI", wisconsin: "WI", wy: "WY", wyoming: "WY",
  pr: "PR", "puerto rico": "PR", vi: "VI", "virgin islands": "VI", gu: "GU", guam: "GU", as: "AS", "american samoa": "AS",
};

const KLASIFIKASI = {
  TD: "Depresi Tropis", TS: "Badai Tropis", HU: "Hurricane", MH: "Hurricane Mayor",
  PTC: "Potensi Siklon Tropis", PT: "Pasca-Tropis", STD: "Depresi Subtropis", STS: "Badai Subtropis",
};
const ARAH = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]; // 8 arah per 45° dari utara

function toWIB(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${wib.getUTCDate()} ${bln[wib.getUTCMonth()]} ${String(wib.getUTCHours()).padStart(2, "0")}.${String(wib.getUTCMinutes()).padStart(2, "0")} WIB`;
}

function renderAlert(p) {
  const until = p.ends || p.expires || p.onset;
  const area = String(p.areaDesc || "").split(";")[0].trim();
  return `${SEV_EMOJI[p.severity] || "▫️"} ${p.event} — ${area}\n    s/d ${toWIB(until)}`;
}

// ══════════════════════════════════════════════════════════════
// STORAGE — handler pakai db param, monitor getDatabase() (singleton sama)
// ══════════════════════════════════════════════════════════════
function getStore(db) {
  if (!db.data.wxalert) db.data.wxalert = { watchers: {}, health: {} };
  if (!db.data.wxalert.watchers) db.data.wxalert.watchers = {};
  if (!db.data.wxalert.health) db.data.wxalert.health = {};
  return db.data.wxalert;
}

function saveDb(db) { try { db.save?.(); } catch {} }

function markSeen(w, id) {
  w.seen = w.seen || {};
  w.seen[id] = Date.now();
  const keys = Object.keys(w.seen);
  if (keys.length > SEEN_CAP) delete w.seen[keys[0]]; // buang tertua
}

const pluginConfig = {
  name: "wxalert",
  alias: ["wxalert", "wxrundown", "nwsalert", "ewsv2", "cuacaalert"],
  category: "cuaca",
  description: "Alert cuaca AS realtime (NWS) + siklon tropis (NHC) + langganan auto EWS v2 dengan push per-alert — versi bot wxrundown.com",
  usage: ".wxalert | .wxalert <state> | .wxalert tropis | .wxalert on [nasional|tropis|<state>…] | .wxalert off | .wxalert status | .wxalert tes | .wxalert health",
  example: ".wxalert texas | .wxalert on tropis | .wxalert on fl tx | .wxalert tes",
  cooldown: 5,
  isEnabled: true,
};

// ══════════════════════════════════════════════════════════════
// MANUAL QUERY
// ══════════════════════════════════════════════════════════════
function buildNational(feats) {
  if (!feats.length) return claraWrap("WX Alert — Nasional AS", "✨ Gak ada alert aktif di seluruh AS sekarang.");
  const perSev = {};
  feats.forEach((f) => { perSev[f.severity] = (perSev[f.severity] || 0) + 1; });
  const sevLine = ["Extreme", "Severe", "Moderate", "Minor"]
    .filter((s) => perSev[s]).map((s) => `${SEV_EMOJI[s]} ${s}: ${perSev[s]}`).join(" · ");
  const top = feats
    .filter((f) => SEV_RANK[f.severity] >= 3)
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
    .slice(0, 6);
  return claraWrap("WX Alert — Nasional AS (NWS)", [
    `Total alert aktif: ${feats.length}`,
    sevLine,
    "",
    "Alert paling serius sekarang:",
    ...(top.length ? top.map(renderAlert) : ["(gak ada severity Severe/Extreme aktif)"]),
    "",
    "Detail per wilayah: .wxalert <negara bagian>",
    "Contoh: .wxalert texas · .wxalert fl",
    "Siklon tropis: .wxalert tropis",
    "Auto-push: .wxalert on",
  ].join("\n"));
}

async function nationalSummary() {
  if (cacheValid()) return buildNational(_cache.feats);
  const { status, data } = await fetchJson(NWS);
  if (status !== 200 || !Array.isArray(data?.features)) {
    return claraWrap("WX Alert", `❌ API NWS bermasalah (${status}). Coba lagi nanti.`);
  }
  const feats = data.features.map((f) => ({ id: f.id, ...f.properties }));
  _cache = { ts: Date.now(), feats };
  return buildNational(feats);
}

async function stateAlerts(q) {
  const code = STATES[q];
  if (!code) {
    return claraWrap("WX Alert", [
      `🔎 Wilayah "${q}" gak dikenal. Pakai kode/nama negara bagian AS, contoh: TX · texas · FL · california.`,
      "",
      "Ringkasan nasional: .wxalert",
      "Siklon tropis: .wxalert tropis",
    ].join("\n"));
  }
  const { status, data } = await fetchJson(`${NWS}?area=${code}`);
  if (status !== 200 || !Array.isArray(data?.features)) {
    return claraWrap("WX Alert", `❌ API NWS bermasalah (${status}). Coba lagi nanti.`);
  }
  const feats = data.features.map((f) => f.properties)
    .sort((a, b) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0));
  if (!feats.length) return claraWrap(`WX Alert — ${code}`, `✨ Gak ada alert aktif di ${code} sekarang.`);
  const lines = [`Alert aktif di ${code}: ${feats.length}`, "", ...feats.slice(0, 10).map(renderAlert)];
  if (feats.length > 10) lines.push("", `…+${feats.length - 10} alert lain (mayoritas minor/advisory)`);
  return claraWrap(`WX Alert — ${code} (NWS)`, lines.join("\n"));
}

async function tropical() {
  const { status, data } = await fetchJson(NHC);
  if (status !== 200 || !Array.isArray(data?.activeStorms)) {
    return claraWrap("WX Tropis", `❌ API NHC bermasalah (${status}). Coba lagi nanti.`);
  }
  const storms = data.activeStorms;
  if (!storms.length) return claraWrap("WX Tropis — NHC", "✨ Gak ada sistem tropis aktif di Atlantik/Pasifik sekarang.");
  const lines = storms.map((s) => {
    const arah = ARAH[Math.round(((Number(s.movementDir) || 0) % 360) / 45) % 8];
    const klas = KLASIFIKASI[s.classification] || s.classification;
    const basin = String(s.id || "").startsWith("al") ? "Atlantik" : String(s.id || "").startsWith("ep") ? "Pasifik Timur" : String(s.id || "").startsWith("cp") ? "Pasifik Tengah" : "?";
    return [
      `🌀 ${s.name} — ${klas} (Lembah ${basin})`,
      `    Angin: ${s.intensity} kt · Tekanan: ${s.pressure} mb`,
      `    Posisi: ${s.latitude} ${s.longitude} · gerak ${s.movementSpeed} kt ke ${arah}`,
      `    Update: ${toWIB(s.lastUpdate)}`,
      s.publicAdvisory?.url ? `    Advisory: ${s.publicAdvisory.url}` : "",
    ].filter(Boolean).join("\n");
  });
  return claraWrap(`WX Tropis — ${storms.length} Sistem Aktif (NHC)`, lines.join("\n\n") + "\n\nSumber: NHC NOAA.");
}

// ══════════════════════════════════════════════════════════════
// KIRIM — jalur satu pintu + retry 1x + health tracking
// ══════════════════════════════════════════════════════════════
// jalur kirim satu pintu buat SEMUA push (tes/aktivasi/monitor) + retry 1x
async function safeSend(chat, text) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { await _sock.sendMessage(chat, { text }); return true; }
    catch (e) {
      if (attempt === 2) { logger.warn("wxalert", `kirim ke ${chat} gagal: ${e.message}`); return false; }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}

function trackPush(db) {
  const h = getStore(db).health;
  h.pushes = (h.pushes || 0) + 1;
  h.lastPushAt = Date.now();
}

// ══════════════════════════════════════════════════════════════
// EWS v2 — LANGGANAN
// ══════════════════════════════════════════════════════════════
function subHelp() {
  return claraWrap("EWS v2 — Langganan Alert Cuaca", [
    "Fitur auto-push alert cuaca AS (EWS v2 — upgrade dari EWS gempa .dsw):",
    "",
    "▸ .wxalert on — langganan nasional (Severe/Extreme seluruh AS)",
    "▸ .wxalert on tropis — langganan siklon tropis baru (NHC)",
    "▸ .wxalert on <state> — per negara bagian, bisa banyak:",
    "     .wxalert on fl tx",
    "▸ .wxalert off — berhenti semua",
    "▸ .wxalert status — cek langganan chat ini",
    "▸ .wxalert tes — kirim alert contoh SEKARANG (uji notifikasi)",
    "▸ .wxalert health — kondisi monitor (owner)",
    "",
    "Tiap alert baru dikirim SENDIRI (push per-alert), cek 5 menit sekali.",
    "Cuma severity Severe/Extreme yang di-push biar gak spam.",
  ].join("\n"));
}

// sampel aktivasi: kondisi serius yang LAGI AKTIF dikirim langsung sebagai
// bukti notifikasi jalan — di-mark seen biar tick berikut gak dobel.
async function sendActivationSample(m, sock, db, w) {
  const chat = m.key.remoteJid;
  let sampleSent = 0;
  try {
    if (w.states.length) {
      const code = w.states[0];
      const { status, data } = await fetchJson(`${NWS}?area=${code}`);
      const feats = status === 200 && Array.isArray(data?.features)
        ? data.features.map((f) => ({ id: f.id, ...f.properties })) : [];
      const serious = feats.filter((f) => SEV_RANK[f.severity] >= 3).slice(0, 2);
      for (const f of serious) {
        markSeen(w, f.id);
        const ok = await safeSend(chat, claraWrap("EWS v2 — Contoh Alert Aktif", [
          `Ini sampel kondisi yang LAGI AKTIF di ${code}:`,
          "",
          renderAlert(f),
          "",
          `Alert BARU selanjutnya otomatis muncul di chat ini tiap 5 menit. Buat uji kirim: .wxalert tes`,
        ].join("\n")));
        if (ok) sampleSent++;
      }
    }
    if (w.tropis) {
      const { status, data } = await fetchJson(NHC);
      const storms = status === 200 && Array.isArray(data?.activeStorms) ? data.activeStorms : [];
      for (const s of storms.slice(0, 1)) {
        markSeen(w, s.id);
        const klas = KLASIFIKASI[s.classification] || s.classification;
        const ok = await safeSend(chat, claraWrap("EWS v2 — Contoh Siklon Aktif", [
          `Ini sampel sistem tropis yang LAGI AKTIF:`,
          "",
          `🌀 ${s.name} — ${klas} · angin ${s.intensity} kt · tekanan ${s.pressure} mb`,
          `    posisi ${s.latitude} ${s.longitude}`,
          "",
          `Sistem BARU selanjutnya otomatis muncul di chat ini. Buat uji kirim: .wxalert tes`,
        ].join("\n")));
        if (ok) sampleSent++;
      }
    }
    if (!sampleSent && w.nasional) {
      const summary = await nationalSummary();
      await safeSend(chat, summary);
      sampleSent++;
    }
  } catch (e) { logger.warn("wxalert", "activation sample: " + e.message); }
  return sampleSent;
}

async function subOn(m, sock, db, args) {
  const store = getStore(db);
  const chatId = m.key.remoteJid;
  const w = store.watchers[chatId] || { states: [], nasional: false, tropis: false, seen: {} };
  if (!args.length) w.nasional = true;
  const bad = [];
  for (const a of args) {
    if (a === "nasional") { w.nasional = true; continue; }
    if (a === "tropis" || a === "tropical" || a === "siklon" || a === "hurricane") { w.tropis = true; continue; }
    const code = STATES[a];
    if (code) { if (!w.states.includes(code)) w.states.push(code); continue; }
    bad.push(a);
  }
  store.watchers[chatId] = w;
  saveDb(db);
  const lines = ["✅ Langganan EWS v2 AKTIF di chat ini:", ""];
  if (w.nasional) lines.push("▸ Nasional — Severe/Extreme seluruh AS");
  if (w.tropis) lines.push("▸ Tropis — siklon baru NHC");
  if (w.states.length) lines.push(`▸ Negara bagian: ${w.states.join(", ")}`);
  if (bad.length) lines.push("", `⚠️ Gak dikenali (di-skip): ${bad.join(", ")}`);
  lines.push("", "Notifikasi diuji langsung — sampel menyusul di bawah.");
  lines.push("Berhenti: .wxalert off");
  await m.reply(claraWrap("EWS v2 — WX Alert", lines.join("\n")));
  // bukti langsung: kirim kondisi aktif sekarang (gak nunggu tick pertama)
  const n = await sendActivationSample(m, sock, db, w);
  saveDb(db);
  if (!n) {
    await m.reply(claraWrap("EWS v2", "ℹ️ Belum ada kondisi serius aktif di langgananmu sekarang — alert BARU bakal otomatis muncul. Uji jalur kirim: .wxalert tes"));
  }
}

async function subOff(m, db) {
  const store = getStore(db);
  const chatId = m.key.remoteJid;
  if (!store.watchers[chatId]) {
    return m.reply(claraWrap("EWS v2", "ℹ️ Chat ini gak ada langganan WX Alert. Aktifin: .wxalert on"));
  }
  delete store.watchers[chatId];
  saveDb(db);
  return m.reply(claraWrap("EWS v2 — WX Alert", "✅ Langganan alert cuaca chat ini udah dihentikan."));
}

async function subStatus(m, db) {
  const store = getStore(db);
  const w = store.watchers[m.key.remoteJid];
  if (!w) return m.reply(claraWrap("EWS v2", "ℹ️ Chat ini belum langganan. Aktifin: .wxalert on [nasional|tropis|<state>]"));
  const lines = ["Status langganan EWS v2 chat ini:", ""];
  lines.push(w.nasional ? "▸ Nasional: 🟢 ON" : "▸ Nasional: 🔴 off");
  lines.push(w.tropis ? "▸ Tropis (NHC): 🟢 ON" : "▸ Tropis (NHC): 🔴 off");
  lines.push(w.states.length ? `▸ Negara bagian: ${w.states.join(", ")}` : "▸ Negara bagian: (kosong)");
  lines.push(`▸ Alert udah dikirim (dedupe): ${Object.keys(w.seen || {}).length}`);
  const h = store.health;
  lines.push("", `Monitor: last tick ${h.lastTickAt ? toWIB(new Date(h.lastTickAt).toISOString()) : "—"} · total push ${h.pushes || 0}`);
  return m.reply(claraWrap("EWS v2 — Status", lines.join("\n")));
}

// .wxalert tes — kirim alert CONTOH ke chat ini lewat jalur kirim yang sama
// dengan push asli (bukti end-to-end notifikasi hidup, tanpa nunggu tick).
async function subTes(m, sock, db) {
  const chat = m.key.remoteJid;
  const fake = {
    id: "tes-" + Date.now(),
    severity: "Extreme",
    event: "Tornado Warning (TES)",
    areaDesc: "Dummy County, TX",
    ends: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  const ok = await safeSend(chat, claraWrap("EWS v2 — TES NOTIFIKASI", [
    "🚨 Tornado Warning (TES) — Dummy County, TX",
    `    s/d ${toWIB(fake.ends)}`,
    "",
    "Ini alert CONTOH buat ngetes jalur notifikasi EWS v2.",
    "Kamu terima ini = notifikasi di chat ini BISA jalan.",
    "Alert ASLI di-push otomatis tiap 5 menit setelah ini.",
  ].join("\n")));
  if (!ok) return m.reply(claraWrap("EWS v2", "❌ Tes kirim GAGAL — bot gak bisa kirim ke chat ini. Cek log."));
  trackPush(db); saveDb(db);
  return m.reply(claraWrap("EWS v2", "✅ Tes kirim BERHASIL — notifikasi di chat ini berfungsi."));
}

async function subHealth(m, db) {
  const store = getStore(db);
  const h = store.health;
  const watchers = Object.keys(store.watchers || {});
  const lines = [
    "Kondisi monitor EWS v2:",
    "",
    `▸ Langganan aktif: ${watchers.length} chat`,
    `▸ Interval: 5 menit · first-poll pasca-boot 15 dtk`,
    `▸ Total tick: ${h.ticks || 0} · total push: ${h.pushes || 0}`,
    `▸ Tick terakhir: ${h.lastTickAt ? toWIB(new Date(h.lastTickAt).toISOString()) : "—"}`,
    `▸ Push terakhir: ${h.lastPushAt ? toWIB(new Date(h.lastPushAt).toISOString()) : "—"}`,
    `▸ Cek NWS terakhir: ${h.lastNwsAt ? toWIB(new Date(h.lastNwsAt).toISOString()) : "—"}`,
    `▸ Error terakhir: ${h.lastError || "—"}`,
  ];
  if (watchers.length) {
    lines.push("", "Langganan:");
    for (const c of watchers.slice(0, 10)) {
      const w = store.watchers[c];
      const tags = [w.nasional && "nasional", w.tropis && "tropis", ...(w.states || [])].filter(Boolean).join(",");
      lines.push(`▸ ${c.replace(/@\w+\.us$/, "…")}: ${tags}`);
    }
  }
  return m.reply(claraWrap("EWS v2 — Health", lines.join("\n")));
}

// ══════════════════════════════════════════════════════════════
// MONITOR — poll 5 mnt, push PER-ALERT, dedupe, lazy, gagal gak mati
// ══════════════════════════════════════════════════════════════
async function pushAlertsPerChat(db, chat, w, feats, label) {
  const fresh = feats
    .filter((f) => SEV_RANK[f.severity] >= 3 && !((w.seen || {})[f.id]))
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  if (!fresh.length) return 0;
  fresh.forEach((f) => markSeen(w, f.id));
  let sent = 0;
  const batch = fresh.slice(0, PUSH_CAP);
  for (const f of batch) {
    const out = claraWrap("EWS v2 — Alert Cuaca AS" + (label ? " · " + label : ""), [
      "🚨 ALERT BARU:",
      "",
      renderAlert(f),
      "",
      f.headline ? String(f.headline).slice(0, 120) : "",
      "",
      "— EWS v2 otomatis · sumber: NWS",
    ].filter((l, i) => l !== "" || i < 3).join("\n"));
    const ok = await safeSend(chat, out);
    if (ok) { sent++; trackPush(db); }
  }
  if (fresh.length > PUSH_CAP) {
    const rest = fresh.slice(PUSH_CAP);
    const out = claraWrap("EWS v2 — Ringkasan Sisa", [
      `…+${fresh.length - PUSH_CAP} alert lain baru di ${label || "langgananmu"}:`,
      "",
      ...rest.slice(0, 8).map(renderAlert),
    ].join("\n"));
    await safeSend(chat, out);
  }
  return sent;
}

async function pollNational(db, watchers) {
  let feats;
  if (cacheValid()) feats = _cache.feats;
  else {
    const { status, data } = await fetchJson(NWS);
    if (status !== 200 || !Array.isArray(data?.features)) throw new Error(`NWS ${status}`);
    feats = data.features.map((f) => ({ id: f.id, ...f.properties }));
    _cache = { ts: Date.now(), feats };
    const h = getStore(db).health; h.lastNwsAt = Date.now();
  }
  for (const { chat, orig } of watchers) {
    await pushAlertsPerChat(db, chat, orig, feats, "Nasional");
  }
}

async function pollStates(db, stateGroups) {
  for (const [code, list] of Object.entries(stateGroups)) {
    const { status, data } = await fetchJson(`${NWS}?area=${code}`);
    if (status !== 200 || !Array.isArray(data?.features)) continue;
    const feats = data.features.map((f) => ({ id: f.id, ...f.properties }));
    for (const { chat, orig } of list) {
      await pushAlertsPerChat(db, chat, orig, feats, code);
    }
  }
}

async function pollTropical(db, watchers) {
  const { status, data } = await fetchJson(NHC);
  if (status !== 200 || !Array.isArray(data?.activeStorms)) return;
  const storms = data.activeStorms;
  for (const { chat, orig } of watchers) {
    const fresh = storms.filter((s) => !((orig.seen || {})[s.id]));
    if (!fresh.length) continue;
    fresh.forEach((s) => markSeen(orig, s.id));
    for (const s of fresh.slice(0, 4)) {
      const klas = KLASIFIKASI[s.classification] || s.classification;
      const arah = ARAH[Math.round(((Number(s.movementDir) || 0) % 360) / 45) % 8];
      const out = claraWrap("EWS v2 — Siklon Tropis BARU", [
        `🌀 ${s.name} — ${klas}`,
        "",
        `Angin: ${s.intensity} kt · Tekanan: ${s.pressure} mb`,
        `Posisi: ${s.latitude} ${s.longitude} · gerak ${s.movementSpeed} kt ke ${arah}`,
        `Update: ${toWIB(s.lastUpdate)}`,
        "",
        "— EWS v2 otomatis · sumber: NHC",
      ].join("\n"));
      const ok = await safeSend(chat, out);
      if (ok) trackPush(db);
    }
    if (fresh.length > 4) {
      await safeSend(chat, claraWrap("EWS v2 — Tropis", `…+${fresh.length - 4} sistem tropis baru lain: ${fresh.slice(4).map((s) => s.name).join(", ")}`));
    }
  }
}

async function tick(sockOverride) {
  const db = getDatabase();
  const store = getStore(db);
  const h = store.health;
  h.ticks = (h.ticks || 0) + 1;
  h.lastTickAt = Date.now();
  const entries = Object.entries(store.watchers || {});
  if (!entries.length) { saveDb(db); return; }
  const sendSock = sockOverride || _sock;
  if (!sendSock) { saveDb(db); return; }
  if (sockOverride) _sock = sendSock;
  const watchers = entries.map(([chat, w]) => ({ chat, orig: w }));
  const nasional = watchers.filter((x) => x.orig.nasional);
  const tropis = watchers.filter((x) => x.orig.tropis);
  const stateGroups = {};
  for (const x of watchers) for (const s of x.orig.states || []) (stateGroups[s] = stateGroups[s] || []).push(x);
  try {
    if (nasional.length) await pollNational(db, nasional);
    if (Object.keys(stateGroups).length) await pollStates(db, stateGroups);
    if (tropis.length) await pollTropical(db, tropis);
    h.lastError = null;
  } catch (e) {
    h.lastError = String(e.message || e);
    logger.warn("wxalert", "tick: " + h.lastError);
  }
  saveDb(db);
}

let _timer = null;

export async function initWxAlertMonitor(sock) {
  _sock = sock;
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => { tick().catch(() => {}); }, POLL_MS);
  if (typeof _timer.unref === "function") _timer.unref();
  // first-poll pasca-boot: gak nunggu 5 menit pertama
  setTimeout(() => { tick().catch(() => {}); }, 15 * 1000).unref?.();
  logger.success("wxalert", "EWS v2 monitor started (poll 5 mnt + first-poll 15 dtk)");
}

// dipakai e2e: satu siklus poll penuh dengan mock sock
export async function _tickForTest(sock) { await tick(sock); }
export function _getTimerForTest() { return _timer; }

// ══════════════════════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════════════════════
async function handler(m, { sock, db }) {
  const args = (m.args || []).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
  if (sock) _sock = sock; // jalur kirim push selalu siap dari handler manapun
  try {
    if (args[0] === "on" || args[0] === "aktif") return await subOn(m, sock, db, args.slice(1));
    if (args[0] === "off" || args[0] === "stop") return await subOff(m, db);
    if (args[0] === "status") return await subStatus(m, db);
    if (args[0] === "tes" || args[0] === "test") {
      _sock = _sock || sock;
      return await subTes(m, _sock, db);
    }
    if (args[0] === "health" || args[0] === "cek") return await subHealth(m, db);
    if (args[0] === "langganan" || args[0] === "sub") return m.reply(subHelp());

    let out;
    if (!args.length) out = await nationalSummary();
    else if (args[0] === "tropis" || args[0] === "tropical" || args[0] === "siklon" || args[0] === "hurricane") out = await tropical();
    else out = await stateAlerts(args[0]);
    return m.reply(out);
  } catch (e) {
    return m.reply(claraWrap("WX Alert", `❌ Gagal nyambung ke API cuaca AS: ${e.message || e}`));
  }
}

export { handler, pluginConfig, pluginConfig as config };
export default handler;
