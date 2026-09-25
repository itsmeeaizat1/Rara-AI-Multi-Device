// E2E .jadwalbolanotify tipe LIVE — kick-off + gol + HT real-time, 100% offline
import fs from "fs";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

const STATE = new URL("../../src/data/autobolanotify.json", import.meta.url).pathname;
try { fs.unlinkSync(STATE); } catch {}

// ── market ESPN yang bisa digeser dari test ──
// Live tracker cuma nge-fetch liga ESPN (skip tsdbId idn.1 / apifyCountry idn.2)
let market = {
  "eng.1": [],
};
const norm = (m, slug) => ({
  ...m, slug, leagueLabel: "Liga Inggris", emoji: "🏴", leagueLogo: null,
  homeScore: m.homeScore ?? null, awayScore: m.awayScore ?? null,
  statusDetail: m.statusDetail || "", venue: "Emirates Stadium",
});
const mkMatch = (state, hs, as, statusDetail) => ({
  key: "espn:m4", espnId: "401234", date: new Date(Date.now() - 30 * 60000).toISOString(),
  home: "Arsenal", away: "Chelsea", state, homeScore: hs, awayScore: as, statusDetail,
  teamIds: { home: "359", away: "371" },
  goalDetails: [],
});

import * as lib from "../../src/lib/nova-auto-bola-notifier.js";
import { fromSC } from "../../src/lib/styler.js";

let summaryCalls = 0;
lib.setFetcher({
  espn: async (slug) => (market[slug] || []).map((m) => norm(m, slug)),
  tsdbLeague: async () => [],
  apify: async () => [],
  summary: async () => {
    summaryCalls++;
    return {
      keyEvents: [
        { shortText: "Kevin Schade Goal - Header", clock: { displayValue: "34'" }, team: { id: "359", displayName: "Arsenal" }, scoringPlay: true },
      ],
    };
  },
});
lib.__setApifyWindowOverride(true);

const sent = [];
const mockSock = { sendMessage: async (chatId, content) => sent.push({ chatId, text: content?.text || "" }) };
lib.setSock(mockSock);
const CHAT = "628123@s.whatsapp.net";

// ═══ 1. default: tipe live MATI (opt-in) ═══
check("1a. default tipe live MATI", lib.getContentTypes().live === false);
check("1b. BOLA_TYPES punya live", !!lib.BOLA_TYPES.live && lib.BOLA_TYPES.live.label === "Live");

// ═══ 2. aktifasi + tipe live on ═══
lib.addTarget(CHAT);
lib.setBolaNotifierOn(true);
check("2a. setContentType live on", lib.setContentType("live", true) === true);
check("2b. tipe live AKTIF", lib.getContentTypes().live === true);
const st = lib.getStatus();
check("2c. status liveTicker nyala", st.liveTipe === true && st.liveIntervalMenit === 3 && st.liveTracked === 0);

// ═══ 3. gak ada laga live → 0 kirim ═══
let r = await lib.runLiveCheck();
check("3a. gak ada laga live → sent 0", r.sent === 0 && r.live === 0);

// ═══ 4. laga masuk state "in" → KICK-OFF ═══
market["eng.1"] = [mkMatch("in", 0, 0, "1st")];
sent.length = 0;
r = await lib.runLiveCheck();
check("4a. kick-off terkirim", r.sent === 1 && r.live === 1);
check("4b. isi kick-off", sent[0]?.text.includes("KICK-OFF") && sent[0].text.includes("Arsenal") && sent[0].chatId === CHAT);

// ═══ 5. cek ulang skor sama → gak ada duplikat ═══
sent.length = 0;
r = await lib.runLiveCheck();
check("5a. skor tetap → 0 kirim (dedup)", r.sent === 0);
check("5b. liveTracked 1", lib.getStatus().liveTracked === 1);

// ═══ 6. gol home → notif GOL + nama pencetak dari summary ═══
market["eng.1"] = [mkMatch("in", 1, 0, "35th")];
sent.length = 0;
summaryCalls = 0;
r = await lib.runLiveCheck();
check("6a. gol terdeteksi → 1 kirim", r.sent === 1);
check("6b. kartu gol: skor + tim + pencetak", sent[0]?.text.includes("GOL") && sent[0].text.includes("1 - 0") && sent[0].text.includes("Arsenal") && sent[0].text.includes("Kevin Schade"));
check("6c. summary dipanggil 1x (enrich gol)", summaryCalls === 1);

// ═══ 7. half-time → 1x doang ═══
market["eng.1"] = [mkMatch("in", 1, 0, "Halftime")];
sent.length = 0;
r = await lib.runLiveCheck();
check("7a. HT terkirim 1x", r.sent === 1 && sent[0]?.text.includes("HALF-TIME"));
market["eng.1"] = [mkMatch("in", 1, 0, "Halftime")];
r = await lib.runLiveCheck();
check("7b. HT dobel → gak dikirim lagi", r.sent === 0);

// ═══ 8. gol balasan away → tim away yang disebut ═══
market["eng.1"] = [mkMatch("in", 1, 1, "60th")];
sent.length = 0;
r = await lib.runLiveCheck();
check("8a. gol away terdeteksi", r.sent === 1 && sent[0]?.text.includes("Chelsea") && sent[0].text.includes("1 - 1"));

// ═══ 9. laga selesai → liveMatches kebuang ═══
market["eng.1"] = [mkMatch("post", 2, 1, "FT")];
r = await lib.runLiveCheck();
check("9a. post → cleanup liveMatches", r.live === 0 && lib.getStatus().liveTracked === 0);

// ═══ 10. getLiveNow: pure cek skor berjalan ═══
market["eng.1"] = [mkMatch("in", 1, 0, "12th")];
let live = await lib.getLiveNow();
check("10a. getLiveNow balikin laga live", live.length === 1 && live[0].home === "Arsenal");
check("10b. getLiveNow pure (gak nulis state)", lib.getStatus().liveTracked === 0);
market["eng.1"] = [];
live = await lib.getLiveNow();
check("10c. getLiveNow kosong", live.length === 0);

// ═══ 11. setLiveIntervalMenit validasi ═══
check("11a. interval 0 ditolak", lib.setLiveIntervalMenit(0) === null);
check("11b. interval 45 ditolak", lib.setLiveIntervalMenit(45) === null);
check("11c. interval 2 diterima", lib.setLiveIntervalMenit(2) === 2);
check("11d. status liveInterval 2", lib.getStatus().liveIntervalMenit === 2);

// ═══ 12. tipe live OFF → skipped ═══
lib.setContentType("live", false);
r = await lib.runLiveCheck();
check("12a. tipe live off → skipped", r.skipped === true && r.tipeOff === true);
lib.setContentType("live", true);

// ═══ 13. plugin .jadwalbolanotify skor ═══
market["eng.1"] = [mkMatch("in", 2, 1, "78th")];
const jbn = await import("../../plugins/info/jadwalbolanotify.js");
const mkM = (args) => ({
  args, chat: CHAT, replyed: [], reacts: [],
  reply: async (s) => { mkM.lastReply = String(s); return true; },
  react: async (e) => { mkM.lastReact = e; return true; },
});
const mP = mkM(["skor"]);
await jbn.handler(mP, { sock: mockSock, args: ["skor"] });
const skorCard = sent[sent.length - 1]?.text || "";
check("13a. .skor kirim kartu live", skorCard.includes("SKOR BERJALAN") && skorCard.includes("2 - 1"));
check("13b. .skor nunjukin menit + hint tipe live", skorCard.includes("78th") && skorCard.includes("info live on"));
market["eng.1"] = [];
const mP2 = mkM(["skor"]);
await jbn.handler(mP2, { sock: mockSock, args: ["skor"] });
check("13c. .skor kosong → pesan gak ada laga", fromSC(String(mkM.lastReply || "")).includes("gak ada laga"));

// ═══ 14. liveinterval subcommand ═══
const mP3 = mkM(["liveinterval"]);
await jbn.handler(mP3, { sock: mockSock, args: ["liveinterval"] });
check("14a. .liveinterval nunjukin interval (smallcaps-aware)", fromSC(String(mkM.lastReply || "")).includes("2 menit"));
const mP4 = mkM(["liveinterval", "99"]);
await jbn.handler(mP4, { sock: mockSock, args: ["liveinterval", "99"] });
check("14b. interval invalid ditolak", String(mkM.lastReply || "").toLowerCase().includes("1–30") || String(mkM.lastReply).toLowerCase().includes("1-30"));

// ═══ 15. monitor: live ticker mati bareng stopMonitor ═══
lib.setBolaNotifierOn(false);
check("15a. monitor stop → live ticker ikut stop", lib.getStatus().running === false);

lib.stopMonitor();
try { fs.unlinkSync(STATE); } catch {}
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
