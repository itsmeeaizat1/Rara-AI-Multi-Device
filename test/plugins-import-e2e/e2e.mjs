// E2E IMPORT GUARD (12 Sep 2026) — semua file plugins/**/*.js WAJIB bisa
// di-import. BUG NYATA: novaai.js import getAllSkills dari aiagent.js yang
// gak nge-export → plugin gagal load SENYAP (catch loadPlugin) →
// .novaagent unknown command di bot — padahal semua e2e hijau karena gak
// ada tes yang import file plugin-nya langsung.
// Tes ini: (1) dynamic import tiap file plugin — nol boleh gagal,
// (2) command KRITIS ke-resolve via loader beneran (loadPlugins).
// Jalankan dari repo root: node test/plugins-import-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const pluginsDir = path.join(REPO, "plugins");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 160))); ok ? pass++ : fail++; };

w("\n— import guard: SEMUA file plugin —");
const categories = fs.readdirSync(pluginsDir);
let total = 0;
const broken = [];
for (const cat of categories) {
  const catPath = path.join(pluginsDir, cat);
  if (!fs.statSync(catPath).isDirectory()) continue;
  for (const f of fs.readdirSync(catPath)) {
    if (!f.endsWith(".js") || f.startsWith("_")) continue;
    total++;
    try {
      await import(pathToFileURL(path.join(catPath, f)).href);
    } catch (e) {
      broken.push(`${cat}/${f}: ${e?.message || e}`);
    }
  }
}
t(`${total} file plugin ke-import tanpa error`, broken.length === 0, broken.join(" | "));
if (broken.length) w("   FILE GAGAL:\n   " + broken.join("\n   "));

w("\n— resolve command kritis via loader beneran —");
fs.rmSync("/tmp/plugins-import-guard-db", { recursive: true, force: true });
const { initDatabase } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-database.js")).href);
await initDatabase("/tmp/plugins-import-guard-db/nova.json");
const { loadPlugins, getPlugin } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-plugins.js")).href);
const loaded = await loadPlugins(pluginsDir);
t("loadPlugins jalan (≥ 1000 plugin)", loaded >= 1000, "cuma " + loaded);
// REGRESI 17 Sep 2026: resolve command kritis via loader beneran
for (const cmd of ["novaagent", "aisuperagent", "mcp", "memory", "telpon", "doctor", "ai9v2", "9routerv2", "connlog"]) {
  const p = getPlugin(cmd);
  t(`.${cmd} ke-resolve`, !!p, "unknown command");
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
