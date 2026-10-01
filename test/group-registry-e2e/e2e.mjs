// E2E GROUP REGISTRY — auto-catat grup yang bot ikuti (13 Sep 2026)
// Request owner: "Total Grup di Info Database suka 0 / ke-reset tiap restart
// pdhal aku join 1 grup sendiri".
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "groupreg-e2e-db-")) + "/rara.json");
const db = getDatabase();

const {
  ensureGroupRegistered, syncGroupRegistry, countGroupsLive, setLiveCacheForTest,
} = await import(R + "/src/lib/rara-group-registry.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

function mkSock(groups) {
  return {
    groupFetchAllParticipating: async () => {
      const out = {};
      for (const [jid, subject] of Object.entries(groups)) out[jid] = { id: jid, subject };
      return out;
    },
  };
}

// ── 1. ensureGroupRegistered ──
w("\n— ensureGroupRegistered —");
const G1 = "12036302@g.us";
const r1 = ensureGroupRegistered(G1, { name: "Grup Saya", db });
check("1a. grup baru → tercatat (true)", r1 === true);
const g1 = db.getGroup(G1);
check("1b. nama tersimpan", g1 && g1.name === "Grup Saya", JSON.stringify(g1 && g1.name));
check("1c. registeredAt tersimpan", typeof g1?.registeredAt === "number");
const r1b = ensureGroupRegistered(G1, { name: "Dobel", db });
check("1d. daftar ulang → false (gak dobel)", r1b === false);
check("1e. nama gak ketimpa", db.getGroup(G1).name === "Grup Saya");
check("1f. jid bukan grup → false", ensureGroupRegistered("62811@s.whatsapp.net", { db }) === false);
check("1g. jid kosong → false", ensureGroupRegistered("", { db }) === false);
// fitur grup gak kesentuh — default antilink tetap false
check("1h. antilink tetap default (false)", db.getGroup(G1).antilink === false);

// ── 2. syncGroupRegistry (startup) ──
w("\n— syncGroupRegistry —");
const G2 = "12036404@g.us";
const G3 = "12036505@g.us";
const sock2 = mkSock({ [G1]: "Grup Saya", [G2]: "Grup Keluarga", [G3]: "Squad Game" });
const sr = await syncGroupRegistry(sock2, db);
check("2a. added 2 (G1 udah ada, G2+G3 baru)", sr.added === 2, JSON.stringify(sr));
check("2b. total 3 grup kecatat", sr.total === 3, JSON.stringify(sr));
check("2c. semua masuk db.data.groups", db.getGroup(G2) && db.getGroup(G3));
check("2d. nama dari subject WA", db.getGroup(G2).name === "Grup Keluarga");
// idempoten — sync ulang gak nambah
const sr2 = await syncGroupRegistry(sock2, db);
check("2e. sync ulang idempoten (added 0)", sr2.added === 0, JSON.stringify(sr2));

// ── 3. countGroupsLive ──
w("\n— countGroupsLive —");
setLiveCacheForTest(0, 0); // reset cache
const sock3 = mkSock({ a: "1", b: "2", c: "3", d: "4" });
const c1 = await countGroupsLive(sock3, db);
check("3a. live fetch 4 grup → 4", c1 === 4, String(c1));
const sockEmpty = mkSock({});
const c2 = await countGroupsLive(sockEmpty, db);
check("3b. cache 5 mnt: fetch ke-2 masih 4", c2 === 4, String(c2));
setLiveCacheForTest(0, 0);
const c3 = await countGroupsLive(null, db);
check("3c. tanpa sock → fallback registry (3 di db)", c3 === 3, String(c3));
const c4 = await countGroupsLive(null, null);
check("3d. tanpa sock + db null → fallback db global (3)", c4 === 3, String(c4));

// ── 4. persist (simulasi restart proses) ──
w("\n— persist —");
check("4a. 3 grup tertulis di db.data.groups", Object.keys(db.data.groups).filter(j => j.endsWith("@g.us")).length === 3, JSON.stringify(Object.keys(db.data.groups)));

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
