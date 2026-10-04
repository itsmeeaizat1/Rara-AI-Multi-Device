// ── STICKER MEDIA INFO E2E (4 Okt 2026) ────────────────────────────────────
// Kartu info media kategori stiker (batch 3): stiker WA gak bisa bawa caption
// → kartu dikirim sebagai teks SETELAH stiker, reply sukses lama jadi fallback.
// Sumber data: buffer webp hasil asli ditangkap lewat hook onWebp
// (sendImageAsSticker/sendVideoAsSticker) atau buffer yang memang udah di tangan
// (attp/ttp/stickerfilter/swm-webp/stikerframe), lalu di-probe probeBuffer.
// Pack (linesticker/pinpack/stickerpack): kartu RINGKASAN di akhir, bukan per
// stiker (anti spam). readFileSync WAJIB new URL(rel, import.meta.url) —
// ENOENT top-level ESM = exit 0 SENYAP.

import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const ROOT = new URL("../..", import.meta.url).pathname;
const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { probeBuffer, mediaResultCard, fmtSize } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

console.log("── 1. probeBuffer webp (sharp) ──");
{
  const sharp = (await import("sharp")).default;
  const webp = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0f0" } }).webp().toBuffer();
  const info = await probeBuffer(webp);
  check("webp: size = panjang buffer", info.size === webp.length);
  check("webp: dimensi 512x512", info.width === 512 && info.height === 512);
  check("webp: mime image/webp", info.mime === "image/webp");
}

console.log("── 2. kartu jenis stiker ──");
{
  const card = mediaResultCard({
    header: "tesstiker",
    type: "stiker",
    request: [["Teks", "halo semuanya"]],
    size: 51200, mime: "image/webp", width: 512, height: 512,
  });
  check("header 「 ✦ TESSTIKER ✦ 」", card.includes("「 ✦ TESSTIKER ✦ 」"));
  check("Jenis : stiker", /Jenis\s+: stiker/.test(card));
  check("Format WEBP", /Format\s+: WEBP/.test(card));
  check("Ukuran 50 KB", card.includes(fmtSize(51200)) && card.includes("50 KB"));
  check("Permintaan Teks tampil", card.includes("halo semuanya"));
  check("durasi gak dipaksakan muncul", !card.includes("Durasi"));
  const kosong = mediaResultCard({});
  check("tanpa data → string kosong (fallback reply lama)", kosong === "");
}

console.log("── 3. hook onWebp di helper socket ──");
{
  const sock = await src("src/lib/rara-socket.js");
  const nOn = (sock.match(/options\.onWebp/g) || []).length;
  check("onWebp dipanggil di sendImageAsSticker + sendVideoAsSticker (2 titik)", nOn >= 2);
  check("onWebp best-effort (guard typeof function)", sock.includes('typeof options.onWebp === "function"'));
}

console.log("── 4. plugin stiker: kartu per hasil ──");
{
  // [file, header-kartu] — header harus persis dengan string di source
  const files = [
    ["plugins/sticker/brat.js", "brat"], ["plugins/sticker/brathd.js", "brathd"],
    ["plugins/sticker/bratanime.js", "bratanime"], ["plugins/sticker/bratbahlil.js", "bratbahlil"],
    ["plugins/sticker/bratgreen.js", "bratgreen"], ["plugins/sticker/bratpatrick.js", "bratpatrick"],
    ["plugins/sticker/bratsquidward.js", "bratsquidward"], ["plugins/sticker/bratwhite.js", "bratwhite"],
    ["plugins/sticker/animebrat.js", "animebrat"], ["plugins/sticker/bratgirl.js", "bratcewek"],
    ["plugins/sticker/bratvid.js", "Bratvid"], ["plugins/sticker/bratvid2.js", "bratvid2"],
    ["plugins/sticker/attp.js", "attp"], ["plugins/sticker/ttp.js", "ttp"],
    ["plugins/sticker/qc.js", "qc"], ["plugins/sticker/stickerfilter.js", "stickerfilter"],
    ["plugins/sticker/swm.js", "swm"], ["plugins/sticker/emojimix.js", "emojimix"],
    ["plugins/sticker/sticker.js", "sticker"], ["plugins/sticker/aisticker.js", "aisticker"],
    ["plugins/sticker/bratlocal.js", "bratlocal"], ["plugins/sticker/smeme.js", "smeme"],
    ["plugins/sticker/smemev2.js", "smemev2"], ["plugins/sticker/smemevid.js", "smemevid"],
    ["plugins/sticker/stikerframe.js", "stikerframe"], ["plugins/sticker/stikergrid.js", "stikergrid"],
    ["plugins/sticker/linesticker.js", "linesticker"], ["plugins/sticker/pinpack.js", "pinpack"],
    ["plugins/sticker/stickerpack.js", "stickerpack"],
  ];
  for (const [f, header] of files) {
    const s = await src(f);
    check(`${f.split("/").pop()} → mediaResultCard(header "${header}")`,
      s.includes("mediaResultCard") && s.includes(`header: "${header}"`));
  }
}

console.log("── 5. probe sumber: onWebp vs buffer di tangan ──");
{
  const onWebpFiles = [
    "plugins/sticker/sticker.js", "plugins/sticker/qc.js", "plugins/sticker/emojimix.js",
    "plugins/sticker/swm.js",
  ];
  for (const f of onWebpFiles) {
    const s = await src(f);
    check(`${f.split("/").pop()} nangkap webp hasil via onWebp`, s.includes("onWebp"));
  }
  const bufferInHand = [
    ["plugins/sticker/attp.js", "stickerBuffer"],
    ["plugins/sticker/ttp.js", "stickerBuffer"],
    ["plugins/sticker/stickerfilter.js", "exifBuf"],
  ];
  for (const [f, v] of bufferInHand) {
    const s = await src(f);
    check(`${f.split("/").pop()} probe buffer hasil (${v}) langsung`, s.includes(`probeBuffer(${v})`));
  }
  // fallback reply lama tetep ada
  const attp = await src("plugins/sticker/attp.js");
  check("attp fallback raraBerhasil tetap", /m\.reply\(card \|\| raraBerhasil\("attp"\)\)/.test(attp));
  const st = await src("plugins/sticker/sticker.js");
  check("sticker.js: durasi video ikut kalau diketahui (duration: videoDur)", st.includes("duration: videoDur"));
  check("sticker.js: gak pakai mediaInfoCaption lama lagi", !st.includes("mediaInfoCaption"));
}

console.log("── 5b. pack: kartu ringkasan, bukan per stiker ──");
{
  const line = await src("plugins/sticker/linesticker.js");
  check("linesticker: platform LINE + Terjirim X/Y", line.includes('platform: "LINE"') && line.includes("Terjirim"));
  check("linesticker: loop kirim per stiker gak disentuh (sendImageAsSticker tetap)", line.includes("sendImageAsSticker"));
  const pin = await src("plugins/sticker/pinpack.js");
  check("pinpack: platform Pinterest + Jumlah", pin.includes('platform: "Pinterest"') && pin.includes("Jumlah"));
  const sp = await src("plugins/sticker/stickerpack.js");
  check("stickerpack: platform Telegram + Jumlah", sp.includes("platform: \"Telegram (combot)\"") && sp.includes("Jumlah"));
  // pack gak boleh probe buffer per stiker (anti spam kartu per hasil)
  check("pinpack gak probeBuffer per stiker (ringkasan doang)", !pin.includes("probeBuffer"));
  check("stickerpack gak probeBuffer per stiker (ringkasan doang)", !sp.includes("probeBuffer"));
}

console.log("── 6. anti-throw ──");
{
  let threw = false;
  try { await probeBuffer(null); await probeBuffer(Buffer.from([1, 2, 3])); }
  catch { threw = true; }
  check("input aneh → aman (tanpa throw)", !threw);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
