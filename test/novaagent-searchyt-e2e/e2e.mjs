// E2E SEARCH YOUTUBE AGENT (fix owner 14 Sep 2026: ".novaagent cairkan bot
// alya md ini di youtube hasilnya beda" → arahan "cari harus pakai browser
// beneran bukan AI" → revisi "klo disuruh cari BUKAN video yang diunduh,
// tapi thumbnail cuplikan preview + buffer url + deskripsi ke plain text —
// KECUALI aku minta unduh video"). FIX: (1) tool searchyt — cari video
// YouTube via BROWSER BENERAN (chromium, nova-yt-browser.js) → fallback
// yt-search; (2) MODE PENCARIAN (default): kartu THUMBNAIL preview
// (i.ytimg.com dari video id, maxres→hq fallback) + caption plain text
// (judul/channel/durasi/views/deskripsi/link + hint unduh) — TANPA unduh;
// (3) MODE UNDUH (download:true eksplisit — "unduh/putar/nonton video X"):
// kartu info + video hasil unduhan rantai nova-ytdlp → IkyyXD → ytdl.js;
// (4) localParse deteksi lokal — strip kata unduh dari query. Offline, semua
// dep di-inject.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import {
  TOOLS, localParse,
  _setSearchytDepsForTest, _resetSearchytDepsForTest,
} from "../../src/lib/aiagent.js";

const DB = "/tmp/novaagent-searchyt-e2e-db.json";
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

// ═══ 1. localParse — preview default, unduh cuma eksplisit ═══
w("\n— localParse: preview vs unduh —");
const cek = (txt, wantQuery, wantDownload) => {
  const r = localParse(txt);
  t("  " + txt, r?.tool === "searchyt" && r?.args?.query === wantQuery && !!r?.args?.download === !!wantDownload,
    "→ " + JSON.stringify(r));
};
// cari → PREVIEW (gak unduh)
cek("cairkan bot alya md ini di youtube", "bot alya md", false);
cek("carikan video tutorial dpixel di youtube", "tutorial dpixel", false);
cek("cari video bot alya md", "bot alya md", false);
cek("lihatkan video dpixel", "dpixel", false);
cek("cari video bot wa alya md di yt", "bot wa alya md", false);
// minta unduh/putar/nonton → UNDUH
cek("unduh video bot alya md di youtube", "bot alya md", true);
cek("download video lucu di youtube", "lucu", true);
cek("putar video kucing lucu", "kucing lucu", true);
cek("tontonin video anya md bot", "anya md bot", true);
cek("nonton video lucu di yt", "lucu", true);
cek("dl video mancing di youtube", "mancing", true);

// gak boleh nyangkut: jalur lain tetep jalan
t("  'carikan berita terbaru prabowo' → BUKAN searchyt (jalur websearch)",
  localParse("carikan berita terbaru prabowo")?.tool !== "searchyt");
t("  'buatkan gambar kucing astronot' → tetep genimage",
  localParse("buatkan gambar kucing astronot")?.tool === "genimage");
t("  'tutup grup' → tetep closegc",
  localParse("tutup grup")?.tool === "closegc");

// ═══ 1b. browser beneran duluan ═══
w("\n— tool searchyt: browser beneran —");
const VIDEOS = [
  { title: "Cara Cairkan Bot Alya MD — Deploy WhatsApp Bot", author: { name: "Alya MD Official" },
    duration: { timestamp: "12:34" }, views: 15400, ago: "3 minggu lalu",
    description: "Tutorial lengkap cara install dan cairkan bot Alya MD Multi Device. Download script di deskripsi ya guys!",
    url: "https://youtube.com/watch?v=alyaMD12345" },
  { title: "Setting Bot Alya MD Biar Aktif 24 Jam", author: { name: "WA Bot Indo" },
    duration: { timestamp: "8:11" }, views: 2300, ago: "1 bulan lalu", description: "",
    url: "https://youtube.com/watch?v=alyaMD67890" },
  { title: "Review Script Alya MD WhatsApp Bot", author: { name: "Script Hunter" },
    duration: { timestamp: "15:02" }, views: 989, ago: "2 bulan lalu", description: "",
    url: "https://youtube.com/watch?v=alyaMDabcde" },
];
const BROWSER_VIDEOS = [
  { title: "Browser Result: Cairkan Alya MD", author: { name: "Via Chromium" },
    duration: { timestamp: "10:10" }, views: 1200000, ago: "2 hari lalu",
    description: "hasil ekstraksi DOM youtube dari chromium headless",
    url: "https://youtube.com/watch?v=browser12345" },
  { title: "Browser Result 2", author: { name: "Ch 2" }, duration: { timestamp: "3:03" },
    views: 500, ago: "5 jam lalu", description: "", url: "https://youtube.com/watch?v=brow2" },
];

sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async (q, opts) => [...BROWSER_VIDEOS],
  yts: async () => { throw new Error("JANGAN KEPAKE"); },
  downloadVideoYtDlp: async (url) => ({ buffer: Buffer.alloc(20000, 7), title: "x" }),
  toWhatsAppVideo: async (b) => b,
  thumbGet: async () => Buffer.alloc(30000, 9),
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const brImg = sent.find(x => x.image);
const brCap = brImg?.caption || "";
t("1ba. hasil BROWSER dipakai (judul browser ada)", brCap.includes("Browser Result: Cairkan Alya MD"), brCap.slice(0, 120));
t("1bb. kartu nunjukin 'via: browser beneran'", brCap.includes("browser beneran (chromium)"), brCap.slice(0, 160));
t("1bc. PREVIEW MODE: thumbnail image kekirim (bukan video)", !!brImg && !sent.find(x => x.video));
t("1bd. views 1.2 jt ke-format dari hasil browser", brCap.includes("1.2 jt penonton"), brCap.slice(0, 250));
t("1be. mode cari default GAK ngunduh (tanpa download flag)", !sent.find(x => x.video));
t("1bf. hint cara unduh ada di kartu", brCap.includes("unduh video") && brCap.includes(".playvideo"), brCap.slice(-160));

// ═══ 2. MODE PENCARIAN default: thumbnail + deskripsi plain text ═══
w("\n— tool searchyt: preview mode (default) —");
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("chromium missing libnss3"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async (u) => (String(u).includes("maxresdefault") ? Buffer.alloc(45000, 9) : Buffer.alloc(20000, 9)),
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const imgMsg = sent.find(x => x.image);
const cap = imgMsg?.caption || "";
t("2a. thumbnail preview kekirim (image + caption)", !!imgMsg && imgMsg.image.length === 45000);
t("2b. GAK ada video diunduh (request owner)", !sent.find(x => x.video), JSON.stringify(sent.map(x => Object.keys(x))));
t("2c. caption ada judul + channel + durasi + views + ago",
  cap.includes(VIDEOS[0].title) && cap.includes("Alya MD Official") && cap.includes("12:34") && cap.includes("15.4 rb penonton") && cap.includes("3 minggu lalu"),
  cap.slice(0, 220));
t("2d. deskripsi video masuk plain text", cap.includes("Tutorial lengkap cara install"), cap.slice(0, 300));
t("2e. link video utama + video lain ada", cap.includes("alyaMD12345") && cap.includes("alyaMD67890") && cap.includes("alyaMDabcde"));
t("2f. kartu nunjukin fallback 'youtube engine' (browser down)", cap.includes("youtube engine"), cap.slice(0, 160));
t("2g. hint 'unduh video <judul>' + .playvideo ada", cap.includes(".novaagent unduh video") && cap.includes(".playvideo"), cap.slice(-180));

// thumbnail maxres 404 (placeholder kecil) → hqdefault fallback
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async (u) => (String(u).includes("maxresdefault") ? Buffer.alloc(1200, 1) : Buffer.alloc(20000, 9)),
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
t("2h. maxres placeholder kecil → hqdefault dipakai", sent.find(x => x.image)?.image?.length === 20000);

// deskripsi kosong (jalur browser) → fetch shortDescription dari watch page
_setSearchytDepsForTest({
  browserSearch: async () => [
    { ...VIDEOS[0], description: "", url: "https://youtube.com/watch?v=descpage123" },
    { ...VIDEOS[1] },
  ],
  thumbGet: async () => Buffer.alloc(30000, 9),
  httpGetText: async () => '<html><script>ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Deskripsi ASLI dari watch page YouTube hasil browsing."}}</script></html>',
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const capDesc = sent.find(x => x.image)?.caption || sent.find(x => x.text)?.text || "";
t("2i. deskripsi kosong → diambil dari watch page (shortDescription)", capDesc.includes("Deskripsi ASLI dari watch page"), capDesc.slice(0, 300));

// thumbnail gagal total → kartu teks polos tetap lengkap
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async () => { throw new Error("img down"); },
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const txtCard = sent.find(x => x.text);
t("2j. thumbnail gagal → kartu teks tetap lengkap", !!txtCard?.text?.includes(VIDEOS[0].title) && !sent.find(x => x.image), txtCard?.text?.slice(0, 120));

// ═══ 3. MODE UNDUH (download: true) — kartu info + video ═══
w("\n— tool searchyt: unduh mode (eksplisit) —");
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async () => Buffer.alloc(30000, 9),
  downloadVideoYtDlp: async (url, quality) => {
    if (url === VIDEOS[0].url && quality === "480") return { buffer: Buffer.alloc(50000, 1), title: VIDEOS[0].title };
    throw new Error("404");
  },
  toWhatsAppVideo: async (buf) => buf,
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md", download: true });
const infoCard = sent.find(x => x.text);
const videoMsg = sent.find(x => x.video);
t("3a. download:true → VIDEO kekirim", !!videoMsg && videoMsg.video?.length === 50000);
t("3b. kartu info teks ikut kekirim", !!infoCard?.text?.includes(VIDEOS[0].title));
t("3c. mode unduh GAK kirim thumbnail image", !sent.find(x => x.image));
t("3d. caption video ada judul + link", !!videoMsg?.caption?.includes(VIDEOS[0].title) && videoMsg.caption.includes("alyaMD12345"));

// fallback rantai unduhan: nova-ytdlp mati → IkyyXD
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async (url, opts) => {
    if (opts?.responseType === "arraybuffer") return { data: Buffer.alloc(40000, 2) };
    return { data: { status: true, result: { VideoUrl: { url: "https://dl.example/v.mp4" }, title: "x" } } };
  },
  toWhatsAppVideo: async (buf) => buf,
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md", download: true });
t("3e. nova-ytdlp mati → IkyyXD ytmp4 dapet buffer", sent.find(x => x.video)?.video?.length === 40000);

// dua-duanya mati → ytdl.js
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async () => { throw new Error("down"); },
  ytdlFn: async (url, type) => ({ status: true, dl: "https://dl.example/y.mp4", title: "y" }),
  httpGet: async () => ({ data: Buffer.alloc(30000, 3) }),
  toWhatsAppVideo: async (buf) => buf,
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md", download: true });
t("3f. dua engine mati → ytdl.js dapet buffer", sent.find(x => x.video)?.video?.length === 30000);

// SEMUA jalur unduhan mati → kartu info tetap keluar + pesan jujur
w("\n— unduh kandas —");
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async () => { throw new Error("down"); },
  ytdlFn: async () => { throw new Error("down"); },
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md", download: true });
const failNotice = sent.filter((x) => /gagal diunduh/i.test(x?.text || ""));
t("4a. kartu info TETAP kekirim walau unduh mati", !!sent.find(x => x.text && x.text.includes(VIDEOS[0].title)));
t("4b. pesan jujur 'gagal diunduh' + hint .playvideo", failNotice.length >= 1 && failNotice[0].text.includes(".playvideo"), failNotice[0]?.text?.slice(0, 120));

// ═══ 5. edge case ═══
w("\n— edge case —");
let errEmpty = "";
try { await TOOLS.searchyt.run(conn, mockM, { query: "" }); } catch (e) { errEmpty = e.message; }
t("5a. query kosong → error jelas", /mau cari video apa/i.test(errEmpty), errEmpty);

_setSearchytDepsForTest({ browserSearch: async () => { throw new Error("x"); }, yts: async () => ({ videos: [] }) });
let errNone = "";
try { await TOOLS.searchyt.run(conn, mockM, { query: "xyzabc123" }); } catch (e) { errNone = e.message; }
t("5b. gak nemu video → error jelas (bukan crash)", /gak nemu video/i.test(errNone), errNone);

// ═══ 6. registrasi di prompt think() ═══
w("\n— registrasi tool —");
const { buildThinkSystemPrompt } = await import("../../src/lib/aiagent.js");
const sys = buildThinkSystemPrompt({ mcpTools: [] });
t("6a. searchyt masuk daftar tools prompt think()", sys.includes("searchyt"));

_resetSearchytDepsForTest();
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
