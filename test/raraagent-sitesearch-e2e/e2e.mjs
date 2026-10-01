// E2E SITE SEARCH AGENT (request owner 14 Sep 2026: "cba tes klo disuruh
// cari kayak carikan aplikasi whatsapp di apkmiror" — tes live: planner
// milih tool download → 403, SALAH TOTAL, karena gak ada tool buka situs
// sembarang). FIX: (1) TOOLS.searchsite + deteksi lokal localParse —
// chromium beneran (rara-web-browser.js: DuckDuckGo site: search + buka
// halaman utama) via LIB BERSAMA rara-site-search.js — dipakai
// .raraagent DAN .aisuperagent; (2) PREVIEW SCREENSHOT — "gambaran web
// yg agent lihat kyk browsing live" (request owner revisi) — screenshot
// halaman ASLI jadi gambar + kartu caption, gak ada → fallback teks;
// (3) NARASI ALIVE — AI ngjelasin hasilnya kayak ngomong (fakta wajib
// dari data browser); (4) retry 2x pageFacts. Semua dep di-inject.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/rara-database.js";
import {
  TOOLS, localParse,
  _setSiteSearchDepsForTest, _resetSiteSearchDepsForTest,
} from "../../src/lib/aiagent.js";
import {
  detectSiteSearchIntent, searchSiteAndSend,
  _setSiteSearchDepsForTest as setLibDeps,
  _resetSiteSearchDepsForTest as resetLibDeps,
} from "../../src/lib/rara-site-search.js";
import { normalizeSite } from "../../src/scraper/rara-web-browser.js";

const DB = "/tmp/raraagent-sitesearch-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

// ── mock conn + m ──
const sent = [];
const conn = { sendMessage: async (chat, msg) => { sent.push(msg); return { key: {} }; } };
const mockM = { chat: "pc@test", sender: "x@test" };

// ═══ 1. normalizeSite ═══
w("\n— normalizeSite —");
t("  'apkmirror' → apkmirror.com", normalizeSite("apkmirror") === "apkmirror.com");
t("  'www.apkmirror.com/' → apkmirror.com", normalizeSite("www.apkmirror.com/") === "apkmirror.com");
t("  'https://apkpure.com/x' → apkpure.com", normalizeSite("https://apkpure.com/x") === "apkpure.com");
t("  'bukan domain' → null", normalizeSite("bukan domain") === null);

// ═══ 2. detectSiteSearchIntent ═══
w("\n— detectSiteSearchIntent —");
const d = (txt, wantSite, wantQuery) => {
  const r = detectSiteSearchIntent(txt, txt);
  t("  " + txt, r?.site === wantSite && r?.query === wantQuery, "→ " + JSON.stringify(r));
};
d("carikan aplikasi whatsapp di apkmirror", "apkmirror.com", "whatsapp");
d("carikan aplikasi whatsapp di apkmiror", "apkmirror.com", "whatsapp"); // typo owner ke-handle
d("cari aplikasi whatsapp di apkpure dong", "apkpure.com", "whatsapp");
d("carikan harga hp di www.tokopedia.com", "tokopedia.com", "harga hp");
d("carikan aplikasi whatsapp di apkmirror.com", "apkmirror.com", "whatsapp");
// negative: youtube = jalur searchyt sendiri, bukan site search
t("  'cairkan bot alya md di youtube' → null (jalur yt)",
  detectSiteSearchIntent("cairkan bot alya md di youtube", "cairkan bot alya md di youtube") === null);
t("  'buka grupnya' → null", detectSiteSearchIntent("buka grupnya", "buka grupnya") === null);
t("  'carikan aplikasi whatsapp' (tanpa situs) → null",
  detectSiteSearchIntent("carikan aplikasi whatsapp", "carikan aplikasi whatsapp") === null);

// ═══ 3. localParse — deteksi lokal .raraagent ═══
w("\n— localParse searchsite —");
const lp = (txt, site, query) => {
  const r = localParse(txt);
  t("  " + txt, r?.tool === "searchsite" && r?.args?.site === site && r?.args?.query === query,
    "→ " + JSON.stringify(r));
};
lp("carikan aplikasi whatsapp di apkmirror", "apkmirror.com", "whatsapp");
lp("carikan aplikasi whatsapp di apkmiror", "apkmirror.com", "whatsapp");
lp("cari harga hp di www.tokopedia.com", "tokopedia.com", "harga hp");
// youtube tetep searchyt — BUKAN searchsite
t("  'cairkan bot alya md di youtube' → searchyt (bukan searchsite)",
  localParse("cairkan bot alya md di youtube")?.tool === "searchyt");
// plain cari tanpa situs gak nyangkut
t("  'carikan berita prabowo' → BUKAN searchsite",
  localParse("carikan berita prabowo")?.tool !== "searchsite");

// ═══ 4. searchSiteAndSend — preview screenshot + kartu + narasi ═══
w("\n— searchSiteAndSend full flow (mock browser) —");
resetLibDeps();
const FAKE_SHOT = Buffer.alloc(5000, 7);
setLibDeps({
  siteSearch: async () => [
    { title: "WhatsApp Messenger APK", url: "https://www.apkmirror.com/apk/whatsapp-inc/whatsapp-messenger/", snippet: "WhatsApp Messenger resmi dari Meta — gratis, dipakai 2 miliar orang di 180 negara." },
    { title: "WhatsApp Business APK", url: "https://www.apkmirror.com/apk/whatsapp-inc/whatsapp-business/", snippet: "Versi bisnis WhatsApp." },
  ],
  pageFacts: async () => ({
    title: "WhatsApp Messenger",
    description: "Halaman download APK WhatsApp Messenger di APKMirror.",
    text: "WhatsApp Messenger dari Meta — versi 2.26.30.70 tersedia untuk diunduh, aplikasi pesan gratis dengan lebih dari 2 miliar pengguna.",
    screenshot: FAKE_SHOT,
  }),
  aiChat: async (prompt) => {
    if (/versi 2\.26/.test(prompt) === false) throw new Error("narasi harus dikasih data fakta halaman");
    return "Nih ketemu WhatsApp Messenger di APKMirror — versi 2.26.30.70 udah tersedia, aplikasi pesan gratis yang dipakai 2 miliar orang. Mau aku cariin versi lainnya juga?";
  },
});
sent.length = 0;
const r1 = await searchSiteAndSend(conn, mockM, { site: "apkmirror.com", query: "whatsapp" });
t("  return { site, count }", r1.site === "apkmirror.com" && r1.count === 2, JSON.stringify(r1));
t("  preview SCREENSHOT kekirim sebagai gambar (browsing live)",
  sent.some((s) => s.image === FAKE_SHOT && /WhatsApp Messenger APK/.test(s.caption || "")),
  JSON.stringify(sent.map((s) => Object.keys(s))));
t("  kartu caption: judul hasil utama + link + via browser",
  (() => { const c = sent.find((s) => s.image)?.caption || ""; return /dicari via: browser beneran \(chromium\)/.test(c) && /whatsapp-inc\/whatsapp-messenger/.test(c) && /🏆 \*WhatsApp Messenger APK\*/.test(c); })());
t("  isi halaman (versi dari fakta) masuk kartu",
  /versi 2\.26\.30\.70/.test(sent.find((s) => s.image)?.caption || ""));
t("  hasil lain ikut di kartu",
  /whatsapp-business/.test(sent.find((s) => s.image)?.caption || ""));
t("  narasi alive kekirim setelah kartu",
  sent.some((s) => s.text && /2 miliar|versi 2\.26/.test(s.text) && !s.image),
  JSON.stringify(sent.map((s) => s.text?.slice(0, 40))));

// ═══ 5. fallback: screenshot gagal → kartu teks doang ═══
w("\n— fallback tanpa screenshot —");
sent.length = 0;
setLibDeps({
  siteSearch: async () => [
    { title: "WhatsApp Messenger APK", url: "https://www.apkmirror.com/wa/", snippet: "APK resmi." },
  ],
  pageFacts: async () => { throw new Error("timeout buka halaman"); },
  aiChat: async () => "Ketemu WhatsApp di apkmirror, silakan cek linknya di kartu ya.",
});
const r2 = await searchSiteAndSend(conn, mockM, { site: "apkmirror.com", query: "whatsapp" });
t("  pageFacts gagal → kartu teks tetap jalan (retry 2x senyap)",
  sent.some((s) => s.text && /WhatsApp Messenger APK/.test(s.text) && !s.image));
t("  snippet DDG masuk kartu (data gak ilang)", /APK resmi/.test(sent.find((s) => s.text)?.text || ""));
t("  narasi tetap kekirim", sent.some((s) => s.text && /cek linknya/.test(s.text)));

// ═══ 6. hasil kosong → error ramah ═══
w("\n— hasil kosong —");
sent.length = 0;
setLibDeps({ siteSearch: async () => [], pageFacts: async () => ({}), aiChat: async () => "" });
let err = "";
try { await searchSiteAndSend(conn, mockM, { site: "apkmirror.com", query: "zzzznope" }); }
catch (e) { err = e.message; }
t("  throw error ramah 'gak nemu hasil'", /gak nemu hasil di apkmirror\.com/.test(err), err);
t("  gak ada pesan kekirim pas kosong", sent.length === 0);

// ═══ 7. narasi AI mati → skip senyap, kartu tetap lengkap ═══
w("\n— narasi AI down —");
sent.length = 0;
setLibDeps({
  siteSearch: async () => [{ title: "WA APK", url: "https://apkmirror.com/x", snippet: "snip" }],
  pageFacts: async () => ({ title: "WA", description: "d", text: "isi", screenshot: FAKE_SHOT }),
  aiChat: async () => { throw new Error("AI down semua"); },
});
await searchSiteAndSend(conn, mockM, { site: "apkmirror.com", query: "wa" });
t("  kartu + preview tetap kekirim walau AI narasi mati",
  sent.some((s) => s.image === FAKE_SHOT));
t("  gak ada narasi → total pesan = 1 (kartu doang)", sent.length === 1, "sent=" + sent.length);

// ═══ 8. TOOLS.searchsite — tool planner .raraagent ═══
w("\n— TOOLS.searchsite (planner .raraagent) —");
t("  tool terdaftar + desc nunjukin situs", !!TOOLS.searchsite && /SITUS/i.test(TOOLS.searchsite.desc));
_resetSiteSearchDepsForTest();
_setSiteSearchDepsForTest({
  siteSearch: async () => [{ title: "WA APK", url: "https://apkmirror.com/wa", snippet: "s" }],
  pageFacts: async () => ({ title: "WA", text: "isi", screenshot: FAKE_SHOT }),
  aiChat: async () => "narasi.",
});
sent.length = 0;
const rt = await TOOLS.searchsite.run(conn, mockM, { site: "apkmirror.com", query: "whatsapp" });
t("  run() → preview + kartu kekirim", sent.some((s) => s.image === FAKE_SHOT) && rt.site === "apkmirror.com");

// ═══ 9. guard: deteksi lokal gak dobel sama youtube ═══
w("\n— guard prioritas —");
t("  youtube duluan: 'carikan video bot alya md di youtube' → searchyt bukan searchsite",
  localParse("carikan video bot alya md di youtube")?.tool === "searchyt");
t("  situs tanpa kata video: 'carikan aplikasi whatsapp di apkmirror' → searchsite",
  localParse("carikan aplikasi whatsapp di apkmirror")?.tool === "searchsite");

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
