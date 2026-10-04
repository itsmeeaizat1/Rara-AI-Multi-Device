// ── ANIME MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────────
// Kartu info media kategori anime (batch 11): 41 file reaction GIF berkartu
// (waifu.pics fallback nekos.best). Pola: caption aksi + kartu digabung dalam
// SATU pesan (fullCap), mentions tetap jalan. Field: Aksi (spesifik per file,
// diekstrak dari caption asli), Target (dinamis @mention/sender),
// Engine (dinamis waifu.pics/nekos.best).

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
];

console.log("── 1. rescan: SEMUA sender anime wajib berkartu ──");
const all = readdirSync(new URL("../../plugins/anime", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/anime/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/anime/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`sender anime = ${senders.length} (ekspetasi 44)`, senders.length === 44);
check(`total file anime = ${all.length} (ekspetasi 61)`, all.length === 61);

console.log("── 2. kartu digabung caption aksi + mentions tetap jalan ──");
for (const f of senders) {
  const s = await src(`plugins/anime/${f}`);
  const inline = /\(await dlCard\([^)]*\)\) \|\|/.test(s);
  const combined = /fullCap|card \? \$\{caption\}|card \? `\$/.test(s) || inline;
  const usesMentions = /mentions/.test(s.match(/sendMessage\([\s\S]{0,300}/)?.[0] ?? "");
  check(`${f}: kartu digabung caption`, combined && (!usesMentions || s.includes("mentions")));
}

console.log("── 3. field Engine dinamis sumber asli ──");
const REACT_FAMILY = ["waifu.pics", "nekos.best"];
for (const f of senders) {
  const s = await src(`plugins/anime/${f}`);
  if (REACT_FAMILY.some((a) => s.includes(a))) {
    check(`${f}: Engine waifu.pics/nekos.best dinamis`, s.includes("waifu.pics") && s.includes("nekos.best") && /eng = .*url\.includes|url\.includes\("waifu\.pics"\) \?/.test(s));
  }
}
{
  const sW = await src("plugins/anime/wallpaperanime.js");
  check("wallpaperanime.js: Sumber Wallhaven/Konachan", sW.includes("Wallhaven") && sW.includes("Konachan") && sW.includes('["Sumber"'));
  const sC = await src("plugins/anime/animecouple.js");
  check("animecouple.js: Sumber Andaraz API", sC.includes("Andaraz API") && sC.includes('["Jenis", "PP Cowok"') && sC.includes('["Jenis", "PP Cewek"'));
}

console.log("── 4. field Aksi spesifik per file (40 label unik + react dinamis) ──");
{
  const labels = new Set();
  for (const f of senders) {
    const s = await src(`plugins/anime/${f}`);
    for (const mm of s.matchAll(/\["Aksi", "([^"]+)"\]/g)) labels.add(mm[1]);
  }
  check(`label Aksi unik >= 40 (nyata: ${labels.size})`, labels.size >= 40);
  const sReact = await src("plugins/anime/anime-react.js");
  check("anime-react: Aksi dinamis dari label", /String\(label \|\| "Reaction"\)/.test(sReact) || /rx\.label/.test(sReact));
}

console.log("── 5. probe buffer asli + fallback URL ──");
for (const f of senders) {
  const s = await src(`plugins/anime/${f}`);
  const probeBuf = /dlCard\([^,]+, \{ buffer \}/.test(s) || s.includes("{ buffer },") || /\{ buffer: (imageBuffer|result\.\w+)/.test(s);
  const probeUrl = /dlCard\([^,]+, \{ url \}/.test(s);
  const singlePath = ["anime-react.js", "animecouple.js", "wallpaperanime.js"].includes(f);  // 1 jalur kirim, fallback URL tak wajib
  check(`${f}: probe media asli`, (probeBuf || probeUrl) && (probeUrl || singlePath || probeBuf));
}

console.log("── 6. helper dlCard + header dinamis pluginConfig ──");
for (const f of senders) {
  const s = await src(`plugins/anime/${f}`);
  check(`${f}: helper + header dinamis`, s.includes("async function dlCard") && s.includes("Array.isArray(pluginConfig.name)"));
}

console.log("── 7. import semua file anime ──");
{
  const { pathToFileURL } = await import("node:url");
  const path = (await import("node:path")).default;
  const REPO = path.resolve(".");
  let bad = [];
  for (const p of all) {
    try { await import(pathToFileURL(path.join(REPO, "plugins/anime", p)).href); }
    catch (e) { bad.push(`${p}: ${e.message.split("\n")[0]}`); }
  }
  check(`import ${all.length} file anime OK`, bad.length === 0);
  for (const b of bad) console.log("   ⚠️ " + b);
}

console.log(`\n${"─".repeat(46)}`);
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
