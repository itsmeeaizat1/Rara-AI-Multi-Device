// E2E SEARCH YOUTUBE AGENT (fix owner 14 Sep 2026: ".novaagent cairkan bot
// alya md ini di youtube" hasil pencarian beda/nyasar — request YouTube gak
// pernah ke-detect di mana pun: localParse gak punya pola 'cari video',
// needsWebSearch cuma nangkep kata berita/viral/terbaru → jatuh ke think()
// AI yang milih tool salah / jawab dari halusinasi. FIX: (1) tool searchyt
// — cari video YouTube via yt-search + kirim KARTU INFO (judul/channel/
// durasi/views/deskripsi/link video lain) + VIDEO SAMPEL hasil unduhan
// (rantai nova-ytdlp → IkyyXD ytmp4 → ytdl.js, konversi H.264+AAC 480p);
// (2) localParse deteksi lokal 'carikan/cairkan/putar/nonton X di youtube/
// yt/video' — instan, gak lewat AI classification. (3) Request owner 14 Sep
// "jgn pakai kecerdasan ai, agent mencari pakai browser beneran": jalur
// BROWSER BENERAN (nova-yt-browser.js chromium) duluan → fallback yt-search
// kalau chromium gak ada. Keduanya hasil ASLI YouTube, bukan AI. Semua dep
// di-inject (offline).
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

// ═══ 1. localParse — deteksi lokal request YouTube ═══
w("\n— localParse: deteksi YouTube —");
const cek = (txt, wantQuery) => {
  const r = localParse(txt);
  t("  " + txt, r?.tool === "searchyt" && r?.args?.query === wantQuery,
    "→ " + JSON.stringify(r));
};
cek("cairkan bot alya md ini di youtube", "bot alya md");
cek("carikan video tutorial dpixel di youtube", "tutorial dpixel");
cek("cari video bot alya md", "bot alya md");
cek("putar video kucing lucu", "kucing lucu");
cek("tontonin video anya md bot", "anya md bot");
cek("nonton video lucu di yt", "lucu");
cek("playin video mancing di youtube", "mancing");
cek("lihatkan video dpixel", "dpixel");
cek("cari video bot wa alya md di yt", "bot wa alya md");

// gak boleh nyangkut: jalur lain tetep jalan
t("  'carikan berita terbaru prabowo' → BUKAN searchyt (jalur websearch)",
  localParse("carikan berita terbaru prabowo")?.tool !== "searchyt");
t("  'buatkan gambar kucing astronot' → tetep genimage",
  localParse("buatkan gambar kucing astronot")?.tool === "genimage");
t("  'tutup grup' → tetep closegc",
  localParse("tutup grup")?.tool === "closegc");

// ═══ 1b. BROWSER BENERAN duluan (request owner: cari pakai browser asli) ═══
w("\n— tool searchyt: browser beneran —");
const BROWSER_VIDEOS = [
  { title: "Browser Result: Cairkan Alya MD", author: { name: "Via Chromium" },
    duration: { timestamp: "10:10" }, views: 1200000, ago: "2 hari lalu",
    description: "hasil ekstraksi DOM youtube dari chromium headless",
    url: "https://youtube.com/watch?v=brow1" },
  { title: "Browser Result 2", author: { name: "Ch 2" }, duration: { timestamp: "3:03" },
    views: 500, ago: "5 jam lalu", description: "", url: "https://youtube.com/watch?v=brow2" },
];
// browser sukses → HARUS pakai hasil browser (via: browser)
sent.length = 0;
_setSearchytDepsForTest({
  browserSearch: async (q, opts) => [...BROWSER_VIDEOS],
  yts: async () => { throw new Error("JANGAN KEPAKE"); },
  downloadVideoYtDlp: async (url) => ({ buffer: Buffer.alloc(20000, 7), title: "x" }),
  toWhatsAppVideo: async (b) => b,
});
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const brCard = sent.find(x => x.text);
t("1ba. hasil dari BROWSER dipakai (judul browser ada)", !!brCard?.text?.includes("Browser Result: Cairkan Alya MD"), brCard?.text?.slice(0, 120));
t("1bb. kartu nunjukin 'via: browser beneran'", !!brCard?.text?.includes("browser beneran (chromium)"), brCard?.text?.slice(0, 160));
t("1bc. yt-search fallback GAK kepake (browser duluan)", !brCard?.text?.includes("youtube engine"));
t("1bd. views 1,2 jt ke-format dari hasil browser", brCard?.text?.includes("1.2 jt penonton"), brCard?.text?.slice(0, 250));
t("1be. video sampel kekirim dari hasil browser", !!sent.find(x => x.video)?.caption?.includes("brow1"));

// browser mati/chromium gak ada → fallback yt-search (tetap hasil ASLI, bukan AI)
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("chromium missing libnss3"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async (url, quality) => {
    if (url === VIDEOS[0].url) return { buffer: Buffer.alloc(50000, 1), title: VIDEOS[0].title };
    throw new Error("404");
  },
  toWhatsAppVideo: async (buf) => buf,
});

// ═══ 2. tool searchyt — happy path: kartu info + video sampel ═══
w("\n— tool searchyt: sukses (fallback yt-search setelah browser down) —");
const VIDEOS = [
  { title: "Cara Cairkan Bot Alya MD — Deploy WhatsApp Bot", author: { name: "Alya MD Official" },
    duration: { timestamp: "12:34" }, views: 15400, ago: "3 minggu lalu",
    description: "Tutorial lengkap cara install dan cairkan bot Alya MD Multi Device. Download script di deskripsi ya guys!",
    url: "https://youtube.com/watch?v=alya1" },
  { title: "Setting Bot Alya MD Biar Aktif 24 Jam", author: { name: "WA Bot Indo" },
    duration: { timestamp: "8:11" }, views: 2300, ago: "1 bulan lalu", description: "",
    url: "https://youtube.com/watch?v=alya2" },
  { title: "Review Script Alya MD WhatsApp Bot", author: { name: "Script Hunter" },
    duration: { timestamp: "15:02" }, views: 989, ago: "2 bulan lalu", description: "",
    url: "https://youtube.com/watch?v=alya3" },
];
_setSearchytDepsForTest({
  yts: async (q) => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async (url, quality) => {
    if (url === VIDEOS[0].url && quality === "480") return { buffer: Buffer.alloc(50000, 1), title: VIDEOS[0].title };
    throw new Error("404");
  },
  toWhatsAppVideo: async (buf) => buf,
});

sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const infoCard = sent.find((x) => x.text);
const videoMsg = sent.find((x) => x.video);
t("2a. kartu info teks kekirim", !!infoCard);
t("2a2. kartu nunjukin fallback 'youtube engine' (browser down)", !!infoCard?.text?.includes("youtube engine"), infoCard?.text?.slice(0, 160));
t("2b. kartu ada judul video #1", !!infoCard?.text?.includes(VIDEOS[0].title), infoCard?.text?.slice(0, 120));
t("2c. kartu ada channel + durasi + views", !!infoCard?.text?.includes("Alya MD Official") && infoCard.text.includes("12:34") && infoCard.text.includes("15.4 rb penonton"), infoCard?.text?.slice(0, 200));
t("2d. kartu ada deskripsi (isi info)", !!infoCard?.text?.includes("Tutorial lengkap cara install"), infoCard?.text?.slice(0, 300));
t("2e. kartu ada link video lain (hasil #2 #3)", !!infoCard?.text?.includes("alya2") && infoCard.text.includes("alya3"));
t("2f. VIDEO SAMPEL kekirim (buffer unduhan)", !!videoMsg && videoMsg.video?.length === 50000);
t("2g. caption video ada judul + link", !!videoMsg?.caption?.includes(VIDEOS[0].title) && videoMsg.caption.includes("alya1"));

// ═══ 3. fallback unduhan: nova-ytdlp mati → IkyyXD → ytdl.js ═══
w("\n— tool searchyt: fallback rantai unduhan —");
_setSearchytDepsForTest({
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async (url, opts) => {
    if (opts?.responseType === "arraybuffer") return { data: Buffer.alloc(40000, 2) };
    return { data: { status: true, result: { VideoUrl: { url: "https://dl.example/v.mp4" }, title: "x" } } };
  },
  toWhatsAppVideo: async (buf) => buf,
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const videoMsg2 = sent.find((x) => x.video);
t("3a. nova-ytdlp mati → IkyyXD ytmp4 dapet buffer", !!videoMsg2 && videoMsg2.video?.length === 40000);

// kedua-duanya mati → ytdl.js
_setSearchytDepsForTest({
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async () => { throw new Error("down"); },
  ytdlFn: async (url, type) => ({ status: true, dl: "https://dl.example/y.mp4", title: "y" }),
  httpGet: async () => ({ data: Buffer.alloc(30000, 3) }),
  toWhatsAppVideo: async (buf) => buf,
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const videoMsg3 = sent.find((x) => x.video);
t("3b. dua engine mati → ytdl.js dapet buffer", !!videoMsg3 && videoMsg3.video?.length === 30000);

// ═══ 4. SEMUA jalur unduhan mati → kartu info tetap keluar + pesan jujur ═══
w("\n— tool searchyt: unduh kandas —");
_setSearchytDepsForTest({
  yts: async () => ({ videos: [...VIDEOS] }),
  downloadVideoYtDlp: async () => { throw new Error("down"); },
  ikyyGet: async () => { throw new Error("down"); },
  ytdlFn: async () => { throw new Error("down"); },
});
sent.length = 0;
await TOOLS.searchyt.run(conn, mockM, { query: "bot alya md" });
const infoCard2 = sent.find((x) => x.text);
const failNotice = sent.filter((x) => /gagal diunduh/i.test(x?.text || ""));
t("4a. kartu info TETAP kekirim walau unduh mati", !!infoCard2);
t("4b. pesan jujur 'video sampel gagal diunduh' + hint .playvideo", failNotice.length >= 1 && failNotice[0].text.includes(".playvideo"), failNotice[0]?.text?.slice(0, 120));

// ═══ 5. edge case ═══
w("\n— edge case —");
// query kosong → throw (bukan crash senyap)
let errEmpty = "";
try { await TOOLS.searchyt.run(conn, mockM, { query: "" }); } catch (e) { errEmpty = e.message; }
t("5a. query kosong → error jelas", /mau cari video apa/i.test(errEmpty), errEmpty);

// hasil pencarian kosong → error jelas
_setSearchytDepsForTest({ yts: async () => ({ videos: [] }) });
let errNone = "";
try { await TOOLS.searchyt.run(conn, mockM, { query: "xyzabc123" }); } catch (e) { errNone = e.message; }
t("5b. gak nemu video → error jelas (bukan crash)", /gak nemu video/i.test(errNone), errNone);

// ═══ 6. TOOL terdaftar di prompt think() (AI bisa milih utk frasa lain) ═══
w("\n— registrasi tool —");
const { buildThinkSystemPrompt } = await import("../../src/lib/aiagent.js");
const sys = buildThinkSystemPrompt({ mcpTools: [] });
t("6a. searchyt masuk daftar tools prompt think()", sys.includes("searchyt"));

_resetSearchytDepsForTest();
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
