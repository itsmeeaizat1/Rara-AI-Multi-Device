// ── TOOLS MEDIA INFO E2E (4 Okt 2026) ──────────────────────────────────────
// Kartu info media kategori tools (batch 5): 228 file tools = 81 pengirim
// media (berkartu) + 147 text-only. Jenis kirim beragam: gambar/video →
// caption; dokumen → caption document (bisa); audio → kartu teks SETELAH
// send (gak bisa caption); sticker → teks setelah (gak bisa caption).
// Rescan otomatis: setiap file tools yang punya pola kirim media WAJIB
// memakai mediaResultCard — pola yang lolos grep lama (sendMedia, sendX,
// sticker:) ikut kena.

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import assert from "node:assert/strict";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, probeBuffer, fmtSize } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

console.log("── 1. kartu jenis dokumen/audio/stiker ──");
{
  const doc = mediaResultCard({
    header: "tesdoc", type: "dokumen",
    request: [["Teks", "halo dunia"]],
    size: 4096, mime: "application/pdf",
  });
  check("dokumen: header + Jenis : dokumen", doc.includes("「 ✦ TESDOC ✦ 」") && /Jenis\s+: dokumen/.test(doc));
  check("dokumen: tanpa dimensi → baris dimensi gak muncul", !/Dimensi/.test(doc));
  const aud = mediaResultCard({
    header: "tesaudio", type: "audio",
    request: [["Model", "TTS"]], size: 102400, mime: "audio/mpeg", duration: 12,
  });
  check("audio: Jenis : audio + durasi", /Jenis\s+: audio/.test(aud) && /Durasi\s*:/.test(aud));
  const stiker = mediaResultCard({ header: "tesstiker", type: "stiker", size: 20480, mime: "image/webp", width: 512, height: 512 });
  check("stiker: Jenis : stiker", /Jenis\s+: stiker/.test(stiker));
}

console.log("── 2. rescan: SEMUA pengirim media tools wajib berkartu ──");
// klasifier = pola batch AI (batch 1 kelewat 4 plugin karena cuma grep
// sendImage — di sini semua pola ikut dicek)
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
const allTools = readdirSync(new URL("../../plugins/tools", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of allTools) {
  const s = await src(`plugins/tools/${f}`);
  if (PATTERNS.some(([re]) => re.test(s))) senders.push(f);
}
check(`rescan menemukan 81 pengirim media (ketemu: ${senders.length})`, senders.length === 81);
const uncarded = [];
for (const f of senders) {
  const s = await src(`plugins/tools/${f}`);
  if (!s.includes("mediaResultCard")) uncarded.push(f);
}
check(`81 pengirim media SEMUA berkartu (bocor: ${uncarded.length ? uncarded.join(", ") : "0"})`, uncarded.length === 0);

console.log("── 3. header kartu = nama perintah (pluginConfig.name) ──");
// [file, header] — 81 pengirim media
const files = [
  ["am-data", "am-data"], ["animeimg", "animeimg"], ["animesearch", "animesearch"],
  ["animevoice", "animevoice"], ["archivefile", "arsipfile"], ["barcode", "barcode"],
  ["carbon", "carbon"], ["chart", "chart"], ["comicsanka", "comicsanka"],
  ["contract", "kontraktool"], ["converter", "converter"], ["cpsanka", "cpsanka"],
  ["dafont", "dafont"], ["deepaiedit", "deepaiedit"], ["emojitoanimation", "emojitoanimasi"],
  ["emojitoimage", "emojitoimage"], ["fixupx", "fixupx"], ["fotolive", "fotolive"],
  ["gameprice", "gameprice"], ["hd", "hd"], ["hd3", "hd3"], ["hd4", "reminiv2"],
  ["hdvid", "hdvid"], ["imgcompress", "imgcompress"], ["imgupscale", "imgupscale"],
  ["inworldtts", "inworldtts"], ["invoicemaker", "invoicemaker"], ["letterhead", "kop"],
  ["memegen", "memegenapi"], ["nobg", "nobg"], ["nokos", "nokos"], ["notulen", "notulen"],
  ["obfuscate", "obfuscate"], ["onephoto", "__SUBS__"], ["onettts", "onettts"],
  ["pdftoimg", "pdftoimg"], ["pdftools", "pdftools"], ["photocaption", "photocaption"],
  ["photocollage", "photocollage"], ["photofilter", "photofilter"], ["photostamp", "photostamp"],
  ["phototools", "phototools"], ["photowatermark", "photowatermark"], ["proxy", "proxy"],
  ["qr", "qr"], ["qrcode-v15", "qrcode"], ["qrcustom", "qrcustom"], ["qrgen", "qrgen"],
  ["quoteanimesanka", "quoteanimesanka"], ["qwa", "qwa"], ["remini", "remini"],
  ["reminiv3", "reminiv3"], ["removebg", "removebg"], ["removebgv2", "removebgv2"],
  ["rvo", "rvo"], ["sppd", "sppd"], ["stalk", "stalk"], ["surat", "surattool"],
  ["text2image", "text2image"], ["text2img", "text2img"], ["toaud", "toaud"],
  ["toaudio", "toaudio"], ["toimg", "toimg"], ["tomp4", "tomp4"], ["toreal", "toreal"],
  ["tovideo", "tovideo"], ["tovn", "tovn"], ["ttd", "ttd"], ["ttsnahidasanka", "ttsnahidasanka"],
  ["txt2qr", "txt2qr"], ["txttopdf", "txttopdf"], ["unblurimg", "unblurimg"],
  ["upscaler", "upscaler"], ["vidcompress", "vidcompress"], ["wallpaper", "wallpaper"],
  ["wallpaperwallhaven", "wallpaperwallhaven"], ["wink", "wink"], ["word2pdf", "word2pdf"],
  ["write", "nulis"], ["ztools", "ztools"], ["ztools2", "ztools2"],
];
check("daftar suite = 81 file (kategori lengkap)", files.length === 81);
for (const [f, header] of files) {
  const s = await src(`plugins/tools/${f}.js`);
  if (header === "__SUBS__") {
    // onephoto: mega-plugin sub-perintah (onenobg/oneupscale/dll) → header per sub
    check(`${f}.js → mediaResultCard + header sub-perintah`,
      s.includes("mediaResultCard") && /header: "one/.test(s));
  } else {
    check(`${f}.js → mediaResultCard(header "${header}")`,
      s.includes("mediaResultCard") && s.includes(`header: "${header}"`));
  }
}

console.log("── 4. migrasi sistem lama & jenis khusus ──");
{
  const conv = await src("plugins/tools/converter.js");
  check("converter.js: mediaInfoCaption LAMA dihapus total", !conv.includes("mediaInfoCaption"));
  const stik = await src("plugins/tools/emojitoanimation.js");
  check("emojitoanimation: type stiker + kartu teks setelah sticker (bukan caption)",
    stik.includes('"stiker"') && /m\.reply\(card/.test(stik) || /m\.reply\(\s*card/.test(stik));
  for (const f of ["animevoice", "inworldtts", "onettts", "toaud", "ttsnahidasanka"]) {
    const s = await src(`plugins/tools/${f}.js`);
    check(`${f}: kartu via m.reply setelah audio (audio gak bisa caption)`, /m\.reply\(\s*card/.test(s) || /await m\.reply\(card/.test(s));
  }
  // dokumen bisa caption — pastikan minimal 3 dokumen-tools pakai caption di payload
  let docCaption = 0;
  for (const f of ["txttopdf", "word2pdf", "notulen", "letterhead", "obfuscate", "ttd", "sppd", "surat", "contract", "ztools", "ztools2", "archivefile", "proxy", "pdftools"]) {
    const s = await src(`plugins/tools/${f}.js`);
    if (/caption:\s*\(card/.test(s) || /caption:\s*card/.test(s)) docCaption++;
  }
  check(`dokumen-tools: caption kartu di payload document (≥10 dari 14) — ketemu ${docCaption}`, docCaption >= 10);
}

console.log("── 5. sumber probe & anti-throw ──");
{
  const toimg = await src("plugins/tools/toimg.js");
  check("toimg: buffer hasil di tangan → probeBuffer", toimg.includes("probeBuffer"));
  const carbon = await src("plugins/tools/carbon.js");
  check("carbon: sumber render → probe", carbon.includes("probeBuffer") || carbon.includes("probeMedia"));
  // anti-throw: input aneh gak boleh bikin probeBuffer melempar
  let safe = true;
  try { await probeBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0])); } catch { safe = false; }
  check("probeBuffer buffer pendek → aman (tanpa throw)", safe);
  let safe2 = true;
  try { await probeBuffer(null); } catch { safe2 = false; }
  check("probeBuffer(null) → aman", safe2);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
