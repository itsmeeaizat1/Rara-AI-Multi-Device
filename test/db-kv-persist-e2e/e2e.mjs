// E2E: persistensi KV database — token telegram & setingan bridge tahan restart
// Akar bug (owner 7 Okt 2026): db.data dibangun dari 8 store tetap aja, key
// ekstra (apiKeys, bridge, jasher, dll) cuma di memori → lenyap pas boot.
// Fix: store kv (settings/kv.json) nampung semua top-level key ekstra.
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
};

const R = path.resolve(import.meta.dirname, "../..");

async function bootDb(dir) {
  const mod = await import(url("src/lib/rara-database.js"));
  if (mod.__resetDatabaseForTest) mod.__resetDatabaseForTest();
  return await mod.initDatabase(dir);
}

function url(p) { return "file://" + path.join(R, p); }

const dir1 = mkdtempSync(path.join(tmpdir(), "rara-kv-"));

// ── Fase 1: "proses bot jalan" — set token + setingan bridge lalu shutdown ──
{
  const db = await bootDb(dir1);
  // simulate .setkey telegram <token> (rara-api-keys.setApiKey path)
  const { setApiKey } = await import(url("src/lib/rara-api-keys.js"));
  setApiKey("telegram", "771234:AA-faketoken-for-test");
  // simulate .bridge ownerid add telegram + enabled
  const { ensureBridgeState } = await import(url("src/lib/rarabridge/adapter.js"));
  const b = ensureBridgeState(db);
  b.ownerIds.telegram.push("771234");
  b.enabled.telegram = true;
  // simulate jasher registry + notif target
  db.db.data.jasher = { groups: { "tg_g1001234567890@g.us": { name: "Grup Panel Aku", platform: "telegram" } } };
  db.setting("tgNotifyGroup", "-1001234567890");
  // flushAll + shutdown hooks (sama kayak restart)
  db.db.write();
}

// ── Fase 2: "proses bot baru" — init ulang dari disk, key harus balik ──
{
  const db2 = await bootDb(dir1);
  const { getApiKey } = await import(url("src/lib/rara-api-keys.js"));
  check("1a. token telegram setkey TAHAN restart", getApiKey("telegram") === "771234:AA-faketoken-for-test", getApiKey("telegram"));
  check("1b. bridge ownerIds TAHAN restart", db2.db.data.bridge?.ownerIds?.telegram?.[0] === "771234", JSON.stringify(db2.db.data.bridge?.ownerIds));
  check("1c. bridge enabled TAHAN restart", db2.db.data.bridge?.enabled?.telegram === true, JSON.stringify(db2.db.data.bridge?.enabled));
  check("1d. registry jasher TAHAN restart", db2.db.data.jasher?.groups?.["tg_g1001234567890@g.us"]?.name === "Grup Panel Aku", JSON.stringify(db2.db.data.jasher));
  let kvRaw = null;
  try { kvRaw = readFileSync(path.join(dir1, "settings/kv.json"), "utf8"); } catch {}
  const kvObj = kvRaw ? JSON.parse(kvRaw) : null;
  check("1e. store kv file kebentuk + isi apiKeys", !!kvObj?.apiKeys?.telegram?.includes("771234"), kvRaw?.slice(0, 80));
  check("1f. key tetap 8 store gak kebawa ke kv", !!kvObj && !("users" in kvObj) && !("settings" in kvObj) && !("chathistory" in kvObj), "");
  check("1g. initBridgeFromBoot nemu token + enabled (auto-resume jalan)", db2.db.data.bridge?.enabled?.telegram === true && getApiKey("telegram") !== "");
}

rmSync(dir1, { recursive: true, force: true });
console.log(`\n===== KV PERSIST E2E: ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
