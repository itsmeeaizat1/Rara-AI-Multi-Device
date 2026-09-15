// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-bola-notifier.js — Auto Jadwal Bola Notifier (request owner 10 Sep
// 2026: "tambah fitur auto jadwalbola notifier mirip kerja anime notifier").
//
// RANTAI PROVIDER (ala anime/movie notifier — anti mati total):
//   1. ESPN   site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard
//             (gratis no key — utama liga internasional, verified live)
//   2. TheSportsDB eventsnextleague/eventspastleague per liga (Liga 1 Indonesia
//             id 4790 — ESPN idn.1 stale data musim lalu, TSDB yang muter)
//   3. Apify Flashscore (actor khadinakbar/flashscore-live-matches, token di env
//             APIFY_TOKEN / apikeys.json apifyToken — LIGA 2 INDONESIA: satu-
//             satunya sumber; PAY_PER_EVENT $0.003/item → interval throttle
//             terpisah + window jam main WIB biar credit free $5/bln aman)
//   4. TheSportsDB eventsday (free key "3" — fallback global semua liga down)
//
// 3 TIPE KONTEN (bisa on/off sendiri, ala .animenotify info <tipe>):
//   • jadwal   📅 digest "Jadwal Bola Hari Ini" (sekali/hari WIB) + fixture
//              baru yang muncul belakangan
//   • reminder ⏰ H-45 menit sebelum kick-off (dedup sekali per match)
//   • hasil    🏁 skor full-time begitu pertandingan selesai (dedup)
//   • live     🔴 kick-off + GOL real-time selama laga berjalan (polling ESPN
//              cepat tiap N menit; nama pencetak gol diambil dari endpoint
//              summary per-event — hanya liga ESPN, TSDB/Apify gak ada skor live)
//
// Liga favorit configurable: .jadwalbolanotify liga add|del|list|reset
// (default: Inggris, Spanyol, Italia, Jerman, Prancis, Champions).
// Interval cek bisa diset: .jadwalbolanotify interval <menit> (5-720, def 30).
// Waktu kick-off otomatis dikonversi ke WIB.
//
// Per-chat opt-in (.jadwalbolanotify on) + target terpusat
// (.switch auto autobolanotify set) — subscriber tetap dapat, target terpusat
// nambah jangkauan. Toggle global: .switch auto autobolanotify on/off.

import axios from "axios";
import fs from "fs";
import path from "path";
import { mergeAutoTargets } from "./nova-auto-target.js";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "autobolanotify.json");

const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const TSDB_API = "https://www.thesportsdb.com/api/v1/json/3";

const TZ = "Asia/Jakarta";
const DEFAULT_INTERVAL_MENIT = 30;
const DEFAULT_LIVE_INTERVAL_MENIT = 3; // polling gol — 1-30 mnt
// ── Apify Flashscore (Liga 2 Indonesia & fallback outage) — hemat credit:
//    $0.00005/run + $0.003/match record, free tier Apify $5/bln.
//    Interval throttle terpisah + cuma jalan di window jam main WIB. ──
const APIFY_ACTOR = "khadinakbar~flashscore-live-matches";
const DEFAULT_APIFY_INTERVAL_MENIT = 120;
const APIFY_WINDOW_START = 7;  // 07:00 WIB
const APIFY_WINDOW_END = 24;   // 23:59 WIB
const APIFY_REMINDER_WINDOW_MS = 150 * 60 * 1000; // jendela reminder liga Apify (match H-150)
const REMINDER_BEFORE_MS = 45 * 60 * 1000; // H-45 menit
const REMINDER_GRACE_MS = 5 * 60 * 1000;  // lewat 5 mnt tetap kirim (jitter)
const CAP_JADWAL_BARU = 10, CAP_REMINDER = 5, CAP_HASIL = 8;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  Accept: "application/json",
};

// ── Liga registry: slug ESPN + keyword TSDB ──
//   • ESPN slug biasa → ESPN scoreboard (internasional)
//   • tsdbId → TheSportsDB league endpoint (Liga 1 Indonesia 4790)
//   • apifyCountry → Apify Flashscore (Liga 2 Indonesia — sumber satu-satunya)
export const LEAGUE_DB = {
  "eng.1": { label: "Liga Inggris", emoji: "🏴", kw: ["premier league", "english premier", "inggris"] },
  "esp.1": { label: "Liga Spanyol", emoji: "🇪🇸", kw: ["spanish la liga", "la liga", "spanyol"] },
  "ita.1": { label: "Liga Italia", emoji: "🇮🇹", kw: ["italian serie a", "serie a", "italia"] },
  "ger.1": { label: "Liga Jerman", emoji: "🇩🇪", kw: ["german bundesliga", "bundesliga", "jerman"] },
  "fra.1": { label: "Liga Prancis", emoji: "🇫🇷", kw: ["french ligue 1", "ligue 1", "prancis"] },
  "uefa.champions": { label: "Liga Champions", emoji: "🏆", kw: ["uefa champions league", "champions league", "champions"] },
  "uefa.europa": { label: "Liga Europa", emoji: "🥈", kw: ["uefa europa league", "europa league", "europa"] },
  "uefa.europa.conf": { label: "Conference League", emoji: "🥉", kw: ["conference league"] },
  "ned.1": { label: "Liga Belanda", emoji: "🇳🇱", kw: ["dutch eredivisie", "eredivisie", "belanda"] },
  "por.1": { label: "Liga Portugal", emoji: "🇵🇹", kw: ["portuguese primeira", "portugal"] },
  "sau.1": { label: "Liga Arab Saudi", emoji: "🇸🇦", kw: ["saudi"] },
  "usa.1": { label: "MLS Amerika", emoji: "🇺🇸", kw: ["major league soccer", "mls"] },
  "idn.1": { label: "Liga 1 Indonesia", emoji: "🇮🇩", kw: ["indonesian", "indonesia", "liga 1", "super league", "bri"], tsdbId: 4790 },
  "idn.2": { label: "Liga 2 Indonesia", emoji: "🇮🇩", kw: ["liga 2", "championship", "pegadaian"], apifyCountry: "Indonesia", apifyLeaguePattern: "liga[\\s-]*2|championship" },
  "bra.1": { label: "Brasileirao", emoji: "🇧🇷", kw: ["brazilian"] },
  "arg.1": { label: "Liga Argentina", emoji: "🇦🇷", kw: ["argentine"] },
  "tur.1": { label: "Liga Turki", emoji: "🇹🇷", kw: ["turkish super lig", "turki"] },
};

const DEFAULT_LEAGUES = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.champions", "idn.1", "idn.2"];

export const BOLA_TYPES = {
  jadwal: { label: "Jadwal", emoji: "📅", desc: "Digest jadwal pertandingan hari ini (WIB) + fixture baru" },
  reminder: { label: "Reminder", emoji: "⏰", desc: "Pengingat H-45 menit sebelum kick-off" },
  hasil: { label: "Hasil", emoji: "🏁", desc: "Skor full-time begitu laga selesai" },
  live: { label: "Live", emoji: "🔴", desc: "Kick-off + GOL real-time selama laga berjalan (opt-in — liga ESPN saja)" },
};

// ───────────────────────────── state ─────────────────────────────

function defaultState() {
  return {
    enabled: false,
    targets: [],
    intervalMenit: DEFAULT_INTERVAL_MENIT,
    liveIntervalMenit: DEFAULT_LIVE_INTERVAL_MENIT,
    apifyIntervalMenit: DEFAULT_APIFY_INTERVAL_MENIT,
    lastApifyCheck: null,
    apifyCache: null,
    initDone: false,
    leagues: [...DEFAULT_LEAGUES],
    contentTypes: { jadwal: true, reminder: true, hasil: true, live: false },
    dailyDigest: null,
    seenJadwal: [],
    sentReminders: {},
    sentResults: {},
    liveMatches: {},
    lastCheck: null,
    lastSource: null,
  };
}

function loadState() {
  try {
    const st = { ...defaultState(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
    st.contentTypes = { ...defaultState().contentTypes, ...st.contentTypes };
    if (!Array.isArray(st.leagues) || !st.leagues.length) st.leagues = [...DEFAULT_LEAGUES];
    return st;
  } catch {
    return defaultState();
  }
}

function saveState(st) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
  } catch (e) {
    logger.error?.("bola-notifier", `saveState gagal: ${e.message}`);
  }
}

let sock = null;
let timer = null;
let liveTimer = null;
let chain = Promise.resolve();

function enqueue(fn) {
  chain = chain.then(fn, fn);
  return chain;
}

// ─────────────────── fetcher (injectable buat e2e) ───────────────────

let espnFetcher = null;
let tsdbFetcher = null;
let tsdbLeagueFetcher = null;
let apifyFetcher = null;
let summaryFetcher = null;
export function setFetcher({ espn, tsdb, tsdbLeague, apify, summary } = {}) {
  if (espn) espnFetcher = espn;
  if (tsdb) tsdbFetcher = tsdb;
  if (tsdbLeague) tsdbLeagueFetcher = tsdbLeague;
  if (apify) apifyFetcher = apify;
  if (summary) summaryFetcher = summary;
}

// ── Apify Flashscore (Liga 2 Indonesia + fallback outage) ──
export { getApifyToken } from "./nova-apify.js";
import { getApifyToken } from "./nova-apify.js";

let apifyWindowOverride;
export function __setApifyWindowOverride(v) { apifyWindowOverride = v; } // test hook
function apifyWindowOk() {
  if (apifyWindowOverride !== undefined) return !!apifyWindowOverride;
  const hour = Number(new Date().toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }));
  return hour >= APIFY_WINDOW_START && hour < APIFY_WINDOW_END;
}

// Satu run Apify = match HARI INI (actor gak bisa dayOffsets>0, verified live).
// PAY_PER_EVENT: $0.00005/run + $0.003/item — DIPANGGIL HANYA kalau due throttle.
async function apifyFlashscore(country, { maxResults = 40 } = {}) {
  if (apifyFetcher) return apifyFetcher(country);
  const token = getApifyToken();
  if (!token) throw new Error("token Apify belum diset (env APIFY_TOKEN / apikeys.json apifyToken)");
  const res = await axios.post(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=120`,
    { sport: "football", dayOffsets: [0], maxResults, country, language: "en", proxyConfiguration: { useApifyProxy: true } },
    { timeout: 130000 },
  );
  return res.data || [];
}

// Normalize item Flashscore → struktur match notifier
function normApify(ev, slug) {
  const meta = LEAGUE_DB[slug] || {};
  const status = String(ev.status || "").toLowerCase();
  const state = status === "live" ? "in" : (/finish|^ft|ended/.test(status) ? "post" : "pre");
  const pat = meta.apifyLeaguePattern ? new RegExp(meta.apifyLeaguePattern, "i") : null;
  return {
    ok: !pat || pat.test(ev.league || "") || pat.test(ev.leagueUrl || ""),
    match: {
      key: `fs:${ev.matchId}`,
      slug,
      leagueLabel: meta.label || ev.league || slug,
      emoji: meta.emoji || "⚽",
      leagueLogo: null,
      date: new Date(ev.startTime || Date.now()).toISOString(),
      home: ev.homeTeam || "?", away: ev.awayTeam || "?",
      homeScore: ev.homeScore ?? null, awayScore: ev.awayScore ?? null,
      state,
      statusDetail: ev.status || (ev.minute ? `${ev.minute}'` : ""),
      venue: null,
      source: "flashscore",
    },
  };
}

async function espnScoreboard(slug) {
  if (espnFetcher) return espnFetcher(slug);
  const res = await axios.get(`${ESPN_API}/${slug}/scoreboard`, { headers: HEADERS, timeout: 15000 });
  const logo = res.data?.leagues?.[0]?.logos?.[0]?.href || null;
  const name = res.data?.leagues?.[0]?.name || null;
  const out = [];
  for (const ev of res.data?.events || []) {
    const c = ev.competitions?.[0];
    if (!c) continue;
    let home = null, away = null;
    for (const t of c.competitors || []) {
      const side = { name: t.team?.displayName || t.team?.name || "?", score: t.score ?? null };
      if (t.homeAway === "home") home = side; else if (t.homeAway === "away") away = side;
    }
    if (!home || !away) continue;
    const state = c.status?.type?.state || "pre"; // pre | in | post
    // detail gol (buat tipe live): scoringPlay → tim + menit + jenis (pen/og)
    const goalDetails = state === "in" ? (c.details || [])
      .filter((d) => d.scoringPlay)
      .map((d) => ({ teamId: d.team?.id ?? null, clock: d.clock?.displayValue || "", type: d.type?.text || "Goal", og: !!d.ownGoal, pen: !!d.penaltyKick }))
      : [];
    out.push({
      key: `espn:${ev.id}`,
      espnId: ev.id,
      slug,
      leagueLabel: LEAGUE_DB[slug]?.label || name || slug,
      emoji: LEAGUE_DB[slug]?.emoji || "⚽",
      leagueLogo: logo,
      date: new Date(ev.date).toISOString(),
      home: home.name, away: away.name,
      homeScore: home.score, awayScore: away.score,
      state,
      statusDetail: c.status?.type?.detail || "",
      venue: c.venue?.fullName || ev.venue?.fullName || null,
      teamIds: { home: (c.competitors || []).find((t) => t.homeAway === "home")?.team?.id ?? null, away: (c.competitors || []).find((t) => t.homeAway === "away")?.team?.id ?? null },
      goalDetails,
    });
  }
  return out;
}

// Liga dengan tsdbId (Liga 1 Indonesia 4790): jadwal berjalan dari TSDB
// eventsnextleague + hasil dari eventspastleague — ESPN idn.1 stale (musim lalu).
async function tsdbLeagueMatches(slug, tsdbId) {
  const meta = LEAGUE_DB[slug] || {};
  if (tsdbLeagueFetcher) return tsdbLeagueFetcher(slug, tsdbId);
  const [next, past] = await Promise.allSettled([
    axios.get(`${TSDB_API}/eventsnextleague.php?id=${tsdbId}`, { headers: HEADERS, timeout: 15000 }),
    axios.get(`${TSDB_API}/eventspastleague.php?id=${tsdbId}`, { headers: HEADERS, timeout: 15000 }),
  ]);
  const evs = [];
  if (next.status === "fulfilled") evs.push(...(next.value.data?.events || []));
  if (past.status === "fulfilled") evs.push(...(past.value.data?.events || []));
  if (!evs.length) throw new Error(`TSDB league ${tsdbId} kosong`);
  const out = [];
  for (const ev of evs) {
    const dateIso = ev.strTime
      ? new Date(`${ev.dateEvent}T${ev.strTime.length <= 5 ? ev.strTime + ":00" : ev.strTime}${ev.strTime.endsWith("Z") ? "" : "Z"}`).toISOString()
      : new Date(`${ev.dateEvent}T00:00:00Z`).toISOString();
    out.push({
      key: `tsdb:${ev.idEvent}`,
      slug,
      leagueLabel: meta.label || slug,
      emoji: meta.emoji || "⚽",
      leagueLogo: null,
      date: dateIso,
      home: ev.strHomeTeam || "?", away: ev.strAwayTeam || "?",
      homeScore: ev.intHomeScore ?? null, awayScore: ev.intAwayScore ?? null,
      state: (ev.intHomeScore != null && ev.intAwayScore != null) || /ft|finished|match finished/i.test(ev.strStatus || "") ? "post" : "pre",
      statusDetail: ev.strStatus || "",
      venue: ev.strVenue || null,
    });
  }
  return out;
}

async function tsdbDay(dateStr) {
  if (tsdbFetcher) return tsdbFetcher(dateStr);
  const res = await axios.get(`${TSDB_API}/eventsday.php?d=${dateStr}&s=Soccer`, { headers: HEADERS, timeout: 15000 });
  const evs = res.data?.events || [];
  const out = [];
  for (const ev of evs) {
    const lg = String(ev.strLeague || "").toLowerCase();
    const slug = Object.keys(LEAGUE_DB).find((s) =>
      (LEAGUE_DB[s].kw || []).some((k) => lg.includes(k)) || lg.includes(s));
    if (!slug) continue; // cuma liga favorit yang dipantau
    const dateIso = ev.strTime
      ? new Date(`${ev.dateEvent}T${ev.strTime.length <= 5 ? ev.strTime + ":00" : ev.strTime}${ev.strTime.endsWith("Z") ? "" : "Z"}`).toISOString()
      : new Date(`${ev.dateEvent}T00:00:00Z`).toISOString();
    out.push({
      key: `tsdb:${ev.idEvent}`,
      slug,
      leagueLabel: LEAGUE_DB[slug].label,
      emoji: LEAGUE_DB[slug].emoji,
      leagueLogo: null,
      date: dateIso,
      home: ev.strHomeTeam || "?", away: ev.strAwayTeam || "?",
      homeScore: ev.intHomeScore ?? null, awayScore: ev.intAwayScore ?? null,
      state: (ev.intHomeScore != null && ev.intAwayScore != null) || /ft|finished/i.test(ev.strStatus || "") ? "post" : "pre",
      statusDetail: ev.strStatus || "",
      venue: ev.strVenue || null,
    });
  }
  return out;
}

async function fetchAll(leagues, today, { apifyDue = false } = {}) {
  // Routing per-liga: apifyCountry → Flashscore (khusus throttle due),
  // tsdbId → TSDB league endpoint, sisanya ESPN scoreboard.
  let apifyRanFlag = false;
  const results = await Promise.allSettled(leagues.map(async (s) => {
    const meta = LEAGUE_DB[s] || {};
    if (meta.apifyCountry) {
      if (!apifyDue || !apifyWindowOk()) return [];
      const evs = await apifyFlashscore(meta.apifyCountry, { maxResults: 40 });
      apifyRanFlag = true; // throttle dihitung per RUN — walau laga kosong
      return evs.map((ev) => normApify(ev, s)).filter((x) => x.ok).map((x) => x.match);
    }
    if (meta.tsdbId) return tsdbLeagueMatches(s, meta.tsdbId);
    return espnScoreboard(s);
  }));
  const matches = [];
  let ok = 0, usedTsdb = false, usedApify = false;
  for (const r of results) {
    if (r.status === "fulfilled") {
      ok++;
      matches.push(...r.value);
      if (r.value.length && r.value[0].key.startsWith("tsdb:")) usedTsdb = true;
      if (r.value.length && r.value[0].key.startsWith("fs:")) usedApify = true;
    }
  }
  if (ok > 0) {
    const src = ["espn"];
    if (usedTsdb) src.push("thesportsdb");
    if (usedApify) src.push("flashscore");
    return { matches, source: src.join("+"), apifyRan: apifyRanFlag };
  }
  // SEMUA provider utama gagal → fallback eventsday; masih mati juga →
  // Apify Flashscore HARI INI (credit guard: cuma kalau throttle due).
  try {
    const tsMatches = await tsdbDay(today);
    return { matches: tsMatches, source: "thesportsdb", apifyRan: false };
  } catch { /* lanjut ke apify */ }
  if (apifyDue || apifyWindowOk()) {
    try {
      const evs = await apifyFlashscore(null, { maxResults: 50 });
      const out = evs.map((ev) => {
        const slug = leagues.find((s) => {
          const meta = LEAGUE_DB[s] || {};
          if (!meta.apifyCountry) return false;
          const pat = meta.apifyLeaguePattern ? new RegExp(meta.apifyLeaguePattern, "i") : null;
          return !pat || pat.test(ev.league || "") || pat.test(ev.leagueUrl || "");
        });
        return slug ? normApify(ev, slug).match : null;
      }).filter(Boolean);
      if (out.length) return { matches: out, source: "flashscore", apifyRan: true };
      throw new Error("flashscore kosong");
    } catch (e) {
      throw new Error(`semua sumber down: ${e.message}`);
    }
  }
  throw new Error("semua sumber down (apify belum due/window)");
}

// ───────────────────────────── WIB helpers ─────────────────────────────

function wibDate(d) {
  return new Date(d || Date.now()).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}
function fmtWIB(iso) {
  return new Date(iso).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).replace(".", ":") + " WIB";
}
function fmtWIBFull(d) {
  return new Date(d || Date.now()).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ───────────────────────────── kirim ─────────────────────────────

export function setSock(_sock) {
  if (_sock) sock = _sock;
}

async function sendBola(chatId, txt, meta = {}) {
  if (!sock) return false;
  try {
    await sock.sendMessage(chatId, {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title: meta.title || "JADWAL BOLA",
          body: "nova bola notifier • jadwal, reminder & skor realtime",
          sourceUrl: "https://www.espn.com/soccer/",
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false,
          ...(meta.logo ? { thumbnailUrl: meta.logo } : {}),
        },
      },
    });
    return true;
  } catch (e) {
    logger.error?.("bola-notifier", `kirim ke ${chatId} gagal: ${e.message}`);
    return false;
  }
}

function groupByLeague(matches) {
  const by = {};
  for (const m of matches) {
    (by[m.leagueLabel] = by[m.leagueLabel] || { emoji: m.emoji, slug: m.slug, logo: m.leagueLogo, list: [] });
    by[m.leagueLabel].list.push(m);
  }
  return by;
}

async function sendDigest(targets, matches) {
  const by = groupByLeague(matches);
  let txt = `⚽ *JADWAL BOLA HARI INI*\n📅 ${fmtWIBFull()} (WIB)\n`;
  let logo = null;
  for (const [label, g] of Object.entries(by)) {
    logo = logo || g.logo;
    txt += `\n${g.emoji} *${label.toUpperCase()}*\n`;
    for (const m of g.list) txt += `• ${m.home} vs ${m.away} — ${fmtWIB(m.date)}\n`;
  }
  txt += `\n📊 Total: *${matches.length}* pertandingan dari *${Object.keys(by).length}* liga`;
  txt += `\n💡 Reminder otomatis H-${REMINDER_BEFORE_MS / 60000} menit sebelum kick-off`;
  for (const t of targets) await sendBola(t, txt, { title: "JADWAL BOLA HARI INI", logo });
}

async function sendNewFixtures(targets, matches) {
  const lines = matches.map((m) => `${m.emoji} ${m.home} vs ${m.away} — ${fmtWIB(m.date)} (${m.leagueLabel})`);
  const txt = `📅 *JADWAL BARU DITAMBAHKAN!*\nDeteksi ${matches.length} laga baru hari ini:\n\n` + lines.join("\n");
  for (const t of targets) await sendBola(t, txt, { title: "JADWAL BOLA — FIXTURE BARU", logo: matches[0]?.leagueLogo });
}

async function sendReminder(targets, m) {
  const mins = Math.max(1, Math.round((new Date(m.date) - Date.now()) / 60000));
  const title = mins <= 60 ? "BENTAR LAGI KICK-OFF!" : "PENGINGAT KICK-OFF!";
  const txt = `⏰ *${title}*\n\n${m.emoji} *${m.leagueLabel}*\n⚔️ ${m.home} vs ${m.away}\n🕐 kick-off ${fmtWIB(m.date)} (~${mins} menit lagi)${m.venue ? `\n🏟️ ${m.venue}` : ""}`;
  for (const t of targets) await sendBola(t, txt, { title: "KICK-OFF SEBENTAR LAGI", logo: m.leagueLogo });
}

async function sendResult(targets, m) {
  const txt = `🏁 *FULL-TIME!*\n\n${m.emoji} *${m.leagueLabel}*\n⚔️ ${m.home} *${m.homeScore ?? "?"} - ${m.awayScore ?? "?"}* ${m.away}`;
  for (const t of targets) await sendBola(t, txt, { title: "HASIL PERTANDINGAN", logo: m.leagueLogo });
}

async function sendKickoff(targets, m) {
  const skor = Number(m.homeScore) > 0 || Number(m.awayScore) > 0 ? ` (skor sementara ${m.homeScore}-${m.awayScore})` : "";
  const txt = `🔴 *KICK-OFF! LAGA DIMULAI*\n\n${m.emoji} *${m.leagueLabel}*\n⚔️ ${m.home} vs ${m.away}${skor}\n🕐 ${fmtWIB(m.date)}${m.venue ? `\n🏟️ ${m.venue}` : ""}\n\n💡 Gol bakal otomatis masuk — pantau terus ya`;
  for (const t of targets) await sendBola(t, txt, { title: "KICK-OFF!", logo: m.leagueLogo });
}

// Nama pencetak gol dari endpoint summary (best-effort, 1 fetch per gol).
// Shape live-verified: keyEvents[].shortText "Kevin Schade Goal - Header".
async function enrichGoal(m) {
  try {
    let data;
    if (summaryFetcher) data = await summaryFetcher(m.slug, m.espnId);
    else {
      const res = await axios.get(`${ESPN_API}/${m.slug}/summary?event=${m.espnId}`, { headers: HEADERS, timeout: 12000 });
      data = res.data;
    }
    const goals = (data?.keyEvents || []).filter((x) => x.scoringPlay);
    const last = goals[goals.length - 1];
    if (!last) return null;
    return {
      short: last.shortText || "", // "Kevin Schade Goal - Header"
      minute: last.clock?.displayValue || "",
      teamId: last.team?.id ?? null,
      teamName: last.team?.displayName || (String(last.team?.id) === String(m.teamIds?.home) ? m.home : m.away),
    };
  } catch { return null; }
}

async function sendGoal(targets, m, scorerTeam, goal) {
  const kicker = goal?.short ? `\n👤 ${goal.short}${goal.minute ? ` (${goal.minute})` : ""}` : "";
  const txt = `⚽ *GOL! ${scorerTeam} MENCETAK GOL!*\n\n${m.emoji} *${m.leagueLabel}*\n⚔️ ${m.home} *${m.homeScore ?? 0} - ${m.awayScore ?? 0}* ${m.away}${kicker}${m.statusDetail && /^\d+/.test(m.statusDetail) ? `\n🕒 menit ${m.statusDetail}` : ""}`;
  for (const t of targets) await sendBola(t, txt, { title: "GOL!!!", logo: m.leagueLogo });
}

async function sendHT(targets, m) {
  const txt = `⏸️ *HALF-TIME*\n\n${m.emoji} *${m.leagueLabel}*\n⚔️ ${m.home} *${m.homeScore ?? 0} - ${m.awayScore ?? 0}* ${m.away}\nhasil sementara babak pertama`;
  for (const t of targets) await sendBola(t, txt, { title: "HALF-TIME", logo: m.leagueLogo });
}

// ── live tracker: polling ESPN cepat, deteksi kick-off/gol/HT ──
// Fecth hanya liga ESPN (skip tsdbId/apifyCountry — gak ada skor live).
export function runLiveCheck(opts = {}) {
  return enqueue(() => doRunLiveCheck(opts));
}

async function doRunLiveCheck({ force = false } = {}) {
  const st = loadState();
  if (!st.enabled && !force) return { skipped: true };
  if ((st.contentTypes || {}).live === false && !force) return { skipped: true, tipeOff: true };
  const espnSlugs = st.leagues.filter((s) => {
    const meta = LEAGUE_DB[s] || {};
    return !meta.tsdbId && !meta.apifyCountry;
  });
  if (!espnSlugs.length) return { skipped: true, noEspn: true };
  const targetsSnapshot = await mergeAutoTargets(sock, "autobolanotify", [...st.targets]);
  const results = await Promise.allSettled(espnSlugs.map((s) => espnScoreboard(s)));
  const live = [];
  for (const r of results) if (r.status === "fulfilled") live.push(...r.value.filter((m) => m.state === "in"));
  let sent = 0;
  const stNow = loadState(); // fresh (mergeAutoTargets bisa nulis state)
  const prevLive = { ...(stNow.liveMatches || {}) };
  const seen = {};
  for (const m of live) {
    seen[m.key] = true;
    const prev = prevLive[m.key];
    const scoreNow = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;
    if (!prev) {
      // baru terdeteksi live → kick-off (dedup via kehadiran state)
      await sendKickoff(targetsSnapshot, m);
      sent++;
      seen[m.key] = { kickoffNotified: true, score: scoreNow, detail: m.statusDetail };
    } else if (prev.score !== scoreNow) {
      // GOL — tim mana yang nambah?
      const nowH = Number(m.homeScore) || 0, nowA = Number(m.awayScore) || 0;
      const prevH = Number(String(prev.score).split("-")[0]) || 0, prevA = Number(String(prev.score).split("-")[1]) || 0;
      const scorerTeam = nowH > prevH ? m.home : nowA > prevA ? m.away : m.home;
      const goal = await enrichGoal(m);
      await sendGoal(targetsSnapshot, m, scorerTeam, goal);
      sent++;
      seen[m.key] = { ...prev, score: scoreNow, detail: m.statusDetail };
    } else if (prev.detail !== m.statusDetail && /half|interval/i.test(m.statusDetail)) {
      await sendHT(targetsSnapshot, m);
      sent++;
      seen[m.key] = { ...prev, detail: m.statusDetail };
    } else {
      seen[m.key] = { ...prev, score: scoreNow, detail: m.statusDetail };
    }
  }
  stNow.liveMatches = seen; // key yang udah gak live otomatis kebuang
  stNow.lastLiveCheck = new Date().toISOString();
  saveState(stNow);
  return { sent, live: live.length };
}

// Cek skor berjalan manual (.jadwalbolanotify skor) — pure, tanpa side effect
export async function getLiveNow() {
  const st = loadState();
  const espnSlugs = st.leagues.filter((s) => {
    const meta = LEAGUE_DB[s] || {};
    return !meta.tsdbId && !meta.apifyCountry;
  });
  const results = await Promise.allSettled(espnSlugs.map((s) => espnScoreboard(s)));
  const live = [];
  for (const r of results) if (r.status === "fulfilled") live.push(...r.value.filter((m) => m.state === "in"));
  return live;
}

// ───────────────────────────── run check ─────────────────────────────

export function runCheck(opts = {}) {
  return enqueue(() => doRunCheck(opts));
}

async function doRunCheck({ force = false, chatId = null } = {}) {
  let st = loadState();
  const targetsSnapshot = await mergeAutoTargets(sock, "autobolanotify", [...st.targets]);
  st = loadState();
  st.lastCheck = new Date().toISOString();
  saveState(st);

  const targets = chatId ? [chatId] : targetsSnapshot;
  const types = st.contentTypes || {};
  const today = wibDate();
  const hasApifyLeague = st.leagues.some((s) => (LEAGUE_DB[s] || {}).apifyCountry);
  const apifyDue = (hasApifyLeague || !chatId) &&
    (!st.lastApifyCheck || Date.now() - new Date(st.lastApifyCheck).getTime() >= st.apifyIntervalMenit * 60000);
  const { matches: fetched, source, apifyRan } = await fetchAll(st.leagues, today, { apifyDue });
  st.lastSource = source;
  if (apifyRan) {
    st.lastApifyCheck = new Date().toISOString();
    const fsFresh = fetched.filter((m) => m.key.startsWith("fs:"));
    if (fsFresh.length) st.apifyCache = { date: today, matches: fsFresh };
  }
  // Liga Apify (Liga 2) gak di-fetch tiap siklus (hemat credit) — merge cache
  // biar reminder/hasilnya tetap dievaluasi tiap 30 mnt.
  const cached = st.apifyCache?.date === today ? st.apifyCache.matches : [];
  const freshKeys = new Set(fetched.map((m) => m.key));
  const matches = [...fetched, ...cached.filter((m) => !freshKeys.has(m.key))];
  const todays = matches.filter((m) => wibDate(m.date) === today);
  let sent = 0;

  // FIRST-RUN baseline: semua yang udah ada dicatat doang — gak spam notifikasi
  if (!st.initDone && !force) {
    st.initDone = true;
    st.dailyDigest = today;
    st.seenJadwal = todays.map((m) => m.key);
    for (const m of matches.filter((x) => x.state === "post")) st.sentResults[m.key] = today;
    saveState(st);
    return { sent: 0, baseline: true, source };
  }

  // 1. DIGEST harian "Jadwal Bola Hari Ini" — sekali per hari WIB.
  //    force+chatId (aktivasi .jadwalbolanotify on) → salinan ke chat itu
  //    walau digest global hari ini udah pernah kekirim.
  if (types.jadwal !== false && (st.dailyDigest !== today || (force && chatId))) {
    if (todays.length) {
      await sendDigest(force && chatId ? [chatId] : targets, todays);
      sent++;
    }
    st.dailyDigest = today;
    st.seenJadwal = todays.map((m) => m.key);
  }

  // 2. FIXTURE BARU — laga hari ini yang muncul belakangan (perubahan jadwal)
  if (types.jadwal !== false && !chatId) {
    const fresh = todays.filter((m) => !st.seenJadwal.includes(m.key)).slice(0, CAP_JADWAL_BARU);
    if (fresh.length) {
      await sendNewFixtures(targets, fresh);
      sent++;
      st.seenJadwal.push(...fresh.map((m) => m.key));
    }
  }

  // 3. REMINDER H-45 menit sebelum kick-off (sekali per laga)
  if (types.reminder !== false && !chatId) {
    const now = Date.now();
    const due = matches.filter((m) => {
      if (m.state !== "pre" || st.sentReminders[m.key]) return false;
      const win = m.source === "flashscore" ? APIFY_REMINDER_WINDOW_MS : REMINDER_BEFORE_MS;
      return (new Date(m.date) - now) <= win && (now - new Date(m.date)) <= REMINDER_GRACE_MS;
    }).slice(0, CAP_REMINDER);
    for (const m of due) {
      await sendReminder(targets, m);
      sent++;
      st.sentReminders[m.key] = today;
    }
  }

  // 4. HASIL full-time (sekali per laga)
  if (types.hasil !== false && !chatId) {
    const done = matches.filter((m) => m.state === "post" && !st.sentResults[m.key]).slice(0, CAP_HASIL);
    for (const m of done) {
      await sendResult(targets, m);
      sent++;
      st.sentResults[m.key] = today;
    }
  }

  // cleanup bounded
  st.seenJadwal = st.seenJadwal.slice(-300);
  saveState(st);
  return { sent, source, todays: todays.length };
}

// ───────────────────────────── liga favorit ─────────────────────────────

export function resolveLeague(input) {
  const q = String(input || "").toLowerCase().trim();
  if (!q) return null;
  if (LEAGUE_DB[q]) return q;
  // Pass 1: exact (label / keyword) — biar "championship" gak nyasar ke
  // uefa.champions via fuzzy "champions"
  const keys = Object.keys(LEAGUE_DB);
  const exact = keys.find((s) =>
    LEAGUE_DB[s].label.toLowerCase() === q || (LEAGUE_DB[s].kw || []).some((k) => k === q));
  if (exact) return exact;
  // Pass 2: fuzzy
  const found = keys.find((s) => {
    const l = LEAGUE_DB[s];
    return (l.kw || []).some((k) => k.includes(q) || q.includes(k));
  });
  if (found) return found;
  // slug ESPN custom (mis. arg.1) — validasi bentuk biar gak ngawur
  if (/^[a-z]{2,6}\.[a-z0-9]{1,4}$/.test(q)) return q;
  return null;
}

export function getLeagues() {
  return loadState().leagues.map((s) => ({ slug: s, ...(LEAGUE_DB[s] || { label: s, emoji: "⚽", kw: [] }) }));
}

export function addLeague(input) {
  const slug = resolveLeague(input);
  if (!slug) return { ok: false, error: "unknown" };
  const st = loadState();
  if (st.leagues.includes(slug)) return { ok: false, error: "dup", slug };
  st.leagues.push(slug);
  saveState(st);
  return { ok: true, slug, label: LEAGUE_DB[slug]?.label || slug, leagues: st.leagues };
}

export function removeLeague(input) {
  const st = loadState();
  let slug = resolveLeague(input);
  if (!slug) slug = String(input).toLowerCase().trim();
  const i = st.leagues.indexOf(slug);
  if (i === -1) return { ok: false, error: st.leagues.length ? "missing" : "last" };
  if (st.leagues.length <= 1) return { ok: false, error: "last" };
  st.leagues.splice(i, 1);
  saveState(st);
  return { ok: true, slug, leagues: st.leagues };
}

export function resetLeagues() {
  const st = loadState();
  st.leagues = [...DEFAULT_LEAGUES];
  saveState(st);
  return st.leagues;
}

// ───────────────────────────── tipe konten ─────────────────────────────

export function getContentTypes() {
  return { ...loadState().contentTypes };
}

export function setContentType(type, on) {
  if (!BOLA_TYPES[type]) return false;
  const st = loadState();
  st.contentTypes[type] = !!on;
  saveState(st);
  syncMonitor(); // tipe live toggle → live ticker ikut nyala/mati
  return true;
}

// ───────────────────────────── target & status ─────────────────────────────

export function addTarget(chatId) {
  const st = loadState();
  if (!st.targets.includes(chatId)) { st.targets.push(chatId); saveState(st); }
  return true;
}
export function removeTarget(chatId) {
  const st = loadState();
  const i = st.targets.indexOf(chatId);
  if (i > -1) { st.targets.splice(i, 1); saveState(st); }
  return true;
}
export function isTarget(chatId) {
  return loadState().targets.includes(chatId);
}

export function isEnabled() {
  return !!loadState().enabled;
}
export function setBolaNotifierOn(on) {
  const st = loadState();
  st.enabled = !!on;
  saveState(st);
  syncMonitor();
  return st.enabled;
}

export function setApifyIntervalMenit(menit) {
  const v = Number(menit);
  if (!v || v < 15 || v > 720) return null;
  const st = loadState();
  st.apifyIntervalMenit = v;
  saveState(st);
  return v;
}

export function setLiveIntervalMenit(menit) {
  const v = Number(menit);
  if (!v || v < 1 || v > 30) return null;
  const st = loadState();
  st.liveIntervalMenit = v;
  saveState(st);
  syncMonitor();
  return v;
}

export function getStatus() {
  const st = loadState();
  return {
    enabled: st.enabled,
    targets: [...st.targets],
    intervalMenit: st.intervalMenit,
    liveIntervalMenit: st.liveIntervalMenit || DEFAULT_LIVE_INTERVAL_MENIT,
    liveTipe: { ...(st.contentTypes || {}) }.live !== false,
    liveTracked: Object.keys(st.liveMatches || {}).length,
    lastLiveCheck: st.lastLiveCheck || null,
    apifyIntervalMenit: st.apifyIntervalMenit,
    apifyToken: !!getApifyToken(),
    lastApifyCheck: st.lastApifyCheck,
    running: !!timer,
    initDone: st.initDone,
    leagues: st.leagues,
    lastCheck: st.lastCheck,
    lastSource: st.lastSource,
  };
}

// ───────────────────────────── interval ─────────────────────────────

export function setIntervalMenit(menit) {
  const v = Number(menit);
  if (!v || v < 5 || v > 720) return null;
  const st = loadState();
  st.intervalMenit = v;
  saveState(st);
  syncMonitor();
  return v;
}

// ───────────────────────────── monitor ─────────────────────────────

export function syncMonitor() {
  const st = loadState();
  if (st.enabled && st.targets.length && !timer) startTimer();
  if ((!st.enabled || !st.targets.length) && timer) stopMonitor();
  // live ticker jalan kalau notifier nyala & tipe live aktif (atau force interval)
  if (st.enabled && (st.contentTypes || {}).live !== false && !liveTimer) startLiveTimer();
  if (((!st.enabled || !st.targets.length) || (st.contentTypes || {}).live === false) && liveTimer) stopLiveTimer();
  return { started: !!timer, live: !!liveTimer };
}

function startTimer() {
  const st = loadState();
  timer = setInterval(() => {
    runCheck().catch((e) => logger.error?.("bola-notifier", `runCheck: ${e.message}`));
  }, st.intervalMenit * 60000);
  if (typeof timer.unref === "function") timer.unref();
}

function startLiveTimer() {
  const st = loadState();
  liveTimer = setInterval(() => {
    runLiveCheck().catch((e) => logger.error?.("bola-notifier", `runLiveCheck: ${e.message}`));
  }, (st.liveIntervalMenit || DEFAULT_LIVE_INTERVAL_MENIT) * 60000);
  if (typeof liveTimer.unref === "function") liveTimer.unref();
  logger.info?.("bola-notifier", `live ticker JALAN — interval ${st.liveIntervalMenit || DEFAULT_LIVE_INTERVAL_MENIT} mnt`);
}

function stopLiveTimer() {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
}

export function stopMonitor() {
  if (timer) { clearInterval(timer); timer = null; }
  stopLiveTimer();
}

export async function initBolaNotifier(_sock) {
  setSock(_sock);
  const st = loadState();
  if (st.enabled && st.targets.length) startTimer();
  if (st.enabled && (st.contentTypes || {}).live !== false) startLiveTimer();
  // baseline pas boot biar gak spam notifikasi lama
  runCheck().catch((e) => logger.error?.("bola-notifier", `init: ${e.message}`));
  logger.info?.("bola-notifier", `monitor ${timer ? "JALAN" : "idle"} — interval ${st.intervalMenit} mnt, ${st.targets.length} subscriber, ${st.leagues.length} liga${liveTimer ? ` + live ticker` : ""}`);
  return true;
}
