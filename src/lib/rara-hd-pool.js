// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-hd-pool.js — pool worker thread buat rara-hd-local (Swin2SR upscale).
// SATU worker aktif (model ke-load sekali, cache pipeline tetap panas),
// job dieksekusi satu-satu (CPU sudah saturate paralelism gak nambah cepat).
// Fitur: queue dengan posisi antrian, auto-respawn kalau worker mati,
// fallback inline kalau worker thread gak bisa jalan di environment tsb.
//
// WATCHDOG (fix "remini lama banget, hasil gak pernah muncul"):
// job render/unduhan-model gak boleh nge-hang selamanya. Default 10 menit,
// override per-job via opts.timeoutMs. Penting: worker YANG LAGI JALAN
// JANGAN PERNAH di-terminate() pas inference — ONNX runtime native bakal
// std::terminate dan ABORT proses Node sekaligus (terverifikasi: exit 134).
// Makanya pas timeout worker di-ORPHAN aja (dianggap basi): antrian lanjut
// di worker baru, worker basi di-terminate CUMA SETELAH dia idle (job basi
// selesai dan balas pesan) — 100% aman dari abort.
import { Worker } from "worker_threads";
import { enhanceLocal } from "./rara-hd-local.js";
export { isModelCached } from "./rara-hd-local.js";

const WORKER_URL = new URL("./rara-hd-worker.js", import.meta.url);
const DEFAULT_JOB_TIMEOUT = 10 * 60 * 1000; // render 4k/5k 3-5 mnt + unduhan model pertama

let worker = null; // worker AKTIF — nerima job baru dari queue
const staleWorkers = new Set(); // worker basi: job-nya udah timeout, masih nyelesein sendirian
let seq = 0;
let running = null; // job yang lagi dieksekusi worker aktif
const queue = []; // { id, buffer, mode, opts, resolve, reject }
let workerBroken = false; // env gak support worker → fallback inline

function startWorker() {
  const w = new Worker(WORKER_URL, { type: "module" });
  w.unref();

  w.on("message", ({ id, ok, result, error }) => {
    if (w.__stale) {
      // job basi akhirnya kelar juga — sekarang worker ini IDLE, aman terminate
      staleWorkers.delete(w);
      w.terminate().catch(() => {});
      return;
    }
    // FIX BUG: job di-SHIFT keluar queue saat dispatch — kalau dicari di queue
    // lagi (kode lama queue.find()) gak akan pernah ketemu → promise hang
    // selamanya (.remini "selesai" di worker tapi hasil gak pernah dikirim,
    // gak error juga). Job yang lagi dieksekusi disimpen di variabel `running`.
    if (!running || running.id !== id) return;
    const job = running;
    running = null;
    settle(job, ok ? null : new Error(error || "hd worker error"), result);
    pump();
  });

  w.on("error", (e) => {
    console.error("[HD-Pool] worker error:", e.message);
    if (w !== worker) return; // worker basi error → gak ganggu pool
    failAll(new Error("hd worker crash: " + e.message));
  });

  w.on("exit", (code) => {
    staleWorkers.delete(w);
    if (w !== worker) return; // worker basi mati → no-op, antrian gak kena
    console.error("[HD-Pool] worker exit kode", code);
    worker = null;
    failAll(new Error("hd worker exit (" + code + ")"));
  });

  return w;
}

// selesaikan satu job: matiin timer watchdog-nya, terus settle promise (idempotent)
function settle(job, err, result) {
  if (job.__timer) { clearTimeout(job.__timer); job.__timer = null; }
  if (job.__settled) return;
  job.__settled = true;
  if (err) job.reject(err);
  else job.resolve(result);
}

// nyalain watchdog buat job yang baru mulai dieksekusi
function armTimeout(job) {
  const ms = Math.max(5000, Number(job.opts?.timeoutMs) || DEFAULT_JOB_TIMEOUT);
  job.__timer = setTimeout(() => {
    job.__timedOut = true;
    console.error(`[HD-Pool] job ${job.id} timeout ${(ms / 1000).toFixed(0)}s — worker di-orphan, antrian lanjut di worker baru`);
    if (running === job) running = null;
    if (worker) {
      // ORPHAN worker yang lagi macet — JANGAN terminate (fatal saat inference),
      // biarkan dia kelar sendirian; nanti pas dia balas pesan (idle) baru aman di-terminate
      worker.__stale = true;
      staleWorkers.add(worker);
      if (staleWorkers.size >= 3) {
        console.error(`[HD-Pool] WARNING: ${staleWorkers.size} worker basi numpuk — cek internet/RAM VPS`);
      }
      worker = null; // pump() spawn worker baru buat antrian berikutnya
    }
    settle(job, new Error("timeout_render"));
    pump();
  }, ms);
  if (job.__timer.unref) job.__timer.unref();
}

// worker aktif mati di tengah antrian → semua job aktif+antrian gagal, user bisa retry
function failAll(err) {
  if (running) settle(running, err);
  running = null;
  while (queue.length) {
    const j = queue.shift();
    settle(j, err);
  }
  pump();
}

function pump() {
  if (running || !queue.length) return;
  if (workerBroken) {
    // fallback inline: jalan di main thread (blok, tapi tetap jalan)
    const job = queue.shift();
    running = job;
    armTimeout(job);
    enhanceLocal(job.buffer, job.mode, job.opts)
      .then((r) => { if (!job.__timedOut) settle(job, null, r); })
      .catch((e) => { if (!job.__timedOut) settle(job, e); })
      .finally(() => { if (running === job) running = null; pump(); });
    return;
  }
  if (!worker) {
    try { worker = startWorker(); } catch (e) {
      console.error("[HD-Pool] spawn gagal — fallback inline:", e.message);
      workerBroken = true;
      pump();
      return;
    }
  }
  const job = queue.shift();
  running = job; // simpen job-nya, bukan cuma true — biar handler message bisa resolve
  armTimeout(job);
  worker.__lastId = job.id;
  worker.postMessage(
    { id: job.id, buffer: job.buffer, mode: job.mode, opts: job.opts },
    [job.buffer.buffer.slice(job.buffer.byteOffset, job.buffer.byteOffset + job.buffer.byteLength)],
  );
}

/**
 * Upscale di worker thread — main thread tetap responsif.
 * @returns {Promise<{buffer,width,height,scale,model,label,ms,tiles}>}
 */
export function enhanceLocalAsync(buffer, mode = "hd", opts = {}) {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer) || !buffer.length) return reject(new Error("no_buffer"));
    // copy input biar buffer asli gak kepinda ke worker (dipakai lagi caller)
    const input = Buffer.from(buffer);
    const job = { id: ++seq, buffer: input, mode, opts, resolve, reject };
    queue.push(job);
    pump();
  });
}

/** Info antrian buat notice UX: { ahead, busy } — ahead = jumlah job nunggu */
export function hdQueueInfo() {
  return { ahead: queue.length, busy: !!running };
}
