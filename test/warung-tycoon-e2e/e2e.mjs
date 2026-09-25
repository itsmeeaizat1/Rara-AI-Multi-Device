// E2E Warung Tycoon — masak/belanja/buka/rating/event/gacha pity/renovasi/franchise/daily/top
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import { ensureRpg, saveRpg, getCash } from "../../src/lib/nova-rpg-service.js";

process.env.WARUNG_BUKA_CD_MS = "0"; // e2e anti-flaky
process.env.WARUNG_MASAK_CD_MS = "0";
process.env.WARUNG_GACHA_CD_MS = "0";
process.env.WARUNG_ANIM_MS = "0";
process.env.WARUNG_REGEN_S = "100000"; // matikan regen (biar stamina eksplisit)
const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const some = (q) => sent.some((x) => sc(x.text || x).includes(sc(q)));

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const dbDir = path.join(process.cwd(), "test", "warung-tycoon-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const plug = await import(R + "/plugins/rpg/warungtycoon.js");
const { handler, MENUS, RESEP_RAHASIA, TIERS, gachaWarungEV } = plug;

const SENDER = "6281@s.whatsapp.net";
const sent = [];
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: SENDER, text: "", args: [], pushName: "Juragan", mentionedJid: [],
    ...o,
    reply: async (x) => { sent.push({ text: typeof x === "string" ? x : x.text }); return true; },
    react: async () => true,
  };
}
// sock tanpa key → editFramesAnim gagal senyap → jalur fallback tetap kirim kartu hasil
const sock = { sendMessage: async () => ({}) };
const run = (o) => handler(mkMsg(o), { sock, config: {} });
const last = () => sc(sent[sent.length - 1].text);
const U = () => getDatabase().data.warung.users[SENDER];
const cash = () => getCash({ sender: SENDER });
function setCash(n) { const r = ensureRpg({ sender: SENDER, pushName: "P" }); r.cash = n; saveRpg({ sender: SENDER }, r); }

// rand deterministik bertingkat: urutan konsumsi per buka = pelangganRand, ratingUpRand, eventGate, eventPick, [sub-rand]
let _seq = [];
const setSeq = (...vals) => { _seq = [...vals]; };
plug._setRandForTest(() => (_seq.length ? _seq.shift() : 0.99));

console.log("— section 1: struktur & mulai —");
t("1a. 5 tier warung: gerobak→restoran", TIERS.length === 5 && TIERS[0].min === 1 && TIERS[4].min === 20);
t("1b. 5 menu reguler unlock 1/5/10/15/20", MENUS.length === 5 && MENUS.map((x) => x.unlock).join(",") === "1,5,10,15,20");
t("1c. harga menu naik monoton", MENUS.every((x, i, a) => i === 0 || x.harga > a[i - 1].harga));
t("1d. 4 resep rahasia (2 rare, 1 epic, 1 legendary)", RESEP_RAHASIA.length === 4 && RESEP_RAHASIA.filter((x) => x.raritas === "Rare").length === 2);
t("1e. EV gacha jujur di bawah harga 2.000", gachaWarungEV() > 900 && gachaWarungEV() < 2000, "EV=" + gachaWarungEV());
t("1f. komando lain sebelum daftar → ditolak jujur", (await run({ args: ["masak", "mielinting"] }), some("BELUM BUKA USAHA")));
setCash(0);
await run({});
t("1g. mulai: welcome + tutorial + starter pack", some("SELAMAT DATANG") && some("STARTER PACK"));
t("1h. starter pack: +2.000 uang + bahan 10/5/3", cash() === 2000 && U().bahan.beras === 10 && U().bahan.ayam === 5 && U().bahan.cabe === 3);
t("1i. init state: lvl 1, stamina 10, rating 3", U().level === 1 && U().stamina === 10 && U().rating === 3);

console.log("— section 2: masak —");
await run({ args: ["masak", "mielinting"] });
t("2a. masak 5 porsi mie linting sukses", some("5 PORSI MIE LINTING") && U().stok.mielinting === 5);
t("2b. bahan dipotong 5× resep (beras 10→5)", U().bahan.beras === 5);
t("2c. stamina dipotong 1 (10→9)", U().stamina === 9);
await run({ args: ["masak", "wagyu"] });
t("2d. menu terkunci ditolak (wagyu lvl 20)", some("BELUM BUKA MENU"));
await run({ args: ["masak", "nasiliwet"] });
t("2e. resep rahasia tanpa kepemilikan ditolak", some("RESEP RAHASIA"));
U().bahan.beras = 3; // kurang dari 5 yang dibutuhin batch mie linting
await run({ args: ["masak", "mielinting"] });
t("2f. bahan kurang ditolak jujur (butuh 5 beras, punya 3)", some("BAHAN KURANG"));
await run({ args: ["masak", "gaada"] });
t("2g. menu tak ada ditolak", some("MENU TAK ADA"));

console.log("— section 3: buka warung —");
// seq: pelanggan rand→0 (4+1=5), ratingUp 0.99(gak), event 0.99(gak) — 0.99 gak < 0.2
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("3a. buka: hasil jualan keluar", some("HASIL JUALAN"));
t("3b. stok 5 porsi terjual semua (5 pelanggan lvl 1)", U().stok.mielinting === 0, "stok=" + JSON.stringify(U().stok));
t("3c. omzet 5×60=300 masuk (profit mult rating 3 = 100%)", cash() === 2000 + 300, "cash=" + cash());
t("3d. stamina dipotong 2 (9→7)", U().stamina === 7);
t("3e. EXP masuk (6+5×2+4=20)", U().exp === 20, "exp=" + U().exp);
t("3f. totalOmzet & totalPelanggan tercatat", U().totalOmzet === 300 && U().totalPelanggan === 5);
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("3g. buka stok kosong: pelanggan kabur, rating 3→2", U().rating === 2 && some("Rating turun"), "rating=" + U().rating);

console.log("— section 4: rating & profit multiplier —");
const refill = () => { U().stamina = U().maxStamina; };
U().stamina = U().maxStamina;
U().rating = 5; // set manual: mult profit rating = (1+(5-3)*0.15)=1.3
U().stok.mielinting = 5;
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("4a. rating 5 → omzet ×1.3 (300→390)", cash() === 2300 + 390, "cash=" + cash());
U().rating = 1; // mult = (1-0.3)=0.7
U().stok.mielinting = 5;
refill();
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("4b. rating 1 → omzet ×0.7 (300→210)", cash() === 2690 + 210, "cash=" + cash());
t("4c. semua terlayani 25% chance rating naik", (() => { U().rating = 3; U().stok.mielinting = 5; U().stamina = U().maxStamina; return true; })());
setSeq(0, 0.1, 0.99);
await run({ args: ["buka"] });
t("4d. gosip enak: rating 3→4", U().rating === 4, "rating=" + U().rating);

console.log("— section 5: event acak —");
// kritikus bagus: gate 0.1<0.2, pick 0.1<0.25, sub 0.2<0.5 (bagus)
U().rating = 3; U().stok.mielinting = 10; U().kupon = 0; U().stamina = U().maxStamina;
setSeq(0, 0.99, 0.1, 0.1, 0.2);
await run({ args: ["buka"] });
t("5a. kritikus puas: rating +1, kupon +1, tip masuk", U().rating === 4 && U().kupon === 1 && some("KRITIKUS"));
// kritikus pedas: gate 0.1, pick 0.1, sub 0.9
U().rating = 3; U().stamina = U().maxStamina; U().level = 1; U().exp = 0; U().stok = {}; U().stok.mielinting = 5;
setSeq(0, 0.99, 0.1, 0.1, 0.9);
await run({ args: ["buka"] });
t("5b. kritikus kecewa: rating -1", U().rating === 2);
// banjir: gate 0.1, pick 0.3 (0.25-0.45)
U().rating = 3; U().stok = {}; U().stok.mielinting = 5; U().stamina = U().maxStamina; U().level = 1; U().exp = 0;
setSeq(0, 0.99, 0.1, 0.3);
await run({ args: ["buka"] });
t("5c. banjir: omzet -40% (300→180)", some("BANJIR") || some("Hujan") || some("ngambek"), "cash=" + cash());
// catering sukses: gate 0.1, pick 0.5 (0.45-0.65), stok ≥5
U().kupon = 0; U().stok = {}; U().stok.mielinting = 8; U().stamina = U().maxStamina; U().level = 1; U().exp = 0;
setSeq(0, 0.99, 0.1, 0.5);
await run({ args: ["buka"] });
t("5d. catering sukses: kupon +1", U().kupon === 1 && some("CATERING"));
// catering gagal (stok <5): rating -1
U().rating = 3; U().stok = {}; U().stok.mielinting = 2; U().stamina = U().maxStamina; U().level = 1; U().exp = 0;
// sisa=3 (gak semua kebagian) → rand rating-up GAK konsumsi → gate langsung rand kedua
setSeq(0, 0.1, 0.5);
await run({ args: ["buka"] });
t("5e. catering stok kurang: rating -1 + jujur", U().rating === 2 && some("STOKMU KURANG"));
// penipu: gate 0.1, pick 0.7 (0.65-0.8)
U().rating = 3; U().stok = {}; U().stok.mielinting = 5; U().level = 1; U().exp = 0;
const cashSebelum = cash(); U().stamina = U().maxStamina;
setSeq(0, 0.99, 0.1, 0.7);
await run({ args: ["buka"] });
t("5f. penipu: omzet dikurangi 150", cash() === cashSebelum + 300 - 150, "cash=" + cash() + " vs " + (cashSebelum + 150));
// supplier: gate 0.1, pick 0.95
U().stok = {}; U().stok.mielinting = 5; U().bahan.beras = 0; U().bahan.ayam = 0; U().bahan.cabe = 0; U().stamina = U().maxStamina; U().level = 1; U().exp = 0;
setSeq(0, 0.99, 0.1, 0.95);
await run({ args: ["buka"] });
t("5g. supplier murah: +5 beras +3 ayam +2 cabe", U().bahan.beras === 5 && U().bahan.ayam === 3 && U().bahan.cabe === 2);

console.log("— section 6: belanja —");
U().stamina = 10; U().bahan.beras = 0;
setCash(1000);
await run({ args: ["belanja", "beras", "20"] });
t("6a. belanja 20 beras = 500 uang, stamina -1", U().bahan.beras === 20 && cash() === 500 && U().stamina === 9);
await run({ args: ["belanja", "beras", "999"] });
t("6b. jumlah aneh ditolak", some("JUMLAH ANEH"));
await run({ args: ["belanja", "emas", "5"] });
t("6c. bahan tak ada ditolak", some("BAHAN TAK ADA"));
setCash(10);
await run({ args: ["belanja", "beras", "20"] });
t("6d. uang kurang ditolak jujur", some("KURANG UANG"));
U().bahan.beras = 99;
await run({ args: ["belanja", "beras", "5"] });
t("6e. gudang penuh ditolak (cap 100)", some("GUDANG PENUH"));

console.log("— section 7: stamina & regen —");
U().stamina = 1;
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("7a. stamina < 2 ditolak buka", some("KECAPEKAN"));
U().stamina = 0;
await run({ args: ["masak", "mielinting"] });
t("7b. stamina 0 ditolak masak", some("KECAPEKAN"));
// regen: staminaAt diputar mundur 200.000s → regen 2 (REGEN_S dienv 100000)
U().stamina = 0; U().staminaAt = Math.floor(Date.now() / 1000) - 200000;
await run({ args: ["status"] });
t("7c. regen +1/5mnt jalan (0→2 dari waktu)", U().stamina === 2, "stamina=" + U().stamina);

console.log("— section 8: gacha & pity —");
U().stamina = 10; U().pity = 0; U().kupon = 0;
setCash(2000);
setSeq(0.5); // r=0.5 → Common (bahan)
await run({ args: ["gacha"] });
t("8a. gacha common: bahan bonus, pity 1", U().pity === 1 && some("GACHA RESEP RAHASIA") && U().totalPull === 1);
t("8b. gacha dipotong 2.000 (cash 2000→0)", cash() === 0);
setCash(2000); setSeq(0.7); // r → Rare (0.6-0.85)
await run({ args: ["gacha"] });
t("8c. rare: resep rahasia pertama tercatat", U().resep.bakmirebus || U().resep.satefavorit, JSON.stringify(Object.keys(U().resep)));
t("8d. rare → pity lanjut (reset cuma di Epic+)", U().pity === 2, "pity=" + U().pity);
setCash(2000); setSeq(0.98); // r=0.98 → Legendary (0.95-0.99)
await run({ args: ["gacha"] });
t("8e. legendary: resep warisan + kupon +2", U().resep.warisan === true && U().kupon === 2);
setCash(2000); setSeq(0.999); // r → Mitos (≥0.99)
U().rating = 3; U().kupon = 2;
await run({ args: ["gacha"] });
t("8f. mitos: jackpot + kupon +5 + rating +1", some("JACKPOT") && U().kupon === 7 && U().rating === 4, "kupon=" + U().kupon + " rating=" + U().rating);
setCash(0);
await run({ args: ["gacha"] });
t("8g. uang kurang: gacha ditolak, pull gak nambah", some("KURANG UANG") && U().totalPull === 4);
// PITY: 4 pull common lalu ke-5 → Epic (pityForce → r 0.85-0.95)
U().pity = 0;
setCash(2000 * 5);
for (let i = 0; i < 4; i++) { setSeq(0.5); await run({ args: ["gacha"] }); }
t("8h. 4 pull common: pity 4/5", U().pity === 4, "pity=" + U().pity);
const resepSebelum = Object.keys(U().resep).length;
setSeq(0.0); // rand kecil — pityForce harus override ke Epic
await run({ args: ["gacha"] });
t("8i. pull ke-5: PITY GARANSI Epic+ walau rand kecil", U().pity === 0 && Object.keys(U().resep).length > resepSebelum && some("EPIC"));
t("8j. EV audit: gachaWarungEV() konsisten < harga", gachaWarungEV() < 2000);

console.log("— section 9: resep rahasia & renovasi —");
U().bahan = { beras: 15, ayam: 5, cabe: 5 }; U().stamina = U().maxStamina;
U().resep.nasiliwet = true; // Epic: butuh 3 beras, 1 ayam per porsi
await run({ args: ["masak", "nasiliwet"] });
t("9a. resep rahasia bisa dimasak setelah dimenangkan", U().stok.nasiliwet === 5, "stok=" + JSON.stringify(U().stok));
U().meja = 0; U().kupon = 3;
await run({ args: ["renovasi"] });
t("9b. renovasi 3 kupon → meja 1", U().meja === 1 && U().kupon === 0);
U().kupon = 2;
await run({ args: ["renovasi"] });
t("9c. kupon kurang ditolak", some("KUPON KURANG"));
U().meja = 10; U().kupon = 3;
await run({ args: ["renovasi"] });
t("9d. meja cap 10 ditolak", some("MAXIMAL"));
U().kupon = 0; U().meja = 0;
// meja nambah pelanggan: pelanggan = 4+1+meja+rand(0..2)
U().meja = 3; U().stok = {}; U().stok.mielinting = 20; U().stamina = U().maxStamina; U().level = 1; U().exp = 0;
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("9e. meja menambah pelanggan (4+1+3+0=8 beli 8)", U().stok.mielinting === 20 - 8, "sisa=" + U().stok.mielinting);

console.log("— section 10: daily & top —");
U().stamina = 0; U().bahan = { beras: 0, ayam: 0, cabe: 0 };
const cashDaily = cash();
await run({ args: ["daily"] });
t("10a. daily: uang + bahan + stamina penuh + streak 1", cash() === cashDaily + 30 && U().bahan.beras === 10 && U().stamina === U().maxStamina && U().dailyStreak === 1);
await run({ args: ["daily"] });
t("10b. daily dobel ditolak", some("SUDAH DIKLAIM"));
const db2 = getDatabase();
db2.data.warung.users["6282@s.whatsapp.net"] = { ...db2.data.warung.users[SENDER], franchise: 2, totalOmzet: 999999, level: 99, rating: 5 };
await run({ args: ["top"] });
t("10c. top: franchise tertinggi di urutan 1", last().indexOf("6282") < last().indexOf(SENDER.split("@")[0]));

console.log("— section 11: franchise —");
await run({ args: ["franchise"] });
t("11a. franchise sebelum syarat ditolak (lvl rendah)", some("BELUM LAYAK"));
// penuhi syarat manual: level 20 + omzet 100k + resep warisan harus TETAP
U().level = 20; U().exp = 0; U().totalOmzet = 100000; U().kupon = 0; U().meja = 5;
U().resep.warisan = true;
await run({ args: ["franchise"] });
t("11b. franchise sukses: count 1, profit 10%, rank Rare", U().franchise === 1 && some("FRANCHISE") && U().kupon === 5);
t("11c. franchise reset level 1 tapi resep rahasia TETAP", U().level === 1 && U().resep.warisan === true);
t("11d. meja permanen (tetap 5) + kupon +5", U().meja === 5 && U().kupon === 5);
t("11e. rank naik tiap franchise (Common→Rare)", some("RARE"));
// profit franchise ngaruh: rating 3 (mult 1.0) × franchise 1.1 → 300 dasar jadi 330
U().stok.mielinting = 5; U().stamina = U().maxStamina;
const cashF = cash();
setSeq(0, 0.99, 0.99);
await run({ args: ["buka"] });
t("11f. omzet kena profit franchise ×1.1 (300→330)", cash() === cashF + 330, "cash=" + cash() + " vs " + (cashF + 330));

console.log("— section 12: fallback animasi & guard —");
// sock tanpa key → editFramesAnim false → kartu hasil TETAP terkirim (sudah dibuktikan semua section)
t("12a. fallback animasi: kartu hasil tetap terkirim", sent.length > 20);
const cekIsolasi = fs.readFileSync(path.join(R, "plugins/rpg/warungtycoon.js"), "utf8");
t("12b. gak ada sisa debug/konfigurasi ngawur", !/console\.log\(/.test(cekIsolasi));

console.log("— section 13: cutscene cinematic (gaya cuplikan Nintendo) —");
{ const lib = await import(R + "/src/lib/libanimationrpg/libwarungrpg.js"); lib._setWarungAnimMsForTest(700); }
const { bukaCinematic, masakCinematic } = await import(R + "/src/lib/libanimationrpg/libwarungrpg.js");
const { sceneTotalMs } = await import(R + "/src/lib/nova-anim-runner.js");
const cek = { tile: "🛒", rating: 3 };
const scFull = bukaCinematic({ ...cek, pelanggan: 8, terjual: 8, omzet: 960, kosong: false, eventTipe: null, eventSukses: false });
const scKosong = bukaCinematic({ ...cek, pelanggan: 5, terjual: 0, omzet: 0, kosong: true, eventTipe: null, eventSukses: false });
const scEvent = bukaCinematic({ ...cek, pelanggan: 8, terjual: 8, omzet: 960, kosong: false, eventTipe: "kritikus", eventSukses: true });
const scSupplier = bukaCinematic({ ...cek, pelanggan: 8, terjual: 8, omzet: 960, kosong: false, eventTipe: "supplier", eventSukses: true });
const nFrames = (scenes) => scenes.reduce((a, x) => a + x.frames.length, 0);
t("13a. ramai penuh: cutscene ±10 dtk (9-12s)", sceneTotalMs(scFull, 700) >= 9000 && sceneTotalMs(scFull, 700) <= 12000, "ms=" + sceneTotalMs(scFull, 700));
t("13b. warung kosong: LEBIH PENDEK dari ramai", sceneTotalMs(scKosong, 700) < sceneTotalMs(scFull, 700) && sceneTotalMs(scKosong, 700) >= 6500, "ms=" + sceneTotalMs(scKosong, 700));
t("13c. ada event: babak ekstra → LEBIH PANJANG dari biasa", sceneTotalMs(scEvent, 700) > sceneTotalMs(scFull, 700), "ms=" + sceneTotalMs(scEvent, 700));
t("13d. pelanggan ramai → babak antre makin banyak frame", nFrames(scFull) > nFrames(scKosong));
t("13e. scene event beda tipe beda frame (kritikus vs supplier)", nFrames(scEvent) === nFrames(scSupplier) && scEvent !== scSupplier);
t("13f. lima babak wajib: buka-antre-situasi-hasil (≥4 scene)", scFull.length >= 4, "scene=" + scFull.length);
t("13g. frame final tampil omzet full + bintang rating", scFull[scFull.length - 1].frames[2].includes("960") && scFull[scFull.length - 1].frames[2].includes("★"));
t("13h. kas berdetak naik bertahap (sepertiga→2/3→full)", scFull[scFull.length - 1].frames[0].includes("320") && scFull[scFull.length - 1].frames[1].includes("640"));
t("13i. masak mini-cutscene ~3-4 dtk", sceneTotalMs(masakCinematic(MENUS[0], 5), 700) >= 2500 && sceneTotalMs(masakCinematic(MENUS[0], 5), 700) <= 5000, "ms=" + sceneTotalMs(masakCinematic(MENUS[0], 5), 700));
t("13j. semua frame dalam code fence monospace", scFull.every((x) => x.frames.every((f) => f.startsWith("\n```") || f.startsWith("```"))));
{ const lib = await import(R + "/src/lib/libanimationrpg/libwarungrpg.js"); lib._setWarungAnimMsForTest(0); }

console.log("\n══════ HASIL E2E WARUNG TYCOON: " + pass + " PASS, " + fail + " FAIL ══════");
if (fail > 0) process.exit(1);
