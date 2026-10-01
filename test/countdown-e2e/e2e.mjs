// E2E — LIVE COUNTDOWN TICKER (13 Sep 2026)
// Request owner: "cba cek fitur lain yg masih biasa aja kyk td fitur .afk
// g ada counddown" — kartu .afk/.remind/.alarm dulu polos statis (durasi
// angka beku), sekarang durasi/sisa waktu nge-tick HIDUP tiap detik.
// BARU src/lib/rara-countdown.js — runLiveTicker edit-in-place adaptif
// (detik-detik akhir tick per detik, sisanya adaptif 30s/60s, kuota edit
// dibatasi biar gak spam WhatsApp).
// Tes dipercepat via env: NOVAFK_TICKER_MS (AFK tick window) +
// NOVA_TICK_MAXEDITS (kuota edit reminder/alarm).
// E2E RARA COUNTDOWN — pola db asli path tmp (ala afk-e2e).
process.env.NOVAFK_TICKER_MS = "1500";
process.env.NOVA_TICK_MAXEDITS = "2";

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase } = await import(R + "/src/lib/rara-database.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "cd-e2e-db-")) + "/rara.json");

const { formatRemaining, runLiveTicker } = await import(R + "/src/lib/rara-countdown.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => fromSC(String(s)).toLowerCase();

function mockSock() {
  const sent = [];
  const sock = {
    sent,
    sendMessage: async (chat, payload) => {
      sent.push({ chat, payload });
      return { key: { id: "k" + sent.length, remoteJid: chat } };
    },
  };
  return sock;
}

// ═══════════════════════════════════════════════════════════════
w("\n— formatRemaining —");
check("00:45", formatRemaining(45000) === "00:45", formatRemaining(45000));
check("01:05", formatRemaining(65000) === "01:05", formatRemaining(65000));
check("1:00:00", formatRemaining(3600000) === "1:00:00", formatRemaining(3600000));
check("2 hari 04 jam", formatRemaining(2 * 86400000 + 4 * 3600000) === "2 hari 04 jam", formatRemaining(2 * 86400000 + 4 * 3600000));
check("00:00 saat 0/negatif", formatRemaining(0) === "00:00" && formatRemaining(-5000) === "00:00");

// ═══════════════════════════════════════════════════════════════
w("\n— runLiveTicker mode down: countdown tiap detik sampai abis —");
{
  const sock = mockSock();
  const t0 = Date.now();
  const res = await runLiveTicker({
    sock, chat: "t@g.us",
    mode: "down", targetTs: Date.now() + 2500,
    initialCard: "AWAL", tickCard: (st) => "🕒 " + formatRemaining(st.remainingMs),
  });
  const dt = Date.now() - t0;
  check("berhenti pas waktunya (finished)", res.finished === true, JSON.stringify(res));
  check("durasi nyata ~2.5-4 dtk (tick tiap detik)", dt >= 2400 && dt < 5000, dt + "ms");
  check("initial + beberapa edit + final", sock.sent.length >= 3, sock.sent.length + " pesan");
  const last = sock.sent[sock.sent.length - 1].payload;
  check("kartu final 00:00", String(last.text).includes("00:00"), last.text);
  const allEdit = sock.sent.slice(1).every((s) => !!s.payload.edit);
  check("semua update lewat edit key yang sama", allEdit && sock.sent[1].payload.edit.id === "k1", JSON.stringify(sock.sent[1].payload.edit));
}
{
  // kuota edit abis → finalCard statis dipakai (timer jauh)
  const sock = mockSock();
  const res = await runLiveTicker({
    sock, chat: "t@g.us",
    mode: "down", targetTs: Date.now() + 10 * 60 * 1000, maxEdits: 2,
    initialCard: "AWAL",
    tickCard: (st) => "🕒 " + formatRemaining(st.remainingMs),
    finalCard: () => "FINAL-STATIS",
  });
  check("berhenti sebelum waktunya (finished=false)", res.finished === false, JSON.stringify(res));
  check("maxEdits dipatuhi", res.edits === 2, "edits=" + res.edits);
  const last = String(sock.sent[sock.sent.length - 1].payload.text);
  check("finalCard statis dikirim", last === "FINAL-STATIS", last);
}
{
  // edit gagal → ticker diam, kartu awal tetep ada
  const sock = mockSock();
  sock.sendMessage = async (chat, payload) => {
    if (payload?.edit) throw new Error("edit tidak didukung");
    sock.sent.push({ chat, payload });
    return { key: { id: "k1" } };
  };
  const res = await runLiveTicker({
    sock, chat: "t@g.us",
    mode: "down", targetTs: Date.now() + 2500,
    initialCard: "AWAL", tickCard: (st) => "🕒 " + formatRemaining(st.remainingMs),
  });
  check("gak crash pas edit gagal", typeof res.edits === "number");
  check("kartu awal tetep tampil", sock.sent.length >= 1 && String(sock.sent[0].payload.text) === "AWAL", JSON.stringify(sock.sent.map(s => s.payload)));
}

// ═══════════════════════════════════════════════════════════════
w("\n— runLiveTicker mode up: count-up AFK —");
{
  const sock = mockSock();
  const res = await runLiveTicker({
    sock, chat: "t@g.us",
    mode: "up", sinceTs: Date.now() - 3000, upRunMs: 2000,
    initialCard: "⏱️ 0 dtk", tickCard: (st) => "⏱️ " + Math.floor(st.elapsedMs / 1000) + " dtk",
  });
  check("selesai setelah upRunMs", res.finished === true, JSON.stringify(res));
  const first = Math.floor(3000 / 1000), second = sock.sent[1] ? Number(String(sock.sent[1].payload.text).replace("⏱️ ", "").replace(" dtk", "")) : -1;
  check("durasi nambah antar tick (3→4 dtk)", second >= first && second <= first + 3, sock.sent.map((s) => s.payload.text).join(" | "));
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin .afk: kartu SET nge-tick hidup —");
{
  const { config, handler } = await import("../../plugins/group/afk.js");
  const sock = mockSock();
  const m = {
    sender: "62811@row", chat: "t@g.us", pushName: "Budi",
    args: ["lagi", "makan"], text: "lagi makan",
    reply: async (text) => { sock.sent.push({ chat: m.chat, payload: { text } }); return { key: { id: "r" } }; },
  };
  await handler(m, { sock });
  const cards = sock.sent.filter((s) => norm(s.payload.text).includes("afk aktif"));
  check("kartu AFK Aktif muncul", cards.length >= 1, JSON.stringify(sock.sent.map(s => String(s.payload.text).slice(0, 40))));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("durasi nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
  const durs = sock.sent.map((s) => {
    const mm = norm(s.payload.text).match(/⏱️ durasi : ([^\n]+)/);
    return mm ? mm[1] : null;
  }).filter(Boolean);
  check("baris durasi ke-update (bukan angka beku)", durs.length >= 2, durs.join(" → "));
  const cleanUp = global.__novaAfkNotifyTs; // jaga throttle global
  global.__novaAfkNotifyTs?.clear?.();
}
{
  // .afk cek — kartu cek nge-tick juga
  const { config, handler } = await import("../../plugins/group/afk.js");
  const sock = mockSock();
  const m = {
    sender: "62811@row", chat: "t@g.us", pushName: "Budi",
    args: [], text: "", mentionedJid: ["62811@row"],
    reply: async (text) => { sock.sent.push({ chat: m.chat, payload: { text } }); return { key: { id: "r" } }; },
  };
  // set dulu biar ada data AFK
  await handler({ ...m, args: ["tidur"], text: "tidur", mentionedJid: [] }, { sock });
  const before = sock.sent.length;
  await handler({ ...m, args: ["cek"], text: "cek", mentionedJid: ["62811@row"] }, { sock });
  const cekCards = sock.sent.slice(before).filter((s) => norm(s.payload.text).includes("cek afk"));
  check("kartu Cek AFK muncul", cekCards.length >= 1, JSON.stringify(sock.sent.slice(before).map(s => String(s.payload.text).slice(0, 40))));
  const edits = sock.sent.slice(before).filter((s) => !!s.payload.edit);
  check("cek durasi nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin .remind: kartu countdown ke waktu berbunyi —");
{
  const { config, handler } = await import("../../plugins/tools/reminder.js");
  const sock = mockSock();
  const m = {
    sender: "62812@row", chat: "d@row", pushName: "Siti",
    args: ["6s", "minum", "obat"], text: "6s minum obat",
    react: async () => {},
    reply: async (text) => { sock.sent.push({ chat: m.chat, payload: { text } }); return { key: { id: "r" } }; },
  };
  await handler(m, { sock });
  const remCards = sock.sent.filter((s) => norm(s.payload.text).includes("reminder dibuat"));
  check("kartu Reminder Dibuat muncul", remCards.length >= 1, JSON.stringify(remCards.map(s => String(s.payload.text).slice(0, 30))));
  const remEdits = sock.sent.filter((s) => !!s.payload.edit);
  check("countdown nge-tick via edit-in-place", remEdits.length >= 1, remEdits.length + " edit");
  // tunggu reminder beneran berbunyi (6s)
  await sleep(4000);
  const fired = sock.sent.some((s) => norm(s.payload.text).includes("reminder berbunyi") || norm(s.payload.text).includes("waktunya"));
  await sleep(2500);
  const fired2 = sock.sent.some((s) => norm(s.payload.text).includes("reminder berbunyi") || norm(s.payload.text).includes("waktunya"));
  check("reminder beneran berbunyi setelah countdown", fired || fired2, sock.sent.map(s => String(s.payload.text).slice(0, 40)).join(" | "));
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin .alarm: kartu countdown ke HH:MM —");
{
  const { config, handler } = await import("../../plugins/utility/alarm.js");
  const sock = mockSock();
  // alarm = menit WIB berikutnya (1-60 dtk ke depan)
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000 + 60 * 1000);
  const hh = String(nowWib.getUTCHours()).padStart(2, "0");
  const mmnt = String(nowWib.getUTCMinutes()).padStart(2, "0");
  const m = {
    sender: "62813@row", chat: "d2@row", pushName: "Anto",
    text: `${hh}:${mmnt} bangun`,
    reply: async (text) => { sock.sent.push({ chat: m.chat, payload: { text } }); return { key: { id: "r" } }; },
  };
  await handler(m, { sock, config: { command: { prefix: "." } } });
  const alarmCards = sock.sent.filter((s) => norm(s.payload.text).includes("alarm disetel"));
  check("kartu Alarm Disetel muncul", alarmCards.length >= 1, JSON.stringify(sock.sent.map(s => String(s.payload.text).slice(0, 40))));
  const hasCountdown = sock.sent.some((s) => norm(s.payload.text).includes("bunyi dalam"));
  check("kartu nunjukin countdown", hasCountdown, sock.sent.map(s => String(s.payload.text).slice(0, 60)).join(" | "));
  const alarmEdits = sock.sent.filter((s) => !!s.payload.edit);
  check("alarm countdown nge-tick via edit-in-place", alarmEdits.length >= 1, alarmEdits.length + " edit");
  const inDb = (global.alarms["62813@row"] || []).some((a) => a.time === `${hh}:${mmnt}`);
  check("alarm tetep ke-save (persist engine gak berubah)", inDb, JSON.stringify(global.alarms["62813@row"]));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
