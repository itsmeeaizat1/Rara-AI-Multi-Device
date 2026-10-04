// ── ASUPAN MEDIA INFO E2E (4 Okt 2026) ───────────────────────────────────────
// Kartu info media kategori asupan: 17/17 sender berkartu, 0 teks-only.
// Keluarga foto Pollinations (11): kartu = caption (fallback caption asli).
// profilepic: DiceBear; cosplay: waifu.pics; keluarga video lokal (bocil/
// ukhty/videofeed): Koleksi lokal + Playlist + Total video; asupantiktok:
// neoxr + Username + Judul. Field unik per fitur (owner 4 Okt).

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

console.log("── 1. rescan: SEMUA pengirim media asupan berkartu ──");
const all = readdirSync(new URL("../../plugins/asupan", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/asupan/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/asupan/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 17)`, senders.length === 17);

console.log("── 2. Engine + FIELD UNIK per fitur ──");
const SPEC = {
  "asupantiktok.js": { engine: "API neoxr.eu", fields: ["Username", "Judul"] },
  "bike.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "blackpink.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "bocil.js": { engine: "Koleksi lokal", fields: ["Playlist", "Total video"] },
  "car.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "cosplay.js": { engine: "waifu.pics", fields: ["Kategori"] },
  "couplepp.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "doll.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "justina.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "profilepic.js": { engine: "DiceBear API", fields: ["Style", "Seed"] },
  "pubg.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "rosebp.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "ryujin.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "ukhty.js": { engine: "Koleksi lokal", fields: ["Playlist", "Total video"] },
  "ulzzangboy.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "ulzzanggirl.js": { engine: "Pollinations AI", fields: ["Prompt", "Seed"] },
  "videofeed.js": { engine: "Koleksi lokal", fields: ["Playlist", "Total video"] },
};
for (const [f, spec] of Object.entries(SPEC)) {
  const s = await src(`plugins/asupan/${f}`);
  const cardLine = s.split("\n").find((l) => l.includes('dlCard("'));
  check(`${f}: Engine "${spec.engine}" + ${spec.fields.length} field unik di baris kartu`,
    !!cardLine && s.includes(`"${spec.engine}"`) && spec.fields.every((k) => cardLine.includes(`["${k}"`)));
}
{
  const shapes = new Set(Object.values(SPEC).map((v) => [v.engine, ...v.fields].join("|")));
  check(`bentuk kartu ${shapes.size}/17 variasi (bukan boilerplate)`, shapes.size >= 5);
}

console.log("── 3. Prompt beda per fitur Pollinations (bukan teks sama) ──");
const PROMPTS = {
  "bike.js": "sport motorcycle aesthetic",
  "car.js": "luxury sports car aesthetic",
  "couplepp.js": "cute couple anime matching profile picture",
  "ulzzangboy.js": " aesthetic portrait", // ekspresi (query + " aesthetic portrait")
  "ulzzanggirl.js": " aesthetic portrait",
};
for (const [f, p] of Object.entries(PROMPTS)) {
  const s = await src(`plugins/asupan/${f}`);
  check(`${f}: Prompt "${p.trim()}"`, s.includes(`"${p}"`) || s.includes(`"${p.trim()}"`));
}

console.log("── 4. caption fallback + helper anti-throw ──");
for (const f of senders) {
  const s = await src(`plugins/asupan/${f}`);
  check(`${f}: fallback caption asli`, /card \|\| |card \? |: caption/.test(s));
  check(`${f}: dlCard best-effort (catch → null)`, s.includes("} catch { return null; }"));
}

console.log("── 5. probe sumber benar ──");
check("videofeed: probe BUFFER video", (await src("plugins/asupan/videofeed.js")).includes("{ buffer: videoBuffer }"));
for (const f of ["asupantiktok", "bocil", "ukhty"]) {
  const s = await src(`plugins/asupan/${f}.js`);
  check(`${f}: probe URL`, /dlCard\("video", \{ url:/.test(s));
}
for (const f of ["bike", "profilepic", "cosplay"]) {
  const s = await src(`plugins/asupan/${f}.js`);
  check(`${f}: probe URL gambar`, /dlCard\("gambar", \{ url/.test(s));
}

console.log("── 6. engine kartu hidup ──");
{
  const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
  const info = await probeBuffer(png, { mime: "image/png" });
  const card = mediaResultCard({
    header: "bike", type: "gambar",
    request: [["Engine", "Pollinations AI"], ["Prompt", "sport motorcycle aesthetic"], ["Seed", "4321"]],
    size: info?.size, mime: info?.mime, width: info?.width, height: info?.height,
  });
  check("kartu asupan ter-render + field Prompt/Seed", typeof card === "string" && card.includes("BIKE") && card.includes("sport motorcycle") && card.includes("4321"));
}

console.log("── 7. import guard: 17 file asupan ke-load ──");
{
  let okc = 0;
  for (const f of all) {
    try { await import(new URL(`../../plugins/asupan/${f}`, import.meta.url).href); okc++; }
    catch (e) { console.log(`    ⚠️ ${f}: ${e.message.split("\n")[0]}`); }
  }
  check(`${okc}/17 file asupan ke-import`, okc === 17);
}

console.log("\n──────────────────────────────────────────────");
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
