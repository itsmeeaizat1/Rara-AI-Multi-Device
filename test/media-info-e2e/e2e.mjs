// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E: caption info hasil fitur pemroses media — rara-media-info.js satu pintu.
// REWRITE 3 Okt 2026: (1) jalur maker dikoreksi plugins/ai -> plugins/ai-image (tes lama crash ENOENT di main),
// (2) format baru 「 ✦ HEADER ✦ 」 + "• Label : nilai" (tanpa *bold*/emoji), (3) field khas sticker/convert/aio.
// Jalankan dari repo root: node test/media-info-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}
const REPO = path.resolve(".");
const rd = (f) => fs.readFileSync(new URL(path.join(REPO, f), "file://"), "utf8");
const { fmtBytes, mediaInfoCaption } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-media-info.js")).href);

// ── fmtBytes ──
t("fmtBytes: 353000 → '344.7 KB'", fmtBytes(353000) === "344.7 KB");
t("fmtBytes: 5 MB → '5.0 MB'", fmtBytes(5 * 1024 * 1024) === "5.0 MB");
t("fmtBytes: 2.5 GB → '2.5 GB'", fmtBytes(2.5 * 1024 ** 3) === "2.5 GB");
t("fmtBytes: 0/invalid → ''", fmtBytes(0) === "" && fmtBytes(NaN) === "" && fmtBytes(-5) === "");

// ── mediaInfoCaption: desain lama ──
{
  const cap = mediaInfoCaption({ header: "Rara Sticker", fields: [
    { icon: "📥", label: "Input", value: "Video" },
    { icon: "⏱️", label: "Durasi", value: "6.0 detik" },
    { icon: "🎨", label: "Filter", value: "crop, circle" },
    { icon: "📦", label: "Ukuran", value: "344.7 KB" },
  ] });
  const expect = "「 ✦ STICKER ✦ 」\n\n• Input  : Video\n• Durasi : 6.0 detik\n• Filter : crop, circle\n• Ukuran : 344.7 KB";
  t("caption: judul 「 ✦ ✦ 」 + baris '• Label : nilai' rata", cap === expect, JSON.stringify(cap));
  t("caption: tanpa *bold* dan tanpa emoji ikon", !/[*]/.test(cap) && !/[📥⏱️🎨📦]/u.test(cap));
}
t("caption: field null/undefined/kosong dilewati",
  mediaInfoCaption({ header: "X", fields: [
    { label: "Input", value: null }, { label: "Out", value: "Y" }, { label: "Z", value: "  " }, { label: "U", value: undefined },
  ] }) === "「 ✦ X ✦ 」\n\n• Out : Y");
t("caption: tanpa field → judul saja", mediaInfoCaption({ header: "X" }) === "「 ✦ X ✦ 」");
t("caption: header kosong → RARA", mediaInfoCaption({}) === "「 ✦ RARA ✦ 」");
t("caption: prefix 'Rara ' pada header dibuang", mediaInfoCaption({ header: "Rara To GIF" }).startsWith("「 ✦ TO GIF ✦ 」"));
t("caption: label kosong diabaikan", mediaInfoCaption({ header: "X", fields: [{ label: "", value: "V" }] }) === "「 ✦ X ✦ 」");
{
  const g = mediaInfoCaption({ header: "Convert", groups: [
    { title: "Konversi", fields: [{ label: "Ke", value: "WAV" }, { label: "Codec", value: "pcm" }] },
    { title: "Kosong", fields: [{ label: "a", value: null }] },
    { title: "Ukuran", fields: [{ label: "Sebelum", value: "1 KB" }] },
  ] });
  t("groups: kelompok berjudul urut", g.indexOf("「 ✦ Konversi ✦ 」") < g.indexOf("「 ✦ Ukuran ✦ 」"), g);
  t("groups: kelompok tanpa field sama sekali dibuang (tanpa judul yatim)", !g.includes("Kosong"), g);
  t("groups: label rata PER kelompok", g.includes("• Ke    : WAV") && g.includes("• Codec : pcm") && g.includes("• Sebelum : 1 KB"), g);
}

// ── 16 maker AI (folder benar: ai-image) tetap memanggil mediaInfoCaption + punya field khasnya ──
{
  const makers = ["to3d","toanime","toblack","tocartoon","tocermin","tochibi","toemotebatu","tofigurev2","tofigurine","toghibli","tohijab","toisland","tojapanese","tomanga","tomekah","tooilpainting"];
  for (const name of makers) {
    const src = rd(`plugins/ai-image/${name}.js`);
    t(`${name}.js → m.reply(mediaInfoCaption(...))`, src.includes("mediaInfoCaption("));
    t(`${name}.js → field Input/Style/Engine/Hasil`, ['"Input"', '"Style"', '"Engine"', '"Hasil"'].every((l) => src.includes(`label: ${l}`)));
  }
}

// ── field khas per fitur (dari sumber) ──
{
  const st = rd("plugins/sticker/sticker.js");
  t("sticker: hoist videoDur (bug ReferenceError .s)", /let videoDur = null/.test(st) && (st.match(/let videoDur/g) || []).length === 1 && st.indexOf("let videoDur") < st.indexOf("if (isVideo) {"));
  t("sticker: field Format/Ukuran sumber/Pack/Author", ['"Format"', '"Ukuran sumber"', '"Pack"', '"Author"'].every((l) => st.includes(`label: ${l}`)));
  t("sticker: TIDAK klaim ukuran WebP final (jujur)", !st.includes('label: "Ukuran",') && st.includes("JUJUR"));
  const cv = rd("plugins/convert/convert.js");
  t("convert: 3 kelompok Konversi/Ukuran/Asal", ['title: "Konversi"', 'title: "Ukuran"', 'title: "Asal"'].every((x) => cv.includes(x)));
  t("convert: field Sebelum/Sesudah/Selisih", ['"Sebelum"', '"Sesudah"', '"Selisih"'].every((l) => cv.includes(`label: ${l}`)));
  t("convert: kartu lama raraBox 'Size:' dibuang", !cv.includes("`Size: ${sizeMB} MB`"));
  const aio = rd("plugins/download/aio.js");
  t("aio: pakai probeMedia + mediaResultCard, fallback raraBerhasil", aio.includes("probeMedia(") && aio.includes("mediaResultCard(") && aio.includes("|| raraBerhasil"));
}

// ── smoke import ──
const all = ["plugins/sticker/sticker.js", "plugins/convert/convert.js", "plugins/convert/togif.js", "plugins/convert/vocalremover.js", "plugins/tools/converter.js", "plugins/download/aio.js",
  ...["to3d","toanime","toblack","tocartoon","tocermin","tochibi","toemotebatu","tofigurev2","tofigurine","toghibli","tohijab","toisland","tojapanese","tomanga","tomekah","tooilpainting"].map((n) => `plugins/ai-image/${n}.js`)];
for (const p of all) {
  try { await import(pathToFileURL(path.join(REPO, p)).href); t("import " + p, true); }
  catch (e) { t("import " + p, false, e.message); }
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
