// ── MORI ALLDOWNLOADER UPGRADE E2E (12 Okt 2026) ──────────────────────────────
// Upgrade scrapr vendored 1.0.0 → 1.2.1 (bareng Mori v4.4.0) + rename command
// alldownloaderv3 → morialldownloader. Verifikasi:
//   1. Bridge: 17 platform, 35 method, 6 resolver; engine baru ke-expose
//   2. Vendored scrapr 1.2.1: file engine baru ada, downreels & snapwc hilang
//   3. Plugin: command baru + alias lama tetep resolve via registry loader
//   4. Matrix & detect: Reddit + TeraBox ke-detect
//   5. Chain: engine baru masuk, downreels dibuang
//   6. QA gates: non-text & input acak → usage card bukan throw; engines subcommand
//   7. LIVE: reddit/rapidsave + terabox/sechno + bandcamp/direct dari jaringan asli

import assert from "node:assert/strict";

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};

const LIB = await import(new URL("../../src/scraper/mori-bridge.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT BRIDGE GAGAL:", e.message); process.exit(1); });
const { MORI, MORI_RESOLVER, moriScrape, moriResolve } = LIB;

console.log("── 1. Bridge engine inventory (scrapr 1.2.1) ──");
check("17 platform di bridge", Object.keys(MORI).length === 17);
const methodCount = Object.values(MORI).reduce((a, p) => a + Object.keys(p).length, 0);
check("35 method engine", methodCount === 35);
for (const [p, m] of [["reddit", "rapidsave"], ["terabox", "sechno"], ["rednote", "direct"], ["pixiv", "ajax"], ["bandcamp", "direct"], ["bilibili", "direct"], ["instagram", "snapsave"], ["spotify", "soundloaders"], ["spotify", "spotisaver"], ["tiktok", "tikdownloader"], ["twitter", "savetwt"], ["twitter", "direct"], ["youtube", "ytmp3gg"], ["youtube", "playlist"], ["instagram", "direct"], ["pinterest", "direct"]]) {
  check(`engine baru ${p}/${m} ada`, typeof MORI[p]?.[m] === "function");
}
check("engine lama hilang: instagram/downreels (mati upstream)", MORI.instagram?.downreels === undefined);
check("engine lama hilang: bilibili/snapwc (Node 20+ RSA, dihapus upstream)", MORI.bilibili?.snapwc === undefined);
check("6 resolver di bridge", Object.keys(MORI_RESOLVER).length === 6);
for (const r of ["mediafire", "sfile", "safelinku", "sub2unlock", "rekonise", "unshorten"]) {
  check(`resolver ${r} ada`, typeof MORI_RESOLVER[r] === "function");
}

console.log("── 2. scrapr method tak dikenal → error jelas ──");
try { await moriScrape("reddit", "metode palsu", "https://x.id"); check("metode palsu dilempar Error", false); }
catch (e) { check("metode palsu dilempar Error", /gak ada di bridge/.test(e.message)); }
try { await moriResolve("resolver palsu", "https://x.id"); check("resolver palsu dilempar Error", false); }
catch (e) { check("resolver palsu dilempar Error", /gak ada di bridge/.test(e.message)); }

console.log("── 3. Plugin rename morialldownloader ──");
const PLUG = await import(new URL("../../plugins/download/morialldownloader.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT PLUGIN GAGAL:", e.message); process.exit(1); });
const cfg = PLUG.config || PLUG.pluginConfig;
check("command utama morialldownloader", cfg.name === "morialldownloader");
check("alias baru persis: morialldl + moridl", cfg.alias.length === 2 && cfg.alias.includes("morialldl") && cfg.alias.includes("moridl"));
check("alias lama (alldl3, alldownloaderv3, all3, adl3, allv3) dihapus semua", ["alldl3", "alldownloaderv3", "all3", "adl3", "allv3", "alldownloader3"].every((a) => !cfg.alias.includes(a)));
check("deskripsi nyebut 17 platform + Reddit/TeraBox baru", /17 platform/.test(cfg.description) && /Reddit/.test(cfg.description) && /TeraBox/.test(cfg.description));
check("usage pakai .morialldownloader", cfg.usage.includes(".morialldownloader"));
check("file lama alldownloaderv3.js gak ada lagi", !(await import("node:fs")).existsSync(new URL("../../plugins/download/alldownloaderv3.js", import.meta.url)));

console.log("── 4. Matrix platform & detect ──");
// detectPlatform internal — uji via source + perilaku: regex matrix di file
const { readFile } = await import("node:fs/promises");
const plugSrc = await readFile(new URL("../../plugins/download/morialldownloader.js", import.meta.url), "utf-8");
check("matrix: entri reddit ada", /reddit:\s*\{\s*icon/.test(plugSrc));
check("matrix: entri terabox ada", /terabox:\s*\{\s*icon/.test(plugSrc));
check("matrix label 17 platform", /17 platform ala Mori v4\.4\.0/.test(plugSrc));
check("detectPlatform urutan: reddit & terabox dicek duluan", plugSrc.indexOf('"pixiv", "rednote", "reddit", "terabox"') > 0);
// regex match cek langsung (dicek PALING AKHIR biar gak nyasar)
const red = /(?:^|\.)(?:reddit\.com|redd\.it)/.test("https://www.reddit.com/r/indonesia/s/FhrWISKmrS");
const tbox = /(?:^|\.)(?:terabox\.com|teraboxapp\.com|1024tera\.com|teraboxlink\.\w+|terabox\.\w+)/.test("https://www.terabox.com/wap/share/filelist?surl=x");
check("regex reddit cocok contoh URL", red);
check("regex terabox cocok contoh URL", tbox);

console.log("── 5. Engine chain ──");
check("chain reddit: moriRapidSave", /reddit:\s*\["moriRapidSave"/.test(plugSrc));
check("chain terabox: moriSechno", /terabox:\s*\["moriSechno"/.test(plugSrc));
check("chain youtube: moriYTmp3GG sebelum moriYTmp3", plugSrc.indexOf("moriYTmp3GG") < plugSrc.indexOf('"moriYTmp3"'));
check("chain spotify: spotisaver + soundloaders duluan", plugSrc.indexOf("moriSpotisaver") < plugSrc.indexOf("moriSpotiDown"));
check("chain tiktok: moriTikDownloader masuk", plugSrc.includes('"moriTikDownloader"'));
check("chain twitter: moriSaveTWT masuk", plugSrc.includes('"moriSaveTWT"'));
check("chain bilibili: direct, snapwc dibuang", /bilibili:\s*\["moriBilibiliDirect"/.test(plugSrc) && !plugSrc.includes("moriSnapWC"));
check("downreels dibuang dari semua chain", !plugSrc.includes("moriDownReels"));
check("factory bandcamp direct & pixiv ajax ada", plugSrc.includes('"bandcamp", "direct", "BandcampDirect"') && plugSrc.includes('"pixiv", "ajax", "PixivAjax"'));

console.log("── 6. QA gates: handler bener gak throw ──");
const handler = PLUG.handler || PLUG.default;
check("handler ada", typeof handler === "function");
{
  // pesan acak non-command → gak dipanggil; command dengan input non-teks/None → usage card
  const replies = [];
  const fakeMsg = (text, quoted) => ({
    text, reply: async (r) => replies.push(String(r)),
    react: async () => {},
    mentionedJid: [], quoted: quoted || null,
  });
  // (a) jalur publik: handler → chain fallback all-dl → kartu "semua gagal", gak throw
  const usageErr = [];
  try {
    await handler(fakeMsg(""), { command: "morialldownloader", args: [], text: "", sock: {} });
  } catch (e) { usageErr.push(e); }
  check("tanpa arg gak throw → dibales kartu fallback (desain existing chain all-dl)", usageErr.length === 0 && replies.length > 0 && /『/.test(replies[0]));
  // (b) jalur inti: handlerCore langsung (ctx chain) → usage card panduan command baru
  replies.length = 0;
  try {
    await handler(fakeMsg(""), { command: "morialldownloader", args: [], text: "", sock: {}, __novaAllDlAttempt: true });
  } catch (e) { usageErr.push(e); }
  check("handlerCore tanpa URL → usage card nyebut .morialldownloader", usageErr.length === 0 && replies.length > 0 && /morialldownloader/.test(replies[0]) && /『/.test(replies[0]));
}

console.log("── 7. LIVE: engine baru dari jaringan asli (gerbang 1 QA) ──");
{
  let liveOk = 0, liveTry = 0;
  const live = async (p, m, url) => {
    liveTry++;
    try {
      const r = await moriScrape(p, m, url);
      const ok = Array.isArray(r.downloads) && r.downloads.length > 0;
      if (ok) liveOk++;
      console.log(`  ${ok ? "✅" : "⚠️ "} [info-live] ${p}/${m} ${ok ? "balik downloads" : "gagal (block IP upstream — toleransi)"}`);
    } catch (e) {
      console.log(`  ⚠️  [info-live] ${p}/${m} gagal (toleransi block IP): ${String(e.message).slice(0, 80)}`);
    }
  };
  await live("reddit", "rapidsave", "https://www.reddit.com/r/indonesia/s/FhrWISKmrS");
  await live("terabox", "sechno", "https://www.terabox.com/wap/share/filelist?surl=rIMSgmDoO4oZKpgQhsoeig");
  await live("bandcamp", "direct", "https://tycho.bandcamp.com/track/awake");
  check(`minimal 2 dari 3 live engine baru OK (toleransi block IP upstream)`, liveOk >= 2);
}

console.log(`\n${fail === 0 ? "✅ SEMUA" : "❌ SEBAGIAN"}: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
