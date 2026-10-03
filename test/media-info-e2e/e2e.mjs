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
    t(`${name}.js → field Input/Style/Hasil (tanpa Engine)`, ['"Input"', '"Style"', '"Hasil"'].every((l) => src.includes(`label: ${l}`)) && !/label: *["']Engine["']/.test(src));
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

// ── baris info ringkas GIF reaksi anime (request owner 3 Okt: "jenis gambar/gif, ukuran") ──
{
  const { mediaInfoLine } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-media-info.js")).href);
  t("mediaInfoLine: GIF + ukuran", mediaInfoLine({ kind: "GIF", bytes: 246272 }) === "GIF · 240.5 KB");
  t("mediaInfoLine: tanpa ukuran = hanya jenis (jujur, tak ngarang)", mediaInfoLine({ kind: "Gambar" }) === "Gambar");
  t("mediaInfoLine: kosong total = string kosong", mediaInfoLine({}) === "" && mediaInfoLine() === "");
  t("mediaInfoLine: extra ikut digabung", mediaInfoLine({ kind: "GIF", bytes: 3 * 1024 * 1024, extra: "x" }) === "GIF · 3.0 MB · x");
  const semua = fs.readdirSync(path.join(REPO, "plugins/anime")).filter((f) => /^anime-.+\.js$/.test(f));
  // anime-baka sudah punya kartu penuh (mediaInfoCaption) dari tahap sebelumnya → dikecualikan supaya TIDAK dobel.
  const SUDAH_KARTU_PENUH = ["anime-baka.js"];
  const animeFiles = semua.filter((f) => !SUDAH_KARTU_PENUH.includes(f));
  const tanpaInfo = animeFiles.filter((f) => !rd("plugins/anime/" + f).includes("mediaInfoLine("));
  t(`anime-*: ${animeFiles.length} plugin GIF reaksi pakai mediaInfoLine (tak ada yang ketinggalan)`, tanpaInfo.length === 0, tanpaInfo.join(","));
  const tanpaImpor = animeFiles.filter((f) => !/import \{ mediaInfoLine \}/.test(rd("plugins/anime/" + f)));
  t("anime-*: semua yang memanggil mediaInfoLine juga mengimpornya (anti ReferenceError senyap)", tanpaImpor.length === 0, tanpaImpor.join(","));
  const duaPesan = semua.filter((f) => rd("plugins/anime/" + f).includes("mediaInfoCaption(") && rd("plugins/anime/" + f).includes("mediaInfoLine("));
  t("anime-*: TIDAK ada plugin dengan kartu penuh DAN baris info sekaligus (anti dobel)", duaPesan.length === 0, duaPesan.join(","));
  t("anime-baka: tetap kartu penuh, tanpa baris info", rd("plugins/anime/anime-baka.js").includes("mediaInfoCaption(") && !rd("plugins/anime/anime-baka.js").includes("mediaInfoLine("));
}

// ── TANPA Engine/API di field info (request owner 3 Okt: "yang menyebutkan api maupun lokal atau api external dihapus aja") ──
{
  const walk = (d) => fs.readdirSync(path.join(REPO, d), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(d + "/" + e.name) : e.name.endsWith(".js") ? [d + "/" + e.name] : []);
  const semua = [...walk("plugins"), "src/lib/rara-kyio.js"];
  const engine = semua.filter((f) => /label: *["']Engine["']/.test(rd(f)));
  t("field info: TIDAK ada label Engine sama sekali (API maupun lokal)", engine.length === 0, engine.slice(0, 4).join(","));
  // nama API/penyedia tidak boleh nongol di judul kartu (header) maupun field Sumber/Provider/Via/API
  const API = /ikyy|neoxr|api-faa|faa ai|seaart|stemsplit|pollinations|prodia|replicate|removebackground|pixa\b|microlink|onepunya|qwa api|unlimitedai|waifu\.pics|nekos\.best|kyio api|zelapi|termai|inworld/i;
  const bocor = [];
  for (const f of semua) for (const line of rd(f).split("\n")) {
    if (!/mediaInfoCaption\(\{ *header:/.test(line) && !/label: *["'](Sumber|Source|Provider|Server|Via|API)["']/.test(line)) continue;
    if (f.endsWith("ai-set.js")) continue; // pengaturan AI: provider memang isi perintahnya, bukan info media
    if (API.test(line)) bocor.push(f + ": " + line.trim().slice(0, 80));
  }
  t("judul kartu & field Sumber/Provider: TIDAK menyebut nama API/penyedia", bocor.length === 0, bocor.slice(0, 3).join(" | "));
  t("anime-baka: tanpa field Sumber (nama API)", !/label: *["']Sumber["']/.test(rd("plugins/anime/anime-baka.js")));
  t("kyio: judul kartu info bukan 'Kyio API'", !/mediaInfoCaption\(\{ *header: *["']Kyio API/.test(rd("src/lib/rara-kyio.js")));
}

// ── TANPA nama API/mesin di SEMUA teks hasil (request owner 3 Okt: "info field hanya info tentang fitur ... tidak menyebutkan api di semua fitur") ──
{
  const walk = (d) => fs.readdirSync(path.join(REPO, d), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(d + "/" + e.name) : e.name.endsWith(".js") ? [d + "/" + e.name] : []);
  const semua = walk("plugins");
  const nonKomentar = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
  const cari = (re) => semua.flatMap((f) => nonKomentar(rd(f)).filter((l) => re.test(l)).map((l) => f.split("/").pop() + ": " + l.trim().slice(0, 70)));
  const a = cari(/lines\.push\(`Source: \$\{method\}`\)/);
  t("downloader: tidak ada baris 'Source: ${method}' (nama API/scraper)", a.length === 0, a.slice(0, 3).join(" | "));
  const b = cari(/\((zelapi)\)|via zelapi|Powered by (sharp|Onepunya)/).filter((l) => !/API_KEY|apikeys|description/.test(l));
  t("tidak ada akhiran '(zelapi)' / 'via zelapi' / 'Powered by sharp|Onepunya' di teks hasil", b.length === 0, b.slice(0, 3).join(" | "));
  const c = cari(/(Engine|Mesin): *\*?(\$\{|["'`]?[A-Za-z])/).filter((l) => !/search\.js|console\.|label:|ENGINE|engine ===|\.engine\b|return \{|engine *[:=] *[\w"']|Engine AI lagi|Pilihan engine|TTS Engine|hiaiagent|aicall2/.test(l));
  t("teks hasil: tidak ada baris 'Engine: <nama mesin>' di caption", c.length === 0, c.slice(0, 4).join(" | "));
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
