// RARA AI - MULTI DEVICE — E2E: plugin HARUS ke-register via loader asli (8 Okt 2026).
// AKAR BUG: plugin yang export `default` berupa FUNGSI handler (export default handler)
// tanpa named export `config` → loader rara-plugins.js swap namespace ke fungsi itu
// → pluginConfig hilang → createPluginInfo return NULL → plugin di-skip SENYAP.
// Command live malah kena kartu "Tidak Ditemukan", padahal E2E (yang import plugin
// langsung, bukan lewat loader) hijau semua. Kasus nyata: cpanel-allow.js (.addaksescpanel)
// + cpanelprotect.js (.cpanelprotect) — broken live sejak awal tanpa ada yang sadar.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 200) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

section("1. loader asli: plugin ke-register (bukan cuma bisa di-import)");
const pl = await import(R + "/src/lib/rara-plugins.js");
const targets = [
  { f: "plugins/panel/cpanel-allow.js", cmd: "addaksescpanel", alias: "addcpanel" },
  { f: "plugins/panel/cpanelprotect.js", cmd: "cpanelprotect" },
];
for (const { f, cmd, alias } of targets) {
  const info = await pl.loadPlugin(f);
  t("1. loadPlugin(" + f + ") → bukan null", !!info, info);
  if (info) {
    t("2. " + cmd + " ke-register di commands map", pl.registerPlugin(info) && !!pl.getPlugin(cmd), null);
    const g = pl.getPlugin(cmd);
    t("3. " + cmd + " config valid (name + category)", !!(g && g.config && g.config.name), g && g.config?.name);
    if (alias) t("4. alias " + alias + " kebaca", pl.getAllCommandNames().includes(alias), null);
  }
}

section("2. audit seluruh repo: default WAJIB object kalau gak ada export config");
// Pola berbahaya: `export default handler;` (fungsi/identifier) TANPA named export config.
const PLUGIN_DIRS = ["plugins"];
const offenders = [];
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (e.isFile() && e.name.endsWith(".js") && !e.name.startsWith("_")) {
      const src = fs.readFileSync(p, "utf8");
      // buang komentar (biar "export default handler" di komentar gak false-positive)
      const bare = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\n)\s*\/\/[^\n]*/g, "\n");
      const hasDefault = /^\s*export\s+default/m.test(bare);
      if (!hasDefault) continue; // tanpa default → named export doang, aman
      if (/export\s+(?:const|let|var|function)\s+config\b|export\s*\{[^}]*\bconfig\b/.test(bare)) continue; // config named → aman
      const defMatch = bare.match(/^\s*export\s+default\s+([\s\S]+?);?\s*$/m);
      const defExpr = defMatch ? defMatch[1].trim() : "";
      // object literal default → aman (loader swap ke object yang punya config/handler/pluginConfig)
      if (defExpr.startsWith("{")) continue;
      offenders.push(p + " → export default " + defExpr.slice(0, 40));
    }
  }
}
for (const d of PLUGIN_DIRS) scan(path.join(R, d));
t("1. gak ada plugin dengan default fungsi tanpa export config", offenders.length === 0, offenders);

console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
