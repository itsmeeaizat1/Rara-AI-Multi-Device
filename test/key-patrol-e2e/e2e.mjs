// RARA — E2E: AUTO KEY PATROL .keypatrol (27 Sep 2026)
// Semua HTTP di-mock via seam _setKeyPatrolHttpForTest — TANPA panggilan API beneran.
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-keypatrol-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const lib = await import(R + "/src/lib/rara-key-patrol.js");
const {
  ensureKeyPatrolState, runKeyPatrol, buildReportCard, buildStatusCard,
  initKeyPatrolScheduler, stopKeyPatrolScheduler, KEY_PROBES,
  _setKeyPatrolNowForTest, _clearKeyPatrolNowForTest,
  _setKeyPatrolOwnerJidForTest, _clearKeyPatrolOwnerJidForTest,
  _setKeyPatrolHttpForTest, _clearKeyPatrolHttpForTest,
} = lib;
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const { handler } = await import(R + "/plugins/owner/keypatrol.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 260))); ok ? pass++ : fail++; };

const DAY = 86400000, HOUR = 3600 * 1000;
const REAL_NOW = Date.now();
let NOW = REAL_NOW;
_setKeyPatrolNowForTest(() => NOW);
_setKeyPatrolOwnerJidForTest(() => "6281700000001@s.whatsapp.net");

const db = getDatabase();
db.data.autoorder = db.data.autoorder || {};
db.data.autoorder.pacific = { apiKey: "pac-key-123456789" };
db.data.autoorder.pediatopup = { apiId: "pedia123", apiKey: "pedia-key-9876" };
db.data.autoorder.premku = { apiKey: "prem-key-555555" };
process.env.GEMINI_API_KEY = "gem-test-123456789";
process.env.OPENAI_API_KEY = "oai-test-123456789";
process.env.GROQ_API_KEY = "groq-test-123456789";

// ── mock http: atur per-host, catat semua permintaan ───────────────────
const hostStatus = {}; // substring url → {status, body}
const calls = [];
_setKeyPatrolHttpForTest(async (url, opts) => {
  calls.push({ url, opts });
  for (const [frag, r] of Object.entries(hostStatus)) {
    if (String(url).includes(frag)) return typeof r === "function" ? r(url, opts) : (typeof r === "number" ? { status: r, body: "" } : r);
  }
  return { status: 200, body: "{}" };
});
const setHost = (frag, r) => { hostStatus[frag] = r; };

const mkSock = () => {
  const s = { sent: [], sendMessage: async (jid, o) => { s.sent.push({ jid, text: o?.text || "" }); } };
  return s;
};

w("\n===== 1. state & tabel probe =====");
{
  const st = ensureKeyPatrolState(db);
  check("default: on AKTIF", st.on === true, st.on);
  check("tabel probe: 12 key kurasi", Object.keys(KEY_PROBES).length === 12, Object.keys(KEY_PROBES).length);
  check("probe ada: pediatopup signature md5", KEY_PROBES.pediatopup.req("k-x").body.includes("signature"), KEY_PROBES.pediatopup.req("k-x").body.slice(0, 80));
}

w("\n===== 2. patrol pertama: semua hidup =====");
{
  // skrg (seam = real now) emang Minggu >= 08:00 WIB → laporan mingguan BAKAL kirim.
  // Klaim minggu ini dulu biar section ini fokus ke klasifikasi, bukan laporan.
  const wib = new Date(NOW + 7 * HOUR);
  const senin = new Date(wib.getTime() - ((wib.getUTCDay() + 6) % 7) * DAY);
  ensureKeyPatrolState(db).lastWeekly = `${senin.getUTCFullYear()}-${senin.getUTCMonth() + 1}-${senin.getUTCDate()}`;
  const sock = mkSock();
  const r = await runKeyPatrol(sock);
  check("key terisi semua hidup (default mock 200)", r.results.length === 12 && r.results.filter((x) => x.status !== "kosong").every((x) => x.status === "hidup"), JSON.stringify(r.results.map((x) => [x.name, x.status])));
  check("patrol pertama: TIDAK ada DM (belum ada perubahan)", sock.sent.length === 0, sock.sent.length);
  check("key kosong (anthropic/xai/router9v2/deepseek/zhipu/kimi gak diisi) — tunggu, deepseek/zhipu/kimi gak ada apikeys.json", r.results.some((x) => x.status === "kosong"), JSON.stringify(r.results.filter((x) => x.status === "kosong").map((x) => x.name)));
  check("state tercatat semua hidup/kosong", Object.keys(ensureKeyPatrolState(db).states).length === 12, Object.keys(ensureKeyPatrolState(db).states).length);
  // permintaan bener: gemini pakai query param, groq pakai bearer
  const gem = calls.find((c) => c.url.includes("generativelanguage"));
  check("gemini: key lewat query param", gem && gem.url.includes("key=gem-test-123456789"), gem?.url);
  const groq = calls.find((c) => c.url.includes("api.groq.com"));
  check("groq: auth Bearer", groq && groq.opts?.headers?.Authorization === "Bearer groq-test-123456789", JSON.stringify(groq?.opts?.headers));
  const pac = calls.find((c) => c.url.includes("pacific-pedia"));
  check("pacific: POST form api_key+action=profile", pac && pac.opts?.body === "api_key=pac-key-123456789&action=profile", pac?.opts?.body);
  const pedia = calls.find((c) => c.url.includes("panelpediatopup"));
  const pediaBody = JSON.parse(pedia?.opts?.body || "{}");
  check("pediatopup: signature = md5(api_id+api_key) bener", pediaBody.signature === crypto.createHash("md5").update("pedia123pedia-key-9876").digest("hex"), pedia?.opts?.body);
  const prem = calls.find((c) => c.url.includes("premku.com"));
  check("premku: POST JSON {api_key}", prem && JSON.parse(prem.opts.body).api_key === "prem-key-555555", prem?.opts?.body);
}

w("\n===== 3. perubahan status → DM =====");
{
  // groq jadi 401
  setHost("api.groq.com", { status: 401, body: "" });
  const sock = mkSock();
  const r = await runKeyPatrol(sock);
  const groq = r.results.find((x) => x.name === "groq");
  check("groq 401 → MATI", groq?.status === "mati" && groq?.code === "401", JSON.stringify(groq));
  check("hidup→mati: DM owner 🔴 1x", sock.sent.length === 1 && /MATI/.test(sock.sent[0].text) && sock.sent[0].text.includes("🔴"), sock.sent[0]?.text?.slice(0, 90));
  check("DM mati: ada link console ganti key", sock.sent[0].text.includes("console.groq.com"), sock.sent[0]?.text?.slice(0, 160));
  // tick lagi masih mati → gak spam
  const sock2 = mkSock();
  await runKeyPatrol(sock2);
  check("tetap mati: gak ada DM baru (anti spam)", sock2.sent.length === 0, sock2.sent.length);
  // balik hidup → DM 🟢
  setHost("api.groq.com", { status: 200, body: "{}" });
  const sock3 = mkSock();
  await runKeyPatrol(sock3);
  check("mati→hidup: DM owner 🟢", sock3.sent.length === 1 && sock3.sent[0].text.includes("🟢"), sock3.sent[0]?.text?.slice(0, 90));
}

w("\n===== 4. klasifikasi jujur =====");
{
  // 5xx & network → RUSAK, gak dituduh mati, gak DM
  setHost("api.openai.com", { status: 500, body: "" });
  setHost("api.x.ai", { status: 503, body: "" });
  const sock = mkSock();
  const r = await runKeyPatrol(sock);
  const oai = r.results.find((x) => x.name === "openai");
  check("openai 500 → RUSAK (bukan mati)", oai?.status === "rusak" && oai?.code === "500", JSON.stringify(oai));
  check("rusak: gak ada DM", sock.sent.length === 0, sock.sent.length);
  // 429 = rate limit → TETAP HIDUP
  setHost("api.openai.com", { status: 429, body: "" });
  const r2 = await runKeyPatrol(mkSock());
  const oai2 = r2.results.find((x) => x.name === "openai");
  check("openai 429 → HIDUP (rate limit ≠ mati)", oai2?.status === "hidup", JSON.stringify(oai2));
  // network throw → RUSAK
  setHost("api.openai.com", () => { throw new Error("kabel keputus"); });
  const r3 = await runKeyPatrol(mkSock());
  const oai3 = r3.results.find((x) => x.name === "openai");
  check("network gagal → RUSAK (jaringan)", oai3?.status === "rusak" && oai3?.code === "jaringan", JSON.stringify(oai3));
  // gemini invalid key: 400 + body "API key not valid" → MATI
  setHost("generativelanguage", { status: 400, body: "API key not valid. Please pass a valid API key." });
  const r4 = await runKeyPatrol(mkSock());
  const gem = r4.results.find((x) => x.name === "gemini");
  check("gemini 400 'API key not valid' → MATI", gem?.status === "mati", JSON.stringify(gem));
  delete hostStatus["generativelanguage"];
  delete hostStatus["api.openai.com"];
  delete hostStatus["api.x.ai"];
}

w("\n===== 5. laporan mingguan (Minggu 08:00 WIB) =====");
{
  const st = ensureKeyPatrolState(db);
  st.lastWeekly = "";
  // NOW = Minggu 08:30 WIB → wib = UTC+7 → pilih 01:30 UTC hari Minggu
  const d = new Date(REAL_NOW + 7 * HOUR);
  const mingguUtcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 17, 30, 0); // 17:30 UTC = 00:30 WIB (atur menit biar pasti)
  const daysUntilSunday = (7 - new Date(mingguUtcMidnight + 7 * HOUR).getUTCDay()) % 7;
  NOW = mingguUtcMidnight + daysUntilSunday * DAY + 8 * HOUR; // Minggu 08:30 WIB
  const sock = mkSock();
  const r = await runKeyPatrol(sock);
  const own = sock.sent.filter((s) => /LAPORAN/.test(s.text));
  check("Minggu ≥08:00: laporan mingguan ke owner terkirim", own.length === 1, own.length);
  check("laporan: ada hitungan + per key + tanggal WIB", /Hidup: \d+/.test(own[0]?.text || "") && own[0]?.text?.includes("WIB"), own[0]?.text?.slice(0, 140));
  // minggu sama → dedupe
  const sock2 = mkSock();
  await runKeyPatrol(sock2);
  check("minggu sama: laporan dedupe", sock2.sent.filter((s) => /LAPORAN/.test(s.text)).length === 0, sock2.sent.length);
  // bukan Minggu → gak kirim walau belum pernah
  const st2 = ensureKeyPatrolState(db);
  st2.lastWeekly = "";
  NOW = mingguUtcMidnight + daysUntilSunday * DAY + 9 * HOUR + DAY; // Senin
  const sock3 = mkSock();
  await runKeyPatrol(sock3);
  check("Senin: gak ada laporan mingguan", sock3.sent.filter((s) => /LAPORAN/.test(s.text)).length === 0, sock3.sent.length);
  NOW = REAL_NOW;
}

w("\n===== 6. off state =====");
{
  const st = ensureKeyPatrolState(db);
  st.on = false;
  const r = await runKeyPatrol(mkSock());
  check("off: patrol skipped", r.skipped === true && r.results.length === 0, JSON.stringify(r));
  st.on = true;
}

w("\n===== 7. kartu status & laporan on-demand =====");
{
  const st = ensureKeyPatrolState(db);
  const card = buildStatusCard(st, NOW);
  check("status: boxLeft + aktif + jumlah", card.includes("「") && /AKTIF/.test(card) && /Hidup: \d+/.test(card), card.slice(0, 140));
  const rc = buildReportCard(Object.values(st.lastResults), NOW, "🤖 TES LAPOR");
  check("laporan: nunjukin key kosong", /Kosong: \d+/.test(rc), rc.slice(0, 140));
  // key terisi tapi GAK didukung tes → jujur disebut (deepai via env)
  process.env.DEEPAI_API_KEY = "deep-test-1";
  const rc2 = buildReportCard(Object.values(st.lastResults), NOW, "🤖 TES LAPOR");
  check("laporan: key gak didukung tes disebut jujur", /Gak didukung tes/.test(rc2) && /DeepAI/.test(rc2), rc2.slice(0, 400));
  delete process.env.DEEPAI_API_KEY;
}

w("\n===== 8. plugin handler =====");
{
  const mkM = (args) => {
    const replies = [];
    return { args, react: () => { }, reply: async (t) => { replies.push(t); return t; }, sender: "6281700000001@s.whatsapp.net", pushName: "Owner", _replies: replies };
  };
  const m1 = mkM([]);
  await handler(m1, { sock: mkSock() });
  check("plugin: .keypatrol → status + guide (2 reply)", m1._replies.length === 2 && /KEY PATROL/.test(m1._replies[0]), m1._replies.length);
  const m2 = mkM(["tes"]);
  await handler(m2, { sock: mkSock() });
  check("plugin: .keypatrol tes → kartu hasil live", m2._replies.length === 1 && /Hidup: \d+/.test(m2._replies[0]), m2._replies[0]?.slice(0, 120));
  const m3 = mkM(["lapor"]);
  await handler(m3, { sock: mkSock() });
  check("plugin: .keypatrol lapor → kartu laporan", m3._replies.length === 1 && /WIB/.test(m3._replies[0]), m3._replies[0]?.slice(0, 120));
  const m4 = mkM(["off"]);
  await handler(m4, { sock: mkSock() });
  check("plugin: .keypatrol off → state mati", ensureKeyPatrolState(db).on === false, ensureKeyPatrolState(db).on);
  const m5 = mkM(["on"]);
  await handler(m5, { sock: mkSock() });
  check("plugin: .keypatrol on → state nyala", ensureKeyPatrolState(db).on === true, ensureKeyPatrolState(db).on);
  const m6 = mkM(["abcdef"]);
  await handler(m6, { sock: mkSock() });
  check("plugin: sub gak dikenal → guide bantuan", /ʙᴇʟᴜᴍ ꜱᴀʏᴀ ᴋᴇɴᴀʟɪ/.test(m6._replies[0]), m6._replies[0]?.slice(0, 120));
}

w("\n===== 9. scheduler idempotent + cleanup =====");
{
  const t1 = initKeyPatrolScheduler(mkSock());
  const t2 = initKeyPatrolScheduler(mkSock());
  check("scheduler: init dobel = timer sama (idempotent)", t1 === t2 && Boolean(t1), `${Boolean(t1)} ${t1 === t2}`);
  stopKeyPatrolScheduler();
}

_clearKeyPatrolNowForTest();
_clearKeyPatrolOwnerJidForTest();
_clearKeyPatrolHttpForTest();
stopKeyPatrolScheduler();
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.GROQ_API_KEY;

w(`\n===== HASIL: ${pass} pass, ${fail} fail =====`);
process.exit(fail ? 1 : 0);
