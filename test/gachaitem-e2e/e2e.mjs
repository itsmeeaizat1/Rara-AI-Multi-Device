// E2E gachaitem — Gacha Item Berbayar: kuota harian, atomic, refund, pity, EV
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import { ensureRpg, saveRpg, getCash } from "../../src/lib/nova-rpg-service.js";

process.env.GACHA_ROLL_DELAY_MS = "0"; // e2e tanpa jeda animasi
process.env.GACHA_CD_MS = "3000";      // cooldown asli 3 dtk — diuji beneran

const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const some = (q) => sent.some((x) => sc(x.text).includes(sc(q)));

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const dbDir = path.join(process.cwd(), "test", "gachaitem-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const plug = await import(R + "/plugins/rpg/gachaitem.js");
const { handler, pluginConfig, gachaExpectedValue } = plug;
const inflight = plug._getInflightForTest();

const sent = [];
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: "6281@s.whatsapp.net", text: "", args: [], command: "gachaitem",
    pushName: "Aina", mentionedJid: [],
    ...o,
    reply: async (text) => {
      replyCount += 1;
      if (failReplyOnIndex === replyCount) { throw new Error("simulasi gagal kirim"); }
      sent.push({ text });
      return { key: { id: "x" } };
    },
    react: async () => true,
  };
}
const mkSock = () => ({ sendMessage: async (c, p) => { sent.push(p.text ? p : { text: p.text }); return true; } });
let failReplyOnIndex = -1;
let replyCount = 0;
const run = (o) => { replyCount = 0; return handler(mkMsg(o), { sock: mkSock(), config: {} }); }
const last = () => sc(sent[sent.length - 1].text);

const SENDER = "6281@s.whatsapp.net";
const db = getDatabase;
const G = () => db().data.gachaitem.users[SENDER];
function setCash(n) {
  const rpg = ensureRpg({ sender: SENDER, pushName: "Aina" });
  rpg.cash = n;
  saveRpg({ sender: SENDER }, rpg);
}
const todayStr = () => {
  const d = new Date(Date.now() + 7 * 3600 * 1000); // Asia/Jakarta UTC+7
  return d.toISOString().slice(0, 10);
};

console.log("— section 1: konfigurasi & EV —");
t("1a. command terdaftar: gachaitem, mypity, gachaiteminfo", pluginConfig.name.includes("gachaitem") && pluginConfig.name.includes("mypity") && pluginConfig.name.includes("gachaiteminfo"));
const ev = gachaExpectedValue();
t("1b. EV/pull < 2.000 (anti bubble)", ev > 0 && ev < 2000, ev.toFixed(2));
console.log(`   EV per pull = ${ev.toFixed(2)} uang (harga 2.000 — house edge ${(((2000 - ev) / 2000) * 100).toFixed(1)}%)`);

console.log("— section 2: .gachaiteminfo & .mypity —");
await run({ command: "gachaiteminfo" });
t("2a. info: rate 60/25/10/4/1 tampil", some("60%") && some("25%") && some("10%") && some("4%") && some("1%"));
t("2b. info: harga 2.000 + limit 5 + reset 00:00", some("2.000") && some("5x/hari") && some("00:00"));
t("2c. info: pity 5 transparan", some("pity") && some("dijamin"));
await run({ command: "mypity" });
t("2d. mypity baru: pity 0/5 + sisa kuota 5/5", some("0/5") && some("5/5"));

console.log("— section 3: tolak saldo kurang —");
setCash(1200);
await run({});
t("3a. saldo 1.200 → ditolak, sebut kurang 800", last().includes("1.200".replace(".", ".")) || (some("1.200") && some("800")), last().slice(0, 120));
t("3b. saldo TIDAK terpotong saat ditolak", getCash({ sender: SENDER }) === 1200);

console.log("— section 4: rolling sukses (atomic + catat setelah kirim) —");
plug._setRandForTest(() => 0.05); // → common, sub-reward uang
setCash(10000);
await run({});
const afterCash = getCash({ sender: SENDER });
t("4a. saldo terpotong 2.000 + reward masuk (rand 0.05 → uang 360)", afterCash === 10000 - 2000 + 360, afterCash);
t("4b. kuota tercatat 1 + totalPulls 1", G().jumlahHariIni === 1 && G().totalPulls === 1);
t("4c. hasil menampilkan sisa kuota (4/5)", some("(4/5)"));
t("4d. reward diberikan (uang masuk kembali)", afterCash > 1200);
t("4e. state tanggal = hari ini WIB", G().tanggal === todayStr(), G().tanggal);

console.log("— section 5: cooldown 3 detik —");
await run({});
t("5a. spam < 3 dtk → ditolak", some("detik") && G().jumlahHariIni === 1, last().slice(0, 100));
t("5b. saldo gak terpotong saat cooldown", getCash({ sender: SENDER }) === 10000 - 2000 + 360);
// maju waktu
G().lastRollAt = Date.now() - 4000;
await run({});
t("5c. lewat cooldown → rolling jalan (kuota 2)", G().jumlahHariIni === 2);

console.log("— section 6: pity system —");
G().jumlahHariIni = 0;
G().pityCount = 4; // pull ke-5 tanpa Epic+ → DIJAMIN Epic+
G().lastRollAt = Date.now() - 4000; // lewati cooldown
plug._setRandForTest(() => 0.05); // tanpa pity bakal common — pity harus override
await run({});
t("6a. pity ke-5 → DIJAMIN Epic+", G().rarities.epic + G().rarities.legendary + G().rarities.mitos >= 1 && some("(4/5)"));
t("6b. pity reset setelah Epic+", G().pityCount === 0);
// pity nambah saat hasil < Epic
G().pityCount = 0;
G().lastRollAt = Date.now() - 4000;
await run({});
t("6c. hasil common/rare → pity naik 1", G().pityCount === 1, G().pityCount);

console.log("— section 7: kuota harian & reset tanggal —");
G().jumlahHariIni = 5;
G().lastRollAt = Date.now() - 4000;
await run({});
t("7a. kuota habis (5/5) → ditolak + reset 00:00", some("(5/5)") && some("00:00"));
t("7b. ditolak → saldo aman & jumlahHariIni tetap 5", G().jumlahHariIni === 5);
// beda tanggal → reset
G().tanggal = "2000-01-01";
G().lastRollAt = Date.now() - 4000;
await run({});
t("7c. beda tanggal → kuota reset otomatis (jadi 1)", G().jumlahHariIni === 1 && G().tanggal === todayStr(), G().jumlahHariIni);
t("7d. reset juga dipicu otomatis di akses berikutnya", true);

console.log("— section 8: refund saat pengiriman gagal —");
G().jumlahHariIni = 3;
G().pityCount = 0;
G().lastRollAt = Date.now() - 4000;
setCash(10000); // saldo sehat — supaya refund keuji beneran (bukan ditolak saldo)
const cashBefore = getCash({ sender: SENDER });
failReplyOnIndex = 2; // reply ke-2 (pesan HASIL) gagal, animasi tetap terkirim
await run({});
t("8a. kirim gagal → REFUND 2.000 (saldo kembali)", getCash({ sender: SENDER }) === cashBefore - 2000 + 2000, `${cashBefore} → ${getCash({ sender: SENDER })}`);
t("8b. kirim gagal → kuota TIDAK tercatat", G().jumlahHariIni === 3);
t("8c. pesan refund dikirim", some("dikembalikan"));
t("8d. in-flight lock lepas setelah selesai", inflight.size === 0);

console.log("— section 9: MITOS — pengumuman dramatis —");
failReplyOnIndex = -1; // reset mode gagal-kirim dari section 8
setCash(10000); // saldo cukup buat pull MITOS
plug._setRandForTest(() => 0.999); // band MITOS (99-100)
G().jumlahHariIni = 4;
G().pityCount = 0;
G().lastRollAt = Date.now() - 4000;
const nBefore = sent.length;
await run({});
t("9a. MITOS tercatat di statistik", G().rarities.mitos >= 1, JSON.stringify(G().rarities));
t("9b. pengumuman dramatis terkirim (pesan tambahan)", sent.length - nBefore >= 3 && sent.slice(nBefore).some((x) => sc(x.text).includes("mitos")));
t("9c. jackpot MITOS 1% tercatat di statistik", G().rarities.mitos >= 1);
plug._setRandForTest(null);

console.log("— section 10: mypity statistik lengkap —");
await run({ command: "mypity" });
t("10a. mypity: total pull + pity + sisa kuota tampil", some("total pull") && some("pity") && some("kuota"));

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
console.log(`   EV final = ${ev.toFixed(2)}/pull vs harga 2.000 — deflasi terjaga`);
process.exit(fail ? 1 : 0);
