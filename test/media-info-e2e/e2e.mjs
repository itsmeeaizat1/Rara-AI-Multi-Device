// E2E: field info hasil fitur pemroses media (request owner 19-20 Sep —
// "apakah fitur lain bisa dibuat field juga kyk stiker, convert fitur kyk
// tools dan makes sesuai field yang sesuai") — rara-media-info.js satu pintu
// + 16 maker AI + sticker + converter + togif + vocalremover.
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
const { fmtBytes, mediaInfoCaption } =
  await import(pathToFileURL(path.join(REPO, "src/lib/rara-media-info.js")).href);

// ── fmtBytes ──
t("fmtBytes: 353000 → '344.7 KB'", fmtBytes(353000) === "344.7 KB");
t("fmtBytes: 5 MB → '5.0 MB'", fmtBytes(5 * 1024 * 1024) === "5.0 MB");
t("fmtBytes: 2.5 GB → '2.5 GB'", fmtBytes(2.5 * 1024 ** 3) === "2.5 GB");
t("fmtBytes: 0/invalid → '' (baris dilewati)", fmtBytes(0) === "" && fmtBytes(NaN) === "" && fmtBytes(-5) === "");

// ── mediaInfoCaption: format ala downloader ──
{
  const cap = mediaInfoCaption({ header: "Rara Sticker", fields: [
    { icon: "📥", label: "Input", value: "Video" },
    { icon: "⏱️", label: "Durasi", value: "6.0 detik" },
    { icon: "🎨", label: "Filter", value: "crop, circle" },
    { icon: "📦", label: "Ukuran", value: "344.7 KB" },
  ] });
  const expect =
`*Rara Sticker*

📥 *Input:* Video
⏱️ *Durasi:* 6.0 detik
🎨 *Filter:* crop, circle
📦 *Ukuran:* 344.7 KB`;
  t("caption: header + baris berlabel emoji urut", cap === expect, JSON.stringify(cap));
}
t("caption: field null/undefined/kosong dilewati", 
  mediaInfoCaption({ header: "X", fields: [
    { icon: "📥", label: "Input", value: null },
    { icon: "📤", label: "Out", value: "Y" },
    { icon: "z", label: "Z", value: "  " },
  ] }) === "*X*\n\n📤 *Out:* Y");
t("caption: tanpa field → header doang", mediaInfoCaption({ header: "X" }) === "*X*");
t("caption: header kosong → fallback 'Rara'", mediaInfoCaption({}).startsWith("*Rara*"));
t("caption: icon default kalau gak ada", mediaInfoCaption({ header: "X", fields: [{ label: "L", value: "V" }] }).includes("▪️ *L:* V"));

// ── asersi source: fitur pemroses media pakai format baru ──
{
  const files = {
    "plugins/sticker/sticker.js": ['mediaInfoCaption({ header: "Rara Sticker"', "Stiker Animasi WebP"],
    "plugins/tools/converter.js": ['mediaInfoCaption({ header: "Rara Converter"', "Rara Converter"],
    "plugins/convert/togif.js": ['mediaInfoCaption({ header: "Rara To GIF"'],
    "plugins/convert/vocalremover.js": ['mediaInfoCaption({ header: "Rara Vocal Remover"'],
  };
  for (const [f, needles] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(REPO, f), "utf8");
    for (const n of needles) t(`${f} → ${n.slice(0, 40)}`, src.includes(n));
  }
}

// ── 16 maker AI: caption info hasil setelah sendMedia ──
{
  const makers = {
    "to3d": "Rara To 3D", "toanime": "Rara To Anime", "toblack": "Rara To Black",
    "tocartoon": "Rara To Cartoon", "tocermin": "Rara To Cermin", "tochibi": "Rara To Chibi",
    "toemotebatu": "Rara Emote Batu", "tofigurev2": "Rara Figure v2", "tofigurine": "Rara Figurine",
    "toghibli": "Rara To Ghibli", "tohijab": "Rara To Hijab", "toisland": "Rara To Island",
    "tojapanese": "Rara To Japanese", "tomanga": "Rara To Manga", "tomekah": "Rara To Mekah",
    "tooilpainting": "Rara Oil Painting",
  };
  for (const [name, header] of Object.entries(makers)) {
    const src = fs.readFileSync(path.join(REPO, `plugins/ai-image/${name}.js`), "utf8");
    t(`${name}.js → caption info (header ${header})`,
      src.includes("await m.reply(mediaInfoCaption(") && src.includes(`header: "${header}"`),
      `cari: header: "${header}"`);
    t(`${name}.js → field Input/Style/Engine/Hasil`,
      src.includes('label: "Input"') && src.includes('label: "Style"') &&
      src.includes('label: "Engine"') && src.includes('label: "Hasil"'));
  }
}

// ── smoke import semua fitur yang diubah ──
const all = ["plugins/sticker/sticker.js", "plugins/tools/converter.js",
  "plugins/convert/togif.js", "plugins/convert/vocalremover.js",
  ...Object.keys({
    "to3d": 1, "toanime": 1, "toblack": 1, "tocartoon": 1, "tocermin": 1, "tochibi": 1,
    "toemotebatu": 1, "tofigurev2": 1, "tofigurine": 1, "toghibli": 1, "tohijab": 1,
    "toisland": 1, "tojapanese": 1, "tomanga": 1, "tomekah": 1, "tooilpainting": 1,
  }).map((n) => `plugins/ai-image/${n}.js`)];
for (const p of all) {
  try {
    await import(pathToFileURL(path.join(REPO, p)).href);
    t("import " + p + " OK", true);
  } catch (e) {
    t("import " + p + " OK", false, e.message);
  }
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
