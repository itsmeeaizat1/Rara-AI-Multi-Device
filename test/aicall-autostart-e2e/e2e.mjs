// E2E rara-aicall-autostart — service AI Call auto-run saat bot boot
// (request owner 18 Sep 2026: "aicall lngsung ke run saat bot dirun")
// Logika diuji TANPA VPS: fetch di-mock (seam), pm2 fake (shell script di
// PATH), binary ai-call fake executable, cwd pindah ke tmp dir.
// Jalankan: node test/aicall-autostart-e2e/e2e.mjs
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

process.on("uncaughtException", (e) => { console.error("[UNCAUGHT]", e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[UNHANDLED]", e); process.exit(1); });

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`[   OK ] ${name}`); }
  else { fail++; console.log(`[ FAIL ] ${name}${extra ? " — " + extra : ""}`); }
}

const mod = await import("../../src/lib/rara-aicall-autostart.js");
const { ensureAicallRunning, getAicallAutostartStatus,
  _setAicallAutostartFetchForTest, _clearAicallAutostartFetchForTest } = mod;

// ── sandbox dir: cwd baru + aicall/ + fake binary + fake pm2 ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aicall-auto-"));
const aicallDir = path.join(tmp, "aicall");
fs.mkdirSync(aicallDir);
fs.writeFileSync(path.join(aicallDir, ".env"), "GROQ_API=gsk_test\nTTS_ENGINE=edgetts\n");

// fake binary ai-call (executable, cuma sleep — cukup buat path spawn)
const fakeBin = path.join(aicallDir, "ai-call");
fs.writeFileSync(fakeBin, "#!/bin/sh\nsleep 30\n");
fs.chmodSync(fakeBin, 0o755);

// fake pm2 di PATH — catat argumen ke file, jlist output dari env
const fakePm2Dir = path.join(tmp, "bin");
fs.mkdirSync(fakePm2Dir);
const pm2Log = path.join(tmp, "pm2-calls.log");
fs.writeFileSync(path.join(fakePm2Dir, "pm2"), "#!/bin/sh\necho \"$@\" >> \"" + pm2Log + "\"\ncase \"$1\" in\n  jlist) echo \"${PM2JLIST:-[]}\" ;;\n  *) echo \"[PM2] ok\" ;;\nesac\n");
fs.chmodSync(path.join(fakePm2Dir, "pm2"), 0o755);

const ORIG_PATH = process.env.PATH;
const ORIG_CWD = process.cwd();
function setPm2(jlist) {
  process.env.PATH = fakePm2Dir + ":" + ORIG_PATH;
  process.env.PM2JLIST = jlist;
}
function noPm2() {
  process.env.PM2JLIST = "";
  process.env.PATH = fakePm2Dir.replace(/[^:]+$/, "nonexistent:") + ORIG_PATH;
}
function pm2Calls() {
  try { return fs.readFileSync(pm2Log, "utf-8"); } catch { return ""; }
}

// health fetch mock — default DOWN
let _healthOk = false;
function setHealth(up) { _healthOk = up; }
_setAicallAutostartFetchForTest(async () => ({ ok: _healthOk }));

// wait cepet buat test (default 20 dtk kelamaan)
mod._setAicallAutostartWaitForTest(200);

process.chdir(tmp);
console.log("— section 1: service sudah hidup → no-op —");
setHealth(true);
let r = await ensureAicallRunning({ silent: true });
ok("already-running", r.started === false && r.reason === "already-running", JSON.stringify(r));

console.log("— section 2: .noautostart → disabled —");
setHealth(false);
fs.writeFileSync(path.join(aicallDir, ".noautostart"), "1");
r = await ensureAicallRunning({ silent: true });
ok("disabled via flag", r.started === false && r.reason.includes("disabled"), JSON.stringify(r));
fs.rmSync(path.join(aicallDir, ".noautostart"));

console.log("— section 3: binary belum di-build → skip —");
fs.renameSync(fakeBin, fakeBin + ".tmp");
r = await ensureAicallRunning({ silent: true });
ok("binary missing ditolak", r.started === false && r.reason.includes("binary"), JSON.stringify(r));
fs.renameSync(fakeBin + ".tmp", fakeBin);

console.log("— section 4: .env belum ada → skip —");
fs.renameSync(path.join(aicallDir, ".env"), path.join(aicallDir, ".env.tmp"));
r = await ensureAicallRunning({ silent: true });
ok("env missing ditolak", r.started === false && r.reason.includes("env"), JSON.stringify(r));
fs.renameSync(path.join(aicallDir, ".env.tmp"), path.join(aicallDir, ".env"));

console.log("— section 5: pm2 baru — pm2 start tercatat benar —");
fs.writeFileSync(pm2Log, "");
setPm2("[]");
r = await ensureAicallRunning({ silent: true });
const calls5 = pm2Calls();
ok("pm2 start dipanggil", calls5.includes("start") && calls5.includes(fakeBin) && calls5.includes("nova-aicall"), calls5.replace(/\n/g, " | "));
ok("pm2 save dipanggil (persist dump)", calls5.includes("save"), calls5.replace(/\n/g, " | "));
ok("reason menyebut pm2 start", r.reason.includes("pm2 start"), r.reason);
ok("health belum OK → started false + hint", r.started === false && r.reason.includes("belum merespon"), r.reason);

console.log("— section 6: proses pm2 lama ada (stopped) → restart —");
fs.writeFileSync(pm2Log, "");
setPm2('[{"name":"nova-aicall","pm2_env":{"status":"stopped"}}]');
r = await ensureAicallRunning({ silent: true });
const calls6 = pm2Calls();
ok("pm2 restart dipanggil", calls6.includes("restart nova-aicall") && !calls6.includes(fakeBin), calls6.replace(/\n/g, " | "));
ok("reason menyebut restart", r.reason.includes("pm2 restart"), r.reason);

console.log("— section 7: pm2 tak terpasang → spawn langsung —");
fs.writeFileSync(pm2Log, "");
noPm2();
r = await ensureAicallRunning({ silent: true });
ok("spawn-direct path", r.reason.includes("spawn-direct") || r.reason.includes("spawn"), r.reason);

console.log("— section 8: service hidup setelah start → started true —");
// pm2 baru + service langsung OK setelah start → waitUntilUp succeed
setPm2("[]");
fs.writeFileSync(pm2Log, "");
// fetch mock: down saat probe pertama, UP setelah pm2 start terpanggil
let startedOnce = false;
_setAicallAutostartFetchForTest(async () => {
  if (fs.readFileSync(pm2Log, "utf-8").includes("start")) return { ok: true };
  return { ok: false };
});
r = await ensureAicallRunning({ silent: true });
ok("started true saat health OK", r.started === true, JSON.stringify(r));
ok("status helper terisi", getAicallAutostartStatus()?.reason === r.reason, JSON.stringify(getAicallAutostartStatus()));

// ── cleanup ──
_setAicallAutostartFetchForTest(undefined);
_clearAicallAutostartFetchForTest();
process.env.PATH = ORIG_PATH;
delete process.env.PM2JLIST;
mod._setAicallAutostartWaitForTest(null);
process.chdir(ORIG_CWD);
try { execSync("pkill -f 'sleep 30' 2>/dev/null || true"); } catch {}
fs.rmSync(tmp, { recursive: true, force: true });

console.log("");
console.log(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
