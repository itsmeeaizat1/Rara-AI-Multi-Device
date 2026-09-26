// NOVA AI — pinglog e2e: log ping interaktif panel tiap 20 dtk
// Fitur 26 Sep 2026 (owner: "di log panel pas bot run ada log ping tiap 20
// detik, log deteksi kerusakan, dll biar log interaktif lengkap").
// Yang dites: format murni, counter window, hook logger.error, tick render
// (fake sock), lifecycle idempotent (panggil 2x gak dobel timer) + PINGLOG_OFF.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

let pass = 0, fail = 0;
const w = (s) => console.log(s);
const t = (name, ok, extra) => { ok ? pass++ : fail++; w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); };

const mod = await import(R + "/src/lib/nova-pinglog.js");
const {
  formatDuration, formatBytes, buildPingLine,
  notePingMessage, notePingError,
  startPingLog, stopPingLog, _pingLogInternalsForTest,
} = mod;

// ─── 1. formatDuration ───
t("1a formatDuration(0) = 0dtk", formatDuration(0) === "0dtk", formatDuration(0));
t("1b formatDuration(65) = 1m 5dtk", formatDuration(65) === "1m 5dtk", formatDuration(65));
t("1c formatDuration(3600) = 1j 0dtk", formatDuration(3600) === "1j 0dtk", formatDuration(3600));
t("1d formatDuration(90061) = 1h 1j 1m", formatDuration(90061) === "1h 1j 1m", formatDuration(90061));
t("1e formatDuration negatif dibeset 0dtk", formatDuration(-5) === "0dtk");

// ─── 2. formatBytes ───
t("2a formatBytes(512) = 512 B", formatBytes(512) === "512 B");
t("2b formatBytes(2048) = 2.0 KB", formatBytes(2048) === "2.0 KB", formatBytes(2048));
t("2c formatBytes(4MB) = 4 MB", formatBytes(4 * 1024 * 1024) === "4 MB");

// ─── 3. buildPingLine ───
const line = buildPingLine({ now: new Date(2026, 8, 26, 10, 53, 12), upSec: 3930, rss: 432 * 1024 * 1024, pingMs: 342, waOk: true, msgs: 12, errors: 0 });
t("3a jam WIB 10.53.12", line.includes("🕒 10.53.12"), line);
t("3b up 1j 5m", line.includes("⏱ up 1j 5m"));
t("3c RAM MB", line.includes("🧠 432 MB"));
t("3d ping ms", line.includes("⚡ 342ms"));
t("3e WA ✅", line.includes("📡 WA ✅"));
t("3f msg & err", line.includes("📥 12 msg") && line.includes("❌ 0 err"));

const lineBad = buildPingLine({ pingMs: -1, waOk: false, msgs: 3, errors: 2 });
t("3g ping gagal = ∅ + WA ❌", lineBad.includes("⚡ ∅") && lineBad.includes("📡 WA ❌"), lineBad);

// ─── 4. counter window ───
const itl = _pingLogInternalsForTest();
itl.resetStats();
notePingMessage(); notePingMessage(); notePingMessage();
notePingError("plugin X: gagal ambil API");
t("4a counter msg 3", itl.stats.msgs === 3);
t("4b counter err 1 + lastError keisi", itl.stats.errors === 1 && itl.stats.lastError.includes("plugin X"));

// ─── 5. tick render pakai fake sock + spy print ───
const printed = [];
const fakeSock = {
  generateMessageTag: () => "TAG-1",
  query: async () => "ok",
  ev: { on: () => {}, off: () => {} },
};
pingTimerLoop: {
  itl.resetStats();
  // injek sock lewat startPingLog; immediate tick biar kelar dulu → window ke-reset
  const res = startPingLog(fakeSock, { intervalMs: 30000 });
  t("5a startPingLog started", res.started === true && res.intervalMs === 30000);
  await new Promise((r) => setTimeout(r, 50));
  itl.resetStats();
  notePingMessage();
  notePingError("tes: error palsu");
  await itl.runTick((s) => printed.push(s));
  const tickLine = printed.find((x) => x.includes("🕒")) || "";
  t("5b tick kasil baris ping", tickLine.includes("📡 WA ✅") && tickLine.includes("⚡"), tickLine);
  t("5c deteksi error muncul", printed.some((x) => x.includes("⚠ deteksi") && x.includes("tes: error palsu")), printed.join(" | "));
  t("5d window ke-reset abis tick", itl.stats.msgs === 0 && itl.stats.errors === 0);

  // idempotent: start kedua gak bikin timer dobel
  const res2 = startPingLog(fakeSock, { intervalMs: 25 });
  t("5e start 2x idempotent (reused)", res2.reused === true);
  stopPingLog();
  // interval pendek terpisah: spy console.log global, tunggu 1 tick
  const logs = [];
  const origLog = console.log;
  console.log = (...a) => logs.push(a.join(" "));
  startPingLog(fakeSock, { intervalMs: 30 });
  await new Promise((r) => setTimeout(r, 120));
  console.log = origLog;
  t("5f interval jalan otomatis", logs.some((x) => x.includes("🕒") || x.includes("📥")), logs.join(" | ").slice(0, 120));
  stopPingLog();
  t("5g stopPingLog → gak jalan lagi", itl.isRunning() === false);
}

// ─── 6. hook logger.error otomatis ───
const { logger } = await import(R + "/src/lib/nova-logger.js");
itl.resetStats();
const res6 = startPingLog(fakeSock, { intervalMs: 30000 });
logger.error("TESHOOK", "pesan gagal");
t("6a logger.error kehitung deteksi", itl.stats.errors === 1 && itl.stats.lastError.includes("TESHOOK"));
t("6b logger.error masih jalan (return value utuh)", typeof logger.error === "function");
stopPingLog();

// ─── 7. PINGLOG_OFF ───
process.env.PINGLOG_OFF = "1";
const res7 = startPingLog(fakeSock, {});
t("7a PINGLOG_OFF=1 gak start", res7.started === false);
delete process.env.PINGLOG_OFF;
stopPingLog();

w("");
w(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
