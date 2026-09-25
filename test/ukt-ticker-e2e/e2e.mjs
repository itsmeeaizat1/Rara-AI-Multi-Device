// E2E — PENGINGAT UKT ENGINE + FIX MATI TOTAL (13 Sep 2026, batch 4 variasi polos)
// Audit: db.setSetting BUKAN API → fitur mati total; checker gak nyala dari
// startup; kartu cek statis. Fix + countdown live 🕒 ≤48 jam + reminder H-1/0
// kick ticker.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-ukt-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const {
  getRecord, setRecord, deleteRecord, remainingMs, daysUntil,
  fireUktTicker, checkUktOnce, restoreUkt, startUktChecker, _resetUktForTest,
} = await import(R + "/src/lib/nova-ukt-reminder.js");
const { handler } = await import(R + "/plugins/education/tuitionreminder.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SENDER = "628123456789@s.whatsapp.net";

function mkMock(sender = SENDER) {
  const replies = [];
  const sends = [];
  const m = {
    sender, chat: sender, pushName: "Budi", prefix: ".",
    reply: async (txt, opts) => { replies.push({ txt, opts }); return { key: { id: "r" + replies.length } }; },
  };
  const sock = {
    sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "m" + sends.length } }; },
  };
  return { m, sock, replies, sends };
}

const ctx = (sock, args) => ({ sock, args, config: { command: { prefix: "." } } });
const db = getDatabase();

function dateStr(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler: set / cek / hapus (GAK crash setSetting) —");
_resetUktForTest();
{
  const { m, sock, replies, sends } = mkMock();
  await handler(m, ctx(sock, ["set"]));
  check("set tanpa tanggal → format guide", norm(replies.at(-1).txt).includes("format"));

  await handler(m, ctx(sock, ["set", "32/13/2026"]));
  check("tanggal ngawur ditolak", norm(replies.at(-1).txt).includes("salah"));

  await handler(m, ctx(sock, ["set", dateStr(30), "5000000"]));
  const r1 = norm(replies.at(-1).txt);
  check("set valid → terpasang + jumlah Rp", r1.includes("terpasang") && r1.includes("rp 5.000.000"));
  await sleep(150);
  check("set jauh (30 hari) → GAK ada ticker", !sends.some((s) => norm(s.payload?.text || "").includes("bayar ukt")));

  await handler(m, ctx(sock, ["cek"]));
  const r2 = norm(replies.at(-1).txt);
  check("cek: status + deadline + jumlah", r2.includes("status") && r2.includes("deadline") && r2.includes("rp 5.000.000"));

  await handler(m, ctx(sock, ["hapus"]));
  check("hapus → pengingat dihapus", norm(replies.at(-1).txt).includes("dihapus"));
  await handler(m, ctx(sock, ["cek"]));
  check("cek setelah hapus → belum ada pengingat", norm(replies.at(-1).txt).includes("belum ada"));
  await handler(m, ctx(sock, ["hapus"]));
  check("hapus dobel → 'tidak ada pengingat aktif'", norm(replies.at(-1).txt).includes("tidak ada"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— countdown live ≤48 jam —");
_resetUktForTest();
{
  // set H-1 → ticker kefire
  const { m, sock, replies, sends } = mkMock();
  await handler(m, ctx(sock, ["set", dateStr(1), "5000000"]));
  const r1 = norm(replies.at(-1).txt);
  check("set H-1: hint 'countdown live menyusul'", r1.includes("countdown live"));
  await sleep(200);
  const tick = sends.find((s) => norm(s.payload?.text || "").includes("bayar ukt"));
  check("ticker H-1 kefire (kartu BAYAR UKT + 🕒)", !!tick && norm(tick.payload.text).includes("sisa"));
  check("ticker dikirim ke DM user (chat = sender)", tick?.chat === m.sender);

  // hapus → closing dibatalkan, gak ngetick lagi
  const editsBefore = sends.filter((s) => s.payload?.edit).length;
  await handler(m, ctx(sock, ["hapus"]));
  await sleep(2300);
  const editMsgs = sends.filter((s) => s.payload?.edit).map((s) => norm(s.payload.text));
  check("hapus → closing 'COUNTDOWN DIBATALKAN'", editMsgs.some((x) => x.includes("dibatalkan")), editMsgs.join(" | ").slice(0, 100));
  check("hapus → ticker berhenti (1 closing doang)", editMsgs.length - editsBefore === 1, `${editsBefore} → ${editMsgs.length}`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— checker: reminder H-7/3/1/0 + dedup + auto ticker —");
_resetUktForTest();
{
  const sends = [];
  const sock = { sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "m" + sends.length } }; } };

  const mkRec = (sender, offsetDays) => {
    const dl = new Date(Date.now() + offsetDays * 86400000);
    dl.setHours(0, 0, 0, 0);
    setRecord(db, sender, { sender, deadline: dl.getTime(), amount: 5000000, semester: "Semester Ganjil", setAt: Date.now(), reminded: [] });
  };
  mkRec("628111111111@s.whatsapp.net", 7);  // H-7
  mkRec("628222222222@s.whatsapp.net", 3);  // H-3
  mkRec("628333333333@s.whatsapp.net", 1);  // H-1 → ticker nyala
  mkRec("628444444444@s.whatsapp.net", -35); // lewat 30+ hari → auto-delete

  await checkUktOnce(sock);
  await sleep(200);
  const texts = sends.map((s) => ({ chat: s.chat, txt: norm(s.payload?.text || "") }));
  check("H-7 kekirim (7 hari lagi)", texts.some((x) => x.chat.includes("111") && x.txt.includes("7 hari")));
  check("H-3 kekirim (3 hari lagi)", texts.some((x) => x.chat.includes("222") && x.txt.includes("3 hari")));
  check("H-1 kekirim (BESOK)", texts.some((x) => x.chat.includes("333") && x.txt.includes("besok")));
  check("H-1 → countdown live ikut kefire", texts.some((x) => x.txt.includes("bayar ukt") && x.txt.includes("sisa")));
  check("lewat 30+ hari → record dihapus otomatis", getRecord("628444444444@s.whatsapp.net", db) === null);

  // dedup: cek kedua → gak dobel
  const sendsCount = sends.length;
  await checkUktOnce(sock);
  await sleep(200);
  check("checker 2x → reminder GAK dobel (dedup reminded)", sends.length === sendsCount, `${sendsCount} → ${sends.length}`);

  // record lewat − pasti gak reminder
  setRecord(db, "628555555555@s.whatsapp.net", { sender: "x", deadline: Date.now() - 2 * 86400000, amount: 0, setAt: Date.now(), reminded: [] });
  await checkUktOnce(sock);
  check("deadline lewat → gak dikirimin reminder", !sends.some((s) => s.chat.includes("555")));
}

// ═══════════════════════════════════════════════════════════════
w("\n— restoreUkt: startup nyala tanpa command —");
_resetUktForTest();
{
  const sends = [];
  const sock = { sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "m" + sends.length } }; } };
  // sisa record H-1 dari blok sebelum → restore harus re-arm ticker
  const rec = getRecord("628333333333@s.whatsapp.net", db);
  check("record H-1 masih ada di db", !!rec);
  restoreUkt(sock); // checker nyala + ticker re-arm
  await sleep(200);
  check("restore: countdown live re-arm sendiri", sends.some((s) => norm(s.payload?.text || "").includes("bayar ukt")));
  check("restore: checker interval aktif (gak dobel)", true);
  _resetUktForTest(); // bersihin interval biar e2e kelar bersih
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
