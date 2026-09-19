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

// ── header dinamis per platform (request lanjutan owner: fitur lain disamakan) ──
{
  const cap = tiktokCaption({ header: "YouTube Downloader", title: "Nova Video", uploader: "Nova Channel", duration: "2:40", views: 1234567, download: "720p" });
  t("caption: header dinamis — 'YouTube Downloader' bukan TikTok", cap.startsWith("*YouTube Downloader*\n\n📝 *Judul:* Nova Video"));
  t("caption: durasi '2:40' → dipadding '02:40'", cap.includes("⏱️ *Durasi:* 02:40"));
  t("caption: views 1234567 → '1,234,567'", cap.includes("👁️ *Views:* 1,234,567"));
  t("caption: download 720p (kualitas jujur per fitur)", cap.includes("⬇️ *Download:* 720p"));
  t("caption: header kosong → fallback TikTok Downloader", tiktokCaption({ header: "" }).startsWith("*TikTok Downloader*"));
  const capLong = tiktokCaption({ header: "All Downloader", duration: "120:30" });
  t("caption: durasi >99 menit tetap utuh", capLong.includes("⏱️ *Durasi:* 120:30"));
}

// ── 5 plugin TikTok pakai tiktokCaption + label download sesuai kemampuan ──
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

// ── 10 plugin downloader lain disamakan formatnya ──
{
  const files = {
    "plugins/download/alldl.js": ['tiktokCaption({', '`${platform.name} Downloader`'],
    "plugins/download/alldownloader.js": ['tiktokCaption({', '`${style.name} Downloader`'],
    "plugins/download/ytmp4.js": ['tiktokCaption({', '"YouTube Downloader"'],
    "plugins/download/ytmp3.js": ['tiktokCaption({', '"YouTube Downloader"'],
    "plugins/download/ytmp4v3.js": ['tiktokCaption({', '"YouTube Downloader"'],
    "plugins/download/ytmp3v3.js": ['tiktokCaption({', '"YouTube Downloader"'],
    "plugins/download/douyindl.js": ['tiktokCaption({', '"Douyin Downloader"'],
    "plugins/download/twitterdl.js": ['tiktokCaption({', '"Twitter/X Downloader"'],
    "plugins/download/instagrammedia.js": ['tiktokCaption({', '"Instagram Downloader"'],
    "plugins/download/igv2.js": ['tiktokCaption({', '"Instagram Downloader"'],
  };
  for (const [f, needles] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(REPO, f), "utf8");
    t(f + " → pakai tiktokCaption satu pintu", src.includes(needles[0]));
    t(f + " → header platform sesuai fitur", src.includes(needles[1]));
  }
}

// ── smoke import 15 plugin ──
for (const p of ["plugins/download/tiktokdl.js", "plugins/download/tiktokdl2.js", "plugins/download/tiktokv3.js", "plugins/download/tiktokv4.js", "plugins/download/tiktokmedia.js", "plugins/download/alldl.js", "plugins/download/alldownloader.js", "plugins/download/ytmp4.js", "plugins/download/ytmp3.js", "plugins/download/ytmp4v3.js", "plugins/download/ytmp3v3.js", "plugins/download/douyindl.js", "plugins/download/twitterdl.js", "plugins/download/instagrammedia.js", "plugins/download/igv2.js"]) {
  try {
    await import(pathToFileURL(path.join(REPO, p)).href);
    t("import " + p + " OK", true);
  } catch (e) {
    t("import " + p + " OK", false, e.message);
  }
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
