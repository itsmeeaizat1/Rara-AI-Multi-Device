// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-hd-worker.js — worker thread buat engine upscale lokal (Swin2SR).
// Kenapa worker? Inference ONNX itu CPU-bound — kalau jalan di main thread,
// SELAMA render event loop Node keblok total: bot gak respon command lain,
// pesan masuk numpuk, ping meledak. Di worker thread: render jalan sendiri,
// bot tetap responsif, hasil dikirim balik via postMessage (zero-copy transfer).
// Model tetap ke-load SEKALI di worker ini (cache pipeline panas antar job).
import { parentPort } from "worker_threads";
import { enhanceLocal } from "./nova-hd-local.js";

parentPort.on("message", async ({ id, buffer, mode, opts } = {}) => {
  try {
    const r = await enhanceLocal(Buffer.from(buffer), mode, opts || {});
    // zero-copy transfer hasil ke main thread
    const ab = r.buffer.buffer.slice(
      r.buffer.byteOffset,
      r.buffer.byteOffset + r.buffer.byteLength,
    );
    parentPort.postMessage(
      { id, ok: true, result: { ...r, buffer: Buffer.from(ab) } },
      [ab],
    );
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: e?.message || String(e) });
  }
});
