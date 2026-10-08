// RARA AI - MULTI DEVICE — E2E: location mismatch helper (8 Okt 2026)
// Create kena "No nodes satisfying the requirements" → bot harus bales kartu
// location-salah berisi: config sekarang, daftar location live (✅/⛔ node),
// dan arahan .setpanel v1 location <id>. Semua jalur create + .setpanel location list.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);
let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 220) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const L = await import(R + "/src/lib/panel/locations.js");

section("1. deteksi error location");
t("1a no nodes satisfying", L.isLocationMismatchError("No nodes satisfying the requirements"));
t("1b variasi kapital", L.isLocationMismatchError("NO NODES SATISFYING..."));
t("1c no nodes available", L.isLocationMismatchError("No nodes are available in the requested location"));
t("1d error lain gak ke-trigger", !L.isLocationMismatchError("could not find egg"));
t("1e null/undefined aman", !L.isLocationMismatchError(null) && !L.isLocationMismatchError(undefined));

section("2. kartu bantuan (mock panel: 2 location, 1 punya node)");
const MOCK = [
  { id: 1, short: "us.nyc.lvl3", long: "Default", node: null },
  { id: 2, short: "sg-01", long: "", node: "Auto Node" },
];
L._setLocationsFetcherForTest(async () => MOCK);
const help = await L.buildLocationMismatchHelp({ domain: "http://x", apikey: "ptla_x", location: 1 });
t("2a header location salah", help.includes("LOCATION PANEL SALAH"));
t("2b config sekarang muncul", help.includes("location 1"));
t("2c semua location tampil", help.includes("ID 1") && help.includes("ID 2") && help.includes("us.nyc.lvl3") && help.includes("sg-01"));
t("2d penanda node jelas", help.includes("✅ node: Auto Node") && help.includes("⛔ belum ada node"));
t("2e saran set location bener", help.includes(".setpanel v1 location 2"));
t("2f arahan tanpa restart", help.toLowerCase().includes("tanpa restart"));

const help2 = await L.buildLocationMismatchHelp({ domain: "http://x", apikey: "ptla_x", location: null });
t("2g config belum di-set", help2.includes("(belum di-set)"));

section("3. semua location kosong node");
L._setLocationsFetcherForTest(async () => [{ id: 1, short: "us.nyc.lvl3", long: "", node: null }]);
const help3 = await L.buildLocationMismatchHelp({ domain: "http://x", apikey: "ptla_x", location: 1 });
t("3a arahan bikin node dulu", help3.includes("bikin/pindahkan node"));
t("3b gak nyaranin setpanel nyasar", !help3.includes(".setpanel v1 location"));

section("4. anti-throw: panel gak kejangkau → null");
L._setLocationsFetcherForTest(async () => { throw new Error("ENOTFOUND"); });
t("4a fetch gagal → null (bukan throw", (await L.buildLocationMismatchHelp({ domain: "http://x", apikey: "ptla_x", location: 1 })) === null);
L._setLocationsFetcherForTest(async () => []);
t("4b location kosong → null", (await L.buildLocationMismatchHelp({ domain: "http://x", apikey: "ptla_x", location: 1 })) === null);
L._resetLocationsFetcherForTest();

section("5. integrasi: semua jalur create hook helper");
const checks = [
  ["plugins/panel/createserver.js", 1, "serverConfig"],
  ["plugins/panel/cp.js", 1, "serverConfig"],
  ["plugins/panel/cpanel.js", 2, "slot"],
  ["src/lib/rara-auto-order.js", 1, "panelCfg"],
];
for (const [f, n, varName] of checks) {
  const s = fs.readFileSync(path.join(R, f), "utf8");
  const used = (s.match(/isLocationMismatchError\(/g) || []).length;
  t(`5 ${f}: ${n}x deteksi + bantuan`, used === n);
  t(`5 ${f}: config var benar (${varName})`, s.includes(`buildLocationMismatchHelp(${varName})`));
  t(`5 ${f}: import helper`, /import \{ isLocationMismatchError, buildLocationMismatchHelp \} from "[^"]*locations\.js"/.test(s));
}

section("6. .setpanel v1 location list + usage");
const sp = fs.readFileSync(path.join(R, "plugins/owner/setpanel.js"), "utf8");
t("6a subcommand location list", sp.includes("location list") || sp.includes("=== 'list'"));
t("6b pakai helper live", sp.includes("buildLocationMismatchHelp(p)"));
t("6c usage nyebut location list", sp.includes("setpanel v1 location list"));
t("6d import helper", sp.includes('from "../../src/lib/panel/locations.js"'));

section("7. panduan VPS-PANEL.md");
const pd = fs.readFileSync(path.join(R, "panduan/VPS-PANEL.md"), "utf8");
t("7a kasus No nodes ada", pd.includes("No nodes satisfying the requirements"));
t("7b banyak location dibahas", pd.includes("BANYAK location"));
t("7c command list + fix", pd.includes(".setpanel v1 location list") && pd.includes(".setpanel v1 location 2"));
t("7d kartu otomatis dibahas", pd.includes("LOCATION PANEL SALAH"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
