// E2E nova-uploader (1 Okt 2026) — ENGINE UPLOAD MULTI-HOST
// src/lib/nova-uploader.js — Termai dilepas (free-tier limit kecil, logic-bell
// 429 permanen) → rantai host publik TANPA KEY: kappa.lol → pone.rs → uguu.se.
// Zelapi gak dipakai: /tools/upload-nya mati (diuji live semua varian).
// Jalankan dari repo root: node test/uploader-e2e/e2e.mjs
// Mode live (upload nyata ke internet): NOVA_E2E_LIVE=1 node test/uploader-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");

const up = await import(pathToFileURL(path.join(REPO, "src/lib/nova-uploader.js")).href);
const tmp = await import(pathToFileURL(path.join(REPO, "src/lib/nova-tmpfiles.js")).href);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 200))); ok ? pass++ : fail++; };
const rd = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");

// ── 1. export & kompatibilitas nama lama ───────────────────────────
w("\n— 1. export engine & kompatibilitas —");
t("1a. uploadFile ada", typeof up.uploadFile === "function");
for (const nm of ["uploadImage", "uploadToTelegraph", "uploadTo0x0", "uploadToCatbox", "uploadToTmpfiles", "uploadToUguu"]) {
  t(`1b. ${nm} tetap ada & = uploadFile (38+ importer aman)`, up[nm] === up.uploadFile);
}
t("1c. updateAssetUrl tetap ada (change-asset family)", typeof up.updateAssetUrl === "function");

// ── 2. validasi input ──────────────────────────────────────────────
w("\n— 2. validasi —");
{
  const err = await up.uploadFile("bukan buffer").then(() => null, (e) => e);
  t("2a. non-Buffer ditolak", err instanceof Error && /Buffer/.test(err.message), err?.message);
}
{
  const err = await up.uploadFile(null, "x.jpg").then(() => null, (e) => e);
  t("2b. null ditolak", err instanceof Error);
}

// ── 3. rantai fallback via seam host ───────────────────────────────
w("\n— 3. rantai fallback kappa → pone → uguu —");
{
  up._setUploaderHostsForTest([
    { name: "Kappa", fn: async () => { throw new Error("HTTP 500"); } },
    { name: "Pone", fn: async () => "https://u.pone.rs/ok.png" },
    { name: "Uguu", fn: async () => "https://n.uguu.se/ok.png" },
  ]);
  const url = await up.uploadFile(Buffer.from("tes"), "tes.png");
  t("3a. host pertama gagal → nyantol ke host kedua", url === "https://u.pone.rs/ok.png", url);
  up._resetUploaderHttpForTest();
}
{
  up._setUploaderHostsForTest([
    { name: "Kappa", fn: async () => { throw new Error("HTTP 429"); } },
    { name: "Pone", fn: async () => { throw new Error("HTTP 500"); } },
    { name: "Uguu", fn: async () => "https://n.uguu.se/last.png" },
  ]);
  const url = await up.uploadFile(Buffer.from("tes"), "tes.jpg");
  t("3b. dua host pertama gagal → host ketiga sukses", url === "https://n.uguu.se/last.png", url);
  up._resetUploaderHttpForTest();
}
{
  up._setUploaderHostsForTest([
    { name: "Kappa", fn: async () => { throw new Error("HTTP 429"); } },
    { name: "Pone", fn: async () => { throw new Error("timeout"); } },
    { name: "Uguu", fn: async () => { throw new Error("HTTP 500"); } },
  ]);
  const err = await up.uploadFile(Buffer.from("tes"), "tes.jpg").then(() => null, (e) => e);
  t("3c. semua gagal → error jujur nyebut 3 host", err instanceof Error && /Kappa/.test(err.message) && /Pone/.test(err.message) && /Uguu/.test(err.message), err?.message);
  up._resetUploaderHttpForTest();
}

// ── 4. seam total _http ────────────────────────────────────────────
w("\n— 4. seam total —");
{
  up._setUploaderHttpForTest(async (buf, fn) => `https://fake.local/${fn}-${buf.length}`);
  const url = await up.uploadFile(Buffer.from("abc"), "x.png");
  t("4a. _http override balikin URL dari seam", url === "https://fake.local/x.png-3", url);
  up._resetUploaderHttpForTest();
  up._setUploaderHostsForTest([{ name: "T", fn: async () => "https://t.local/a" }]);
  const url2 = await up.uploadFile(Buffer.from("abc"), "x.png");
  t("4b. reset _http → rantai host jalan lagi", url2 === "https://t.local/a", url2);
  up._resetUploaderHttpForTest();
}

// ── 5. nova-tmpfiles signature {url, directUrl} ─────────────────────
w("\n— 5. nova-tmpfiles shim —");
{
  const r = await tmp.uploadTo0x0(Buffer.from("gambar"), { filename: "image.jpg", contentType: "image/jpeg" });
  t("5a. return {url, directUrl} (fakeml/fakeff aman)", typeof r === "object" && r.url && r.directUrl === r.url, JSON.stringify(r));
}
{
  const err = await tmp.uploadTo0x0("bukan buffer").then(() => null, (e) => e);
  t("5b. non-Buffer ditolak", err instanceof Error);
}

// ── 6. termai bersih dari codebase ─────────────────────────────────
w("\n— 6. termai dilepas penuh —");
{
  const files = [
    "plugins/browser/tourl.js",
    "plugins/search/animeapaini.js",
    "plugins/tools/whatmusic.js",
    "plugins/tools/qrcustom.js",
    "plugins/tools/onephoto.js",
    "plugins/main/tqto.js",
    "src/lib/nova-uploader.js",
    "src/lib/nova-tmpfiles.js",
    "src/lib/nova-boot-doctor.js",
  ];
  let clean = true;
  for (const f of files) {
    if (rd(f).includes("c.termai.cc") || rd(f).includes("APIkey.termai")) {
      w("     ⚠️ masih ada termai di " + f); clean = false;
    }
  }
  t("6a. 0 referensi endpoint/key termai di semua file dimigrasi", clean);
  t("6b. logic-bell.js dihapus (orphaned)", !fs.existsSync(path.join(REPO, "src/scraper/logic-bell.js")));
  t("6c. tourl: host Termai dibuang dari UPLOADERS", !rd("plugins/browser/tourl.js").includes('name: "Termai"'));
  t("6d. boot-doctor: entry termai dibuang", !rd("src/lib/nova-boot-doctor.js").includes('key: "termai"'));
  t("6e. whatmusic: uploadTo0x0 balikin URL string (fix laten object)", rd("plugins/tools/whatmusic.js").includes("return uploadImage(buffer, filename)"));
  t("6f. animeapaini: upload pakai engine nova-uploader", rd("plugins/search/animeapaini.js").includes("uploadImage(buffer, 'image.jpg')"));
  t("6g. qrcustom: upload pakai engine nova-uploader", rd("plugins/tools/qrcustom.js").includes("uploadImage(buffer, 'logo.png')"));
}

// ── 7. LIVE (opsional, default off) ────────────────────────────────
if (process.env.NOVA_E2E_LIVE === "1") {
  w("\n— 7. LIVE upload (internet nyata) —");
  {
    const buf = Buffer.from("live uploader e2e " + Date.now(), "utf8");
    const url = await up.uploadFile(buf, "e2e.txt");
    t("7a. upload live sukses balikin URL", /^https:\/\/(kappa\.lol|u\.pone\.rs|[a-z]\.uguu\.se)\//.test(url), url);
    const r = await fetch(url);
    const body = await r.text();
    t("7b. URL live bisa di-download & isine sama", r.status === 200 && body === buf.toString(), r.status + " " + body.slice(0, 40));
  }
  {
    // audio path (whatmusic flow)
    const buf = Buffer.from("audio dummy " + Date.now(), "utf8");
    const url = await up.uploadFile(buf, "audio.mp3");
    const r = await fetch(url);
    t("7c. file audio terupload & bisa diambil", r.status === 200, url);
  }
}

w(`\n— selesai: ${pass} lulus, ${fail} gagal —`);
process.exit(fail > 0 ? 1 : 0);
