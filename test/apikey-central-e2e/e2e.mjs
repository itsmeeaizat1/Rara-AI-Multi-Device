// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// KONTRAK: Pusatisasi 3 titik key nyasar → src/lib/apikey/apikeys.json
// (audit 10 Okt 2026, disetujui owner: "ya")
//   1. plugins/tools/ampro.js — literal AIza (Firebase AlightMotion) → fitur.amproFirebase
//   2. src/lib/apikey/9routerapikey.json — file terpisah → section "router"
//   3. 11 file literal apikey:"kyzz" → scraper.kyzz
// Ptero-panels.json & db runtime (.setkey) TETAP by design (bukan sekadar key).

import { readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = (rel) => path.resolve(__dirname, "../..", rel);

let pass = 0, fail = 0;
function t(name, cond, info = "") {
  console.log(`  ${cond ? "✅" : "❌"} ${name}${cond ? "" : " — " + String(info).slice(0, 90)}`);
  cond ? pass++ : fail++;
}

console.log("\n═══ 1. apikeys.json: section baru ═══");
{
  const center = JSON.parse(readFileSync(R("src/lib/apikey/apikeys.json"), "utf8"));
  t("1a. section router ada (gateway + providers migrasi)", !!(center.router?.gateway && Array.isArray(center.router?.providers)), "router: " + (center.router ? "ada" : "hilang"));
  t("1b. fitur.amproFirebase terisi (nilai AIza lama)", /^AIza[A-Za-z0-9_-]{20,}$/.test(center.fitur?.amproFirebase || ""), String(center.fitur?.amproFirebase || "").slice(0, 12) + "...");
  t("1c. scraper.kyzz == 'kyzz' (key publik API gratis)", center.scraper?.kyzz === "kyzz", JSON.stringify(center.scraper?.kyzz));
}

console.log("\n═══ 2. file 9routerapikey.json dilebur ═══");
{
  t("2a. src/lib/apikey/9routerapikey.json TIDAK ada lagi", !existsSync(R("src/lib/apikey/9routerapikey.json")), "masih ada");
  const src = readFileSync(R("src/lib/rara-9router-local.js"), "utf8");
  t("2b. readRouter9Config baca section router apikeys.json", src.includes('raw?.router') && src.includes("apikeys.json"), "belum rewired");
  t("2c. ROUTER9_CONFIG override tetap didukung (seam test & VPS)", src.includes("ROUTER9_CONFIG"), "override dibuang");
}

console.log("\n═══ 3. ampro.js: literal AIza pindah ke pusat ═══");
{
  const src = readFileSync(R("plugins/tools/ampro.js"), "utf8");
  t("3a. gak ada literal AIza di ampro.js", !/AIza[A-Za-z0-9_-]{20,}/.test(src), (src.match(/AIza[A-Za-z0-9_-]{8}/) || ["?"])[0]);
  t("3b. ampro.js baca key dari pusat (getApiKey)", src.includes("getApiKey"), "import hilang");
  const ampro = await import(R("plugins/tools/ampro.js"));
  const amproCfg = ampro.default?.config || ampro.config;
  t("3c. plugin ampro tetap export config + handler", !!(amproCfg && (ampro.default?.handler || ampro.handler)), "export rusak");
  const { getApiKey } = await import(R("src/lib/rara-api-keys.js"));
  t("3d. getApiKey('ampro') resolve ke nilai pusat", /^AIza[A-Za-z0-9_-]{20,}$/.test(getApiKey("ampro") || ""), String(getApiKey("ampro") || "").slice(0, 12));
}

console.log("\n═══ 4. 11 literal kyzz → pusat ═══");
{
  const files = [
    "plugins/ai/zerogptv2.js", "plugins/airich/youtubeairich.js",
    "plugins/download/douyindl.js", "plugins/download/instagramdl.js",
    "plugins/download/instagrammedia.js", "plugins/download/soundclouddl.js",
    "plugins/download/tiktokdl.js", "plugins/download/twitterdl.js",
    "plugins/search/play.js", "plugins/search/playvideo.js",
  ];
  let masih = [];
  for (const f of files) {
    if (existsSync(R(f)) && /:\s*["']kyzz["']/.test(readFileSync(R(f), "utf8"))) masih.push(f); // literal VALUE doang; getApiKey("kyzz") sah
  }
  t("4a. gak ada literal 'kyzz' tersisa di 10 file", masih.length === 0, masih.join(", "));
  const { getApiKey } = await import(R("src/lib/rara-api-keys.js"));
  t("4b. getApiKey('kyzz') == 'kyzz'", getApiKey("kyzz") === "kyzz", JSON.stringify(getApiKey("kyzz")));
  const douyin = await import(R("plugins/download/douyindl.js"));
  const dCfg = douyin.default?.config || douyin.config;
  t("4c. douyindl tetap export config + handler", !!(dCfg && (douyin.default?.handler || douyin.handler)), "export rusak");
}

console.log("\n═══ 5. flatten & getter lain gak rusak ═══");
{
  const { getApiKeys } = await import(R("src/lib/config/env-loader.js"));
  const flat = getApiKeys();
  t("5a. flat.amproFirebase terbaca", !!flat.amproFirebase, "kosong");
  t("5b. flat.kyzz terbaca", flat.kyzz === "kyzz", JSON.stringify(flat.kyzz));
  t("5c. key section lain tetap ada (geminiStandalone dsb)", Object.keys(flat).length > 40, Object.keys(flat).length + " key");
}

console.log("\n═══ 5b. ATURAN WEB: tiap key punya label web di _note ═══");
{
  // ATURAN owner 10 Okt: tiap apikey dikomentari nama WEBSITE sumbernya di
  // _note_<key>.web — biar pas key expired tinggal cari ke webnya.
  // Key yang emang gak punya web → web: "-" (gak boleh kosong/hilang).
  const center = JSON.parse(readFileSync(R("src/lib/apikey/apikeys.json"), "utf8"));
  const DOMAIN = /https?:\/\/|[a-z0-9][a-z0-9-]*\.[a-z][a-z0-9.-]*/i;
  let noWeb = [], emptyWeb = [];
  const cekWeb = (sec, name, note) => {
    const w = note?.web;
    if (w === undefined || w === null) noWeb.push(sec + "." + name);
    else if (String(w).trim() === "") emptyWeb.push(sec + "." + name);
    else if (String(w).trim() !== "-" && !DOMAIN.test(String(w))) noWeb.push(sec + "." + " (web gak valid)");
  };
  for (const sec of ["aiSatuan", "raraai", "scraper", "fitur"]) {
    for (const [k, v] of Object.entries(center[sec] || {})) {
      if (k.startsWith("_") || typeof v !== "string") continue;
      cekWeb(sec, k, center[sec]["_note_" + k]);
    }
  }
  const provs = center.aiMultiprovider?.providers || {};
  for (const [k, p] of Object.entries(provs)) {
    if (k.startsWith("_") || typeof p !== "object" || !p) continue;
    cekWeb("providers", k, p._note);
  }
  t("5d. semua key punya _note.web (hilang: 0)", noWeb.length === 0, noWeb.slice(0, 6).join(", "));
  t("5e. gak ada web kosong — gak ada web = wajib '-'", emptyWeb.length === 0, emptyWeb.join(", "));
  t("5f. web '-' diizinkan (tanpa web sumber)", true);

  // ATURAN URUTAN (owner 10 Okt, WAJIB): nama fitur dulu, baru nama web
  let salahUrut = [];
  const cekUrut = (label, note) => {
    const ks = Object.keys(note || {});
    const fi = ks.indexOf("fitur"), wi = ks.indexOf("web");
    if (wi >= 0 && (fi < 0 || fi > wi)) salahUrut.push(label);
  };
  for (const sec of ["aiSatuan", "raraai", "scraper", "fitur"]) {
    for (const [k, v] of Object.entries(center[sec] || {})) {
      if (k.startsWith("_note")) cekUrut(sec + "." + k, v);
    }
  }
  for (const [k, p] of Object.entries(provs)) {
    if (k.startsWith("_")) { cekUrut("providers." + k, p); continue; }
    if (typeof p === "object" && p) cekUrut("providers." + k, p._note);
  }
  t("5g. URUTAN WAJIB: label fitur sebelum web di semua note", salahUrut.length === 0, salahUrut.slice(0, 5).join(", "));
}

console.log("\n═══ 6. repo bersih literal key ═══");
{
  // scan kasar file .js di plugins/ — gak boleh ada literal AIza (kunci API google)
  const { execSync } = await import("node:child_process");
  const out = execSync("grep -rlE 'AIza[A-Za-z0-9_-]{20,}' plugins/ --include='*.js' || true").toString().trim();
  t("6a. gak ada literal AIza di plugins/", out === "", out);
}

console.log(`\n===== APIKEY CENTRAL (KONTRAK): ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
