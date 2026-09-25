// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// test/daftar-api-e2e/e2e.mjs — E2E 2 plugin baru dari daftar farizdotid (tanpa API key):
// .kuncijawabantts (kunci-tts-api.vercel.app) + .caridoa (doa-doa-api-ahmadramadhan.fly.dev).
// Semua akses HTTP lewat seam _setHttpForTest — gak ada network di e2e.
// Jalankan: node test/daftar-api-e2e/e2e.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(import.meta.dirname, "../..");
let pass = 0, fail = 0;
const t = (name, ok, extra = "") => {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} → ${typeof extra === "string" ? extra.slice(0, 200) : JSON.stringify(extra)?.slice(0, 200)}`); }
};
const { toSC } = await import(R + "/src/lib/nova-menu-style.js");
const hasSC = (reply, expected) => String(reply).toLowerCase().includes(toSC(expected));

// ── init db ringan ──
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "daftarapi-e2e-"));
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

function mkM(over = {}) {
  return {
    command: "kuncijawabantts",
    args: [],
    text: "",
    chat: "62812user@s.whatsapp.net",
    sender: "62812user@s.whatsapp.net",
    reply: async (x) => { mkM._replies.push(String(x)); },
    ...over,
  };
}
mkM._replies = [];
const lastReply = () => (mkM._replies.length ? mkM._replies[mkM._replies.length - 1] : "");

console.log("— 1. kuncijawabantts —");
const tts = await import(R + "/plugins/fun/answerkeytts.js");
{
  t("1. config ok (name/alias/category fun)", tts.pluginConfig?.name === "kuncijawabantts" && tts.pluginConfig?.alias?.includes("kuncitts") && tts.pluginConfig?.category === "fun");
  // soal kosong → panduan
  mkM._replies.length = 0;
  await tts.handler(mkM({ text: "" }), { sock: {}, db: {} });
  t("1a. soal kosong → panduan cara pakai", hasSC(lastReply(), "cara pakai"), lastReply().slice(0, 120));
  // happy path — 3 jawaban
  mkM._replies.length = 0;
  let gotUrl = "";
  tts._setHttpForTest(async (url) => {
    gotUrl = url;
    return {
      status: 200,
      data: { title: "Kunci jawaban TTS Tidak Jujur", total: 3, answers: [
        { stars: 5, word: "CURANG", clue: "Tidak jujur" },
        { stars: 4, word: "FAIR", clue: "Sportif, jujur" },
        { stars: 3, word: "BOHONG", clue: "Tidak jujur" },
      ] },
    };
  });
  await tts.handler(mkM({ text: "tidak jujur" }), { sock: {}, db: {} });
  t("1b. param question ter-encode ke URL", gotUrl.includes("question=tidak%20jujur"), gotUrl);
  t("1c. jawaban dirender + bintang kecocokan", hasSC(lastReply(), "curang") && lastReply().includes("★★★★★"), lastReply().slice(0, 150));
  t("1d. clue jawaban ikut ditampilkan", hasSC(lastReply(), "sportif"), lastReply().slice(0, 150));
  // cap 12 jawaban
  mkM._replies.length = 0;
  tts._setHttpForTest(async () => ({
    status: 200,
    data: { title: "T", total: 25, answers: Array.from({ length: 25 }, (_, i) => ({ stars: 3, word: `WORD${i + 1}`, clue: "" })) },
  }));
  await tts.handler(mkM({ text: "banyak" }), { sock: {}, db: {} });
  t("1e. 25 jawaban → 12 teratas + info total", hasSC(lastReply(), "word12") && !hasSC(lastReply(), "word13,") && hasSC(lastReply(), "25 jawaban"), lastReply().slice(0, 150));
  // gak ketemu
  mkM._replies.length = 0;
  tts._setHttpForTest(async () => ({ status: 200, data: { title: "X", total: 0, answers: [] } }));
  await tts.handler(mkM({ text: "xyzabc" }), { sock: {}, db: {} });
  t("1f. gak ketemu → jujur + saran kata kunci", hasSC(lastReply(), "gak ketemu"), lastReply().slice(0, 120));
  // server error
  mkM._replies.length = 0;
  tts._setHttpForTest(async () => ({ status: 500, data: null }));
  await tts.handler(mkM({ text: "tes" }), { sock: {}, db: {} });
  t("1g. 500 → pesan server bermasalah", hasSC(lastReply(), "server tts bermasalah"), lastReply().slice(0, 120));
  // network gagal
  mkM._replies.length = 0;
  tts._setHttpForTest(async () => { throw new Error("network down"); });
  await tts.handler(mkM({ text: "tes" }), { sock: {}, db: {} });
  t("1h. koneksi gagal → jujur", hasSC(lastReply(), "gagal nyambung"), lastReply().slice(0, 120));
  tts._resetSeamsForTest();
}

console.log("— 2. caridoa —");
const doa = await import(R + "/plugins/islami/prayerfinder.js");
{
  t("2. config ok (name/alias/category islami)", doa.pluginConfig?.name === "caridoa" && doa.pluginConfig?.alias?.includes("doadoa") && doa.pluginConfig?.category === "islami");
  // nama kosong → panduan
  mkM._replies.length = 0;
  await doa.handler(mkM({ command: "caridoa", text: "" }), { sock: {}, db: {} });
  t("2a. nama kosong → panduan + contoh doa", hasSC(lastReply(), "cara pakai") && hasSC(lastReply(), "sebelum makan"), lastReply().slice(0, 120));
  // happy path
  mkM._replies.length = 0;
  let gotUrl = "";
  doa._setHttpForTest(async (url) => {
    gotUrl = url;
    return {
      status: 200,
      data: { id: "30", doa: "Doa sebelum makan", ayat: "اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allahumma baarik lanaa fiimaa rozaqtanaa", artinya: "Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan" },
    };
  });
  await doa.handler(mkM({ command: "caridoa", text: "sebelum makan" }), { sock: {}, db: {} });
  t("2b. slug nama doa masuk ke path API", gotUrl.includes("/api/doa/sebelum makan") || gotUrl.includes("/api/doa/sebelum%20makan"), gotUrl);
  t("2c. doa dirender: nama + ayat + latin + arti", hasSC(lastReply(), "doa sebelum makan") && lastReply().includes("اَللّٰهُمَّ") && hasSC(lastReply(), "ya allah, berkahilah"), lastReply().slice(0, 200));
  // fuzzy — API gak ketemu: array msg
  mkM._replies.length = 0;
  doa._setHttpForTest(async () => ({ status: 200, data: [{ data: "", msg: "mohon maaf doa yang anda cari gak ketemu" }] }));
  await doa.handler(mkM({ command: "caridoa", text: "xyz" }), { sock: {}, db: {} });
  t("2d. gak ketemu (format array) → jujur + saran", hasSC(lastReply(), "gak ketemu"), lastReply().slice(0, 120));
  // 404 / status lain
  mkM._replies.length = 0;
  doa._setHttpForTest(async () => ({ status: 404, data: null }));
  await doa.handler(mkM({ command: "caridoa", text: "tes" }), { sock: {}, db: {} });
  t("2e. 404 → pesan server bermasalah", hasSC(lastReply(), "server doa bermasalah"), lastReply().slice(0, 120));
  // network gagal
  mkM._replies.length = 0;
  doa._setHttpForTest(async () => { throw new Error("timeout"); });
  await doa.handler(mkM({ command: "caridoa", text: "tes" }), { sock: {}, db: {} });
  t("2f. koneksi gagal → jujur", hasSC(lastReply(), "gagal nyambung"), lastReply().slice(0, 120));
  doa._resetSeamsForTest();
}

console.log("— 3. anti-dobel dengan fitur lama —");
{
  // .doaharian (offline) & .zlokal suite harus tetap ada dan gak ketimpa alias
  const dh = (await import(R + "/plugins/islami/dailyprayer.js")).config;
  const dhAlias = dh?.alias || dh?.aliases || [];
  t("3a. .doaharian lama tetap utuh (nama beda)", dh?.name === "doaharian" && !dhAlias.includes("caridoa"), "");
  t("3b. alias caridoa gak nabrak doaharian", !doa.pluginConfig.alias.includes("doaharian"), "");
  const zl = (await import(R + "/plugins/search/zlokal.js")).config;
  const zlAlias = zl?.alias || zl?.aliases || [];
  t("3c. alias baru gak nabrak zlokal (puasasunnah milik zlokal)", !doa.pluginConfig.alias.includes("puasasunnah") && !tts.pluginConfig.alias.includes("puasasunnah") && zlAlias.includes("puasasunnah"), "");
  t("3d. cmd kuncijawabantts gak ada di plugin lain", !zlAlias.includes("kuncijawabantts") && !dhAlias.includes("kuncijawabantts"), "");
}


console.log("— 4. hargakripto (Indodax) —");
const krip = await import(R + "/plugins/search/cryptoprice.js");
{
  t("4. config ok (name/alias/category search)", krip.pluginConfig?.name === "hargakripto" && krip.pluginConfig?.alias?.includes("indodax") && krip.pluginConfig?.category === "search");
  mkM._replies.length = 0;
  krip._setHttpForTest(async (url) => {
    if (url.includes("ticker_all")) return { status: 200, data: { tickers: {
      btc_idr: { last: "1502100000", buy: "1502100000", sell: "1502101000", high: "1550001000", low: "1491453000", vol_btc: "35.03" },
      eth_idr: { last: "48000000", buy: "47900000", sell: "48100000", high: "49000000", low: "47000000", vol_eth: "120" },
    } } };
    return { status: 200, data: {} };
  });
  await krip.handler(mkM({ command: "hargakripto", args: [] }), { sock: {}, db: {} });
  t("4a. tanpa arg → daftar koin populer + harga format rupiah", hasSC(lastReply(), "bitcoin (btc)") && lastReply().includes("1.502.100.000"), lastReply().slice(0, 150));
  mkM._replies.length = 0;
  let gotUrl = "";
  krip._setHttpForTest(async (url) => {
    gotUrl = url;
    return { status: 200, data: { ticker: { buy: "1502100000", high: "1550001000", last: "1502100000", low: "1491453000", sell: "1502101000", server_time: 1790213169, vol_btc: "35.03367753", vol_idr: "53294156742" } } };
  });
  await krip.handler(mkM({ command: "hargakripto", args: ["btc"] }), { sock: {}, db: {} });
  t("4b. .hargakripto btc → path ticker/btc_idr", gotUrl.endsWith("/api/ticker/btc_idr"), gotUrl);
  t("4c. detail dirender (harga/beli/jual/high/low/vol)", hasSC(lastReply(), "btc/idr") && lastReply().includes("1.502.100.000") && hasSC(lastReply(), "24j tertinggi"), lastReply().slice(0, 200));
  mkM._replies.length = 0;
  krip._setHttpForTest(async (url) => {
    gotUrl = url;
    if (url.endsWith("ticker/eth_usdt")) return { status: 200, data: { ticker: { last: "3200", buy: "3199", sell: "3201", high: "3300", low: "3100", vol_eth: "88" } } };
    return { status: 404, data: {} };
  });
  await krip.handler(mkM({ command: "hargakripto", args: ["eth", "usdt"] }), { sock: {}, db: {} });
  t("4d. .hargakripto eth usdt → pair eth_usdt", gotUrl.endsWith("/api/ticker/eth_usdt"), gotUrl);
  mkM._replies.length = 0;
  krip._setHttpForTest(async () => ({ status: 200, data: { error: "invalid_pair", error_description: "Invalid Pair" } }));
  await krip.handler(mkM({ command: "hargakripto", args: ["xyzabc"] }), { sock: {}, db: {} });
  t("4e. pair gak ada → jujur + contoh", hasSC(lastReply(), "gak ada di indodax"), lastReply().slice(0, 130));
  mkM._replies.length = 0;
  let urlPair = "";
  krip._setHttpForTest(async (url) => { urlPair = url; return { status: 200, data: { ticker: { last: "1", buy: "1", sell: "1", high: "1", low: "1" } } }; });
  await krip.handler(mkM({ command: "hargakripto", args: ["btc_usdt"] }), { sock: {}, db: {} });
  t("4f. arg underscore dipakai langsung sebagai pair", urlPair.endsWith("/api/ticker/btc_usdt"), urlPair);
  mkM._replies.length = 0;
  krip._setHttpForTest(async () => { throw new Error("down"); });
  await krip.handler(mkM({ command: "hargakripto", args: ["btc"] }), { sock: {}, db: {} });
  t("4g. koneksi gagal → jujur", hasSC(lastReply(), "gagal nyambung"), lastReply().slice(0, 120));
  krip._resetSeamsForTest();
}

console.log("— 5. dzikir upgrade (dua-dhikr API + fallback offline) —");
const dzkMod = await import(R + "/plugins/islami/dzikir.js");
const dzk = dzkMod.default || dzkMod.handler;
const dzkCfg = dzkMod.config || dzkMod.pluginConfig;
{
  t("5. config utuh (nama dzikir + alias dzikirpagi/petang)", dzkCfg?.name === "dzikir" && [...(dzkCfg?.alias || []), ...(dzkCfg?.aliases || [])].includes("dzikirpagi"), "");
  mkM._replies.length = 0;
  await dzk(mkM({ command: "dzikir", args: [] }), { sock: {}, db: {} });
  t("5a. tanpa arg → menu 5 kategori", hasSC(lastReply(), "pagi") && hasSC(lastReply(), "petang") && hasSC(lastReply(), "doa") && hasSC(lastReply(), "pilihan") && hasSC(lastReply(), "shalat"), lastReply().slice(0, 150));
  mkM._replies.length = 0;
  dzkMod._setHttpForTest(async (url) => {
    if (url.includes("/categories/morning-dhikr/")) return { status: 404, data: null };
    return { status: 200, data: { data: [
      { id: 1, title: "Ayat al-Kursi", category: "morning-dhikr", categoryName: "Dzikir Pagi" },
      { id: 2, title: "Al-Ikhlas", category: "morning-dhikr", categoryName: "Dzikir Pagi" },
    ] } };
  });
  await dzk(mkM({ command: "dzikir", args: ["pagi"] }), { sock: {}, db: {} });
  t("5b. .dzikir pagi → list dari API", hasSC(lastReply(), "ayat al-kursi") && hasSC(lastReply(), "2 item"), lastReply().slice(0, 150));
  t("5c. hint nomor detail ditampilkan", hasSC(lastReply(), "detail: .dzikir pagi"), lastReply().slice(0, 150));
  mkM._replies.length = 0;
  dzkMod._setHttpForTest(async (url) => {
    if (url.includes("/morning-dhikr/1")) return { status: 200, data: { data: {
      id: 1, title: "Ayat al-Kursi", arabic: "اللهُ لا إلهَ", latin: "Allaahu laa ilaaha illaa huwal hayyul qayyuum", translation: "Allah, tidak ada Tuhan melainkan Dia", notes: "Dibaca 1x", fawaid: "Dilindungi hingga petang", source: "HR. at-Tirmidzi: 2879",
    } } };
    return { status: 200, data: { data: [] } };
  });
  await dzk(mkM({ command: "dzikir", args: ["pagi", "1"] }), { sock: {}, db: {} });
  t("5d. detail: arab utuh + latin + arti + jumlah + keutamaan + sumber", lastReply().includes("اللهُ") && hasSC(lastReply(), "hr. at-tirmidzi: 2879") && hasSC(lastReply(), "dibaca 1x"), lastReply().slice(0, 200));
  mkM._replies.length = 0;
  let urlSeen = "";
  dzkMod._setHttpForTest(async (url) => { urlSeen = url; return { status: 200, data: { data: [{ id: 1, title: "Ayat al-Kursi" }] } }; });
  await dzk(mkM({ command: "dzikirpagi", args: [] }), { sock: {}, db: {} });
  t("5e. .dzikirpagi (tanpa sub) → morning-dhikr", urlSeen.includes("/categories/morning-dhikr"), urlSeen);
  mkM._replies.length = 0;
  let urlSeen2 = "";
  dzkMod._setHttpForTest(async (url) => { urlSeen2 = url; return { status: 200, data: { data: { title: "X", arabic: "ا", latin: "l", translation: "t" } } }; });
  await dzk(mkM({ command: "dzikirpagi", args: ["5"] }), { sock: {}, db: {} });
  t("5f. .dzikirpagi 5 → detail nomor 5", urlSeen2.includes("/categories/morning-dhikr/5"), urlSeen2);
  mkM._replies.length = 0;
  let urlSeen3 = "";
  dzkMod._setHttpForTest(async (url) => { urlSeen3 = url; return { status: 200, data: { data: [{ id: 1, title: "Doa Sebelum Tidur" }] } }; });
  await dzk(mkM({ command: "dzikir", args: ["doa"] }), { sock: {}, db: {} });
  t("5g. .dzikir doa → daily-dua", urlSeen3.includes("/categories/daily-dua"), urlSeen3);
  await dzk(mkM({ command: "dzikir", args: ["sholat"] }), { sock: {}, db: {} });
  t("5h. alias sholat → dhikr-after-salah", urlSeen3.includes("/categories/dhikr-after-salah"), urlSeen3);
  mkM._replies.length = 0;
  dzkMod._setHttpForTest(async () => { throw new Error("down"); });
  await dzk(mkM({ command: "dzikir", args: ["pagi"] }), { sock: {}, db: {} });
  t("5i. API down → fallback offline (dzikir pagi 10 item)", hasSC(lastReply(), "ayat kursi") && hasSC(lastReply(), "10 dzikir (offline)"), lastReply().slice(0, 130));
  mkM._replies.length = 0;
  await dzk(mkM({ command: "dzikir", args: ["doa"] }), { sock: {}, db: {} });
  t("5j. API down + kategori doa (gak ada offline) → jujur", hasSC(lastReply(), "gak bisa dihubungi"), lastReply().slice(0, 130));
  dzkMod._resetSeamsForTest();
}

console.log(`\n══════ ${pass} PASS, ${fail} FAIL ══════`);
process.exit(fail > 0 ? 1 : 0);
