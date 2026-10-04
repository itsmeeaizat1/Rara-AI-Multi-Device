// ── SEARCH MEDIA INFO E2E (4 Okt 2026) ──────────────────────────────────────
// Kartu info media kategori search (batch 8): 72 file = 34 pengirim media
// berkartu (rescan 0 bocor) + 38 skip wajar teks-only. Pola: audio (keluarga
// play/soundcloud/spotify) → kartu teks SETELAH voice note; video/gambar →
// caption kartu; dokumen (apkmod-get/android1-get/nerdfont) → caption
// document; multi-gambar hasil search → ringkasan sekali.

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

const PATTERNS = [
  [/(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/, "sendMedia"],
  [/sendImage|sendVideo|sendAudio|sendDocument|sendFile/, "sendX"],
  [/\.sendMessage\([\s\S]{0,400}?\bimage\s*:/, "sm-image"],
  [/\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/, "sm-video"],
  [/\.sendMessage\([\s\S]{0,400}?\baudio\s*:/, "sm-audio"],
  [/\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/, "sm-doc"],
];

console.log("── 1. rescan: SEMUA pengirim media search wajib berkartu ──");
const all = readdirSync(new URL("../../plugins/search", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/search/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/search/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 34)`, senders.length === 34);

console.log("── 2. skip wajar: 38 file teks-only bukan sender ──");
const skipOk = ["android1", "anilist", "apkmod", "applemusic", "bingimage", "buildml", "chords", "cryptoprice", "film", "filmget", "google", "gsmarena", "hololive", "kitsu", "kyioinfo", "kyiosearch", "lyricsspotify", "melolo", "movienotify", "nerdfont", "nhentai", "npm", "pap", "pddikti", "pixiv", "sapihub", "sapimaps", "sapimedia", "sapiriset", "sapishop", "sapitravel", "spotify", "tiktokfoto", "ttsearch", "twittertrend", "yts", "zlokal", "zsearch"];
for (const f of skipOk) {
  const s = await src(`plugins/search/${f}.js`);
  check(`${f}.js: skip wajar (bukan pengirim media)`, !PATTERNS.some(([re]) => re.test(s)));
}

console.log("── 3. header dinamis pluginConfig.name / per sub-perintah ──");
for (const f of senders) {
  const s = await src(`plugins/search/${f}`);
  const dynamic = /header:\s*(Array\.isArray\(pluginConfig\.name\)|pluginConfig\.name|command|cmd)/.test(s);
  const nm = /name:\s*['"]([^'"]+)['"]/.exec(s) || /name:\s*\[\s*['"]([^'"]+)['"]/.exec(s);
  const staticHeaders = [...s.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
  check(`${f}: header sesuai pluginConfig`, dynamic || (nm && staticHeaders.length > 0 && staticHeaders.every((h) => h === nm[1])));
}

console.log("── 4. keluarga audio: kartu teks SETELAH kirim ──");
for (const f of ["play.js", "playaudio.js", "playch.js", "playsoundcloud.js", "playspotify.js", "playtiktok.js", "spotplay.js", "soundcloud.js", "searchthatsong.js"]) {
  const s = await src(`plugins/search/${f}`);
  const audioSend = /\.sendMessage\([\s\S]{0,400}?\baudio\s*:/.test(s);
  const cardReply = /m\.reply\(\w+\)/.test(s) && s.includes("dlCard");
  check(`${f}: audio → kartu m.reply setelah kirim`, audioSend ? cardReply : true);
}

console.log("── 5. payload audio gak boleh ada caption kartu ──");
{
  let bad = 0;
  for (const f of senders) {
    const s = await src(`plugins/search/${f}`);
    if (/audio\s*:[\s\S]{0,300}?caption\s*:/.test(s)) { bad++; console.log(`   ⚠️ ${f}`); }
  }
  check("tak ada caption di payload audio", bad === 0);
}

console.log("── 6. helper dlCard best-effort (tak pernah throw) ──");
{
  const s = await src("plugins/search/play.js");
  check("play.js: dlCard ada try/catch", /async function dlCard[\s\S]{0,700}?catch \{ return null; \}/.test(s));
  let ok = true;
  try { await probeBuffer(Buffer.from([1, 2, 3])); } catch { ok = false; }
  check("probeBuffer pendek aman", ok);
  let ok2 = true;
  try { await probeBuffer(null); } catch { ok2 = false; }
  check("probeBuffer(null) aman", ok2);
  const card = mediaResultCard({ header: "tes", type: "audio", request: [["Judul", "tes"]], size: 1024, mime: "audio/mpeg", duration: 180 });
  check("kartu audio jadi", typeof card === "string" && card.includes("TES"));
}

console.log("── 7. import guard: SEMUA file search harus bisa di-import ──");
{
  const broken = [];
  for (const f of all) {
    try {
      await import(new URL(`../../plugins/search/${f}`, import.meta.url).href);
    } catch (e) {
      if (!/skia\.node/.test(e.message)) broken.push(`${f}: ${e.message.split("\n")[0]}`);
    }
  }
  check("import semua file search", broken.length === 0);
  if (broken.length) console.log("   broken:", broken);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
