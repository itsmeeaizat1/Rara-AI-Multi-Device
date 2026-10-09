// RARA — E2E: STRUKTUR KATEGORI PLUGIN (25 Sep 2026, feat/ai-agent-category)
// Audit hasil reorganisasi: kategori "ai agent" baru, future→smart,
// folder selaras kategori, gak ada kategori basi, import path resolve.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 240))); ok ? pass++ : fail++; };
const section = (t) => w("\n" + t);

function pluginCat(p) {
  const src = fs.readFileSync(p, "utf-8");
  const m = /(?:const\s+\w*[Pp]lugin[Cc]onfig\w*\s*=|createPlugin\s*\()/.exec(src);
  const start = m ? m.index : 0;
  const cm = /category\s*:\s*["']([^"']+)["']/.exec(src.slice(start, start + 4000));
  return cm ? cm[1] : null; // null = fallback folder
}

const walkPlugins = () => {
  const out = [];
  for (const folder of fs.readdirSync("plugins")) {
    const fp = path.join("plugins", folder);
    if (!fs.statSync(fp).isDirectory()) continue;
    for (const f of fs.readdirSync(fp)) {
      if (f.endsWith(".js") && !f.startsWith("_")) out.push(path.join(fp, f));
    }
  }
  return out;
};

// ══ 1. kategori baru "ai agent" ════════════════════════════════════════════
section("1. kategori ai agent (7 fitur agent)");

const AGENT = ["agent.js", "mcp.js", "setanovaagent.js", "agentloop.js", "autotask.js", "skill.js", "ocode.js"];
for (const f of AGENT) {
  const p = "plugins/ai-agent/" + f;
  check("1. " + f + " ada di plugins/ai-agent/", fs.existsSync(p));
  if (fs.existsSync(p)) check("   kategori = ai agent", pluginCat(p) === "ai agent", pluginCat(p));
}
check("1h. cmd .aisuperagent gak berubah", /name:\s*"aisuperagent"/.test(fs.readFileSync("plugins/ai-agent/agent.js", "utf-8")));
check("1i. cmd .agentloop gak berubah", /name:\s*"agentloop"/.test(fs.readFileSync("plugins/ai-agent/agentloop.js", "utf-8")));
check("1j. cmd .autotask gak berubah", /name:\s*"autotask"/.test(fs.readFileSync("plugins/ai-agent/autotask.js", "utf-8")));
check("1k. cmd .skill gak berubah", /name:\s*"skill"/.test(fs.readFileSync("plugins/ai-agent/skill.js", "utf-8")));
check("1l. cmd .ocode gak berubah", /name:\s*"ocode"/.test(fs.readFileSync("plugins/ai-agent/ocode.js", "utf-8")));
check("1m. cmd .mcp gak berubah", /name:\s*"mcp"/.test(fs.readFileSync("plugins/ai-agent/mcp.js", "utf-8")));

const imports = [];
for (const f of AGENT) {
  try { await import(R + "/plugins/ai-agent/" + f); imports.push(true); }
  catch (e) { imports.push(false); console.error("   import error " + f + ":", e.message); }
}
check("1n. semua file agent ke-import tanpa error", imports.every(Boolean), AGENT.filter((_, i) => !imports[i]).join(", "));

// ══ 2. future → smart ═══════════════════════════════════════════════════════
section("2. rename future → smart");

check("2a. folder plugins/smart ada", fs.existsSync("plugins/smart") && fs.statSync("plugins/smart").isDirectory());
check("2b. folder plugins/future GAK ada", !fs.existsSync("plugins/future"));
const smartFiles = fs.readdirSync("plugins/smart").filter((f) => f.endsWith(".js"));
check("2c. 94 file pindah utuh (+botmood lab)", smartFiles.length === 94, smartFiles.length);
const badSmart = smartFiles.filter((f) => pluginCat("plugins/smart/" + f) !== "smart");
check("2d. semua kategori = smart", badSmart.length === 0, badSmart.slice(0, 5));
const anyFuture = walkPlugins().filter((p) => pluginCat(p) === "future");
check("2e. gak ada sisa kategori 'future'", anyFuture.length === 0, anyFuture);

// ══ 3. kategori basi dibersihin ══════════════════════════════════════════════
section("3. kategori basi dibersihin");

check("3a. kategori 'linode' hilang (→ panel)", walkPlugins().every((p) => pluginCat(p) !== "linode"));
const staleFiles = fs.readdirSync("plugins").filter((f) => fs.statSync(path.join("plugins", f)).isFile() && f.endsWith(".js") && f !== "absen.js");
check("3b. cuma absen.js yang di root (dikenal, kategori group)", staleFiles.length === 0, staleFiles);

// ══ 4. folder selaras kategori ══════════════════════════════════════════════
section("4. folder selaras kategori (mismatch cuma yang disengaja)");

const OK_MISMATCH = ["plugins/store/", "plugins/rpg-couple/", "plugins/group/absenjam.js"];
const norm = (s) => String(s).replace(/[-\s]/g, "");
const mismatches = [];
for (const p of walkPlugins()) {
  const cat = pluginCat(p);
  if (!cat) continue; // fallback folder = otomatis selaras
  const folder = path.basename(path.dirname(p));
  if (norm(cat) !== norm(folder) && !OK_MISMATCH.some((k) => p.startsWith(k))) mismatches.push(p + " (folder " + folder + " ≠ kat " + cat + ")");
}
check("4a. folder ai-image/couple/confess-menfess/cecan selaras", !mismatches.some((x) => /ai-image|couple|confess|cecan/.test(x)), mismatches.filter((x) => /ai-image|couple|confess|cecan/.test(x)).slice(0, 4));
check("4b. total mismatch gak-terencana = 0", mismatches.length === 0, mismatches.slice(0, 8));
check("4c. folder ai-image ada isinya", fs.existsSync("plugins/ai-image") && fs.readdirSync("plugins/ai-image").length >= 40);
check("4d. folder couple ada isinya", fs.existsSync("plugins/couple") && fs.readdirSync("plugins/couple").length >= 15);
check("4e. folder confess-menfess ada", fs.existsSync("plugins/confess-menfess"));
check("4f. folder cecan ada", fs.existsSync("plugins/cecan"));

// ══ 5. referensi path resolve ════════════════════════════════════════════════
section("5. semua import path beneran resolve");

const broken = [];
function checkPathsIn(file, label) {
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, "utf-8");
  for (const m of src.matchAll(/["'](plugins\/[\w\-\/\.]+\.js)["']/g)) {
    if (!fs.existsSync(path.join(R, m[1]))) broken.push(label + " → " + m[1]);
  }
}
checkPathsIn(path.join(R, "index.js"), "index.js");
checkPathsIn(path.join(R, "src/handler.js"), "src/handler.js");
checkPathsIn(path.join(R, "src/connection.js"), "src/connection.js");
check("5a. import plugins/ di index.js + handler.js + connection.js resolve semua", broken.length === 0, broken.slice(0, 6));

// semua suite e2e: path plugins/...js yang disebut harus resolve
const brokenTest = [];
for (const d of fs.readdirSync("test")) {
  const f = path.join("test", d, "e2e.mjs");
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf-8");
  for (const m of src.matchAll(/["'](plugins\/\S+?\.js)["']/g)) {
    if (!fs.existsSync(path.join(R, m[1]))) brokenTest.push(d + " → " + m[1]);
  }
}
check("5b. path plugin di semua suite e2e resolve", brokenTest.length === 0, brokenTest.slice(0, 8));

// ══ 6. menu ter-update ══════════════════════════════════════════════════════
section("6. daftar kategori menu ter-update");

const allmenu = fs.readFileSync("plugins/main/allmenu.js", "utf-8");
const catlist = fs.readFileSync("src/lib/rara-category-list.js", "utf-8");
check("6a. allmenu: 'ai agent' masuk urutan + label", allmenu.includes('"ai agent"') && allmenu.includes('"AI Agent"'));
check("6b. allmenu: 'smart' ganti 'future'", allmenu.includes('"smart"') && !allmenu.includes('"future"'));
check("6c. category-list: 'ai agent' + emoji 🤖", catlist.includes('"ai agent"') && catlist.includes("🤖"));
check("6d. category-list: 'smart' + ✨", catlist.includes('"smart"') && !catlist.includes('"future"'));
check("6e. kategori basi di-prune dari urutan", !/"ephoto"|"turnamen"|"religi"|"clean"|"kerja"|"sekolah"|"umum"|"date"|"primary"|"linode"/.test(catlist));

// ══ 7. sampel file pindahan ke-import utuh ══════════════════════════════════
section("7. sampel file pindahan ke-import");

const samples = [
  "plugins/couple/couple.js", "plugins/confess-menfess/confess.js", "plugins/cecan/cecankorea.js",
  "plugins/ai-image/text2img.js", "plugins/nsfw/remove-clothes.js", "plugins/sewa-premium/buyprem.js",
  "plugins/sewa-premium/rent.js", "plugins/tools/q.js", "plugins/convert/vid2gif.js",
  "plugins/group/notifmakan.js", "plugins/panel/linode.js", "plugins/smart/autopulse.js",
  "plugins/smart/ailearn.js", "plugins/smart/sudoku.js",
];
let imported = 0; const err = [];
for (const p of samples) {
  if (!fs.existsSync(p)) { err.push("hilang: " + p); continue; }
  try { await import(R + "/" + p); imported++; } catch (e) { err.push(p + " → " + e.message.slice(0, 80)); }
}
check("7a. 14 sampel ke-import (" + imported + " OK)", err.length === 0, err.slice(0, 5));

// ══ 8. anti-regresi rename: nama command gak ikut keganti ═══════════════════
section("8. nama command gak berubah (rename folder ≠ rename cmd)");
check("8a. confess masih .confess", /name:\s*"confess"/.test(fs.readFileSync("plugins/confess-menfess/confess.js", "utf-8")));
check("8b. sewa masih .sewa", /name:\s*"sewa"/.test(fs.readFileSync("plugins/sewa-premium/rent.js", "utf-8")));
check("8c. text2img masih .text2imgv2", /name:\s*"text2imgv2"/.test(fs.readFileSync("plugins/ai-image/text2img.js", "utf-8")));
check("8d. setanovaagent masih .setanovaagent", /name:\s*"setanovaagent"/.test(fs.readFileSync("plugins/ai-agent/setanovaagent.js", "utf-8")));
check("8e. cmd linode* tetap, kategori panel", fs.readFileSync("plugins/panel/linode.js", "utf-8").includes("linode2gb") && pluginCat("plugins/panel/linode.js") === "panel");

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail > 0 ? 1 : 0);
