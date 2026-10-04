// ── GROUP MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────────
// Kartu info media kategori group: 15/187 file sender berkartu (172 teks-only
// skip wajar). 3 keluarga: fitur auto (antirvo/autoai/autocompress/automedia/
// autosticker), relay multi-cabang (ht/hidetag2/openvo), kartu & profil
// (donasi/getpp/goodbye/groupinfo/grouprules/statscard/welcome). Stiker → kartu
// teks setelah stiker (hook onWebp). Audio VN → kartu teks setelah VN.

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
  /sendImageAsSticker|sendVideoAsSticker/,
  /\.sendMessage\([\s\S]{0,400}?\bsticker\s*:/,
];

console.log("── 1. rescan: SEMUA pengirim media group berkartu ──");
const all = readdirSync(new URL("../../plugins/group", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/group/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/group/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 15)`, senders.length === 15);

console.log("── 2. Engine + FIELD UNIK per fitur ──");
const SPEC = {
  "antirvo.js": { engine: "Rara Anti ViewOnce", fields: ["Pengirim", "Tipe", "Caption Asli"] },
  "autoai.js": { engine: "Rara AI Voice", fields: ["Format", "Sumber"] },
  "autocompress.js": { engine: "Auto Compress (canvas)", fields: ["Lebar Max", "Kualitas"] },
  "automedia.js": { engine: "Auto Media Convert", fields: ["Asal", "Tipe"] },
  "autosticker.js": { engine: "Auto Stiker", fields: ["Asal"] },
  "ht.js": { engine: "Hidetag Media", fields: ["Tipe"] },
  "hidetag2.js": { engine: "Hidetag Media", fields: ["Tipe"] },
  "openvo.js": { engine: "View-Once Unlock", fields: ["Tipe"] },
  "donasi.js": { engine: "QRIS Donasi", fields: ["Tipe"] },
  "getpp.js": { engine: "WhatsApp CDN", fields: ["Target", "Tipe"] },
  "goodbye.js": { engine: "WhatsApp CDN", fields: ["Tipe", "Konteks"] },
  "groupinfo.js": { engine: "WhatsApp CDN", fields: ["Tipe"] },
  "grouprules.js": { engine: "Kartu Rules Lokal", fields: ["Aset"] },
  "statscard.js": { engine: "Canvas Stats Grup", fields: ["Grup"] },
  "welcome.js": { engine: "WhatsApp CDN", fields: ["Tipe", "Konteks"] },
};
for (const [f, spec] of Object.entries(SPEC)) {
  const s = await src(`plugins/group/${f}`);
  const cardLines = s.split("\n").filter((l) => l.includes("dlCard(") && !l.includes("async function"));
  const allTxt = cardLines.join("\n");
  const okEngine = s.includes(`"${spec.engine}"`);
  const okFields = spec.fields.every((k) => allTxt.includes(`["${k}"`));
  check(`${f}: Engine "${spec.engine}" + ${spec.fields.length} field unik`, okEngine && okFields);
}
{
  const shapes = new Set(Object.entries(SPEC).map(([f, sp]) => sp.engine + "|" + sp.fields.join(",")));
  check(`${shapes.size}/15 variasi Engine+field (bukan boilerplate)`, shapes.size >= 10);
}

console.log("── 3. cabang relay ter-kartu lengkap ──");
{
  const ht = await src("plugins/group/ht.js");
  check("ht.js: 5 cabang (gambar/video/stiker/audio/dokumen)", ["gambar", "video", "stiker", "audio", "dokumen"].every((t) => ht.includes(`dlCard("${t}"`)));
  const h2 = await src("plugins/group/hidetag2.js");
  check("hidetag2.js: 5 cabang (gambar/video/stiker/audio/dokumen)", ["gambar", "video", "stiker", "audio", "dokumen"].every((t) => h2.includes(`dlCard("${t}"`)));
  const ov = await src("plugins/group/openvo.js");
  check("openvo.js: 3 cabang (gambar/video/audio)", ["gambar", "video", "audio"].every((t) => ov.includes(`dlCard("${t}"`)));
  const ar = await src("plugins/group/antirvo.js");
  check("antirvo.js: 3 tipe via ternary (video/audio/gambar)", ar.includes('mediaType === "video" ? "video" : mediaType === "audio" ? "audio" : "gambar"'));
}

console.log("── 4. aturan stiker (teks setelah) + audio VN (teks setelah) ──");
{
  const as = await src("plugins/group/autosticker.js");
  check("autosticker: hook onWebp → kartu teks setelah stiker", as.includes("onWebp: stickerCard") && as.includes("stickerCard"));
  const ht = await src("plugins/group/ht.js");
  check("ht.js: stiker → kartu teks setelah (bukan caption)", /sticker: media,[\s\S]{0,300}?text: card/.test(ht));
  check("ht.js: audio VN → kartu teks setelah", /audio: media,[\s\S]{0,400}?text: card/.test(ht));
  const ov = await src("plugins/group/openvo.js");
  check("openvo.js: audio → m.reply(card) setelah VN", ov.includes("if (card) await m.reply(card)"));
}

console.log("── 5. helper anti-throw + probe sumber ──");
for (const f of senders) {
  const s = await src(`plugins/group/${f}`);
  check(`${f}: dlCard best-effort (catch → null)`, s.includes("} catch { return null; }"));
}
{
  check("getpp: probe URL", (await src("plugins/group/getpp.js")).includes('dlCard("gambar", { url: ppUrl }'));
  check("autoai: probe BUFFER VN", (await src("plugins/group/autoai.js")).includes("{ buffer: audioBuffer"));
  check("grouprules: probe BUFFER", (await src("plugins/group/grouprules.js")).includes("{ buffer: imageBuffer }"));
  check("statscard: probe BUFFER", (await src("plugins/group/statscard.js")).includes("{ buffer }"));
  check("donasi: 2 titik probe BUFFER", (async () => {
    const s = await src("plugins/group/donasi.js");
    return s.includes("{ buffer: qrBuf }") && s.includes("{ buffer: qrBuffer }");
  })() instanceof Promise ? await (async () => {
    const s = await src("plugins/group/donasi.js");
    return s.includes("{ buffer: qrBuf }") && s.includes("{ buffer: qrBuffer }");
  })() : false);
}

console.log("── 6. caption fallback tetap ada ──");
for (const f of ["donasi", "getpp", "goodbye", "groupinfo", "grouprules", "statscard", "welcome", "autocompress"]) {
  const s = await src(`plugins/group/${f}.js`);
  check(`${f}: fallback caption asli`, /\? `|: caption|\|\| null/.test(s));
}

console.log("── 7. engine kartu hidup ──");
{
  const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
  const info = await probeBuffer(png, { mime: "image/png" });
  const card = mediaResultCard({
    header: "openvo", type: "gambar",
    request: [["Engine", "View-Once Unlock"], ["Tipe", "Gambar"]],
    size: info?.size, mime: info?.mime, width: info?.width, height: info?.height,
  });
  check("kartu group ter-render + field Tipe", typeof card === "string" && card.includes("OPENVO") && card.includes("View-Once Unlock"));
}

console.log("\n──────────────────────────────────────────────");
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
