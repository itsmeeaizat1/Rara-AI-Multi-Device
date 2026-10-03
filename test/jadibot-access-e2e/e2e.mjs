// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Tes akses .jadibot mode premium: owner otomatis lolos, premium hasil .addprem lolos, user biasa ditolak.
import config from "../../config.js";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { initDatabase, getDatabase } from "../../src/lib/rara-database.js";
await initDatabase(mkdtempSync(path.join(tmpdir(), "jadibot-access-db-")) + "/rara.json");
const { canUseJadibot } = await import("../../plugins/main/becomebot.js");

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  OK  " + n); } else { fail++; console.log("  FAIL " + n); } };

const OWNER = "6281111111111", PREM = "6282222222222", PREM_EXP = "6283333333333", PLAIN = "6284444444444";
config.owner = { ...(config.owner || {}), number: [OWNER] };
config.premiumUsers = [];

const db = getDatabase();
const prevAccess = db.setting("jadibotAccess");
db.setting("jadibotAccess", { mode: "premium", allowedUsers: [] });
const prevPrem = db.data.premium; const prevOwn = db.data.owner;
db.data.premium = [
  PREM + "@s.whatsapp.net",
  { jid: PREM_EXP + "@s.whatsapp.net", expired: Date.now() - 86400000 },
];

try {
  console.log("[1] mode premium");
  ok(canUseJadibot(OWNER + "@s.whatsapp.net").allowed === true, "owner otomatis lolos (tanpa ditambah premium)");
  ok(canUseJadibot(PREM + "@s.whatsapp.net").allowed === true, "user yang ditambah lewat .addprem lolos");
  ok(canUseJadibot(PLAIN + "@s.whatsapp.net").allowed === false, "user biasa tetap ditolak");
  ok(/premium/i.test(canUseJadibot(PLAIN + "@s.whatsapp.net").reason || ""), "pesan penolakan menyebut premium");
  ok(canUseJadibot(PREM + "@lid").allowed === true || canUseJadibot(PREM + "@lid").allowed === false, "format @lid tidak melempar error");
  console.log("[2] mode lain tidak berubah");
  db.setting("jadibotAccess", { mode: "all", allowedUsers: [] });
  ok(canUseJadibot(PLAIN + "@s.whatsapp.net").allowed === true, "mode all: semua lolos");
  db.setting("jadibotAccess", { mode: "specific", allowedUsers: [PREM + "@s.whatsapp.net"] });
  ok(canUseJadibot(PLAIN + "@s.whatsapp.net").allowed === false, "mode specific: non-daftar ditolak");
  ok(canUseJadibot(OWNER + "@s.whatsapp.net").allowed === true, "mode specific: owner tetap lolos");
} finally {
  db.setting("jadibotAccess", prevAccess || {});
  db.data.premium = prevPrem; db.data.owner = prevOwn;
}

// ---- [3] config.isPremium = sumber tunggal untuk SEMUA gate (akar bug: .addprem nulis db.data.premium,
// gate baca premium.json) ----
{
  const dbx = getDatabase(); const P_STR = "6286000000001", P_LIFE = "6286000000002", P_OBJ = "6286000000003", P_OLD = "6286000000004", P_EXPMS = "6286000000005";
  dbx.data.premium = [
    P_STR,                                                              // addpremall: string polos
    { id: P_LIFE, name: "L", addedAt: 1 },                              // approveprem lifetime: tanpa expired
    { id: P_OBJ, name: "O", addedAt: 1, expired: Date.now() + 864e5 },  // addprem: masih aktif
    { id: P_EXPMS, name: "E", addedAt: 1, expired: Date.now() - 864e5 },// addprem: sudah lewat
  ];
  console.log("[3] config.isPremium baca db.data.premium (.addprem)");
  ok(config.isPremium(P_OBJ + "@s.whatsapp.net") === true, "objek {id, expired} aktif -> premium");
  ok(config.isPremium(P_STR + "@s.whatsapp.net") === true, "string polos (addpremall) -> premium");
  ok(config.isPremium(P_LIFE + "@s.whatsapp.net") === true, "lifetime (tanpa expired) -> premium");
  ok(config.isPremium(P_EXPMS + "@s.whatsapp.net") === false, "expired lewat -> BUKAN premium");
  ok(config.isPremium(PLAIN + "@s.whatsapp.net") === false, "user biasa tetap bukan premium");
  ok(config.isPremium(P_OBJ + "@lid") === true || config.isPremium(P_OBJ + "@lid") === false, "format @lid tidak melempar error");
  ok(config.isPremium("") === false && config.isPremium(null) === false, "jid kosong/null aman");
  ok(config.isPremium("62" + "@s.whatsapp.net") === false, "nomor terlalu pendek tidak nyangkut (anti false-positive)");
  // sesudah .delprem (dihapus dari array) langsung tidak premium
  dbx.data.premium = dbx.data.premium.filter((p) => (typeof p === "string" ? p : p.id) !== P_OBJ);
  ok(config.isPremium(P_OBJ + "@s.whatsapp.net") === false, "setelah dihapus (.delprem) langsung tidak premium");
}

console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
