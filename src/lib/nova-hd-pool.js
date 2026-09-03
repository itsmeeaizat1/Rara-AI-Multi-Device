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
    const job = queue.find((j) => j.id === id);
    if (!job) return;
    if (ok) job.resolve(result);
    else job.reject(new Error(error || "hd worker error"));
    running = false;
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
  running = false;
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
    running = true;
    enhanceLocal(job.buffer, job.mode, job.opts)
      .then((r) => { job.resolve(r); })
      .catch((e) => { job.reject(e); })
      .finally(() => { running = false; pump(); });
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
  running = true;
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
  return { ahead: queue.length, busy: running };
}
