// ── DOWNLOAD MEDIA INFO E2E (4 Okt 2026) ────────────────────────────────────
// Kartu info media kategori download (batch 7): 61 file = 56 pengirim media
// berkartu (rescan 0 bocor) + 5 skip wajar teks-only (an1, googlesearch,
// happymod, kyiodl, threaddl). Pola: video/gambar → caption kartu; audio →
// kartu teks SETELAH voice note; dokumen (aio2/aio2dl/ytmp4 >16MB/
// dailymotion) → caption document; helper lokal dipatch sekali (zeldl,
// alldownloader, alldownloaderv3, alldownloaderv4); multi-foto → kartu
// ringkasan (douyindl, tiktokv3 photos).

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import assert from "node:assert/strict";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, probeBuffer, probeMedia } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

console.log("── 1. rescan: SEMUA pengirim media download wajib berkartu ──");
const PATTERNS = [
  [/(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/, "sendMedia"],
  [/sendImage|sendVideo|sendAudio|sendDocument|sendFile/, "sendX"],
  [/\.sendMessage\([\s\S]{0,400}?\bimage\s*:/, "sm-image"],
  [/\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/, "sm-video"],
  [/\.sendMessage\([\s\S]{0,400}?\baudio\s*:/, "sm-audio"],
  [/\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/, "sm-doc"],
];
const allDl = readdirSync(new URL("../../plugins/download", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of allDl) {
  const s = await src(`plugins/download/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/download/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 56)`, senders.length === 56);

console.log("── 2. skip wajar: 5 file teks-only bukan sender ──");
for (const f of ["an1.js", "googlesearch.js", "happymod.js", "kyiodl.js", "threaddl.js"]) {
  const s = await src(`plugins/download/${f}`);
  check(`${f}: skip wajar (bukan pengirim media)`, !PATTERNS.some(([re]) => re.test(s)));
}

console.log("── 3. header dinamis pluginConfig.name ──");
{
  const files = senders.filter((f) => !["zeldl.js", "alldownloader.js", "alldownloaderv3.js", "alldownloaderv4.js"].includes(f));
  for (const f of files) {
    const s = await src(`plugins/download/${f}`);
    const nm = /name:\s*['"]([^'"]+)['"]/.exec(s) || /name:\s*\[\s*['"]([^'"]+)['"]/.exec(s);
    // header dinamis diterima: pluginConfig.name / command per sub-perintah (mega-plugin)
    const dynamic = /header:\s*(Array\.isArray\(pluginConfig\.name\)|pluginConfig\.name|command)/.test(s);
    const staticHeaders = [...s.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
    check(`${f}: header sesuai pluginConfig`, dynamic || (nm && staticHeaders.length > 0 && staticHeaders.every((h) => h === nm[1])));
  }
}

console.log("── 4. keluarga audio: kartu teks SETELAH kirim ──");
{
  for (const f of ["ytmp3.js", "ytmp3v3.js", "ttmp3.js", "applemusicdl.js", "aio.js", "alldl.js", "downloader.js"]) {
    const s = await src(`plugins/download/${f}`);
    check(`${f}: kartu audio via m.reply setelah send`, /m\.reply\((?:\w+Card|sendCard|ytAudCard|aioCard|itemCard|musCard|fCard|uCard|aCard|c)\)/.test(s) || /kartu teks setelah audio/.test(s));
  }
}

console.log("── 5. helper lokal dipatch sekali ──");
{
  for (const f of ["zeldl.js", "alldownloaderv3.js", "alldownloaderv4.js"]) {
    const s = await src(`plugins/download/${f}`);
    const fn = /async function sendMedia/.exec(s);
    const cardInHelper = fn && s.slice(fn.index, fn.index + 2500).includes("dlCard");
    check(`${f}: helper sendMedia lokal berkartu`, !!cardInHelper);
  }
  const s = await src("plugins/download/alldownloader.js");
  check("alldownloader.js: helper sendMedia lokal berkartu", /const card = await dlCard/.test(s));
}

console.log("── 6. multi-foto: kartu ringkasan ──");
{
  const s = await src("plugins/download/douyindl.js");
  check("douyindl.js: ringkasan foto (Jumlah foto)", s.includes("Jumlah foto"));
  const t = await src("plugins/download/tiktokv3.js");
  check("tiktokv3.js: ringkasan foto (Jumlah foto)", t.includes("Jumlah foto"));
}

console.log("── 7. probe & anti-throw ──");
{
  let ok = true;
  try { await probeBuffer(Buffer.from([1, 2, 3])); } catch { ok = false; }
  check("probeBuffer pendek aman", ok);
  let ok2 = true;
  try { await probeBuffer(null); } catch { ok2 = false; }
  check("probeBuffer(null) aman", ok2);
  const card = mediaResultCard({ header: "probe", type: "video", request: [["Judul", "tes"]], size: 1024, mime: "video/mp4", width: 1280, height: 720 });
  check("kartu video jadi", card.includes("「 ✦ PROBE ✦ 」"));
}

console.log("── 8. import guard: SEMUA file download harus bisa di-import ──");
{
  const broken = [];
  for (const f of allDl) {
    try {
      await import(new URL(`../../plugins/download/${f}`, import.meta.url).href);
    } catch (e) {
      if (!/skia\.node/.test(e.message)) broken.push(`${f}: ${e.message.split("\n")[0]}`);
    }
  }
  check("import semua file download", broken.length === 0);
  if (broken.length) console.log("   broken:", broken);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
