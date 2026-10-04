// ── BROWSER MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────
// Kartu info media kategori browser (batch 9): 3/3 sender berkartu.
// mapss: 2 screenshot (search + detail) caption kartu; ssweb: screenshot
// caption kartu; webclone: dokumen html caption kartu. Lokasi native WA
// (mapss [3]) sengaja bukan media kartu.

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, probeBuffer } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

const PATTERNS = [
  /(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/,
  /sendImage|sendVideo|sendAudio|sendDocument|sendFile/,
  /\.sendMessage\([\s\S]{0,400}?\bimage\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\baudio\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/,
];

console.log("── 1. rescan: SEMUA pengirim media browser berkartu ──");
const all = readdirSync(new URL("../../plugins/browser", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/browser/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/browser/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 3)`, senders.length === 3);

console.log("── 2. mapss: 2 titik screenshot caption kartu ──");
{
  const s = await src("plugins/browser/mapss.js");
  check("mapss: titik search caption kartu", s.includes("const shotCard = await dlCard(") && s.includes("shotCard || shotCap"));
  check("mapss: titik detail caption kartu", s.includes("const detCard = await dlCard(") && s.includes("detCard || cap"));
  check("mapss: pin lokasi native gak ikut dikartu", s.includes("location:"));
}

console.log("── 3. ssweb & webclone ──");
{
  const s = await src("plugins/browser/ssweb.js");
  check("ssweb: screenshot caption kartu + fallback", s.includes("shotCard || null"));
  const w = await src("plugins/browser/webclone.js");
  check("webclone: dokumen caption kartu + fallback raraWrap", w.includes("cloneCard || raraWrap("));
}

console.log("── 4. header dinamis + helper best-effort ──");
for (const f of senders) {
  const s = await src(`plugins/browser/${f}`);
  check(`${f}: header dinamis pluginConfig.name`, /header:\s*Array\.isArray\(pluginConfig\.name\)/.test(s));
  check(`${f}: dlCard try/catch (gak pernah throw)`, /async function dlCard[\s\S]{0,700}?catch \{ return null; \}/.test(s));
}

console.log("── 5. import guard: SEMUA file browser bisa di-import ──");
{
  const broken = [];
  for (const f of all) {
    try {
      await import(new URL(`../../plugins/browser/${f}`, import.meta.url).href);
    } catch (e) {
      if (!/skia\.node/.test(e.message)) broken.push(`${f}: ${e.message.split("\n")[0]}`);
    }
  }
  check("import semua file browser", broken.length === 0);
  if (broken.length) console.log("   broken:", broken);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
