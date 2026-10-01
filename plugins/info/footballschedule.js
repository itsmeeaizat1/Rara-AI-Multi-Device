// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Jadwal Bola
 * Fitur: .jadwalbola — jadwal pertandingan sepak bola dari ESPN (free, no key):
 *        semua liga besar + BRI Super League, match LIVE (skor real-time),
 *        match berikutnya 🔜 + KICKOFF COUNTDOWN LIVE (ticker edit-in-place).
 */
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: "jadwalbola",
  alias: ["jadwalbola", "bolahariini", "jadwaltanding"],
  category: "info",
  description: "Jadwal pertandingan bola semua liga + kickoff countdown live",
  usage: ".jadwalbola [liga]",
  example: ".jadwalbola inggris",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ── peta liga: kata kunci → ESPN league code ──
const LEAGUES = {
  inggris: { code: "eng.1", name: "Premier League", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  premier: { code: "eng.1", name: "Premier League", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  spanyol: { code: "esp.1", name: "LaLiga", emoji: "🇪🇸" },
  laliga: { code: "esp.1", name: "LaLiga", emoji: "🇪🇸" },
  italia: { code: "ita.1", name: "Serie A", emoji: "🇮🇹" },
  serie: { code: "ita.1", name: "Serie A", emoji: "🇮🇹" },
  jerman: { code: "ger.1", name: "Bundesliga", emoji: "🇩🇪" },
  bundesliga: { code: "ger.1", name: "Bundesliga", emoji: "🇩🇪" },
  prancis: { code: "fra.1", name: "Ligue 1", emoji: "🇫🇷" },
  ligue: { code: "fra.1", name: "Ligue 1", emoji: "🇫🇷" },
  champions: { code: "uefa.champions", name: "UEFA Champions League", emoji: "🏆" },
  ucl: { code: "uefa.champions", name: "UEFA Champions League", emoji: "🏆" },
  uropa: { code: "uefa.europa", name: "UEFA Europa League", emoji: "🥈" },
  europa: { code: "uefa.europa", name: "UEFA Europa League", emoji: "🥈" },
  indonesia: { code: "idn.1", name: "BRI Super League", emoji: "🇮🇩" },
  bri: { code: "idn.1", name: "BRI Super League", emoji: "🇮🇩" },
  superleague: { code: "idn.1", name: "BRI Super League", emoji: "🇮🇩" },
  arab: { code: "sau.1", name: "Saudi Pro League", emoji: "🇸🇦" },
  saudi: { code: "sau.1", name: "Saudi Pro League", emoji: "🇸🇦" },
  belanda: { code: "ned.1", name: "Eredivisie", emoji: "🇳🇱" },
  eredivisie: { code: "ned.1", name: "Eredivisie", emoji: "🇳🇱" },
};

const DEFAULT_LEAGUES = ["inggris", "champions", "spanyol", "italia", "jerman", "prancis", "indonesia"];

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function wibDate(ts) {
  return new Date(ts + WIB_OFFSET_MS);
}
function fmtWib(ts) {
  const d = wibDate(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} WIB`;
}
function dayLabel(ts, todayWibTs) {
  const d = wibDate(ts), t = wibDate(todayWibTs);
  const sameDay = d.toDateString() === t.toDateString();
  const tmr = new Date(t); tmr.setDate(tmr.getDate() + 1);
  if (sameDay) return "Hari Ini";
  if (d.toDateString() === tmr.toDateString()) return "Besok";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

async function fetchLeague(code) {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?limit=50`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("ESPN HTTP " + res.status);
  const data = await res.json();
  const league = data?.leagues?.[0];
  const events = (data?.events || []).map((e) => {
    const c = e.competitions?.[0] || {};
    const home = (c.competitors || []).find((t) => t.homeAway === "home") || c.competitors?.[0] || {};
    const away = (c.competitors || []).find((t) => t.homeAway === "away") || c.competitors?.[1] || {};
    return {
      leagueName: league?.name || code,
      leagueAbbr: league?.abbreviation || code,
      ts: new Date(e.date).getTime(),
      home: home?.team?.displayName || home?.team?.shortDisplayName || "?",
      away: away?.team?.displayName || away?.team?.shortDisplayName || "?",
      homeScore: home?.score != null ? String(home.score) : "",
      awayScore: away?.score != null ? String(away.score) : "",
      state: c?.status?.type?.state || "", // pre / in / post
      detail: c?.status?.type?.shortDetail || "",
    };
  }).filter((ev) => Number.isFinite(ev.ts));
  return events;
}

/** ambil jadwal — leagueKeys: array kata kunci LEAGUES. Returns events terurut. */
export async function getMatches(leagueKeys) {
  const results = await Promise.allSettled(leagueKeys.map((k) => fetchLeague(LEAGUES[k].code)));
  const events = [];
  let ok = 0;
  results.forEach((r) => { if (r.status === "fulfilled") { ok++; events.push(...r.value); } });
  if (!ok) throw new Error("semua sumber ESPN gagal dijangkau");
  events.sort((a, b) => a.ts - b.ts);
  return events;
}

export function findLeagueKey(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return null;
  for (const [key, v] of Object.entries(LEAGUES)) {
    if (t === key || t.includes(v.name.toLowerCase()) || (t.length >= 3 && v.name.toLowerCase().includes(t))) return key;
  }
  return null;
}

function buildMatchLine(ev, isNext) {
  const marker = isNext ? "🔜" : ev.state === "in" ? "🔴" : ev.state === "post" ? "✅" : "⚽";
  let line = `${marker} *${ev.home}* vs *${ev.away}*`;
  if (ev.state === "in") line += ` — 🔴 LIVE ${ev.homeScore || 0}-${ev.awayScore || 0}`;
  else if (ev.state === "post") line += ` — ${ev.homeScore || 0}-${ev.awayScore || 0} (selesai)`;
  else line += ` — ${fmtWib(ev.ts)}`;
  return line;
}

async function handler(m, { sock }) {
  const filter = (m.args || []).join(" ").toLowerCase().trim();
  try {
    await m.react("🧠");

    const now = Date.now();
    const leagueKey = findLeagueKey(filter);
    // window 3 hari: kemarin (match live/selesai) sampai besok
    const leagueKeys = leagueKey ? [leagueKey] : DEFAULT_LEAGUES;
    const events = (await getMatches(leagueKeys)).filter((e) => e.ts > now - 3 * 60 * 60 * 1000 && e.ts < now + 48 * 60 * 60 * 1000);

    if (!events.length) {
      await m.react("🐣");
      return m.reply(raraWrap("Jadwal Bola", [
        "⚽ Gak ada pertandingan ditemukan" + (leagueKey ? ` buat ${LEAGUES[leagueKey].name}` : " 2 hari ke depan") + ".",
        "",
        "Liga yang didukung: " + Object.values(LEAGUES).map((l, i, a) => (a.findIndex((x) => x.code === l.code) === i ? l.name : null)).filter(Boolean).join(", "),
      ].join("\n")));
    }

    // filter tambahan nama tim
    let shown = leagueKey
      ? events
      : filter
        ? events.filter((e) => e.home.toLowerCase().includes(filter) || e.away.toLowerCase().includes(filter))
        : events;
    if (!shown.length) shown = events;

    // match berikutnya (belum mulai, terdekat)
    const nextEv = events.find((e) => e.ts > now && e.state !== "post");
    const nextIs24h = nextEv && nextEv.ts - now <= 24 * 60 * 60 * 1000;

    // grup per hari
    const groups = {};
    shown.forEach((e) => {
      const day = dayLabel(e.ts, now);
      (groups[day] = groups[day] || []).push(e);
    });

    const lines = ["⚽ *JADWAL PERTANDINGAN*"];
    if (leagueKey) lines.push(`🏆 ${LEAGUES[leagueKey].emoji} ${LEAGUES[leagueKey].name}`);
    if (nextEv) {
      const sisa = nextEv.ts - now;
      lines.push(sisa > 0
        ? `🔜 Berikutnya: *${nextEv.home}* vs *${nextEv.away}* — ${sisa <= 24 * 60 * 60 * 1000 ? formatRemaining(sisa) + " lagi" : dayLabel(nextEv.ts, now) + " " + fmtWib(nextEv.ts)}`
        : "");
    }
    lines.push("");
    for (const [day, evs] of Object.entries(groups)) {
      lines.push(`📅 *${day}*`);
      evs.forEach((e, i) => lines.push(buildMatchLine(e, e === nextEv)));
      lines.push("");
    }
    lines.push("Sumber: ESPN ⚽");

    await m.reply(raraWrap("Jadwal Bola", lines.join("\n")));
    await m.react("🐣");

    // ── kickoff countdown live (≤24 jam) ──
    if (nextEv && nextIs24h) {
      const tickCard = (st) => raraWrap("Jadwal Bola", [
        "⚽ *KICKOFF*",
        "",
        `🏟 ${nextEv.home} vs ${nextEv.away}`,
        `🏆 ${nextEv.leagueName}`,
        "",
        `🕒 Kickoff dalam: *${formatRemaining(st.remainingMs)}*`,
      ].join("\n"));
      const finalCard = raraWrap("Jadwal Bola", [
        "⚽ *KICKOFF!*",
        "",
        `🏟 ${nextEv.home} vs ${nextEv.away}`,
        `🏆 ${nextEv.leagueName}`,
        "",
        "🟢 PERTANDINGAN DIMULAI! Cek skor: .jadwalbola",
      ].join("\n"));
      // fire-and-forget
      runLiveTicker({
        sock, chat: m.chat, m,
        initialCard: tickCard({ remainingMs: nextEv.ts - Date.now() }),
        tickCard,
        finalCard,
        mode: "down",
        targetTs: nextEv.ts,
        maxEdits: Number(process.env.NOVA_BOLA_TICK_MAXEDITS || 36),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[jadwalbola]", err.message || err);
    await m.react("❌");
    return m.reply(raraWrap("jadwalbola", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
