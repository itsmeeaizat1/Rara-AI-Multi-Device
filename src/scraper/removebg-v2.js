// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";

/**
 * Remove background menggunakan @imgly/background-removal-node
 * ML model ONNX Runtime — jalan lokal, gratis, hasil bersih
 *
 * @param {Buffer} imageBuffer — Buffer gambar input
 * @param {Object} opts — Konfigurasi opsional
 * @param {string} opts.outputFormat — "image/png" (default) atau "image/jpeg"
 * @param {number} opts.quality — 0-1 untuk JPEG (default 1.0)
 * @returns {Promise<Buffer>} — Buffer PNG dengan background transparan
 */
async function removeBgLocal(imageBuffer, opts = {}) {
  const outputFormat = opts.outputFormat || "image/png";
  const quality = opts.quality ?? 1.0;

  const blob = new Blob([imageBuffer], {
    type: imageBuffer.type || "image/jpeg",
  });

  const result = await removeBackground(blob, {
    output: { format: outputFormat, quality },
  });

  const arrBuf = await result.arrayBuffer();
  return Buffer.from(arrBuf);
}

export { removeBgLocal };
