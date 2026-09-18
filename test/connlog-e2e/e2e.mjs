// E2E nova-conn-journal + plugin .connlog
// Fitur: jurnal koneksi persist — catat disconnect (kode+alasan), connect,
// watchdog; analisis pola (interval antar-putus, penyebab terbanyak);
// command .connlog (owner) nampilin riwayat + analisis.
// Jalankan: node test/connlog-e2e/e2e.mjs
import fs from "fs";
import os from "os";
import path from "path";

// ── handler uncaught supaya test gak mati senyap (gotcha nova-lid) ──
process.on("uncaughtException", (e) => {
  console.error("[UNCAUGHT]", e);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  console.error("[UNHANDLED]", e);
  process.exit(1);
});

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`[   OK ] ${name}`);
  } else {
    fail++;
    console.log(`[ FAIL ] ${name}${extra ? " — " + extra : ""}`);
  }
}
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  ok(name, a === b, `actual=${a} expected=${b}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "connlog-e2e-"));
const jfile = path.join(tmp, "connlog.json");

// seam journal file
const j = await import("../../src/lib/nova-conn-journal.js");
j._setJournalFileForTest(jfile);

console.log("— section 1: record + persist —");
j.recordConnect();
eq("connect tercatat", j.getJournal().length, 1);
eq("tipe connect", j.getJournal()[0].type, "connect");

j.recordDisconnect({ code: 515, msg: "Restart Required — WhatsApp minta restart koneksi", source: "stream error" });
j.recordConnect();
j.recordDisconnect({ code: 515, msg: "Restart Required — WhatsApp minta restart koneksi", source: "stream error" });
j.recordConnect();
j.recordWatchdog(30);
j.recordConnect();
eq("total 7 entri", j.getJournal().length, 7);

// persist beneran — baca ulang dari file
j._setJournalFileForTest(null);
const raw = JSON.parse(fs.readFileSync(jfile, "utf-8"));
eq("persist ke disk", raw.entries.length, 7);
j._setJournalFileForTest(jfile);

console.log("— section 2: cap 100 entri —");
for (let i = 0; i < 120; i++) j.recordDisconnect({ code: 515, msg: "x", source: "" });
ok("cap max 100 entri", j.getJournal().length === 100, `len=${j.getJournal().length}`);

// reset jurnal untuk section analisis
j.clearJournal();
eq("clear", j.getJournal().length, 0);

console.log("— section 3: analisis pola (interval + penyebab) —");
// pola: reconnect tiap ~10 menit kode 515, lalu 1 watchdog
const T0 = Date.now() - 60 * 60000;
function rec(type, offMin, extra = {}) {
  // manipulasi file jurnal LANGSUNG (ts custom buat pola interval)
  const entries = JSON.parse(fs.readFileSync(jfile, "utf-8")).entries;
  entries.push({ ts: T0 + offMin * 60000, type, ...extra });
  fs.writeFileSync(jfile, JSON.stringify({ entries }, null, 2));
}
rec("connect", 0);
rec("disconnect", 10, { code: 515, msg: "Restart Required", source: "s" });
rec("connect", 11);
rec("disconnect", 21, { code: 515, msg: "Restart Required", source: "s" });
rec("connect", 22);
rec("disconnect", 32, { code: 515, msg: "Restart Required", source: "s" });
rec("connect", 33);
rec("watchdog", 70, { code: null, msg: "Watchdog — 30 menit tanpa pesan masuk, koneksi disengaja direstart", source: "watchdog" });
rec("connect", 71);

const a = j.analyzeJournal();
eq("disconnect count 4 (3 kode 515 + 1 watchdog)", a.disconnectCount, 4);
eq("interval count 3", a.intervals.count, 3);
ok("interval rata-rata ~20 mnt", Math.abs(a.intervals.avgMs - 20 * 60000) < 60000, `avg=${a.intervals.avgMs}`);
eq("interval tercepat 11 mnt", Math.round(a.intervals.minMs / 60000), 11);
eq("interval terlama 38 mnt", Math.round(a.intervals.maxMs / 60000), 38);
// uptime sesi pertama: connect 0 → disconnect 10 = 10 mnt
const firstDrop = a.recent[a.recent.length - 1];
eq("uptime sesi pertama 10 mnt", Math.round(firstDrop.uptimeMs / 60000), 10);
// watchdog tanpa connect ulang sebelum dia → uptime dihitung dari connect 33 → 70 = 37 mnt
const wd = a.recent.find((r) => r.type === "watchdog");
eq("uptime watchdog 37 mnt", Math.round(wd.uptimeMs / 60000), 37);
ok("penyebab terbanyak 515 × 3", Object.entries(a.byReason).some(([k, v]) => k.startsWith("515") && v === 3), JSON.stringify(a.byReason));

console.log("— section 4: plugin handler .connlog —");
// mock m (pola repo) + config
const sent = [];
// mirror nova-serialize: m.text = TANPA command (".connlog clear" → "clear")
const m = {
  text: "",
  reply: (txt) => {
    sent.push(txt);
    return txt;
  },
  args: [],
};
const plugin = await import("../../plugins/owner/connlog.js");
const handler = plugin.default.handler;
const botConfig = { command: { prefix: "." } };

// journal masih ada isinya (section 3)
await handler(m, { config: botConfig });
ok("reply terkirim", sent.length === 1);
const out = sent[0] || "";
ok("ada header Conn Log", out.includes("ᴄᴏɴɴ ʟᴏɢ") || out.toLowerCase().includes("conn log"), out.slice(0, 60));
ok("ada kode 515 di riwayat", out.includes("515"));
ok("ada analisis interval", out.includes("ɪɴᴛᴇʀᴠᴀʟ"));
ok("ada penyebab terbanyak", out.includes("ᴘᴇɴʏᴇʙᴀʙ"));
ok("ada arti watchdog", out.includes("ᴡᴀᴛᴄʜᴅᴏɢ"));
ok("ada uptime sesi", out.includes("10 ᴍɴᴛ"));

// .connlog clear
sent.length = 0;
m.text = "clear";
await handler(m, { config: botConfig });
ok("clear dibalas", sent.length === 1 && sent[0].includes("ᴅɪʜᴀᴘᴜꜱ"), sent[0]?.slice(0, 40));
eq("jurnal kosong setelah clear", j.getJournal().length, 0);

// jurnal kosong → pesan kosong informatif
sent.length = 0;
m.text = "";
await handler(m, { config: botConfig });
ok("jurnal kosong → info", sent.length === 1 && sent[0].includes("ᴋᴏꜱᴏɴɢ"), sent[0]?.slice(0, 40));

// sem: journal balik ke default (jangan bocor ke test lain)
j._setJournalFileForTest(undefined);
fs.rmSync(tmp, { recursive: true, force: true });

console.log("");
console.log(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
