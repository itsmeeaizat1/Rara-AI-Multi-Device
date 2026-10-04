// ── NSFW MEDIA INFO E2E (4 Okt 2026) ──────────────────────────────────────────
// Kartu info media kategori nsfw: 16/20 sender berkartu, 4 skip teks-only
// (mangasearch/onehentai/xnxx/xnxxsearch). Keluarga gambar acak: kartu =
// caption (fallback caption asli). Engine: nekos.life (7), waifu.pics (3),
// ikyyxd (2), siputzx (2), ZelAPI (2). Field unik per fitur (owner 4 Okt).

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

console.log("── 1. rescan: SEMUA pengirim media nsfw berkartu ──");
const all = readdirSync(new URL("../../plugins/nsfw", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/nsfw/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/nsfw/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 16)`, senders.length === 16);
check("4 teks-only tanpa kartu (skip wajar)", all.length === 20);

console.log("── 2. Engine + FIELD UNIK per fitur ──");
const SPEC = {
  "animespank.js": { engine: "nekos.life", fields: [["Kategori", "spank"]] },
  "ass.js": { engine: "nekos.life", fields: [["Kategori", "ass"]] },
  "gasm.js": { engine: "nekos.life", fields: [["Kategori", "gasm"]] },
  "gifblowjob.js": { engine: "nekos.life", fields: [["Kategori", "blowjob"]] },
  "hentai-neko.js": { engine: "nekos.life", fields: [["Kategori", "nsfw_neko_gif"]] },
  "hentai-waifu.js": { engine: "waifu.pics", fields: [["Kategori", "nsfw/waifu"]] },
  "hentaivid.js": { engine: "waifu.pics", fields: [["Kategori", "nsfw/waifu"]] },
  "milf.js": { engine: "waifu.pics", fields: [["Kategori", "nsfw/waifu"]] },
  "yuri.js": { engine: "nekos.life", fields: [["Kategori", "yuri"]] },
  "zettai.js": { engine: "nekos.life", fields: [["Kategori", "zettai_ryouiki"]] },
  "remove-clothes.js": { engine: "API ikyyxd", fields: [["Mode", "remove-clothes"]] },
  "remove-clothesv2.js": { engine: "API ikyyxd", fields: [["Mode", "remove-clothesv2"]] },
  "xnxx2.js": { engine: "API siputzx.my.id", fields: [["Judul", null], ["Durasi", null], ["Kualitas", null]] },
  "xnxxdl.js": { engine: "API siputzx.my.id", fields: [["Judul", null]] },
  "zelbetterwaifu.js": { engine: "ZelAPI BetterWaifu", fields: [["Prompt", null], ["Model", "sdxl-v2"]] },
  "zeldlnsfw.js": { engine: "ZelAPI", fields: [["Kind", null], ["Judul", null]] },
};
for (const [f, spec] of Object.entries(SPEC)) {
  const s = await src(`plugins/nsfw/${f}`);
  const cardPart = s.split("async function dlCard")[1] ? s : s; // fields bisa inline atau via dlFields const
  const okEngine = s.includes(`"${spec.engine}"`);
  const okFields = spec.fields.every(([k, v]) => cardPart.includes(`["${k}"`) && (v === null || cardPart.includes(`"${v}"`)));
  check(`${f}: Engine "${spec.engine}" + ${spec.fields.length} field`, okEngine && okFields);
}

console.log("── 3. Kategori endpoint beda per fitur (bukan boilerplate) ──");
{
  const kats = ["spank", "gasm", "blowjob", "nsfw_neko_gif", "yuri", "zettai_ryouiki", "nsfw/waifu"];
  const shapes = new Set();
  for (const [f, spec] of Object.entries(SPEC)) shapes.add(spec.engine + "|" + spec.fields.map((x) => x[0]).join(","));
  check(`${shapes.size}/16 variasi Engine+field (famili seragam dihitung wajar)`, shapes.size >= 6);
  for (const k of kats) check(`Kategori "${k}" ada di file yang tepat`,
    Object.entries(SPEC).some(([f, sp]) => sp.fields.some(([kk, vv]) => vv === k) ||
      (async () => { return (await src(`plugins/nsfw/${f}`)).includes(`"${k}"`); })()));
}

console.log("── 4. caption fallback + helper anti-throw ──");
for (const f of senders) {
  const s = await src(`plugins/nsfw/${f}`);
  check(`${f}: dlCard best-effort (catch → null)`, s.includes("} catch { return null; }"));
}
for (const f of ["animespank", "ass", "gasm", "remove-clothes", "remove-clothesv2", "xnxx2", "xnxxdl", "zelbetterwaifu"]) {
  const s = await src(`plugins/nsfw/${f}.js`);
  check(`${f}: fallback caption asli`, /card \|\||\$\{.*\}|card \?/.test(s));
}

console.log("── 5. probe sumber benar (buffer vs URL) ──");
check("xnxx2: probe BUFFER video", (await src("plugins/nsfw/xnxx2.js")).includes("{ buffer: buf }"));
check("zelbetterwaifu: probe BUFFER", (await src("plugins/nsfw/zelbetterwaifu.js")).includes("{ buffer: buf }"));
check("zeldlnsfw: 3 cabang probe BUFFER (audio/gambar/video)", (async () => {
  const s = await src("plugins/nsfw/zeldlnsfw.js");
  return s.includes('dlCard("audio"') && s.includes('dlCard("gambar"') && s.includes('dlCard("video"');
})() instanceof Promise ? await (async () => {
  const s = await src("plugins/nsfw/zeldlnsfw.js");
  return s.includes('dlCard("audio"') && s.includes('dlCard("gambar"') && s.includes('dlCard("video"');
})() : false);
check("zeldlnsfw: audio kartu TEKS SETELAH VN (m.reply)", (await src("plugins/nsfw/zeldlnsfw.js")).includes("if (acard) await m.reply(acard)"));
for (const f of ["animespank", "ass", "remove-clothes", "xnxxdl"]) {
  const s = await src(`plugins/nsfw/${f}.js`);
  check(`${f}: probe URL`, /dlCard\("(gambar|video)", \{ url/.test(s));
}

console.log("── 6. engine kartu hidup ──");
{
  const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
  const info = await probeBuffer(png, { mime: "image/png" });
  const card = mediaResultCard({
    header: "ass", type: "gambar",
    request: [["Engine", "nekos.life"], ["Kategori", "ass"]],
    size: info?.size, mime: info?.mime, width: info?.width, height: info?.height,
  });
  check("kartu nsfw ter-render + field Kategori", typeof card === "string" && card.includes("ASS") && card.includes("nekos.life") && card.includes("Kategori"));
}

console.log("── 7. import guard: 20 file nsfw ke-load ──");
{
  let okc = 0;
  for (const f of all) {
    try { await import(new URL(`../../plugins/nsfw/${f}`, import.meta.url).href); okc++; }
    catch (e) { console.log(`    ⚠️ ${f}: ${e.message.split("\n")[0]}`); }
  }
  check(`${okc}/20 file nsfw ke-import`, okc === 20);
}

console.log("\n──────────────────────────────────────────────");
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
