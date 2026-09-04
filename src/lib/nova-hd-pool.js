// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-hd-pool.js — pool worker thread buat nova-hd-local (Swin2SR upscale).
// SATU worker persisten (model ke-load sekali, cache pipeline tetap panas),
// job dieksekusi satu-satu (CPU sudah saturate paralelism gak nambah cepat).
// Fitur: queue dengan posisi antrian, auto-respawn kalau worker mati,
// fallback inline kalau worker thread gak bisa jalan di environment tsb.
import { Worker } from "worker_threads";
import { enhanceLocal } from "./nova-hd-local.js";

const WORKER_URL = new URL("./nova-hd-worker.js", import.meta.url);

let worker = null;
let seq = 0;
let running = false;
const queue = []; // { id, buffer, mode, opts, resolve, reject }
let workerBroken = false; // env gak support worker → fallback inline

function startWorker() {
  worker = new Worker(WORKER_URL, { type: "module" });
  worker.unref();

  worker.on("message", ({ id, ok, result, error }) => {
    // FIX BUG: job di-SHIFT keluar queue saat dispatch — kalau dicari di queue
    // lagi (kode lama queue.find()) gak akan pernah ketemu → promise hang
    // selamanya (.remini "selesai" di worker tapi hasil gak pernah dikirim,
    // gak error juga). Job yang lagi dieksekusi disimpen di variabel `running`.
    if (!running || running.id !== id) return;
    const job = running;
    running = null;
    if (ok) job.resolve(result);
    else job.reject(new Error(error || "hd worker error"));
    pump();
  });

  worker.on("error", (e) => {
    console.error("[HD-Pool] worker error:", e.message);
    failAll(new Error("hd worker crash: " + e.message));
  });

  worker.on("exit", (code) => {
    console.error("[HD-Pool] worker exit kode", code);
    worker = null;
    failAll(new Error("hd worker exit (" + code + ")"));
  });

  return worker;
}

// worker mati di tengah antrian → semua job gagal, user bisa retry
function failAll(err) {
  const active = running; // job yang lagi dieksekusi worker juga ikut gagal
  running = null;
  if (active) active.reject(err);
  while (queue.length) {
    const j = queue.shift();
    j.reject(err);
  }
  pump();
}

function pump() {
  if (running || !queue.length) return;
  if (workerBroken) {
    // fallback inline: jalan di main thread (blok, tapi tetap jalan)
    const job = queue.shift();
    running = job;
    enhanceLocal(job.buffer, job.mode, job.opts)
      .then((r) => { job.resolve(r); })
      .catch((e) => { job.reject(e); })
      .finally(() => { running = null; pump(); });
    return;
  }
  if (!worker) {
    try { startWorker(); } catch (e) {
      console.error("[HD-Pool] spawn gagal — fallback inline:", e.message);
      workerBroken = true;
      pump();
      return;
    }
  }
  const job = queue.shift();
  running = job; // simpen job-nya, bukan cuma true — biar handler message bisa resolve
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
