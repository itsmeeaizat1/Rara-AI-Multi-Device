// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-speedtest.js — engine tes kecepatan internet (Cloudflare, tanpa key).
// Request owner 11 Sep 2026: "untuk pertama kali pairing bot saat bot konek
// coba speedtest sekali, hasilnya tersimpan sebagai tanda hasil kecepatan
// server, tambah di info section server di menu allmenu setelah info server"
// Dipakai 3 tempat: plugin .speedtest, init first-connect (index.js),
// Info Server section (nova-info-section.js).
import { performance } from "perf_hooks";

const CF = {
  trace: "https://speed.cloudflare.com/cdn-cgi/trace",
  down: (bytes) => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
  up: "https://speed.cloudflare.com/__up",
};

export const SETTING_KEY = "serverSpeedtest";

// ─── info koneksi: IP publik + lokasi colo Cloudflare ───
export async function fetchTrace() {
  try {
    const res = await fetch(CF.trace, { cache: "no-store" });
    const txt = await res.text();
    const map = {};
    for (const line of txt.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { ip: map.ip || "-", colo: map.colo || "-", loc: map.loc || "-" };
  } catch {
    return { ip: "-", colo: "-", loc: "-" };
  }
}

// ─── ping & jitter: 4x probe kecil, ambil terbaik ───
export async function measureLatency() {
  const samples = [];
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(CF.down(0), { cache: "no-store" });
      await res.arrayBuffer();
      samples.push(performance.now() - t0);
    } catch {}
  }
  if (!samples.length) throw new Error("gak bisa nyambung ke server tes");
  samples.sort((a, b) => a - b);
  const best = samples[0];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  let jitter = 0;
  if (samples.length > 1) {
    let sum = 0;
    for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1]);
    jitter = sum / (samples.length - 1);
  }
  return { best, jitter, avg };
}

// ─── download: stream 25MB (cap 12 dtk), progress callback ───
export async function measureDownload(onProgress) {
  const TARGET = 25_000_000;
  const LIMIT_MS = 12_000;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LIMIT_MS);
  let received = 0;
  const t0 = performance.now();
  try {
    const res = await fetch(CF.down(TARGET), { cache: "no-store", signal: abort.signal });
    const reader = res.body.getReader();
    let lastEdit = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      const now = performance.now();
      if (onProgress && now - lastEdit > 900) {
        lastEdit = now;
        try { await onProgress(received / TARGET, (received * 8) / ((now - t0) / 1000) / 1e6); } catch {}
      }
    }
  } catch {} // abort di tengah jalan = hasil parsial tetap valid
  finally { clearTimeout(timer); }
  const secs = (performance.now() - t0) / 1000;
  if (!received) throw new Error("download gagal — server tes gak merespon");
  return { mbps: (received * 8) / secs / 1e6, bytes: received };
}

// ─── upload: probe 1MB dulu, kalau cepat lanjut 4MB biar akurat ───
async function measureUploadOnce(size) {
  const body = new Uint8Array(size);
  const t0 = performance.now();
  const res = await fetch(CF.up, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body,
    cache: "no-store",
  });
  await res.arrayBuffer();
  const secs = (performance.now() - t0) / 1000;
  return { mbps: (size * 8) / secs / 1e6, bytes: size, secs };
}

export async function measureUpload() {
  const warm = await measureUploadOnce(1_000_000);
  if (warm.secs > 4) return warm; // koneksi lambat — jangan bikin nunggu lama
  try {
    const main = await measureUploadOnce(4_000_000);
    if (main.mbps > 0) return main;
  } catch {}
  return warm;
}

// ─── run lengkap → objek hasil kompak (disimpan & ditampilin) ───
export async function runSpeedtest(onProgress) {
  const trace = await fetchTrace();
  const { best, jitter } = await measureLatency();
  const down = await measureDownload(onProgress);
  const up = await measureUpload();
  return {
    ping: Number(best.toFixed(1)),
    jitter: Number(jitter.toFixed(1)),
    down: Number(down.mbps.toFixed(1)),
    up: Number(up.mbps.toFixed(1)),
    bytes: down.bytes + up.bytes,
    ip: trace.ip,
    colo: trace.colo,
    loc: trace.loc,
    date: new Date().toISOString(),
  };
}

// ─── persist hasil (db.setting) ───
export function getSavedSpeedtest(db) {
  try {
    return db?.setting?.(SETTING_KEY) || null;
  } catch {
    return null;
  }
}

export function saveSpeedtest(db, result) {
  try {
    if (db && result) {
      db.setting(SETTING_KEY, result);
      return true;
    }
  } catch {}
  return false;
}

// ─── baris Info Server (allmenu) — Download/Upload hasil tes tersimpan ───
export function speedtestInfoRows(db) {
  const s = getSavedSpeedtest(db);
  if (!s || !s.down || !s.up) return [];
  return [
    { label: "Download", value: `${s.down} Mbps` },
    { label: "Upload", value: `${s.up} Mbps` },
  ];
}

// ─── init first-connect: pairing pertama → tes sekali → simpan ───
let initRunning = false;
export async function initServerSpeedtest(sock, db = null, opts = {}) {
  try {
    if (!db) {
      const { getDatabase } = await import("./nova-database.js");
      db = getDatabase();
    }
    if (getSavedSpeedtest(db)) return { skipped: "sudah ada hasil" };
    if (initRunning) return { skipped: "lagi jalan" };
    initRunning = true;
    // jeda biar proses boot gak rebutan bandwidth
    const delayMs = opts.bootDelayMs ?? 8_000;
    await new Promise((r) => setTimeout(r, delayMs));
    const result = await runSpeedtest();
    saveSpeedtest(db, result);
    initRunning = false;
    try { console.log("[speedtest] hasil pertama tersimpan: DL " + result.down + " Mbps / UL " + result.up + " Mbps / ping " + result.ping + " ms"); } catch {}
    return { saved: true, result };
  } catch (e) {
    initRunning = false;
    try { console.log("[speedtest] init gagal: " + (e?.message || e)); } catch {}
    return { error: e?.message || String(e) };
  }
}
