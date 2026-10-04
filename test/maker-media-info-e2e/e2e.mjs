// ── MAKER MEDIA INFO E2E (4 Okt 2026) ──────────────────────────────────────
// Kartu info media kategori maker (batch 4): hasil maker = gambar ber-caption
// → kartu masuk CAPTION (fallback caption lama), beda dari stiker yang harus
// teks terpisah. Buffer render selalu di tangan (canvas/sharp) → probeBuffer;
// sumber URL (ephoto/balogo) → probeMedia. Semua hasil = Jenis: gambar.

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, fmtSize } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

console.log("── 1. kartu jenis gambar ──");
{
  const card = mediaResultCard({
    header: "tesmaker",
    type: "gambar",
    request: [["Teks", "hai semuanya"]],
    size: 51200, mime: "image/png", width: 1024, height: 1024,
  });
  check("header 「 ✦ TESMAKER ✦ 」", card.includes("「 ✦ TESMAKER ✦ 」"));
  check("Jenis : gambar", /Jenis\s+: gambar/.test(card));
  check("Format PNG", /Format\s+: PNG/.test(card));
  check("Permintaan Teks tampil", card.includes("hai semuanya"));
  const kosong = mediaResultCard({});
  check("tanpa data → string kosong (fallback caption lama)", kosong === "");
}

console.log("── 2. plugin maker: kartu per hasil ──");
{
  // [file, header-kartu] — header = nama perintah (pluginConfig.name)
  const files = [
    ["plugins/maker/balogo.js", "balogo"],
    ["plugins/maker/certmaker.js", "certmaker"],
    ["plugins/maker/ephoto.js", "__DYNAMIC__"],
    ["plugins/maker/fakebankjago.js", "fakebankjago"],
    ["plugins/maker/fakecall.js", "fakecall"],
    ["plugins/maker/fakedana.js", "fakedana"],
    ["plugins/maker/fakeff.js", "fakeff"],
    ["plugins/maker/fakeml.js", "fakeml"],
    ["plugins/maker/fakestory.js", "fakestory"],
    ["plugins/maker/fakestory2.js", "fakestory2"],
    ["plugins/maker/fakestory3.js", "fakestory3"],
    ["plugins/maker/fakestory4.js", "fakestory4"],
    ["plugins/maker/fakethreads.js", "fakethreads"],
    ["plugins/maker/gura.js", "gura"],
    ["plugins/maker/iqc.js", "iqc"],
    ["plugins/maker/lyricscard.js", "lyricscard"],
    ["plugins/maker/musiccard.js", "musiccard"],
    ["plugins/maker/nowm.js", "nowm"],
    ["plugins/maker/profilecard.js", "profilecard"],
    ["plugins/maker/quotemaker.js", "quotemaker"],
    ["plugins/maker/textpro.js", "textpro"],
    ["plugins/maker/topixel.js", "topixel"],
    ["plugins/maker/wanted.js", "wanted"],
    ["plugins/maker/watermark.js", "watermark"],
    ["plugins/maker/write2.js", "nulis2"],
  ];
  for (const [f, header] of files) {
    const s = await src(f);
    if (header === "__DYNAMIC__") {
      // ephoto = mega-plugin 32 efek (name array) → header dinamis m.command
      check(`${f.split("/").pop()} → mediaResultCard(header dinamis m.command)`,
        s.includes("mediaResultCard") && /header:\s*(String\()?(m\.command|command)\b/.test(s));
    } else {
      check(`${f.split("/").pop()} → mediaResultCard(header "${header}")`,
        s.includes("mediaResultCard") && s.includes(`header: "${header}"`));
    }
  }
  check("jumlah file maker di suite = 25 + 6 skip + 2 kyio via lib = 33", files.length === 25);
  // kyioimage + kyiomaker: kartu TERPUSAT di lib rara-kyio.js (sendBuffer)
  const kyio = await src("src/lib/rara-kyio.js");
  check("rara-kyio.js sendBuffer → kartu terpusat (tutup kyioimage+kyiomaker)",
    kyio.includes("mediaResultCard") && kyio.includes("probeBuffer") && kyio.includes("sendBuffer"));
  // 6 plugin text-only/API-maintenance stub — skip disengaja & terverifikasi
  const skips = ["captionig", "fakedev", "fakedev2", "fakedev3", "fakeff2", "fakeffduo"];
  for (const sk of skips) {
    const ssk = await src(`plugins/maker/${sk}.js`);
    check(`${sk} benar text-only (0 titik kirim media → skip wajar)`,
      !/sendImage|sendMedia|image:|sendVideo/.test(ssk));
  }
}

console.log("── 3. sumber probe ──");
{
  // buffer render lokal di-probe langsung; URL pakai probeMedia
  const ep = await src("plugins/maker/ephoto.js");
  check("ephoto (sumber URL) pakai probeMedia", ep.includes("probeMedia"));
  const qm = await src("plugins/maker/quotemaker.js");
  check("quotemaker probe buffer render lokal", qm.includes("probeBuffer"));
  check("quotemaker fallback caption raraBerhasil tetap", /caption:\s*\(card\s*\|\|\s*raraBerhasil\(\)\)/.test(qm) || qm.includes("card || raraBerhasil()"));
}

console.log("── 4. anti-throw ──");
{
  const { probeBuffer } = LIB;
  let threw = false;
  try { await probeBuffer(null); await probeBuffer(Buffer.from([1, 2, 3])); }
  catch { threw = true; }
  check("input aneh → aman (tanpa throw)", !threw);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
