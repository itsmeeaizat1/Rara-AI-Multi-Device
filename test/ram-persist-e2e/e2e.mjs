// E2E RAM PERSIST SWEEP (13 Sep 2026) — data global.* gak ilang pas restart
// + reminder re-arm + alarm scheduler beneran bunyi.
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "rampersist-e2e-db-")) + "/rara.json");
const db = getDatabase();
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ── 1. rara-ram-persist generik ──
w("\n— rara-ram-persist (escrow/market/gbank/absensi/santet) —");
const { persistLoad, persistSave, _resetPersistForTest } = await import(R + "/src/lib/rara-ram-persist.js");

// simulasi: proses lama nyimpen escrow lalu "restart" (global dikosongin)
global.rpgEscrow = [{ id: 1, sender: "a@s.whatsapp.net", receiver: "b@s.whatsapp.net", amount: 500, status: "pending" }];
persistSave("rpgEscrow");
global.rpgEscrow = []; // simulasi restart proses
_resetPersistForTest();
persistLoad("rpgEscrow");
check("1a. escrow ke-restore dari db", global.rpgEscrow.length === 1 && global.rpgEscrow[0].amount === 500);

// market
global.rpgMarket = [{ seller: "a@s.whatsapp.net", item: "pedang", harga: 200 }];
persistSave("rpgMarket");
global.rpgMarket = [];
_resetPersistForTest();
persistLoad("rpgMarket");
check("1b. market listing ke-restore", global.rpgMarket.length === 1 && global.rpgMarket[0].item === "pedang");

// gbank
global.rpgGuildBank = { "g1": { balance: 1500 } };
persistSave("rpgGuildBank");
global.rpgGuildBank = {};
_resetPersistForTest();
persistLoad("rpgGuildBank");
check("1c. saldo guild ke-restore", global.rpgGuildBank.g1 && global.rpgGuildBank.g1.balance === 1500);

// absensi
global.absensi = { "grup@g.us": { keterangan: "Absen Harian", createdBy: "a@s.whatsapp.net", createdAt: new Date().toISOString(), peserta: ["a@s.whatsapp.net"] } };
persistSave("absensi");
global.absensi = {};
_resetPersistForTest();
persistLoad("absensi");
check("1d. sesi absensi ke-restore (peserta ikut)", global.absensi["grup@g.us"] && global.absensi["grup@g.us"].peserta.length === 1);

// gak nimpa yang udah ada
global.rpgEscrow = [{ id: 99, amount: 1, status: "pending" }];
_resetPersistForTest();
persistLoad("rpgEscrow");
check("1e. load gak nimpa global yang udah ada isi", global.rpgEscrow[0].id === 99);

// db nyimpen beneran
check("1f. tertulis ke db.setting", (db.setting("ramPersist:rpgGuildBank") || {}).g1?.balance === 1500);

// ── 2. reminder engine ──
w("\n— reminder engine (persist + re-arm + terlewat) —");
const engine = await import(R + "/src/lib/rara-reminder-engine.js");
const { persistReminders, armReminder, fireReminder, restoreReminders } = engine;

const sent = [];
const sock = { sendMessage: async (jid, payload) => { sent.push({ jid, text: norm(payload.text || ""), mentions: payload.mentions }); } };

// buat reminder 2 detik → persist → fires
global.raraReminders = [];
const rem = { id: "RT1", jid: "chat@g.us", sender: "a@s.whatsapp.net", senderName: "A", message: "tes reminder", fireAt: Date.now() + 1500, createdAt: Date.now(), fired: false };
global.raraReminders.push(rem);
armReminder(sock, rem);
persistReminders();
check("2a. reminder aktif tersimpan di db", (db.setting("raraReminders") || []).length === 1);
await new Promise(r => setTimeout(r, 2200));
check("2b. reminder bunyi tepat waktu", sent.length === 1 && sent[0].text.includes("reminder berbunyi"));
check("2c. setelah bunyi, db dibersihin (fired gak disimpen)", (db.setting("raraReminders") || []).length === 0);

// restore: reminder masa depan → re-arm; kelewat → notif terlewat
sent.length = 0;
db.setting("raraReminders", [
  { id: "RT2", jid: "chat@g.us", sender: "a@s.whatsapp.net", message: "masa depan", fireAt: Date.now() + 3600_000, createdAt: Date.now(), fired: false },
  { id: "RT3", jid: "chat@g.us", sender: "a@s.whatsapp.net", message: "kelewat pas bot mati", fireAt: Date.now() - 3600_000, createdAt: Date.now(), fired: false },
]);
global.raraReminders = [];
const rr = restoreReminders(sock);
check("2d. restore: 1 dipasang ulang", rr.rearmed === 1, JSON.stringify(rr));
check("2e. restore: 1 terlewat dikabarin", rr.missed === 1);
await new Promise(r => setTimeout(r, 300));
check("2f. notif terlewat kekirim ke chat asal", sent.length === 1 && sent[0].text.includes("terlewat") && sent[0].jid === "chat@g.us");
check("2g. timer masa depan aktif (timerId kepasang)", global.raraReminders.some(r => r.id === "RT2" && r.timerId));
global.raraReminders.forEach(r => { if (r.timerId) clearTimeout(r.timerId); });

// ── 3. alarm engine ──
w("\n— alarm engine (scheduler beneran + persist + 1x per hari) —");
const alarmLib = await import(R + "/src/lib/rara-alarm.js");
const { loadAlarms, saveAlarms, initAlarmScheduler } = alarmLib;

global.alarms = {};
const sender = "a@s.whatsapp.net";
// pasang alarm di MENIT BERIKUTNYA (biar kena dalam ~60 dtk)
const wib = new Date(Date.now() + 7 * 3600 * 1000 + 60_000);
const hh = String(wib.getUTCHours()).padStart(2, "0");
const mm = String(wib.getUTCMinutes()).padStart(2, "0");
const targetTime = `${hh}:${mm}`;

const mA = { sender, pushName: "A", chat: "chat@g.us", args: [targetTime, "bangun"], text: `${targetTime} bangun`, reply: async () => {}, prefix: "." };
const alarmPlugin = await import(R + "/plugins/utility/alarm.js");
await alarmPlugin.handler(mA, { sock: { sendMessage: async () => {} }, config: { command: { prefix: "." } } });
check("3a. alarm kepasang + tersimpan di db", (db.setting("raraAlarms") || {})[sender]?.length === 1);
check("3b. alarm nyimpen chat tujuan", db.setting("raraAlarms")[sender][0].chat === "chat@g.us");

// scheduler nyala → alarm bunyi di menit target (tunggu max 100 dtk)
sent.length = 0;
initAlarmScheduler(sock);
check("3c. scheduler aktif", !!global.__novaAlarmTimer);
let fired = false;
for (let i = 0; i < 20 && !fired; i++) {
  await new Promise(r => setTimeout(r, 5000));
  fired = sent.some(s => s.text.includes("alarm berbunyi"));
}
check("3d. alarm BUNYI beneran di jam target", fired, `target ${targetTime}, dapat ${sent.length} pesan`);
if (fired) {
  const msg = sent.find(s => s.text.includes("alarm berbunyi"));
  check("3e. alarm kekirim ke chat yang bener + mention", msg.jid === "chat@g.us" && (msg.mentions || []).includes(sender));
  check("3f. guard 1x per hari (lastFiredYmd tercatat)", db.setting("raraAlarms")[sender][0].lastFiredYmd !== null);
}
clearInterval(global.__novaAlarmTimer);
global.__novaAlarmTimer = null;

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
