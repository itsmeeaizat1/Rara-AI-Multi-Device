// E2E — TUGAS H-1 LIVE TICKER + FIX db (13 Sep 2026, batch 4 variasi polos)
// Audit: ".tugas H-1 ticker" — TERNYATA LEBIH PARAH: `db` gak pernah
// di-destructure → SEMUA command crash "db is not defined", clear nyasar
// ke global lama, done/del tanpa guard. Fix total + ticker countdown.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-tugas-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");

const { handler } = await import(R + "/plugins/education/assignment.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = SENDER;

function mkMock() {
  const replies = [];
  const sends = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".",
    reply: async (txt, opts) => { replies.push({ txt, opts }); return { key: { id: "r" + replies.length } }; },
  };
  const sock = {
    sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "m" + sends.length } }; },
  };
  return { m, sock, replies, sends };
}

const ctx = (m, sock) => ({ sock, args: [], config: { command: { prefix: "." } } });
const db = getDatabase();

function addTask(m, sock, dateStr, name) {
  return handler(m, { sock, args: ["add", `${dateStr} | ${name} | Matkul Tes`], config: { command: { prefix: "." } } });
}

// ═══════════════════════════════════════════════════════════════
w("\n— add + parse tanggal —");
{
  const { m, sock, replies, sends } = mkMock();
  await addTask(m, sock, "32/13", "Tugas SALAH"); // tanggal ngawur
  check("32/13 ditolak (validasi tanggal)", norm(replies.at(-1).txt).includes("format tanggal salah"), norm(replies.at(-1).txt).slice(0, 60));

  await addTask(m, sock, "25/12/2027", "Tugas Jauh");
  const r1 = norm(replies.at(-1).txt);
  check("add valid: ID TG + status 'hari lagi'", r1.includes("id: tg") && r1.includes("hari lagi"));
  check("add jauh (2027): GAK ada ticker", !sends.some((s) => norm(s.payload?.text || "").includes("paling deket")));

  const today = new Date();
  const d1 = new Date(today.getTime() + 86400000); // besok
  const ds = `${d1.getDate()}/${d1.getMonth() + 1}/${d1.getFullYear()}`;
  await addTask(m, sock, ds, "Tugas Besok");
  const r2 = norm(replies.at(-1).txt);
  check("add besok (H-1): hint countdown live muncul", r2.includes("countdown live"));
  await sleep(150);
  check("add besok: ticker kefire (kartu TUGAS PALING DEKET)", sends.some((s) => norm(s.payload?.text || "").includes("paling deket")));

  // tugas hari ini → lebih deket → list bakal pilih ini
  const d0 = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  await addTask(m, sock, d0, "Tugas Hari Ini");
  const r3 = norm(replies.at(-1).txt);
  check("add hari ini: status HARI INI", r3.includes("hari ini"));
  await sleep(150);
  const tickSends = sends.filter((s) => norm(s.payload?.text || "").includes("paling deket"));
  check("tugas hari ini ticker kefire", tickSends.length >= 1);
}

// ═══════════════════════════════════════════════════════════════
w("\n— list: kartu + ticker terdekat —");
{
  const { m, sock, replies, sends } = mkMock();
  // ticker "hari ini" dari add masih aktif → bebaskan dulu
  // (simulasi ticker lama udah settle, biar list kebagian nembak)
  const tgHariIni = db.setting("eduTasks")[SENDER].find((x) => norm(x.name).includes("hari ini")).id;
  if (global.__tugasTickers?.[tgHariIni]) delete global.__tugasTickers[tgHariIni];
  await handler(m, { ...ctx(m, sock), args: ["list"] });
  const lst = norm(replies.at(-1).txt);
  check("list: daftar tugas muncul (GAK crash db is not defined)", lst.includes("daftar tugas") && !lst.includes("error"), lst.slice(0, 60));
  await sleep(150);
  const tickText = norm(sends.map((s) => s.payload?.text || "").join(" "));
  check("list: ticker terdekat = tugas HARI INI", tickText.includes("hari ini") && tickText.includes("paling deket"));

  // list kedua → gak dobel ticker (guard __tugasTickers)
  const before = sends.filter((s) => norm(s.payload?.text || "").includes("paling deket")).length;
  await handler(m, { ...ctx(m, sock), args: ["list"] });
  await sleep(150);
  const after = sends.filter((s) => norm(s.payload?.text || "").includes("paling deket")).length;
  check("list 2x: ticker gak dobel (guard aktif)", after === before, `${before} → ${after}`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— done/del: guard + cancel ticker —");
const SENDER3 = "628999000111@s.whatsapp.net";
{
  const { m, sock, replies, sends } = mkMock();
  m.sender = SENDER3; // sender segar — guard & store terisolasi
  const today = new Date();
  const d0 = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  await addTask(m, sock, d0, "Tugas Hari Ini");
  await sleep(250);
  const idHariIni = db.setting("eduTasks")[SENDER3][0].id;
  check("ticker nyala di sesi ini (initial card)", sends.some((s) => norm(s.payload?.text || "").includes("paling deket")));

  await handler(m, { ...ctx(m, sock), args: ["done", "TGXXXX"] });
  check("done ID gak ada → gak crash, kartu 'gak ketemu'", norm(replies.at(-1).txt).includes("gak ketemu"));

  await handler(m, { ...ctx(m, sock), args: ["done", idHariIni] });
  check("done bener → status done + kartu selamat", norm(replies.at(-1).txt).includes("good job"));
  await handler(m, { ...ctx(m, sock), args: ["done", idHariIni] });
  check("done dobel → ditolak 'udah done'", norm(replies.at(-1).txt).includes("udah done"));

  // done tugas yang punya ticker aktif → 1 closing card DIBATALKAN, terus berhenti
  const editsBefore = sends.filter((s) => s.payload?.edit).length;
  await sleep(2600);
  const editMsgs = sends.filter((s) => s.payload?.edit).map((s) => norm(s.payload.text));
  const cancels = editMsgs.filter((x) => x.includes("dibatalkan")).length;
  check("done → closing 'COUNTDOWN DIBATALKAN' (bukan 'WAKTU HABIS')", cancels >= 1, editMsgs.join(" | ").slice(0, 100));
  check("done → ticker berhenti setelah closing (gak ngetick lagi)", editMsgs.length - editsBefore === 1, `${editsBefore} → ${editMsgs.length}`);
  check("closing GAK bilang 'waktu habis' buat tugas done", editMsgs.every((x) => !x.includes("waktu habis")));

  await handler(m, { ...ctx(m, sock), args: ["del", "TGXXXX"] });
  check("del ID gak ada → kartu 'gak ketemu'", norm(replies.at(-1).txt).includes("gak ketemu"));
  await handler(m, { ...ctx(m, sock), args: ["del", idHariIni] });
  check("del bener → tugas dihapus", norm(replies.at(-1).txt).includes("dihapus"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— terlewat + clear —");
{
  const { m, sock, replies, sends } = mkMock();
  const yesterday = new Date(Date.now() - 86400000);
  const ds = `${yesterday.getDate()}/${yesterday.getMonth() + 1}/${yesterday.getFullYear()}`;
  await addTask(m, sock, ds, "Tugas Telat");
  const r = norm(replies.at(-1).txt);
  check("add kemarin: TERLEWAT + gak ada ticker", r.includes("terlewat") && !sends.some((s) => norm(s.payload?.text || "").includes("paling deket")));

  await handler(m, { ...ctx(m, sock), args: ["pending"] });
  check("pending: GAK crash + tugas pending tampil", norm(replies.at(-1).txt).includes("pending"));

  await handler(m, { ...ctx(m, sock), args: ["clear"] });
  const c = norm(replies.at(-1).txt);
  check("clear: semua terhapus + GAK crash taskStore", c.includes("dihapus") || c.includes("belum ada"), c.slice(0, 60));
  await handler(m, { ...ctx(m, sock), args: ["list"] });
  check("list setelah clear → kosong", norm(replies.at(-1).txt).includes("belum ada tugas"));

  await handler(m, { ...ctx(m, sock), args: ["ngawur"] });
  check("cmd gak dikenal → perintah tidak ditemukan", norm(replies.at(-1).txt).includes("tidak ditemukan"));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
