// NOVA AI — index-panel e2e: .index panel kontrol bot + optimizer RAM
// Fitur 26 Sep 2026 (owner: "buat fitur optimizer, ketika on otomatis
// turunin RAM > 500MB, default off + plugin index .index di kategori
// owner — usage & list fitur kontrol bot saat run, kontrol bagian
// index dan connection").
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

const DB_DIR = "/tmp/nova-idx-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

let pass = 0, fail = 0;
const w = (s) => console.log(s);
const t = (name, ok, extra) => { ok ? pass++ : fail++; w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); };

const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

const {
  getOptimizerState, setOptimizer, optimizeNow,
  initOptimizerMonitor, stopOptimizerMonitor, _optimizerInternalsForTest,
} = await import(R + "/src/lib/nova-optimizer.js");
const plugin = await import(R + "/plugins/bot/index.js");
const procCtl = await import(R + "/src/lib/nova-process-control.js");

// ─── 1. optimizer state ───
t("1a plugin config name=index kategori bot", plugin.config.name === "index" && plugin.config.category === "bot" && plugin.config.isOwner === true);
t("1b default optimizer OFF + threshold 500", getOptimizerState().on === false && getOptimizerState().thresholdMB === 500);
t("1c setOptimizer(true, 600)", setOptimizer(true, 600).on === true && getOptimizerState().thresholdMB === 600);
t("1d threshold gak valid (<100) diabaikan", setOptimizer(true, 50).thresholdMB === 600);
t("1e setOptimizer(false) → off", setOptimizer(false).on === false);

// ─── 2. optimizeNow jujur ───
const res2 = await optimizeNow("tes");
t("2a optimizeNow balikin angka", res2.before > 0 && res2.after > 0 && typeof res2.freedMB === "number");
t("2b hint jujur soal --expose-gc", typeof global.gc === "function" ? true : res2.hint.includes("--expose-gc"), res2.hint);

// ─── 3. monitor tick via seam ───
const itl = _optimizerInternalsForTest();
itl.setGetRss(() => 600 * 1024 * 1024); // simulasi RAM 600 MB
itl.setLastOptimizeAt(0);
setOptimizer(true, 500);
const prints = [];
await itl.runMonitorTick((s) => prints.push(s));
t("3a RAM > threshold → optimasi jalan", prints.some((x) => x.includes("OPTIMIZER") && x.includes("600 MB")), prints.join(" | "));
t("3b totalRuns kecatat", getOptimizerState().totalRuns >= 1);
// cooldown 60 dtk
prints.length = 0;
await itl.runMonitorTick((s) => prints.push(s));
t("3c cooldown < 60 dtk → info cooldown", prints.some((x) => x.includes("cooldown")), prints.join(" | "));
// state off → gak ada output
setOptimizer(false);
prints.length = 0;
await itl.runMonitorTick((s) => prints.push(s));
t("3d optimizer off → monitor senyap", prints.length === 0, prints.join(" | "));
// RAM normal → senyap
setOptimizer(true, 500);
itl.setGetRss(() => 100 * 1024 * 1024);
prints.length = 0;
await itl.runMonitorTick((s) => prints.push(s));
t("3e RAM < threshold → senyap", prints.length === 0);
itl.restoreGetRss();

// ─── 4. monitor lifecycle idempotent ───
const r1 = initOptimizerMonitor({ checkMs: 500 });
const r2 = initOptimizerMonitor({ checkMs: 500 });
t("4a monitor idempotent (reused)", r1.started && r2.reused === true);
stopOptimizerMonitor();
t("4b monitor berhenti", itl.isMonitoring() === false);

// ─── 5. dispatch plugin ───
const replies = [];
const fakeM = (args, body) => ({
  args, body: body || (".index " + args.join(" ")), command: "index",
  sender: "x@s.whatsapp.net", prefix: ".",
  reply: (txt) => { replies.push(String(txt)); return true; },
  react: () => true,
});
const fakeCtx = { sock: null, config: { command: { prefix: "." } } };
const run = async (args) => { replies.length = 0; await plugin.handler(fakeM(args), fakeCtx); return replies[0] || ""; };

// usage card
const card = await run([]);
t("5a usage card keluar", card.includes("ɪɴᴅᴇx") && card.includes("ᴏᴘᴛɪᴍɪᴢᴇʀ"), card.slice(0, 100));
t("5b daftar sub lengkap (pinglog/jam/ram/status)", ["ᴘɪɴɢʟᴏɢ", "ᴊᴀᴍ", "ʀᴀᴍ", "ꜱᴛᴀᴛᴜꜱ"].every((k) => card.includes(k)));

// optimizer via plugin
setOptimizer(false);
const onCard = await run(["optimizer", "on"]);
t("5c .index optimizer on", onCard.includes("ᴀᴋᴛɪꜰ") && getOptimizerState().on === true, onCard.slice(0, 80));
await run(["optimizer", "on", "600"]);
t("5d .index optimizer on 600 → threshold 600", getOptimizerState().thresholdMB === 600);
const stCard = await run(["optimizer", "status"]);
t("5e .index optimizer status", stCard.includes("ᴏɴ") && stCard.includes("600"), stCard.slice(0, 80));
const offCard = await run(["optimizer", "off"]);
t("5f .index optimizer off → state off", offCard.includes("ᴅɪᴍᴀᴛɪᴋᴀɴ") && getOptimizerState().on === false);

// ram & status & optimize
const ramCard = await run(["ram"]);
t("5g .index ram", ramCard.includes("ʀᴀᴍ") && ramCard.includes("ᴍʙ"), ramCard.slice(0, 90));
const stRamCard = await run(["status"]);
t("5h .index status ringkasan", stRamCard.includes("ᴏᴘᴛɪᴍɪᴢᴇʀ") && stRamCard.includes("ᴜᴘᴛɪᴍᴇ") || stRamCard.includes("ᴏᴘᴛɪᴍɪᴢᴇʀ") && stRamCard.includes("ᴡᴀ"), stRamCard.slice(0, 90));
const optCard = await run(["optimize"]);
t("5i .index optimize manual", optCard.includes("ᴏᴘᴛɪᴍᴀꜱɪ") && optCard.includes("ᴍʙ"));

// salah subcommand
const salah = await run(["ngasal"]);
t("5j sub asal → kartu salah", salah.includes("ʏᴀʜ ᴋᴀᴋ") && sc(salah).includes("index"), salah.slice(0, 80));

// pinglog & jam runtime control
const fakeSockCtl = { generateMessageTag: () => "T", query: async () => "ok", ev: { on: () => {}, off: () => {} } };
replies.length = 0;
await plugin.handler(fakeM(["pinglog", "on"], ".index pinglog on"), { sock: fakeSockCtl, config: { command: { prefix: "." } } });
const plOn = replies[0] || "";
t("5k .index pinglog on", plOn.includes("ᴘɪɴɢ") && plOn.includes("ɴʏᴀʟᴀᴋᴀɴ"), plOn.slice(0, 80));
const pitl = (await import(R + "/src/lib/nova-pinglog.js"))._pingLogInternalsForTest();
t("5l pinglog beneran jalan", pitl.isRunning() === true && pitl.isClockRunning() === true);
const jamOn = await run(["jam", "on"]);
t("5m .index jam on (idempotent jalan)", pitl.isClockRunning() === true);
await run(["jam", "off"]);
t("5n .index jam off → clock mati", pitl.isClockRunning() === false);
await run(["pinglog", "off"]);
t("5o .index pinglog off → semua mati", pitl.isRunning() === false && pitl.isClockRunning() === false);
// alias ping (rev owner): .index ping on / .index ping off
await plugin.handler(fakeM(["ping", "on"], ".index ping on"), { sock: fakeSockCtl, config: { command: { prefix: "." } } });
t("5p .index ping on (alias)", pitl.isRunning() === true);
const pingOff = await run(["ping", "off"]);
t("5q .index ping off (alias) → mati", pitl.isRunning() === false && pingOff.includes("ᴍᴀᴛɪᴋᴀɴ"), pingOff.slice(0, 60));

// ─── 6. .index restart (no.2 — DB disimpan dulu, exit via seam) ───
const pctl = procCtl._processControlForTest();
const exitCalls = [];
pctl.setExit((code) => exitCalls.push(code));
const cardR1 = await run(["restart"]);
t("6a restart tanpa konfirmasi → kartu peringatan", cardR1.includes("ʏᴀᴋɪɴ") || cardR1.includes("ʀᴇꜱᴛᴀʀᴛ"), cardR1.slice(0, 90));
const cardR2 = await run(["restart", "ya"]);
t("6b restart ya → dijalankan (belum exit, jeda 1.5 dtk)", cardR2.includes("ᴅɪᴊᴀʟᴀɴᴋᴀɴ") && exitCalls.length === 0, cardR2.slice(0, 90));
t("6c isRestarting aktif", procCtl.isRestarting() === true);
const resDup = await procCtl.gracefulRestart();
t("6d panggilan kedua ditolak (idempotent)", resDup.ok === false && resDup.reason.includes("sedang"));
// tunggu jeda 1.6 dtk → exit(0) via seam terpanggil
await new Promise((r) => setTimeout(r, 1700));
t("6e exit(0) terpanggil setelah jeda", exitCalls.length === 1 && exitCalls[0] === 0, JSON.stringify(exitCalls));
pctl.restoreExit();
pctl.resetRestarting();

// ─── 7. .index dbsave (no.3 — paksa simpan DB) ───
const saveCard = await run(["dbsave"]);
t("7a .index dbsave → tersimpan", saveCard.includes("ᴛᴇʀꜱɪᴍᴘᴀɴ"), saveCard.slice(0, 80));
const saveCardAlias = await run(["db"]);
t("7b alias db → jalan juga", saveCardAlias.includes("ᴛᴇʀꜱɪᴍᴘᴀɴ"));

// ─── 8. .index reconnect (no.4 — tanpa sock nyata → jujur gagal) ───
const rcCard = await run(["reconnect"]);
t("8a .index reconnect tanpa koneksi → jujur gagal", rcCard.includes("ɢᴀɢᴀʟ") && rcCard.includes("ᴋᴏɴᴇᴋꜱɪ"), rcCard.slice(0, 100));
const connMod = await import(R + "/src/connection.js");
t("8b forceReconnect diekspor connection.js", typeof connMod.forceReconnect === "function");
const rcRes = connMod.forceReconnect("tes e2e");
t("8c tanpa socket → {ok:false} aman", rcRes.ok === false && rcRes.reason.includes("belum ada koneksi"), JSON.stringify(rcRes));

// ─── 9. .index watchdog (no.5 — kontrol runtime detektor beku) ───
const conn9 = await import(R + "/src/connection.js");
const wd0 = conn9.getWatchdogStatus();
t("9a getWatchdogStatus bentuk bener", typeof wd0.active === "boolean" && wd0.intervalMin === 30 && typeof wd0.silentMin === "number", JSON.stringify(wd0));
t("9b setWatchdogInterval(45)", conn9.setWatchdogInterval(45).ok === true && conn9.getWatchdogStatus().intervalMin === 45);
t("9c interval gak valid ditolak (0, 5000, abc)", conn9.setWatchdogInterval(0).ok === false && conn9.setWatchdogInterval(5000).ok === false && conn9.setWatchdogInterval("abc").ok === false);
const wdCard = await run(["watchdog", "status"]);
t("9d .index watchdog status", wdCard.includes("ᴡᴀᴛᴄʜᴅᴏɢ") && wdCard.includes("45"), wdCard.slice(0, 90));
const wdSet = await run(["watchdog", "interval", "10"]);
t("9e .index watchdog interval 10", conn9.getWatchdogStatus().intervalMin === 10 && wdSet.includes("10"), wdSet.slice(0, 90));
const wdBad = await run(["watchdog", "interval", "0"]);
t("9f interval gak valid → kartu tolak", wdBad.includes("ɢᴀᴋ ᴠᴀʟɪᴅ"), wdBad.slice(0, 80));
await run(["watchdog", "off"]);
t("9g .index watchdog off → berhenti", conn9.getWatchdogStatus().active === false);
await run(["watchdog", "on"]);
t("9h .index watchdog on → aktif lagi", conn9.getWatchdogStatus().active === true);
const wdWrong = await run(["watchdog", "ngasal"]);
t("9i sub watchdog asal → kartu salah", wdWrong.includes("ʏᴀʜ ᴋᴀᴋ"));
conn9.stopWatchdog();
t("9j cleanup: watchdog dimatiin lagi", conn9.getWatchdogStatus().active === false);

// ─── 10. RAM ALERT (owner 26 Sep: "ya mau defaultnya off") ───
const pl = await import(R + "/src/lib/nova-pinglog.js");
const { evaluateRamAlert, setRamAlert, getRamAlertStatus, _setRamMemForTest, _clearRamMemForTest, _setRamAlertOwnerJidForTest, _clearRamAlertOwnerJidForTest, _pingLogInternalsForTest } = pl;

// 10a. unit: logika keputusan
t("10a default ramalert OFF", getRamAlertStatus().on === false && getRamAlertStatus().thresholdPct === 80);
t("10b evaluate: off → gak alert", evaluateRamAlert({ on: false, thresholdPct: 80, sysPct: 95 }) === false || evaluateRamAlert({ on: false, thresholdPct: 80, sysPct: 95 }).shouldAlert === false);
t("10c evaluate: on + RAM 90% ≥ ambang 80% → alert", evaluateRamAlert({ on: true, thresholdPct: 80, lastAlertAt: 0, sysPct: 90, now: 1000000 }).shouldAlert === true);
t("10d evaluate: RAM 70% < ambang 80% → gak", evaluateRamAlert({ on: true, thresholdPct: 80, lastAlertAt: 0, sysPct: 70, now: 1000000 }).shouldAlert === false);
t("10e evaluate: cooldown 30 mnt → gak dobel", evaluateRamAlert({ on: true, thresholdPct: 80, lastAlertAt: 1000000, sysPct: 90, now: 1000000 + 29 * 60 * 1000 }).shouldAlert === false);
t("10f evaluate: lewat cooldown → alert lagi", evaluateRamAlert({ on: true, thresholdPct: 80, lastAlertAt: 1000000, sysPct: 90, now: 1000000 + 31 * 60 * 1000 }).shouldAlert === true);

// 10b. DM flow — alert ke owner via pinglog sock
const dmSent = [];
const mockAlertSock = { sendMessage: async (jid, payload) => { dmSent.push({ jid, text: String(payload?.text || "") }); return { key: { id: "x" } }; } };
_setRamAlertOwnerJidForTest(() => "628000000001@s.whatsapp.net");
pl.startPingLog(mockAlertSock, { clockMs: 60000 });
_setRamMemForTest({ total: 1024 * 1024 * 1024, free: 50 * 1024 * 1024 }); // 1 GB, sisa 50 MB → ~95%
setRamAlert(true, 80);
const itlRam = _pingLogInternalsForTest();
await itlRam.runCheckRamAlert(() => {});
t("10g RAM 95% + alert on → DM owner kekirim", dmSent.length === 1 && dmSent[0].jid === "628000000001@s.whatsapp.net", JSON.stringify(dmSent.map((d) => d.jid)));
t("10h isi DM: kartu ram tinggi + ambang + cpu + waktu", sc(dmSent[0]?.text).includes("ram") && sc(dmSent[0]?.text).includes("tinggi") && sc(dmSent[0]?.text).includes("95%") && sc(dmSent[0]?.text).includes("ambang") && sc(dmSent[0]?.text).includes("cpu") && sc(dmSent[0]?.text).includes("core"), sc(dmSent[0]?.text).slice(0, 200));
t("10h2 getCpuLoadInfo balikin angka valid", pl.getCpuLoadInfo().cores >= 1 && typeof pl.getCpuLoadInfo().load === "number" && typeof pl.getCpuLoadInfo().pct === "number");
dmSent.length = 0;
await itlRam.runCheckRamAlert(() => {});
t("10i cooldown → gak DM dobel", dmSent.length === 0, dmSent.length + "");
setRamAlert(false);
dmSent.length = 0;
await itlRam.runCheckRamAlert(() => {});
t("10j alert off → RAM tinggi pun gak DM", dmSent.length === 0);
_clearRamMemForTest();
_clearRamAlertOwnerJidForTest();

// 10c. lewat plugin .index ramalert
setRamAlert(false);
let rp = "";
rp = await run(["ramalert", "status"]);
t("10k .index ramalert status → kartu kondisi", sc(rp).includes("status ram alert") && sc(rp).includes("off"), sc(rp).slice(0, 90));
{
  const rpCpu = await run(["ramalert", "status"]);
  t("10k2 status ramalert nunjukin cpu", sc(rpCpu).includes("cpu") && sc(rpCpu).includes("core"), sc(rpCpu).slice(0, 220));
}
rp = await run(["ramalert", "on"]);
t("10l .index ramalert on → aktif + ambang 80", sc(rp).includes("aktif") && getRamAlertStatus().on === true && getRamAlertStatus().thresholdPct === 80, sc(rp).slice(0, 90));
await run(["ramalert", "on", "85"]);
t("10m .index ramalert on 85 → ambang 85", getRamAlertStatus().thresholdPct === 85);
rp = await run(["ramalert", "on", "40"]);
t("10n ambang di luar 50-99 ditolak (tetap 85)", getRamAlertStatus().thresholdPct === 85 && sc(rp).includes("50-99"), sc(rp).slice(0, 90));
rp = await run(["ramalert", "off"]);
t("10o .index ramalert off → mati", sc(rp).includes("dimatikan"), sc(rp).slice(0, 90));
t("10p state akhir: off (default balik)", getRamAlertStatus().on === false);
const stRamCard2 = await run(["status"]);
t("10q .index status nunjukin baris RAM Alert", sc(stRamCard2).includes("ram alert"), sc(stRamCard2).slice(0, 200));

w("");
w(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
