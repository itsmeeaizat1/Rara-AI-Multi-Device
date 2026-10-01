// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// test/kyio-e2e/e2e.mjs — E2E KyioAPI (api.kyio.web.id, 330 endpoint, 329 cmd .kyio*).
// Semua akses HTTP lewat seam _setKyioHttpForTest — gak ada network di e2e.
// Jalankan: node test/kyio-e2e/e2e.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(import.meta.dirname, "../..");
let pass = 0, fail = 0;
const t = (name, ok, extra = "") => {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} → ${typeof extra === "string" ? extra.slice(0, 200) : JSON.stringify(extra)?.slice(0, 200)}`); }
};
// decoder smallcaps → huruf normal (output raraWrap dikecilin semua)
const SC_MAP = { "ᴀ": "a", "ʙ": "b", "ᴄ": "c", "ᴅ": "d", "ᴇ": "e", "ꜰ": "f", "ɢ": "g", "ʜ": "h", "ɪ": "i", "ᴊ": "j", "ᴋ": "k", "ʟ": "l", "ᴍ": "m", "ɴ": "n", "ᴏ": "o", "ᴘ": "p", "ǫ": "q", "ʀ": "r", "ꜱ": "s", "ᴛ": "t", "ᴜ": "u", "ᴠ": "v", "ᴡ": "w", "ʏ": "y", "ᴢ": "z" };
const fromSC = (s) => String(s).toLowerCase().replace(/[\u{1D00}-\u{1DBF}]/gu, (ch) => SC_MAP[ch] || ch).replace(/\u{A730}-\u{A73F}/gu, (ch) => SC_MAP[ch] || ch);

// ── init db ringan (sebagian lib butuh) ──
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "kyio-e2e-"));
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/lib/rara-kyio.js");
const { toSC } = await import(R + "/src/lib/rara-menu-style.js");
// cek smallcaps: encode expected pakai toSC (glyph sama persis renderer)
const hasSC = (reply, expected) => String(reply).toLowerCase().includes(toSC(expected));
const {
  kyioHumanizeError, kyioRenderResult, kyioFindMediaUrl, runKyioTable,
  _setKyioHttpForTest, _setKyioUploadForTest, _setKyioMediaHttpForTest, _resetKyioSeamsForTest,
} = lib;

// ── mock sock + m ──
function mkSock(sent = []) {
  return {
    sendMessage: async (jid, payload, opts) => {
      sent.push({ jid, payload });
      return { key: { id: "m1" } };
    },
  };
}
function mkM(over = {}) {
  return {
    command: "kyiodeepseek",
    args: [],
    text: "",
    chat: "62812user@s.whatsapp.net",
    sender: "62812user@s.whatsapp.net",
    reply: async (x) => { mkM._replies.push(String(x)); },
    ...over,
  };
}
mkM._replies = [];
const lastReply = () => (mkM._replies.length ? mkM._replies[mkM._replies.length - 1] : "");

console.log("— 1. lib dasar —");

// 1a. humanize 403 premium
{
  const msg = kyioHumanizeError(403, { error: { code: "IP_NOT_WHITELISTED", message: "Batas 3 kali percobaan gratis untuk endpoint premium telah habis. Upgrade ke plan berbayar" } });
  t("1a. 403 premium → pesan upgrade + setkey kyio", /premium/i.test(msg) && /setkey kyio/i.test(msg), msg);
}
// 1b. humanize 429
{
  const msg = kyioHumanizeError(429, {});
  t("1b. 429 → rate limit free tier", /rate limit/i.test(msg), msg);
}
// 1c. humanize 400 missing param
{
  const msg = kyioHumanizeError(400, { error: { code: "MISSING_PARAMETER", message: "Parameter 'q' is required." } });
  t("1c. 400 → pesan param kurang dari API", /q.*is required/i.test(msg), msg);
}
// 1d. humanize 500
{
  const msg = kyioHumanizeError(502, {});
  t("1d. 5xx → server error", /server kyio error/i.test(msg), msg);
}
// 1e. render string
t("1e. render result string", kyioRenderResult({ status: true, result: "halo dunia" }) === "halo dunia");
// 1f. render field answer (AI)
{
  const out = kyioRenderResult({ status: true, result: { answer: "Jawaban AI", reasoning: "karena begini" } });
  t("1f. render answer + reasoning", /jawaban ai/i.test(out) && /karena begini/i.test(out), out);
}
// 1g. render object dump
{
  const out = kyioRenderResult({ status: true, result: { nama: "Frieren", level: 99 } });
  t("1g. render object key:value", /nama/i.test(out) && /frieren/i.test(out), out);
}
// 1h. render array cap 12
{
  const out = kyioRenderResult({ status: true, result: Array.from({ length: 20 }, (_, i) => `item ${i + 1}`) });
  t("1h. render array + sisa diringkas", /item 1/i.test(out) && /\+8 lainnya|… \+8/i.test(out), out);
}
// 1i. findMediaUrl prioritas video
{
  const url = kyioFindMediaUrl({ thumb: "https://x/pic.jpg", url: "https://x/video.mp4", audio: "https://x/song.mp3" });
  t("1i. findMediaUrl → video duluan", url === "https://x/video.mp4", url);
}
// 1j. findMediaUrl nested
{
  const url = kyioFindMediaUrl({ data: { media: [{ link: "https://x/lagu.mp3" }] } });
  t("1j. findMediaUrl nested array", url === "https://x/lagu.mp3", url);
}
// 1k. findMediaUrl gak ada → null
t("1k. findMediaUrl null kalau gak ada media", kyioFindMediaUrl({ a: "teks biasa", b: 1 }) === null);

console.log("— 2. registry 13 plugin (329 cmd .kyio*) —");
const PLUGIN_FILES = [
  ["kyioai", "plugins/ai/kyioai.js"],
  ["kyiodl", "plugins/download/kyiodl.js"],
  ["kyiotools", "plugins/tools/kyiotools.js"],
  ["kyiosearch", "plugins/search/kyiosearch.js"],
  ["kyioimage", "plugins/maker/kyioimage.js"],
  ["kyionews", "plugins/berita/kyionews.js"],
  ["kyioislamic", "plugins/islami/kyioislamic.js"],
  ["kyiomaker", "plugins/maker/kyiomaker.js"],
  ["kyiofun", "plugins/fun/kyiofun.js"],
  ["kyiogames", "plugins/game/kyiogames.js"],
  ["kyioinfo", "plugins/search/kyioinfo.js"],
  ["kyiomovie", "plugins/anime/kyiomovie.js"],
  ["kyiotts", "plugins/tts/kyiotts.js"],
];
const allCmds = new Set();
const allPaths = new Set();
let nTotal = 0;
for (const [name, f] of PLUGIN_FILES) {
  const plug = await import(R + "/" + f);
  const table = plug.TABLE;
  const cfg = plug.pluginConfig;
  t(`2. ${name}: config + TABLE ada`, Array.isArray(table) && table.length > 0 && cfg?.name === name);
  t(`2. ${name}: alias = name + semua cmd`, cfg.alias.includes(name) && table.every(e => cfg.alias.includes(e.cmd)), "");
  for (const e of table) {
    nTotal++;
    allCmds.add(e.cmd);
    allPaths.add(e.path);
    if (!e.cmd.startsWith("kyio")) t(`2. cmd tanpa prefix: ${e.cmd}`, false);
    if (!e.path.startsWith("/api/v2/")) t(`2. path aneh: ${e.path}`, false);
    if (!["q", "text", "url", "uid", "type", "none", "voice-text"].includes(e.param)) t(`2. param gak dikenal: ${e.cmd} ${e.param}`, false);
    if (!e.hint || !e.hint.startsWith("." + e.cmd)) t(`2. hint gak nyambung: ${e.cmd}`, false);
  }
}
t("2. total cmd = 329 (330 docs - 1 path dobel)", nTotal === 329, nTotal);
t("2. semua cmd unik", allCmds.size === nTotal, `${allCmds.size} vs ${nTotal}`);
t("2. semua path unik", allPaths.size === nTotal, `${allPaths.size} vs ${nTotal}`);
t("2. contoh owner: .kyiodeepseek terdaftar", allCmds.has("kyiodeepseek") && allCmds.has("kyiogemini") && allCmds.has("kyiogpt5"));

console.log("— 3. handler happy path (seam http) —");
{
  _resetKyioSeamsForTest();
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (method, p, params) => {
    calls.push({ method, p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { answer: "Halo, saya baik" } })) };
  });
  const plug = await import(R + "/plugins/ai/kyioai.js");
  await plug.handler(mkM({ command: "kyiodeepseek", text: "halo apa kabar" }), { sock: mkSock(sent), db: {} });
  t("3a. AI: params q ke endpoint deepseek", calls[0]?.p === "/api/v2/deepseek" && calls[0]?.params?.q === "halo apa kabar", calls[0]);
  t("3a. AI: jawaban dirender ke reply", hasSC(lastReply(), "halo, saya baik"), lastReply().slice(0, 100));
}
{
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (method, p, params) => {
    calls.push({ method, p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { title: "Video T", url: "https://x.com/v/video.mp4" } })) };
  });
  _setKyioMediaHttpForTest(async (url) => ({ status: 200, headers: { "content-type": "video/mp4" }, data: Buffer.from("0".repeat(2048)) }));
  const plug = await import(R + "/plugins/download/kyiodl.js");
  await plug.handler(mkM({ command: "kyiotiktok", text: "https://tiktok.com/x" }), { sock: mkSock(sent), db: {} });
  t("3b. downloader: params url", calls[0]?.params?.url === "https://tiktok.com/x", calls[0]);
  t("3b. downloader: media url difetch + video dikirim", sent[0]?.payload?.video != null, sent[0]?.payload);
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 200, headers: { "content-type": "audio/mpeg" }, data: Buffer.from("0".repeat(2048)) }));
  const plug = await import(R + "/plugins/tts/kyiotts.js");
  await plug.handler(mkM({ command: "kyioedgetts", text: "id-ID-ArdiNeural|halo dunia" }), { sock: mkSock(sent), db: {} });
  t("3c. tts: voice|text → audio ptt false dikirim", sent[0]?.payload?.audio != null && sent[0]?.payload?.ptt === false, sent[0]?.payload);
}
{
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (method, p, params) => {
    calls.push({ p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { teks: "hasil tts url" } })) };
  });
  const plug = await import(R + "/plugins/tts/kyiotts.js");
  await plug.handler(mkM({ command: "kyiogoogletts", text: "halo saja" }), { sock: mkSock(sent), db: {} });
  t("3d. tts tanpa voice → params.text", calls[0]?.params?.text === "halo saja", calls[0]);
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 200, headers: { "content-type": "image/png" }, data: Buffer.from("0".repeat(2048)) }));
  const plug = await import(R + "/plugins/maker/kyiomaker.js");
  await plug.handler(mkM({ command: "kyiobrat", text: "teks brat" }), { sock: mkSock(sent), db: {} });
  t("3e. maker brat: binary png → image", sent[0]?.payload?.image != null, sent[0]?.payload);
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: [{ title: "Berita 1", link: "https://x.com/b1" }, { title: "Berita 2", link: "https://x.com/b2" }] })) }));
  const plug = await import(R + "/plugins/berita/kyionews.js");
  await plug.handler(mkM({ command: "kyiocnn" }), { sock: mkSock(sent), db: {} });
  t("3f. news none-param: jalan tanpa args + list dirender", hasSC(lastReply(), "berita 1"), lastReply().slice(0, 100));
}
{
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (m, p, params) => {
    calls.push({ m, p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { url: "https://kyio.web.id/img.png" } })) };
  });
  _setKyioMediaHttpForTest(async () => ({ status: 200, headers: { "content-type": "image/png" }, data: Buffer.from("0".repeat(2048)) }));
  const plug = await import(R + "/plugins/maker/kyioimage.js");
  const quoted = {
    mtype: "imageMessage",
    download: async () => Buffer.from("fakeimg"),
  };
  _setKyioUploadForTest(async (buf) => "https://up.example/img.png");
  await plug.handler(mkM({ command: "kyiotoghibli", text: "", quoted }), { sock: mkSock(sent), db: {} });
  t("3g. reply foto → upload url → params.url (toghibli)", calls[0]?.params?.url === "https://up.example/img.png", calls[0]);
  t("3g. hasil ghibli dikirim image", sent[0]?.payload?.image != null || sent.some(s => s.payload?.image), sent[0]?.payload);
}
{
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (m, p, params) => {
    calls.push({ m, p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { info: "genshin uid 123" } })) };
  });
  const plug = await import(R + "/plugins/game/kyiogames.js");
  await plug.handler(mkM({ command: "kyiogenshin", text: "123456789" }), { sock: mkSock(sent), db: {} });
  t("3h. games genshin: params uid", calls[0]?.params?.uid === "123456789", calls[0]);
}
{
  mkM._replies.length = 0;
  const sent = [];
  const calls = [];
  _setKyioHttpForTest(async (m, p, params) => {
    calls.push({ m, p, params });
    return { status: 200, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ status: true, result: { jadwal: "Subuh 04.30" } })) };
  });
  const plug = await import(R + "/plugins/islami/kyioislamic.js");
  await plug.handler(mkM({ command: "kyiojadwalsholat", text: "Jakarta" }), { sock: mkSock(sent), db: {} });
  t("3i. islamic jadwal sholat: params q", calls[0]?.params?.q === "jakarta" || calls[0]?.params?.q === "Jakarta", calls[0]);
}

console.log("— 4. handler sad path —");
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 403, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ error: { code: "IP_NOT_WHITELISTED", message: "Batas 3 kali percobaan gratis untuk endpoint premium telah habis. Upgrade ke plan berbayar" } })) }));
  const plug = await import(R + "/plugins/maker/kyioimage.js");
  await plug.handler(mkM({ command: "kyiotext2img", text: "kucing" }), { sock: mkSock(sent), db: {} });
  t("4a. premium 403 → pesan upgrade jelas", hasSC(lastReply(), "premium") && hasSC(lastReply(), "setkey kyio"), lastReply().slice(0, 120));
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 429, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ error: { message: "Too many requests" } })) }));
  const plug = await import(R + "/plugins/search/kyiosearch.js");
  await plug.handler(mkM({ command: "kyiogoogle", text: "test" }), { sock: mkSock(sent), db: {} });
  t("4b. 429 → pesan rate limit", hasSC(lastReply(), "rate limit kyio kena"), lastReply().slice(0, 120));
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 400, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ error: { code: "MISSING_PARAMETER", message: "Parameter 'q' is required." } })) }));
  const plug = await import(R + "/plugins/search/kyiosearch.js");
  await plug.handler(mkM({ command: "kyiowikipedia", text: "" }), { sock: mkSock(sent), db: {} });
  t("4c. args kosong → panduan hint command", hasSC(lastReply(), ".kyiowikipedia <topik>"), lastReply().slice(0, 120));
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => { throw new Error("network down"); });
  const plug = await import(R + "/plugins/ai/kyioai.js");
  await plug.handler(mkM({ command: "kyiodeepseek", text: "halo" }), { sock: mkSock(sent), db: {} });
  t("4d. koneksi gagal → pesan gagal jujur", hasSC(lastReply(), "gagal nyambung ke kyio"), lastReply().slice(0, 120));
}
{
  mkM._replies.length = 0;
  const sent = [];
  _setKyioHttpForTest(async () => ({ status: 500, headers: { "content-type": "application/json" }, data: Buffer.from(JSON.stringify({ error: { message: "PLUGIN_ERROR upstream mati" } })) }));
  const plug = await import(R + "/plugins/download/kyiodl.js");
  await plug.handler(mkM({ command: "kyiotiktok", text: "https://tiktok.com/x" }), { sock: mkSock(sent), db: {} });
  t("4e. 500 → server error jujur", hasSC(lastReply(), "server kyio error"), lastReply().slice(0, 120));
}

console.log("— 5. dashboard .kyio —");
{
  mkM._replies.length = 0;
  const sent = [];
  const plug = await import(R + "/plugins/tools/kyiotools.js");
  await plug.handler(mkM({ command: "kyio" }), { sock: mkSock(sent), db: {} });
  const r = fromSC(lastReply());
  t("5a. dashboard: 330 endpoint + 13 kategori", /330 endpoint/i.test(r) && /ai \(69\)/i.test(r) && /tools \(72\)/i.test(r) && /tts \(4\)/i.test(r), lastReply().slice(0, 150));
  t("5b. dashboard: kasih tahu free tier tanpa key", /free tier/i.test(r) && /setkey kyio/i.test(r));
}

_resetKyioSeamsForTest();
console.log(`\n══════ ${pass} PASS, ${fail} FAIL ══════`);
process.exit(fail > 0 ? 1 : 0);
