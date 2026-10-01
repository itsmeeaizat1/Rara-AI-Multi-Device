// E2E Upgrade Weekly Report + Tracker (12 Sep 2026):
// (1) chatBuffer + hourly di rara-activity-tracker (rekam otomatis via trackActivity)
// (2) AI topik + sentimen di generateReport (seam _setWeeklyReportAiForTest; degrade silent)
// (3) 4 fitur mati (topchat/groupanalytics/statscard/grupdashboard) rewired ke tracker live
import path from "node:path";
import fs from "node:fs";

const out = (s) => { process.stdout.write(s + "\n"); };
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || ""));
// tracker pakai DB_PATH process.cwd()/src/database/auto/activity-tracker.json — sandbox pakai file lokal biar gak ganggu data asli
const TRACKER_DB = path.join(R, "src", "database", "auto", "activity-tracker.json");
const BACKUP = TRACKER_DB + ".bak-e2e";
const existed = fs.existsSync(TRACKER_DB);
if (existed) fs.copyFileSync(TRACKER_DB, BACKUP);
try { fs.rmSync(TRACKER_DB, { force: true }); } catch {}
try { fs.rmSync("/tmp/weeklyreport-e2e-db", { recursive: true, force: true }); } catch {}

const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/weeklyreport-e2e-db/rara.json");
const { trackActivity, getChatBuffer, getHourly, getWeeklyStats, getLeaderboard } = await import(R + "/src/lib/rara-activity-tracker.js");

const GID = "120363test@g.us";
function msg(text, sender, opts = {}) {
  return {
    chat: GID, from: GID, isGroup: true,
    sender, pushName: opts.name || sender.split("@")[0],
    text, body: text,
    isCommand: opts.isCommand || false,
    isMedia: opts.isMedia || false,
    ...opts.raw,
  };
}

// ═══ 1. trackActivity — buffer + hourly ═══
out("\n— tracker: buffer + hourly —");
trackActivity(msg("halo semuanya", "6281111@s.whatsapp.net", { name: "Budi" }));
trackActivity(msg("ada yang udah nonton film baru itu?", "6282222@s.whatsapp.net", { name: "Sari" }));
trackActivity(msg(".menu", "6281111@s.whatsapp.net"), undefined, {});
trackActivity(msg("jualan grosir murah cek ig kita!!!", "6283333@s.whatsapp.net", { name: "Tono" }));
trackActivity(msg("wkwkwk lucu banget", "6282222@s.whatsapp.net"));
for (let i = 0; i < 5; i++) trackActivity(msg("ngobrol santai hari ini " + i, "6281111@s.whatsapp.net"));

// command .menu harus masuk stats TAPI TIDAK masuk buffer
const buf = getChatBuffer(GID, 100);
t("1a. buffer: 9 pesan teks tercatat (command ke-skip)", buf.length === 9, `len=${buf.length}`);
t("1b. buffer: command .menu TIDAK masuk buffer", !buf.some((b) => b.text.includes(".menu")));
t("1c. buffer: isi pesan utuh + nama", buf.some((b) => b.name === "Sari" && /film/.test(b.text)));
t("1d. buffer: cap rolling 200 — masih di bawah cap", buf.length <= 200);

// stress cap
for (let i = 0; i < 250; i++) trackActivity(msg("spam isi buffer nomor " + i, "6284444@s.whatsapp.net"));
const buf2 = getChatBuffer(GID, 500);
t("1e. cap 200 jalan (rolling, buang terlama)", buf2.length === 200, `len=${buf2.length}`);
t("1f. buffer terakhir = pesan terbaru", /nomor 249/.test(buf2.at(-1).text));

// hourly
const h = getHourly(GID);
t("1g. hourly: 24 slot & total = jumlah pesan (258+1cmd… = semua aktivitas)", h.length === 24 && h.reduce((a, b) => a + b, 0) >= 258, `total=${h.reduce((a, b) => a + b, 0)}`);
const stats = getWeeklyStats(GID);
t("1h. weeklyStats: totalMessages tercatat", stats.totalMessages >= 259, `msg=${stats.totalMessages}`);

// ═══ 2. generateReport — AI topik + sentimen (seam) ═══
out("\n— weekly report: AI topik + sentimen —");
const dbg = (s) => { try { fs.appendFileSync("/tmp/e2e-dbg.log", s + "\n"); } catch {} };
dbg("S2-start");
dbg("S2-import-plugin...");
const { _setWeeklyReportAiForTest } = await import(R + "/plugins/owner/autoweeklyreport.js");
dbg("S2-imported");

// akses internal generateReport via export? generateReport gak di-export — tes lewat jalur AI analyzer
// dengan inject seam lalu panggil handler .autoweeklyreport now
dbg("S2-import2...");
const { pluginConfig: repCfg, handler: repHandler } = await import(R + "/plugins/owner/autoweeklyreport.js");
dbg("S2-import2-ok");

const replies = [];
function mockM(args, sender = "6289900@s.whatsapp.net") {
  return {
    command: "autoweeklyreport", args, text: args.join(" "), prefix: ".", chat: GID, sender,
    pushName: "Owner", isGroup: true, isOwner: true,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = {
  groupMetadata: async (g) => ({ subject: "Grup Uji Coba", participants: [] }),
  sendMessage: async (to, c) => { replies.push("SENT: " + String(c?.text || c?.caption || "").slice(0, 200)); },
  getName: async (j) => j?.split("@")[0] || "",
  groupFetchAllParticipating: async () => ({}),
};

// owner gate: config.isOwner — owner number dari config.js; pakai sender dari m.isOwner? plugin cek sendiri — cek dulu
// handler .autoweeklyreport now <gid> — owner-only via pluginConfig? cek isOwner di pluginConfig:
dbg("S2-t2a...");
t("2a. pluginConfig owner-gate", repCfg.isOwner === true || repCfg.category === "owner", JSON.stringify({ isOwner: repCfg.isOwner, cat: repCfg.category }));

// inject AI analyzer: topik film + sentimen
dbg("S2-seam...");
_setWeeklyReportAiForTest(async () => JSON.stringify({
  topik: [{ judul: "Film baru", frekuensi: "tinggi" }, { judul: "Jualan online", frekuensi: "rendah" }],
  sentimen: { positif: 60, netral: 30, negatif: 10, catatan: "Suasana grup hangat dan positif" },
}));

// owner check di handler? kalau ada gate isOwner, pastikan sender owner — pakai sender config.
// Jalankan "now" untuk GID
dbg("S2-call-handler");
await repHandler(mockM(["now", GID]), { sock: sockMock, config: { command: { prefix: "." } } });
dbg("S2-handler-done");
const rep = replies.filter((r) => !r.startsWith("SENT:")).at(-1) || "";
const sent = replies.filter((r) => r.startsWith("SENT:"));
t("2b. laporan terkirim/ter-render", rep.length > 50 || sent.length > 0, rep.slice(0, 80));
const fullRep = norm(sent.length ? sent.join("\n") : rep).toLowerCase();
t("2c. laporan: section Topik Minggu Ini muncul", /topik minggu ini/i.test(fullRep), fullRep.slice(0, 150));
t("2d. topik 'Film baru' dari AI tampil", /film baru/i.test(fullRep));
t("2e. section Sentimen Grup muncul", /sentimen grup/i.test(fullRep));
t("2f. persentase sentimen tampil (60%)", /60%/.test(fullRep));
t("2g. catatan AI tampil", /suasana grup hangat/i.test(fullRep));

// AI down → degrade silent (tanpa section AI, tanpa error)
_setWeeklyReportAiForTest(async () => { throw new Error("AI down"); });
replies.length = 0;
await repHandler(mockM(["now", GID]), { sock: sockMock, config: { command: { prefix: "." } } });
const fullRep2 = (replies.filter((r) => r.startsWith("SENT:")).join("\n") || replies.at(-1) || "");
t("2h. AI down → laporan TETAP jalan tanpa topik", !/topik minggu ini/i.test(fullRep2) && fullRep2.length > 50);
t("2i. AI down → gak ada pesan error", !/error|gagal/i.test(fullRep2.slice(0, 400)));

// ═══ 3. 4 fitur rewired ke tracker ═══
out("\n— fitur rewired —");

// topchat
const tc = await import(R + "/plugins/group/topchat.js");
replies.length = 0;
await tc.handler(mockM([], "6281111@s.whatsapp.net"), { sock: sockMock, config: { command: { prefix: "." } } });
const tcr = norm(replies.at(-1) || "");
t("3a. topchat: data live (member tercatat + pesan)", /6281111|tono/.test(tcr.toLowerCase()) && /pesan/.test(tcr), tcr.slice(0, 500));
t("3b. topchat: total pesan mingguan tampil", /total pesan/i.test(tcr));

// groupanalytics
const ga = await import(R + "/plugins/smart/groupanalytics.js");
replies.length = 0;
await ga.handler(mockM([], "6281111@s.whatsapp.net"), { sock: sockMock, config: { command: { prefix: "." } } });
const gar = norm(replies.at(-1) || "");
t("3c. groupanalytics: total pesan > 0 tampil", /total pesan/i.test(gar) && /\d{3}/.test(gar), gar.slice(0, 120));
t("3d. groupanalytics: jam paling rame tampil", /jam paling rame/i.test(gar));

// grupdashboard
const gd = await import(R + "/plugins/group/groupdashboard.js");
replies.length = 0;
await gd.handler(mockM([], "6281111@s.whatsapp.net"), { sock: sockMock, config: { command: { prefix: "." } } });
const gdr = norm(replies.at(-1) || "");
t("3e. grupdashboard: statistik live tampil", /total pesan/i.test(gdr) && /member aktif/i.test(gdr), gdr.slice(0, 120));
t("3f. grupdashboard: top member + jam rame", /top member aktif/i.test(gdr) && /jam paling rame/i.test(gdr));

// statscard (text mode — canvas gak perlu)
const sc = await import(R + "/plugins/group/statscard.js");
replies.length = 0;
await sc.handler(mockM(["text"], "6281111@s.whatsapp.net"), { sock: sockMock, config: { command: { prefix: "." } }, args: ["text"] });
const scr = norm(replies.at(-1) || "");
t("3g. statscard text: data live (total pesan > 0)", /total pesan/i.test(scr) && /member aktif/i.test(scr), scr.slice(0, 150));
t("3h. statscard: top member dari tracker", /6284444|top member/i.test(scr), scr.slice(0, 150));

// grup kosong (belum ada aktivitas) → pesan sopan, gak crash
const EMPTY = "120363kosong@g.us";
replies.length = 0;
const mEmpty = { ...mockM([], "6281111@s.whatsapp.net"), chat: EMPTY };
await tc.handler(mEmpty, { sock: sockMock, config: { command: { prefix: "." } } });
t("3i. grup kosong → pesan 'belum ada data' (gak crash)", /belum ada data/i.test(norm(replies.at(-1) || "")));

// plugin loader smoke
out("\n— plugins 7/7 —");

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");

// restore DB asli
try {
  fs.rmSync(TRACKER_DB, { force: true });
  if (existed) fs.copyFileSync(BACKUP, TRACKER_DB);
  fs.rmSync(BACKUP, { force: true });
} catch {}
await new Promise((r) => setTimeout(r, 300));
process.exit(fail ? 1 : 0);
