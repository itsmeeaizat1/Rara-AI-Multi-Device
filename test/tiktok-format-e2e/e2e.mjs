// E2E: format TikTok Downloader seragam (request owner 19 Sep — judul/uploader/
// username/durasi/view/like/komentar/share/download SD-HD sesuai kemampuan
// fitur) — nova-tiktok-format.js satu pintu + 5 plugin TikTok.
// Jalankan dari repo root: node test/tiktok-format-e2e/e2e.mjs
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
const { fmtNum, fmtTiktokDuration, tiktokCaption } =
  await import(pathToFileURL(path.join(REPO, "src/lib/nova-tiktok-format.js")).href);

// ── fmtNum: separator koma ala contoh owner ──
t("fmtNum: 720329 → '720,329'", fmtNum(720329) === "720,329");
t("fmtNum: string '720.329' (gaya ID) → '720,329'", fmtNum("720.329") === "720,329");
t("fmtNum: 753 → '753' (tanpa separator)", fmtNum(753) === "753");
t("fmtNum: 13432 → '13,432'", fmtNum(13432) === "13,432");
t("fmtNum: teks non-angka → apa adanya", fmtNum("abc") === "abc");
t("fmtNum: kosong → '' (baris dilewati)", fmtNum(null) === "" && fmtNum("") === "");

// ── fmtTiktokDuration: mm:ss zero-padded ──
t("fmtTiktokDuration: 20 dtk → '00:20'", fmtTiktokDuration(20) === "00:20");
t("fmtTiktokDuration: 160 dtk → '02:40'", fmtTiktokDuration(160) === "02:40");
t("fmtTiktokDuration: '00:20' string → tetap", fmtTiktokDuration("00:20") === "00:20");
t("fmtTiktokDuration: '0:20' → dipadding '00:20'", fmtTiktokDuration("0:20") === "00:20");
t("fmtTiktokDuration: 0/kosong → ''", fmtTiktokDuration(0) === "" && fmtTiktokDuration(null) === "");

// ── tiktokCaption: format contoh owner PERSIS ──
{
  const cap = tiktokCaption({
    title: "black hair harga mati🤞 #dohoon #TWS #247withus #kpop #fyp",
    uploader: "Zyachen",
    username: "disappo_1nted",
    duration: "00:20",
    views: 720329,
    likes: 188939,
    comments: 753,
    shares: 13432,
    download: "HD",
  });
  const expect =
`*TikTok Downloader*

📝 *Judul:* black hair harga mati🤞 #dohoon #TWS #247withus #kpop #fyp
👤 *Uploader:* Zyachen
🔗 *Username:* @disappo_1nted
⏱️ *Durasi:* 00:20
👁️ *Views:* 720,329
❤️ *Likes:* 188,939
💬 *Komentar:* 753
🔄 *Share:* 13,432
⬇️ *Download:* HD`;
  t("caption: format contoh owner PERSIS (judul→uploader→username→durasi→views→likes→komentar→share→download)", cap === expect, JSON.stringify(cap));
}

// ── caption: field hilang → baris dilewati, username auto-@, "-" di-skip ──
{
  const cap = tiktokCaption({ title: "Video X", duration: 20, download: "SD" });
  t("caption: cuma judul+durasi+download → tanpa baris lain",
    cap === "*TikTok Downloader*\n\n📝 *Judul:* Video X\n⏱️ *Durasi:* 00:20\n⬇️ *Download:* SD", JSON.stringify(cap));
  t("caption: username pakai @ otomatis", tiktokCaption({ username: "budi" }).includes("🔗 *Username:* @budi"));
  t("caption: username sudah @ → gak dobel", tiktokCaption({ username: "@budi" }).includes("🔗 *Username:* @budi"));
  t("caption: username '-' → baris hilang", !tiktokCaption({ username: "-" }).includes("Username"));
}

// ── 5 plugin pakai tiktokCaption + label download sesuai kemampuan ──
{
  const files = {
    "plugins/download/tiktokdl.js": ['tiktokCaption({', 'download: zann?.type === "nowatermark_hd" ? "HD" : "SD"'],
    "plugins/download/tiktokdl2.js": ['tiktokCaption({', 'download: result.type === "video" ? "SD" : null'],
    "plugins/download/tiktokv3.js": ['tiktokCaption({', 'download: "SD"'],
    "plugins/download/tiktokv4.js": ['tiktokCaption({', 'download: "SD"'],
    "plugins/download/tiktokmedia.js": ['tiktokCaption({', 'download: "HD"'],
  };
  for (const [f, needles] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(REPO, f), "utf8");
    t(f + " → pakai tiktokCaption satu pintu", src.includes(needles[0]));
    t(f + " → label download sesuai kemampuan engine", src.includes(needles[1]));
  }
}

// ── smoke import 5 plugin ──
for (const p of ["plugins/download/tiktokdl.js", "plugins/download/tiktokdl2.js", "plugins/download/tiktokv3.js", "plugins/download/tiktokv4.js", "plugins/download/tiktokmedia.js"]) {
  try {
    await import(pathToFileURL(path.join(REPO, p)).href);
    t("import " + p + " OK", true);
  } catch (e) {
    t("import " + p + " OK", false, e.message);
  }
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
