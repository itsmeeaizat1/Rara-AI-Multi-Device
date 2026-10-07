// RARA AI - MULTI DEVICE — E2E: resource guard cpanel (owner 7 Okt 2026):
// "limit cpu klo melebihi cpu panel dimatikan, limit disk, limit ram" +
// "notifnya ke saluran klo saluran cpanel aktif" — monitor panelClientKeys
// via Client API, nekat batas → dimatikan + notif owner DM + saluran
// (toggle .autobroadcastchannel serverGuardOff). Mock HTTP panel lokal.
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(__dirname, "../..");
process.chdir(R);

let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 260) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(os.tmpdir(), "cpanel-guard-e2e-db-" + Date.now()));

// ═══ SECTION 1: lib unit ═══
section("1. lib rara-cpanel-guard — settings");
const lib = await import(R + "/src/lib/rara-cpanel-guard.js");

let st = lib.getGuardStatus();
t("1a. default: guard mati, semua limit 0, aksi kill, interval 5",
  st.enabled === false && st.cpuMax === 0 && st.ramMax === 0 && st.diskMax === 0 && st.action === "kill" && st.intervalMenit === 5);
t("1b. formatBytes MB/GB", lib.formatBytes(500 * 1024 * 1024) === "500.0 MB" && lib.formatBytes(2 * 1024 ** 3) === "2.00 GB");
lib.setGuardField("cpuMax", 300);
lib.setGuardField("ramMax", 90);
lib.setGuardField("diskMax", 80);
st = lib.getGuardStatus();
t("1c. setGuardField: cpu 300, ram 90, disk 80", st.cpuMax === 300 && st.ramMax === 90 && st.diskMax === 80);
lib.setGuardField("action", "stop");
t("1d. action stop tersimpan", lib.getGuardStatus().action === "stop");
lib.setGuardField("action", "kill");

// ═══ SECTION 2: checkServer + runGuardCheck (mock panel) ═══
section("2. cek server via mock Client API");
const powerSignals = [];
const SERVERS = {
  "srv-heavy": { name: "HeavyServer", limits: { memory: 512, disk: 2000, cpu: 200 }, state: "running", cpu: 350, mem: 400 * 1024 * 1024, disk: 100 * 1024 * 1024 },
  "srv-ramhog": { name: "RamHog", limits: { memory: 512, disk: 2000, cpu: 200 }, state: "running", cpu: 50, mem: 490 * 1024 * 1024, disk: 100 * 1024 * 1024 },
  "srv-diskpig": { name: "DiskPig", limits: { memory: 512, disk: 2000, cpu: 200 }, state: "running", cpu: 20, mem: 100 * 1024 * 1024, disk: 1900 * 1024 * 1024 },
  "srv-santai": { name: "Santai", limits: { memory: 512, disk: 2000, cpu: 200 }, state: "running", cpu: 30, mem: 100 * 1024 * 1024, disk: 300 * 1024 * 1024 },
  "srv-mati": { name: "UdahMati", limits: { memory: 512, disk: 2000, cpu: 200 }, state: "offline", cpu: 400, mem: 0, disk: 0 },
};
const srv = http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  const mId = (req.url.match(/\/api\/client\/servers\/([^/]+)/) || [])[1];
  const s = SERVERS[mId];
  if (req.method === "GET" && req.url.endsWith("/resources") && s) {
    res.end(JSON.stringify({ attributes: { current_state: s.state, resources: { cpu_absolute: s.cpu, memory_bytes: s.mem, disk_bytes: s.disk } } }));
  } else if (req.method === "GET" && req.url.endsWith("/" + mId) && s) {
    res.end(JSON.stringify({ attributes: { name: s.name, limits: s.limits } }));
  } else if (req.method === "POST" && req.url.endsWith("/power")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { powerSignals.push({ id: mId, signal: JSON.parse(body).signal }); res.statusCode = 204; res.end(); });
  } else { res.statusCode = 404; res.end("{}"); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;
const mkTarget = (id) => ({ ptlc: "ptlc_mock", domain: "http://127.0.0.1:" + PORT, serverId: id, serverLabel: id, username: "user" + id });

const stOn = { ...lib.getGuardStatus(), enabled: true, cpuMax: 300, ramMax: 90, diskMax: 80 };

t("2a. heavy (CPU 350 > 300) → pelanggaran cpu",
  (await lib.checkServer(mkTarget("srv-heavy"), stOn)).violation === "cpu");
const rSantai = await lib.checkServer(mkTarget("srv-santai"), stOn);
t("2b. santai → gak ada pelanggaran", rSantai.violation === null && rSantai.cpu === 30);
t("2c. ramhog (95.7% RAM > 90) → pelanggaran ram",
  (await lib.checkServer(mkTarget("srv-ramhog"), stOn)).violation === "ram");
t("2d. diskpig (95% disk > 80) → pelanggaran disk",
  (await lib.checkServer(mkTarget("srv-diskpig"), stOn)).violation === "disk");
t("2e. server offline → gak dihukum walau angkanya tinggi",
  (await lib.checkServer(mkTarget("srv-mati"), stOn)).violation === null);
t("2f. batas 0 = gak dicek (cpuMax 0 → cpu 350 bebas)",
  (await lib.checkServer(mkTarget("srv-heavy"), { ...stOn, cpuMax: 0 })).violation === null);
const rDetail = await lib.checkServer(mkTarget("srv-heavy"), stOn);
t("2g. nama + limit kebaca dari detail", rDetail.name === "HeavyServer" && rDetail.limits.memory === 512);
t("2h. ramPct hitung bener", rDetail.ramPct > 77 && rDetail.ramPct < 79, rDetail.ramPct);

// ── runGuardCheck penuh: database panelClientKeys + notif ──
section("3. runGuardCheck — matikan + notif");
const db = getDatabase();
db.setting("panelClientKeys", {
  "628111111111@s.whatsapp.net": mkTarget("srv-heavy"),
  "628222222222@s.whatsapp.net": mkTarget("srv-ramhog"),
  "628333333333@s.whatsapp.net": mkTarget("srv-santai"),
  "628444444444@s.whatsapp.net": mkTarget("srv-mati"),
});
db.save();

const dms = [];
const sock = {
  sendMessage: async (to, msg) => { dms.push({ to, text: msg?.text || "" }); },
};
lib.setGuardSock(sock);
lib.setGuardField("enabled", true);

// seam saluran: nangkap notif + toggle via db
const saluranMsgs = [];
const bc = await import(R + "/src/lib/rara-saluran-broadcast.js");
bc._setBroadcastSendForTest(async (message) => { saluranMsgs.push(String(message)); });
db.setting("saluranNotify_serverGuardOff", true);
db.save();

powerSignals.length = 0; dms.length = 0; saluranMsgs.length = 0;
let res = await lib.runGuardCheck();
t("3a. 4 server dicek (offline ikut dihitung)", res.checked === 4, res);
t("3b. 2 pelanggaran (heavy cpu + ramhog ram)", res.violations.length === 2 && res.violations.some((v) => v.kind === "cpu") && res.violations.some((v) => v.kind === "ram"));
t("3c. server pelanggaran dimatikan (kill), santai gak disentuh",
  powerSignals.some((p) => p.id === "srv-heavy" && p.signal === "kill") &&
  powerSignals.some((p) => p.id === "srv-ramhog" && p.signal === "kill") &&
  !powerSignals.some((p) => p.id === "srv-santai"));
t("3d. notif DM owner kekirim (kartu dimatikan otomatis)",
  dms.some((d) => /Server Dimatikan Otomatis/.test(d.text) && /HeavyServer/.test(d.text) && /CPU/.test(d.text)), dms.map((d) => d.text.slice(0, 60)));
t("3e. notif saluran kekirim (serverGuardOff aktif)",
  saluranMsgs.some((x) => /Server Melebihi Limit/.test(x) && /RamHog/.test(x) && /Dimatikan otomatis/.test(x)), saluranMsgs[0]?.slice(0, 120));

// cooldown 30 mnt: server yang barusan dihukum dilewati, gak dobel kill
powerSignals.length = 0; saluranMsgs.length = 0;
res = await lib.runGuardCheck();
t("3f. cooldown → pelanggaran barusan dilewati (gak dobel kill)",
  res.skipped === 2 && res.violations.length === 0 && powerSignals.length === 0, res);

// action stop → signal stop
lib.setGuardField("action", "stop");
// reset cooldown biar ke-trigger lagi
db.setting("cpanelGuardCooldown", {});
db.save();
powerSignals.length = 0;
await lib.runGuardCheck();
t("3g. action stop → signal stop (bukan kill)", powerSignals.some((p) => p.signal === "stop") && !powerSignals.some((p) => p.signal === "kill"));

// toggle saluran OFF → gak ada notif saluran
db.setting("saluranNotify_serverGuardOff", false);
db.save();
db.setting("cpanelGuardCooldown", {});
db.save();
saluranMsgs.length = 0; dms.length = 0;
await lib.runGuardCheck();
t("3h. toggle saluran OFF → notif saluran gak kekirim (DM tetap jalan)",
  saluranMsgs.length === 0 && dms.length > 0);

// guard disabled → gak ada aksi
lib.setGuardField("enabled", false);
db.setting("cpanelGuardCooldown", {});
db.save();
powerSignals.length = 0;
await lib.runGuardCheck();
t("3i. guard mati (enabled false) → gak ada power sama sekali", powerSignals.length === 0);

// ═══ SECTION 4: monitor timer ═══
section("4. monitor timer");
lib.setGuardField("enabled", true);
t("4a. enabled + ada limit → syncGuardMonitor nyala timer", (await lib.syncGuardMonitor()).started === true && lib._isRunning() === true);
t("4b. syncGuardMonitor idempotent (gak dobel timer)", (await lib.syncGuardMonitor()).started === true);
lib.setGuardField("enabled", false);
t("4c. disabled → timer berhenti", (await lib.syncGuardMonitor()).started === false && lib._isRunning() === false);
lib.setGuardField("enabled", true);
lib.setGuardField("cpuMax", 0); lib.setGuardField("ramMax", 0); lib.setGuardField("diskMax", 0);
t("4d. enabled tapi limit semua 0 → timer gak nyala (needLimit)", (() => { const r = lib.syncGuardMonitor(); return r.started === false && r.needLimit === true; })());

// ═══ SECTION 5: plugin command guard ═══
section("5. plugin .cpanelprotect guard/cpu/ram/disk");
const plugin = await import(R + "/plugins/panel/cpanelprotect.js");
const replies = [];
function mkM(text, opts = {}) {
  return {
    command: "cpanelprotect", args: text.split(/\s+/).filter(Boolean), text: ".cpanelprotect " + text, prefix: ".",
    sender: "628999000000@s.whatsapp.net", chat: "628999000000@s.whatsapp.net",
    isOwner: opts.isOwner ?? true, isGroup: false,
    mentionedJid: null, quoted: null, react: async () => {},
    reply: async (x) => replies.push(String(x)),
  };
}
const rt = () => replies.join("\n");

replies.length = 0; lib.setGuardField("cpuMax", 0); lib.setGuardField("ramMax", 0); lib.setGuardField("diskMax", 0); lib.setGuardField("enabled", false);
await plugin.handler(mkM("guard on"), { sock });
t("5a. guard on tanpa limit → hint set limit dulu", /belum ada limit/.test(rt()), rt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("cpu 300"), { sock });
t("5b. .cpanelprotect cpu 300 → limit ke-set + arahan guard on", /cpu.*300/.test(rt()) && /cpanelprotect guard on/.test(rt()), rt().slice(0, 140));
replies.length = 0;
await plugin.handler(mkM("ram 90"), { sock });
t("5c. .cpanelprotect ram 90 → ke-set", /ram.*90/.test(rt()), rt().slice(0, 120));
replies.length = 0;
await plugin.handler(mkM("disk 80"), { sock });
t("5d. .cpanelprotect disk 80 → ke-set", /disk.*80/.test(rt()), rt().slice(0, 120));
replies.length = 0;
await plugin.handler(mkM("guard on"), { sock });
t("5e. guard on + limit ada → monitor jalan", /aktif/.test(rt()) && lib.getGuardStatus().enabled === true && lib._isRunning() === true, rt().slice(0, 140));

replies.length = 0;
await plugin.handler(mkM("cpu 9999"), { sock });
t("5f. cpu ngawur (>1000) → ditolak", /gak valid/.test(rt()) && lib.getGuardStatus().cpuMax === 300, rt().slice(0, 120));
replies.length = 0;
await plugin.handler(mkM("ram 150"), { sock });
t("5g. ram 150% → ditolak (maks 100)", /gak valid/.test(rt()) && lib.getGuardStatus().ramMax === 90);
replies.length = 0;
await plugin.handler(mkM("cpu 0"), { sock });
t("5h. cpu 0 → cek cpu dimatiin", /cpu.*dimatikan/.test(rt()) && lib.getGuardStatus().cpuMax === 0);
lib.setGuardField("cpuMax", 300);

replies.length = 0;
await plugin.handler(mkM("interval 10"), { sock });
t("5i. interval 10 mnt", /10 menit/.test(rt()) && lib.getGuardStatus().intervalMenit === 10);
replies.length = 0;
await plugin.handler(mkM("interval 0"), { sock });
t("5j. interval 0 → ditolak", /gak valid/.test(rt()));
replies.length = 0;
await plugin.handler(mkM("action stop"), { sock });
t("5k. action stop", /stop \(halus\)/.test(rt()) && lib.getGuardStatus().action === "stop");
replies.length = 0;
await plugin.handler(mkM("action nuklir"), { sock });
t("5l. aksi ngawur → ditolak", /gak valid/.test(rt()));

replies.length = 0;
await plugin.handler(mkM("cek"), { sock });
t("5m. .cpanelprotect cek → hasil cek live", /HASIL CEK GUARD/.test(rt()) && /Pelanggaran: \d+/.test(rt()), rt().slice(0, 160));

replies.length = 0;
await plugin.handler(mkM("settings"), { sock });
t("5n. settings → seksi GUARD LIMIT RESOURCE muncul",
  /GUARD LIMIT RESOURCE/.test(rt()) && /CPU — matikan/.test(rt()) && /RAM — matikan/.test(rt()) && /Disk — matikan/.test(rt()) && /autobroadcastchannel serverGuardOff/.test(rt()), rt().slice(0, 200));

replies.length = 0;
await plugin.handler(mkM("guard off"), { sock });
t("5o. guard off → dimatikan", /dimatikan/.test(rt()) && lib.getGuardStatus().enabled === false && lib._isRunning() === false);

srv.close();
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
