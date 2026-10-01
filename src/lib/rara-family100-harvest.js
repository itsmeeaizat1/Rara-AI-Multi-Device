// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Family 100 Harvester — auto-isi soal baru dari internet ke src/data/family100.json
// Request owner 8 Sep 2026: "soalnya ke isi sendiri dr internet, tambah otomatis
// ke src/data family100 jadi soal baru". Target bank soal 2000+.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as sleep } from "timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_PATH = path.join(__dirname, "..", "data", "family100.json");
export const STATE_PATH = path.join(__dirname, "..", "database", "game", "family100.state.json");

// ─── Sumber soal internet (dataset family100 publik) ───
// Dataset komunitas berputar di banyak repo tapi isinya mirip — dedup by soal,
// union jawaban buat soal sama, jadi sumber tambahan tetap berguna.
export const DEFAULT_SOURCES = [
  "https://raw.githubusercontent.com/YangJunMing12/family100-database/main/family100.json",
];

function getSources() {
  const extra = (process.env.FAMILY100_SOURCES || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_SOURCES, ...extra])];
}

// ─── Poin survei: bobot menurun, total PERSIS 100 (largest-remainder) ───
export function computePoin(n) {
  if (!n || n <= 0) return [];
  if (n === 1) return [100];
  const r = 0.72;
  const w = Array.from({ length: n }, (_, i) => r ** i);
  const s = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x * 100) / s);
  const floors = raw.map((x) => Math.max(1, Math.floor(x)));
  const byFrac = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  // largest-remainder: sisa dibagi ke frac terbesar (tambah) / frac terkecil (kurang).
  // recompute rem tiap iterasi biar clamp min-1 gak bikin sum nyasar.
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  let k = 0, guard = 0;
  while (rem !== 0 && guard < 10000) {
    const step = rem > 0 ? 1 : -1;
    // rem negatif → ambil dari frac TERKECIL (urutan dari belakang), skip yang udah 1
    const e = rem > 0 ? byFrac[k % n] : byFrac[n - 1 - (k % n)];
    if (step < 0 && floors[e.i] <= 1) { k++; guard++; continue; }
    floors[e.i] += step;
    rem = 100 - floors.reduce((a, b) => a + b, 0);
    k++; guard++;
  }
  // jamin menurun strict (jawaban memang urut popularitas → poin ikut sort desc)
  floors.sort((a, b) => b - a);
  return floors;
}

// ─── Load / save data (atomic) ───
export function loadBank() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch { return []; }
}

function saveBank(data) {
  const tmp = DATA_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data), "utf-8");
  fs.renameSync(tmp, DATA_PATH);
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")); }
  catch { return { lastAt: 0, lastNew: 0, total: 0 }; }
}

function saveState(st) {
  try { fs.writeFileSync(STATE_PATH, JSON.stringify(st), "utf-8"); } catch {}
}

// ─── Normalisasi entry dari sumber (dukung format lama/baru) ───
function normalizeEntries(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const q of raw) {
    const soal = (q?.soal || "").toString().trim();
    let jawaban = [];
    if (Array.isArray(q?.jawaban)) jawaban = q.jawaban.map((j) => (j || "").toString().trim()).filter(Boolean);
    if (!soal || !jawaban.length) continue;
    out.push({ soal, jawaban });
  }
  return out;
}

// ─── Callback registry: pemirsa data (plugin family100 dsb) daftar sendiri ───
const bankUpdatedCallbacks = [];
export function onBankUpdated(fn) {
  if (typeof fn === "function") bankUpdatedCallbacks.push(fn);
}

// ─── HARVEST: ambil soal dari internet → merge ke bank data ───
export async function harvestFamily100({ fetchImpl = null, sources = null, quiet = false, dataPath = null } = {}) {
  const doFetch = fetchImpl || ((u) => fetch(u));
  const srcList = sources || getSources();
  const bank = dataPath
    ? (() => { try { return JSON.parse(fs.readFileSync(dataPath, "utf-8")); } catch { return []; } })()
    : loadBank();

  // index existing per soal lowercase + kumpulan jawaban lower
  const byKey = new Map();
  bank.forEach((q, i) => {
    const key = q.soal.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { idx: i, ans: new Set(q.jawaban.map((j) => j.toLowerCase())) });
  });

  const report = { sources: [], fetched: 0, newSoal: 0, newAnswers: 0, errors: 0 };

  for (const url of srcList) {
    try {
      const res = await doFetch(url);
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status || "?"}`);
      const entries = normalizeEntries(await res.json());
      report.sources.push({ url, ok: true, count: entries.length });
      report.fetched += entries.length;
      for (const { soal, jawaban } of entries) {
        const key = soal.toLowerCase();
        const existing = byKey.get(key);
        if (!existing) {
          // soal baru → append
          const uniq = [], seen = new Set();
          for (const j of jawaban) {
            const k = j.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k); uniq.push(j);
          }
          const entry = { soal, jawaban: uniq, poin: computePoin(uniq.length) };
          bank.push(entry);
          byKey.set(key, { idx: bank.length - 1, ans: new Set(uniq.map((j) => j.toLowerCase())) });
          report.newSoal++;
        } else {
          // soal sama → union jawaban baru
          const q = bank[existing.idx];
          for (const j of jawaban) {
            const k = j.toLowerCase();
            if (existing.ans.has(k)) continue;
            existing.ans.add(k);
            q.jawaban.push(j);
            report.newAnswers++;
          }
          if (report.newAnswers) q.poin = computePoin(q.jawaban.length);
        }
      }
    } catch (e) {
      report.errors++;
      report.sources.push({ url, ok: false, error: e.message });
      if (!quiet) console.error("[family100-harvest] source gagal:", url, e.message);
    }
  }

  if (report.newSoal > 0 || report.newAnswers > 0) {
    if (dataPath) {
      fs.writeFileSync(dataPath, JSON.stringify(bank), "utf-8");
    } else {
      saveBank(bank);
    }
    // invalidate cache listener (plugin family100 daftar via onBankUpdated —
    // jangan dynamic-import plugin di sini, chain import-nya berat bisa hang)
    for (const fn of bankUpdatedCallbacks) {
      try { fn(report); } catch (e) { console.error("[family100-harvest] callback error:", e.message); }
    }
  }

  if (!dataPath) {
    saveState({
      lastAt: Date.now(),
      lastNew: report.newSoal,
      lastNewAnswers: report.newAnswers,
      total: bank.length,
    });
  }

  report.total = bank.length;
  return report;
}

// ─── AUTO REFRESH: cek harian, harvest tiap 7 hari (VPS nyala) ───
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function initAutoRefresh(sock) {
  try {
    const check = async () => {
      const st = loadState();
      if (Date.now() - (st.lastAt || 0) < REFRESH_INTERVAL_MS) return;
      console.log("[family100-harvest] auto-refresh mingguan jalan…");
      try {
        const report = await harvestFamily100({ quiet: true });
        if (report.newSoal > 0) {
          console.log(`[family100-harvest] +${report.newSoal} soal baru (total ${report.total})`);
        } else {
          console.log(`[family100-harvest] gak ada soal baru (total ${report.total})`);
        }
      } catch (e) {
        console.error("[family100-harvest] auto-refresh error:", e.message);
      }
    };
    setTimeout(check, 60 * 1000); // 1 menit setelah boot
    setInterval(check, 24 * 60 * 60 * 1000); // cek tiap hari
    return true;
  } catch (e) {
    console.error("[family100-harvest] init error:", e.message);
    return false;
  }
}

export function getRefreshState() { return loadState(); }
