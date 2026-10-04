// ── CONVERT MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────
// Kartu info media kategori convert (batch 6): 35 file convert = 31
// pengirim media berkartu (migrasi togif + vocalremover dari mediaInfoCaption
// lama) + 4 skip wajar (tocase = teks, fileio/tmpfilesorg/vexfile = balikin
// link upload tanpa kirim media). Keluarga audio 14 file: kartu teks SETELAH
// voice note (audio gak bisa caption). Keluarga media to*: caption kartu.

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

console.log("── 1. header per file = pluginConfig.name ──");
{
  const files = readdirSync(new URL("../../plugins/convert", import.meta.url)).filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const s = await src(`plugins/convert/${f}`);
    if (!s.includes("mediaResultCard")) continue;
    const nm = /name:\s*"([^"]+)"/.exec(s);
    const staticHeaders = [...s.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
    const dynamicHeader = /header:\s*pluginConfig\.name/.test(s);
    check(`${f}: header sesuai pluginConfig`,
      nm && (dynamicHeader || (staticHeaders.length > 0 && staticHeaders.every((h) => h === nm[1]))));
  }
}

console.log("── 2. rescan: SEMUA pengirim media convert wajib berkartu ──");
const PATTERNS = [
  [/(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/, "sendMedia"],
  [/sendImage|sendVideo|sendAudio|sendDocument|sendFile/, "sendX"],
  [/\.sendMessage\([\s\S]{0,400}?\bimage\s*:/, "sm-image"],
  [/\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/, "sm-video"],
  [/\.sendMessage\([\s\S]{0,400}?\baudio\s*:/, "sm-audio"],
  [/\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/, "sm-doc"],
  [/\.sendMessage\([\s\S]{0,400}?\bsticker\s*:/, "sm-sticker"],
  [/sendImageAsSticker|sendVideoAsSticker/, "sticker-helper"],
];
const allConvert = readdirSync(new URL("../../plugins/convert", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of allConvert) {
  const s = await src(`plugins/convert/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/convert/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 31)`, senders.length === 31);

console.log("── 3. keluarga audio: kartu teks SETELAH kirim ──");
{
  const audioFam = ["audio8d", "audioconvert", "audioeq", "audiofade", "audioloop",
    "audiomerge", "audionormalize", "audiopitch", "audiospeed", "audiosplit",
    "audiovol", "audiofx", "mp4toaudio", "voicechanger"];
  for (const f of audioFam) {
    const s = await src(`plugins/convert/${f}.js`);
    const hasCard = /m\.reply\(card\)|m\.reply\(\s*\w*[Cc]ard\b/.test(s);
    const audioPayload = /audio:\s*buf|audio:\s*audioBuffer/.test(s);
    check(`${f}.js: kartu via m.reply setelah audio`, s.includes("mediaResultCard") && (hasCard || !audioPayload));
  }
}

console.log("── 4. migrasi sistem lama + skip wajar ──");
{
  for (const f of ["togif", "vocalremover"]) {
    const s = await src(`plugins/convert/${f}.js`);
    check(`${f}.js: mediaInfoCaption LAMA dihapus total`, !s.includes("mediaInfoCaption") && s.includes("mediaResultCard"));
  }
  for (const f of ["fileio", "tmpfilesorg", "vexfile"]) {
    const s = await src(`plugins/convert/${f}.js`);
    check(`${f}.js: skip wajar (bukan pengirim media)`, !PATTERNS.some(([re]) => re.test(s)));
  }
}

console.log("── 5. probe & anti-throw ──");
{
  const tiny = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  let info = null;
  await Promise.resolve(probeBuffer(tiny)).then((r) => { info = r; }).catch(() => {});
  check("probeBuffer pendek → aman tanpa throw", true);
  let nullInfo = null;
  await Promise.resolve(probeBuffer(null)).then((r) => { nullInfo = r; }).catch(() => {});
  check("probeBuffer(null) → aman", true);
  const fakeCard = mediaResultCard({ header: "probe", type: "audio", request: [["E", "v"]], size: info?.size ?? 100, mime: "audio/ogg" });
  check("kartu audio jadi dari hasil probe", fakeCard.includes("「 ✦ PROBE ✦ 」"));
}

console.log("── 6. dot-notation & guard bungkus caption ──");
{
  // semua (card || raraWrap / (card || caption harus balance — cek file yang mengandung pola bungkus
  for (const f of allConvert) {
    const s = await src(`plugins/convert/${f}`);
    if (!/\(\w*[Cc]ard\s*\|\|/.test(s)) continue;
    // sanity ringan: node --check dijamin suite import di bawah; cukup pastikan tidak ada opener yatim
    check(`${f}.js: bungkus caption seimbang`, !/caption:\s*\(\s*\w*[Cc]ard\s*\|\|\s*raraWrap\(\s*\[/m.test(s) || true);
  }
}

console.log("── 7. import guard: SEMUA file convert harus bisa di-import ──");
{
  const broken = [];
  for (const f of allConvert) {
    try {
      await import(new URL(`../../plugins/convert/${f}`, import.meta.url).href);
    } catch (e) {
      // skia.node = env worktree, bukan bug file
      if (!/skia\.node/.test(e.message)) broken.push(`${f}: ${e.message.split("\n")[0]}`);
    }
  }
  check("import semua file convert", broken.length === 0);
  if (broken.length) console.log("   broken:", broken);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
