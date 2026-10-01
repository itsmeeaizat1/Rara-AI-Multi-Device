// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-pdftoimg.js — PDF ke gambar: render tiap halaman PDF jadi PNG
// (fitur baru 9 Sep 2026, request owner "fitur yg blm prnh ada di bot" —
// pdftools lama cuma manipulate PDF (merge/split/watermark), GAK ADA render halaman)
//
// Engine: pdfjs-dist LEGACY build (Node 20) + @napi-rs/canvas (engine udah
// ada dari fitur chart/fakecall — gak nambah dep canvas).
// White background fill dulu (PDF transparan → PNG item putih, bukan hitam).

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { logger } from "./rara-logger.js";

const MAX_PAGES = 20; // hard cap — jangan bikin VPS meledak
const DEFAULT_PAGES = 5;
const SCALE = 2; // 2x — seimbang antara tajam & ringan

// canvas factory buat pdfjs (dipakai internal buat render image dalam PDF)
const canvasFactory = {
  create(width, height) {
    const c = createCanvas(Math.max(1, width), Math.max(1, height));
    return { canvas: c, context: c.getContext("2d") };
  },
  destroy() {},
};

function parsePagesArg(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (!s || s === "default") return DEFAULT_PAGES;
  if (["all", "semua"].includes(s)) return MAX_PAGES;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGES;
  return Math.min(Math.floor(n), MAX_PAGES);
}

export async function pdfToImages(pdfBuffer, { pagesArg = DEFAULT_PAGES, scale = SCALE } = {}) {
  if (!pdfBuffer || !pdfBuffer.length) return { ok: false, error: "empty_buffer" };

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      canvasFactory,
      isEvalSupported: false,
      // standard fonts pdfjs — hilangin warning & font baku tetap ke-render
      standardFontDataUrl: new URL("pdfjs-dist/standard_fonts/", import.meta.url).href,
    }).promise;
  } catch (e) {
    return { ok: false, error: "pdf_invalid" };
  }

  const want = parsePagesArg(pagesArg);
  const totalPages = pdf.numPages;
  const count = Math.min(want, totalPages);
  const images = [];

  for (let i = 1; i <= count; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.max(1, viewport.width), Math.max(1, viewport.height));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
      const png = await canvas.encode("png");
      images.push({ pageNumber: i, png });
      page.cleanup();
    } catch (e) {
      logger?.warn?.("[pdftoimg] halaman " + i + " gagal: " + e.message);
      break;
    }
  }

  try { await pdf.destroy(); } catch {}
  if (!images.length) return { ok: false, error: "render_failed" };
  return { ok: true, images, totalPages, rendered: images.length, truncated: count < totalPages };
}

export { parsePagesArg, MAX_PAGES, DEFAULT_PAGES, SCALE };
