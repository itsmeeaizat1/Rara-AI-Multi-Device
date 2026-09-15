// E2E .jadwalbolanotify — fetcher di-inject, 100% offline
import fs from "fs";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

// state file dihapus biar fresh tiap run
const STATE = new URL("../../src/data/autobolanotify.json", import.meta.url).pathname;
try { fs.unlinkSync(STATE); } catch {}

// ── fake ESPN: pertandingan bisa digeser dari test ──
let market = {
  "eng.1": [
    { key: "espn:m1", date: new Date(Date.now() + 20 * 60000).toISOString(), home: "Arsenal", away: "Chelsea", state: "pre", score: null }, // H-20 mnt → reminder
  ],
  "esp.1": [
    { key: "espn:m2", date: new Date(Date.now() + 3 * 3600000).toISOString(), home: "Real Madrid", away: "Barcelona", state: "pre", score: null },
  ],
  "ger.1": [
    { key: "espn:m3", date: new Date(Date.now() - 2 * 3600000).toISOString(), home: "Bayern", away: "Dortmund", state: "in" }, // berjalan → transisi post di step 6
  ],
};
const norm = (m, slug) => ({
  ...m, slug, leagueLabel: { "eng.1": "Liga Inggris", "esp.1": "Liga Spanyol", "ger.1": "Liga Jerman", "idn.1": "Liga 1 Indonesia" }[slug],
  emoji: "⚽", leagueLogo: null, homeScore: m.homeScore ?? null, awayScore: m.awayScore ?? null,
  statusDetail: "", venue: "Stadion Test",
});

// Liga 1 Indonesia (tsdbId 4790) — jalur TSDB league endpoint (ESPN idn.1 stale)
const idnMarket = [
  { key: "tsdb:i1", date: new Date(Date.now() + 30 * 60000).toISOString(), home: "Garudayaksa", away: "Persik Kediri", state: "pre" }, // H-30 → reminder
];

// Liga 2 Indonesia — jalur Apify Flashscore (item mentah ala actor, struktur asli)
let apifyCalls = 0;
const fsItem = (id, home, away, offsetMin, status, hs = null, as = null) => ({
  matchId: id, country: "Indonesia", league: "Liga 2",
  leagueUrl: "https://www.flashscore.com/football/indonesia/liga-2/",
  homeTeam: home, awayTeam: away, homeScore: hs, awayScore: as,
  status, minute: status === "live" ? 23 : undefined,
  startTime: new Date(Date.now() + offsetMin * 60000).toISOString(),
});
let idn2Market = [
  fsItem("l2a", "PSMS Medan", "Persipura Jayapura", 100, "scheduled"), // H-100 → reminder window Apify 150 mnt
];

import * as lib from "../../src/lib/nova-auto-bola-notifier.js";
lib.setFetcher({
  espn: async (slug) => (market[slug] || []).map((m) => norm(m, slug)),
  tsdbLeague: async (slug, tsdbId) => (tsdbId === 4790 ? idnMarket.map((m) => norm(m, slug)) : []),
  apify: async (country) => { apifyCalls++; return idn2Market; },
});
lib.__setApifyWindowOverride(true); // e2e deterministik — gak tergantung jam WIB asli

const sent = [];
const mockSock = { sendMessage: async (chatId, content) => sent.push({ chatId, text: content?.text || "" }) };
lib.setSock(mockSock);

const CHAT = "628123@s.whatsapp.net";

// ═══ 1. resolveLeague ═══
check("1a. resolve 'liga belanda' → ned.1", lib.resolveLeague("liga belanda") === "ned.1");
check("1b. resolve 'champions' → uefa.champions", lib.resolveLeague("champions") === "uefa.champions");
check("1b2. resolve 'liga indonesia' → idn.1", lib.resolveLeague("liga indonesia") === "idn.1");
check("1b3. resolve 'bri' → idn.1", lib.resolveLeague("bri") === "idn.1");
check("1b4. resolve 'liga 2' → idn.2", lib.resolveLeague("liga 2") === "idn.2");
check("1b5. resolve 'championship' → idn.2 (bukan uefa.champions)", lib.resolveLeague("championship") === "idn.2");
check("1b6. resolve 'pegadaian' → idn.2", lib.resolveLeague("pegadaian") === "idn.2");
check("1c. resolve slug 'sau.1' langsung", lib.resolveLeague("sau.1") === "sau.1");
check("1d. resolve ngawur → null", lib.resolveLeague("liga bulu tangkis") === null);

// ═══ 2. baseline first-run: gak kirim apapun ═══
let r = await lib.runCheck();
check("2a. baseline: initDone + 0 kirim", r.baseline === true && r.sent === 0);
check("2b. default 8 liga (termasuk Liga 1 & 2 Indonesia)", lib.getLeagues().length === 8);
check("2b2. Liga Indonesia di default", lib.getLeagues().some((l) => l.slug === "idn.1" && l.label === "Liga 1 Indonesia"));
check("2b3. Liga 2 Indonesia di default", lib.getLeagues().some((l) => l.slug === "idn.2" && l.label === "Liga 2 Indonesia"));
check("2c. default enabled=false", lib.isEnabled() === false);

// ═══ 3. liga add/del/reset ═══
let lr = lib.addLeague("Liga Belanda");
check("3a. add Liga Belanda → 9 liga", lr.ok === true && lr.leagues.length === 9);
lr = lib.addLeague("Liga Belanda");
check("3b. add dobel ditolak", lr.ok === false && lr.error === "dup");
lr = lib.addLeague("Liga Bulu Tangkis");
check("3c. add liga gak dikenal ditolak", lr.ok === false && lr.error === "unknown");
lr = lib.removeLeague("ned.1");
check("3d. del Liga Belanda → 8 liga", lr.ok === true && lr.leagues.length === 8);
lr = lib.removeLeague("Liga Tidak Ada");
check("3e. del liga gak terdaftar → missing", lr.ok === false && lr.error === "missing");

// ═══ 4. aktivasi: subscriber + on ═══
lib.addTarget(CHAT);
lib.setBolaNotifierOn(true);
const st1 = lib.getStatus();
check("4a. subscriber terdaftar", st1.targets.includes(CHAT) && st1.enabled === true);
check("4b. monitor JALAN", st1.running === true);

// ═══ 5. force ke chat: digest jadwal hari ini masuk ═══
sent.length = 0;
r = await lib.runCheck({ force: true, chatId: CHAT });
check("5a. force+chat → digest terkirim", r.sent >= 1 && sent.length >= 1);
check("5b. digest nunjukin pertandingan", sent[0]?.text?.includes("JADWAL BOLA HARI INI") && sent[0].text.includes("Arsenal"));
check("5b2. digest termasuk Liga 1 Indonesia (jalur TSDB)", sent[0]?.text?.includes("Garudayaksa"));
check("5b3. digest termasuk Liga 2 Indonesia (jalur Apify Flashscore)", sent[0]?.text?.includes("PSMS Medan"));
check("5c. digest ke chat yang aktifin", sent[0]?.chatId === CHAT);

// ═══ 6. monitor check global: reminder (H-20) + hasil (transisi post) dikirim ═══
market["ger.1"][0] = { key: "espn:m3", date: new Date(Date.now() - 2 * 3600000).toISOString(), home: "Bayern", away: "Dortmund", state: "post", homeScore: 3, awayScore: 1 };
sent.length = 0;
r = await lib.runCheck();
const texts = sent.map((s) => s.text).join("\n");
check("6a. reminder H-20 mnt terkirim", texts.includes("BENTAR LAGI KICK-OFF") && texts.includes("Arsenal"));
check("6a2. reminder Liga 1 Indonesia (Garudayaksa H-30) terkirim", texts.includes("Garudayaksa"));
check("6a3. reminder Liga 2 PSMS Medan (window Apify 150 mnt) terkirim", texts.includes("PSMS Medan"));
const apifyCallsAfterStep6 = apifyCalls;

// ═══ 6.5 THROTTLE: run lagi dalam interval → Apify GAK dipanggil (credit aman) ═══
sent.length = 0;
r = await lib.runCheck();
check("6.5a. throttle — Apify gak dipanggil ulang dalam interval", apifyCalls === apifyCallsAfterStep6);

// ═══ 6.6 CACHE MERGE: liga Apify gak ke-fetch tapi tetap dievaluasi tiap siklus ═══
idn2Market = [fsItem("l2a", "PSMS Medan", "Persipura Jayapura", -90, "finished", 2, 1)];
const stRaw = JSON.parse(fs.readFileSync(STATE, "utf8"));
stRaw.lastApifyCheck = new Date(Date.now() - 3 * 3600000).toISOString(); // paksa due
fs.writeFileSync(STATE, JSON.stringify(stRaw));
sent.length = 0;
r = await lib.runCheck();
check("6.6a. hasil Liga 2 FULL-TIME (refresh poll Apify) terkirim", sent.some((s) => s.text.includes("FULL-TIME") && s.text.includes("PSMS Medan") && s.text.includes("2 - 1")));
check("6b. hasil full-time terkirim", texts.includes("FULL-TIME") && texts.includes("3 - 1"));
check("6c. digest gak dobel", !texts.includes("JADWAL BOLA HARI INI"));

// ═══ 7. dedup: run lagi → gak dobel ═══
sent.length = 0;
r = await lib.runCheck();
check("7a. dedup — 0 kirim", r.sent === 0 && sent.length === 0);

// ═══ 8. fixture baru muncul → notif jadwal baru ═══
// date +30 mnt (bukan +5 jam) — jamin tetap "hari ini" WIB, gak flaky malam hari
market["eng.1"].push({ key: "espn:m9", date: new Date(Date.now() + 30 * 60000).toISOString(), home: "Liverpool", away: "Man City", state: "pre" });
sent.length = 0;
r = await lib.runCheck();
check("8a. fixture baru → notif JADWAL BARU", sent.some((s) => s.text.includes("JADWAL BARU") && s.text.includes("Liverpool")));

// ═══ 9. laga mulai (in) → gak spam notif live ═══
market["eng.1"][0] = { key: "espn:m1", date: new Date(Date.now() - 30 * 60000).toISOString(), home: "Arsenal", away: "Chelsea", state: "in" };
sent.length = 0;
r = await lib.runCheck();
check("9a. laga berjalan (in) → gak ada notif", r.sent === 0);

// ═══ 10. tipe konten off → hasil/reminder gak dikirim ═══
market["esp.1"][0] = { key: "espn:m2", date: new Date(Date.now() - 5 * 60000).toISOString(), home: "Real Madrid", away: "Barcelona", state: "post", homeScore: 2, awayScore: 2 };
lib.setContentType("hasil", false);
sent.length = 0;
r = await lib.runCheck();
check("10a. tipe hasil OFF → skor gak dikirim", !sent.some((s) => s.text.includes("FULL-TIME")));
lib.setContentType("hasil", true);
sent.length = 0;
r = await lib.runCheck();
check("10b. tipe hasil ON lagi → skor masuk", sent.some((s) => s.text.includes("FULL-TIME")));

// ═══ 11. interval & status ═══
check("11a. interval invalid ditolak", lib.setIntervalMenit(2) === null && lib.setIntervalMenit(1000) === null);
check("11b. interval 15 diterima", lib.setIntervalMenit(15) === 15);
check("11c. status interval 15", lib.getStatus().intervalMenit === 15);

// ═══ 12. cleanup: off + monitor stop ═══
lib.removeTarget(CHAT);
lib.syncMonitor();
check("12a. subscriber kosong → monitor STOP", lib.getStatus().running === false);
lib.setBolaNotifierOn(false);
check("12b. enabled OFF", lib.isEnabled() === false);

// ═══ 13. LIVE test (opsional — skip kalau jaringan mati) ═══
try {
  const axios = (await import("axios")).default;
  const res = await axios.get("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard", { timeout: 10000 });
  check("13a. LIVE ESPN eng.1 reachable", Array.isArray(res.data?.events));
  const r2 = await axios.get("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4790", { timeout: 10000 });
  check("13b. LIVE TSDB Liga 1 Indonesia (4790) reachable", Array.isArray(r2.data?.events));
  if (process.env.APIFY_TOKEN) {
    const token = process.env.APIFY_TOKEN;
    const ra = await axios.post("https://api.apify.com/v2/acts/khadinakbar~flashscore-live-matches/run-sync-get-dataset-items?token=" + token + "&timeout=120",
      { sport: "football", dayOffsets: [0], maxResults: 5, language: "en" }, { timeout: 130000 });
    check("13c. LIVE Apify Flashscore reachable", Array.isArray(ra.data));
    w("  (apify live items: " + (ra.data || []).length + ")");
  } else {
    w("  ⚠️ 13c. LIVE Apify skip (token belum diset)");
  }
} catch {
  w("  ⚠️ 13. LIVE ESPN skip (jaringan)");
}

lib.stopMonitor();
fs.unlinkSync(STATE);
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
