// ── AI-IMAGE MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────
// Kartu info media kategori ai-image (batch 10): 47/47 file sender berkartu.
// Pola: semua gambar hasil AI → caption kartu. Field PER FITUR (bukan seragam):
// keluarga SeaArt Live3D (Style+Engine+cuplikan Prompt), keluarga FAA
// (Input+Style+endpoint FAA), keluarga ikyy (Prompt/Mode+Input+Engine endpoint),
// dan engine spesifik per file (Miaou/Neoxr/Nexray/AbzTech/Flux/Gemini/nano-banana).

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

console.log("── 1. rescan: SEMUA 47 file ai-image wajib berkartu ──");
const all = readdirSync(new URL("../../plugins/ai-image", import.meta.url)).filter((f) => f.endsWith(".js"));
for (const f of all) {
  const s = await src(`plugins/ai-image/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) {
    check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
  }
}
check(`kategori ai-image = ${all.length} file (ekspetasi 47)`, all.length === 47);

console.log("── 2. field per fitur: setiap dlCard wajib punya Engine ──");
for (const f of all) {
  const s = await src(`plugins/ai-image/${f}`);
  const calls = [...s.matchAll(/await dlCard\(([^;]*?)\]\]/g)];
  for (const mm of calls) {
    check(`${f}: dlCard ber-Engine`, mm[1].includes('"Engine"'));
  }
}

console.log("── 3. field SPESIFIK per keluarga fitur (bukan seragam) ──");
const fam = {
  "toanime.js": ["SeaArt Live3D", "Anime (Ghibli)"],
  "toblack.js": ["SeaArt Live3D", "Skin Tone Gelap"],
  "to3d.js": ["SeaArt Live3D", "3D Render (Pixar CGI)"],
  "tomanga.js": ["SeaArt Live3D", "Manga"],
  "toemotebatu.js": ["FAA TomoAI", "Emote Batu"],
  "tofigurev2.js": ["FAA Figura v3", "Figure v2"],
  "tomekah.js": ["FAA tomekah", "Background Mekah"],
  "tohijab.js": ["FAA tohijab", "Hijab"],
  "gptimage.js": ["GPT Image (ikyy)"],
  "ikyy-text2img.js": ["GPT Image (ikyy)"],
  "photiu.js": ["GPT Image (ikyy)"],
  "nanobanana.js": ["Gemini Flash Edit (ikyy)", "Foto (reply)"],
  "nanobananav2.js": ["Gemini Flash Edit (ikyy)"],
  "anime2real.js": ["ikyy anime2real", "Anime jadi Realis"],
  "becomeanime.js": ["Gemini Flash Edit (ikyy)", "Jadi Anime"],
  "becomehijab.js": ["Gemini Flash Edit (ikyy)", "Jadi Hijab"],
  "coloring.js": ["ikyy mewarnai", "Mewarnai Sketsa"],
  "darkskintone.js": ["Gemini Flash Edit (ikyy)", "Dark Skin Tone"],
  "faceswap.js": ["ikyy faceswap", "Face Swap"],
  "gtastyle.js": ["Gemini Flash Edit (ikyy)", "GTA Style"],
  "ai-image.js": ["Miaou AI"],
  "aiimggen.js": ["Miaou AI"],
  "anime-gen.js": ["Neoxr AI"],
  "sologo.js": ["Nexray Sologo"],
  "text2img2.js": ["AbzTech GenImg"],
  "enhance.js": ["AI Enhance", "HD Upscale"],
  "txt2img.js": ["StableDiffusion"],
  "txt2img2.js": ["Flux Klein 4B"],
  "text2img.js": ["HaidarApis nano-banana"],
  "flux2pro.js": ["Flux 2 Pro"],
  "fluxkontext.js": ["Flux Kontext"],
  "gemini-flash.js": ["Gemini Flash"],
  "clotheschanger.js": ["Clothes Changer", "nano-banana chain"],
  "rarabanana.js": ["SeaArt nano-banana"],
  "rarabanana2.js": ["SeaArt Flux Image"],
};
for (const [f, needles] of Object.entries(fam)) {
  const s = await src(`plugins/ai-image/${f}`);
  for (const nd of needles) check(`${f}: field "${nd}"`, s.includes(nd));
}

console.log("── 4. keragaman field: request array unik ──");
{
  const reqs = new Set();
  for (const f of all) {
    const s = await src(`plugins/ai-image/${f}`);
    for (const mm of s.matchAll(/dlCard\([^;]*?(\[\[.*?\]\])/g)) reqs.add(mm[1].trim());
  }
  check(`variasi request array >= 25 (nyata: ${reqs.size})`, reqs.size >= 25);
}

console.log("── 5. migrasi bersih: mediaInfoCaption lama hilang dari kategori ──");
{
  let leftover = [];
  for (const f of all) {
    const s = await src(`plugins/ai-image/${f}`);
    if (s.includes("mediaInfoCaption")) leftover.push(f);
  }
  check("0 file pakai mediaInfoCaption", leftover.length === 0);
}

console.log("── 6. header dinamis + helper dlCard ──");
for (const f of all) {
  const s = await src(`plugins/ai-image/${f}`);
  check(`${f}: helper dlCard + header dinamis`, s.includes("dlCard") && /Array\.isArray\(pluginConfig\.name\)|header:/.test(s));
}

console.log(`\n${"─".repeat(46)}`);
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
