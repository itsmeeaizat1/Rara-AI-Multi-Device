// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 nova-aicall-autostart.js — AI Call service auto-run (fix 18 Sep 2026)
// 🔹 Request owner: "gmna supaya fitur aicall lngsung ke run saat bot
//   dirun tnpa prlum pm2 ai call nova gtu soalnya g ngerti caranya"
// 🔹 MASALAH: service AI Call (Go, aicall/ai-call) jalan TERPISAH dari
//   bot utama — owner harus manual `pm2 start nova-aicall` tiap kali
//   VPS restart / service mati. Owner gak hafal carinya.
// 🔹 SOLUSI: pas bot utama boot (index.js), otomatis:
//   1. Probe http://127.0.0.1:8788/health — service udah hidup? selesai.
//   2. Kalau mati + binary aicall/ai-call ada + aicall/.env ada:
//      a. pm2 ADA → `pm2 restart nova-aicall` (proses lama ada tapi
//         stopped/errored) atau `pm2 start <binary> --name nova-aicall
//         --cwd <aicall>` (belum pernah teregistrasi), lalu `pm2 save`
//         biar ikut ke-dump (auto-up pas VPS reboot).
//      b. pm2 GAK ADA (node index.js langsung) → spawn binary detached.
//   3. Tunggu service hidup (health OK, max 20 dtk), log hasil.
// 🔹 Owner tetap bisa MATIKAN auto-start: buat file aicall/.noautostart
//   → bot gak akan nyala-in service otomatis lagi (manual pm2 sendiri).
// 🔹 Semua gagal-senyap-proof: semua langkah try/catch — masalah service
//   gak pernah ganggu boot bot utama.
// ============================================================
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const AICALL_BASE = process.env.AICALL_HTTP_BASE || "http://127.0.0.1:8788";
const AICALL_NAME = "nova-aicall";
const WAIT_AFTER_START_MS = 20000;
const POLL_INTERVAL_MS = 2000;

// seam test — function = mock; null = error path; undefined = fetch asli
let _fetchImpl;
export function _setAicallAutostartFetchForTest(fn) { _fetchImpl = fn; }
export function _clearAicallAutostartFetchForTest() { _fetchImpl = undefined; }
let _waitMsForTest = null;
export function _setAicallAutostartWaitForTest(ms) { _waitMsForTest = ms; }

let _lastResult = null; // hasil autostart terakhir (buat status/log)
export function getAicallAutostartStatus() { return _lastResult; }

async function probeHealth(timeoutMs = 2500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const doFetch = typeof _fetchImpl === "function"
      ? _fetchImpl
      : (_fetchImpl === null
        ? async () => { throw new Error("service down"); }
        : fetch);
    const key = process.env.AICALL_HTTP_KEY || "";
    const res = await doFetch(AICALL_BASE + "/health", {
      signal: ctrl.signal,
      headers: key ? { "X-Api-Key": key } : {},
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitUntilUp(totalMs) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    if (await probeHealth()) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return await probeHealth();
}

async function pm2List() {
  try {
    const { stdout } = await execFileAsync("pm2", ["jlist"], { timeout: 10000 });
    return JSON.parse(stdout || "[]");
  } catch {
    return null; // pm2 gak terpasang / gak bisa dijalankan
  }
}

async function pm2Action(args) {
  const { stdout } = await execFileAsync("pm2", args, { timeout: 20000 });
  return (stdout || "").trim();
}

function log(lines) {
  console.log("");
  console.log("「 ✦ AICALL AUTOSTART ✦ 」");
  console.log("");
  for (const l of [].concat(lines)) console.log("│ " + l);
  console.log("");
}

/**
 * Auto-run service AI Call pas bot boot. Fire-and-forget dari index.js —
 * return { started, reason } untuk yang mau nunggu (mis. .aicall status).
 */
export async function ensureAicallRunning({ silent = false } = {}) {
  const aicallDir = path.join(process.cwd(), "aicall");
  const binary = path.join(aicallDir, "ai-call");

  // owner matiin auto-start manual → hormati
  if (fs.existsSync(path.join(aicallDir, ".noautostart"))) {
    _lastResult = { started: false, reason: "disabled (.noautostart)" };
    if (!silent) log(["Auto-start dimatikan owner (aicall/.noautostart)", "Nyalain manual: pm2 start " + binary + " --name " + AICALL_NAME]);
    return _lastResult;
  }

  // service udah hidup → gak perlu apa-apa
  if (await probeHealth()) {
    _lastResult = { started: false, reason: "already-running" };
    if (!silent) log(["Service AI Call sudah jalan — tidak ada yang perlu dilakukan"]);
    return _lastResult;
  }

  // prasyarat: binary + .env service
  if (!fs.existsSync(binary)) {
    _lastResult = { started: false, reason: "binary-ai-call-tidak-ada (build: cd aicall && go build -o ai-call .)" };
    if (!silent) log(["Binary aicall/ai-call belum ada — lewati", "Build sekali di VPS: cd aicall && go build -o ai-call ."]);
    return _lastResult;
  }
  if (!fs.existsSync(path.join(aicallDir, ".env"))) {
    _lastResult = { started: false, reason: "env-belum-ada (cp aicall/.env.example aicall/.env)" };
    if (!silent) log(["aicall/.env belum ada — lewati (lihat aicall/INTEGRATION.md)"]);
    return _lastResult;
  }

  // coba hidupin — pm2 dulu, fallback spawn langsung
  const list = await pm2List();
  let action = "";
  if (list) {
    const existing = list.find((p) => p?.name === AICALL_NAME);
    try {
      if (existing) {
        action = "pm2 restart " + AICALL_NAME;
        await pm2Action(["restart", AICALL_NAME]);
      } else {
        action = "pm2 start ai-call --name " + AICALL_NAME;
        await pm2Action(["start", binary, "--name", AICALL_NAME, "--cwd", aicallDir]);
      }
      // persist ke dump biar ikut nyala pas VPS reboot (pm2 resurrect)
      try { await pm2Action(["save"]); } catch {}
    } catch (e) {
      _lastResult = { started: false, reason: "pm2-gagal: " + (e?.message || String(e)) };
      if (!silent) log(["Gagal start via pm2: " + (e?.message || e)]);
      return _lastResult;
    }
  } else {
    // pm2 gak ada (misal node index.js langsung) → spawn detached
    try {
      const { spawn } = await import("child_process");
      const child = spawn("./ai-call", [], {
        cwd: aicallDir,
        detached: true,
        stdio: "ignore",
        env: process.env,
      });
      child.unref();
      action = "spawn-direct ./ai-call (pm2 tidak terpasang)";
    } catch (e) {
      _lastResult = { started: false, reason: "spawn-gagal: " + (e?.message || String(e)) };
      if (!silent) log(["Gagal spawn service: " + (e?.message || e)]);
      return _lastResult;
    }
  }

  // tunggu service hidup (WA connect butuh beberapa detik)
  const up = await waitUntilUp(_waitMsForTest ?? WAIT_AFTER_START_MS);
  _lastResult = up
    ? { started: true, reason: action }
    : { started: false, reason: action + " — service belum merespon " + AICALL_BASE + "/health setelah " + (WAIT_AFTER_START_MS / 1000) + "dtk (cek pm2 logs " + AICALL_NAME + ", mungkin belum pairing)" };
  if (!silent) log([
    up ? "Service AI Call dijalankan otomatis — " + action : "Dijalankan (" + action + ") tapi /health belum merespon",
    up ? "Status: " + AICALL_BASE + "/health OK" : "Cek: pm2 logs " + AICALL_NAME + " (sesi mungkin belum pairing)",
  ]);
  return _lastResult;
}
