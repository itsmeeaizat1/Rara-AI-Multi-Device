// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-hd-local.js — Engine enhance/upscale AI 100% LOKAL (tanpa API, tanpa watermark)
// Model: Swin2SR (keluarga Real-ESRGAN) via @huggingface/transformers (ONNX Runtime)
//   - hd   : swin2SR-lightweight-x2-64   → 2x cepat, buat touch-up harian
//   - real : swin2SR-realworld-x4-64     → 4x ala Remini buat foto asli (unblur/restore)
// Model diunduh SEKALI ke src/data/models/ lalu cache permanen — setelah itu offline.
// Tiling otomatis buat gambar besar biar RAM aman di VPS (tile diproses berurutan).
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { pipeline, RawImage, env } from "@huggingface/transformers";

// Cache model di folder data bot (persisten, gak kehapus saat npm install)
env.cacheDir = path.join(process.cwd(), "src", "data", "models");
env.allowLocalModels = false; // jangan scan folder lokal — langsung pakai cache/download

// OFFLINE-FAST: kalau model SUDAH ada di cache dir, baca 100% LOKAL tanpa
// sentuh network (tiap load transformers.js nge-HEAD ke huggingface.co buat
// cek ETag walaupun file sudah ada — network lambat/gangguan = load model
// macet menit2). Trik: layout cache (cacheDir/<org>/<model>/onnx/...) sama
// persis sama konvensi localModelPath → tinggal arahkan localModelPath ke
// cacheDir + allowRemoteModels=false. Model belum ada → remote ON supaya
// unduhan pertama jalan normal seperti biasa.
function ensureRemoteMode(id) {
  const dir = path.join(env.cacheDir, ...id.split("/"), "onnx");
  const cached = fs.existsSync(path.join(dir, "model.onnx"));
  if (cached) {
    env.allowLocalModels = true;
    env.localModelPath = env.cacheDir;
    env.allowRemoteModels = false;
  } else {
    env.allowLocalModels = false;
    env.localModelPath = env.cacheDir;
    env.allowRemoteModels = true;
  }
  return cached;
}

// Cek model udah ke-cache belum (tanpa network) — buat notice UX di plugin:
// kalau belum, proses pertama = unduh ±59MB (bisa lama kalau internet VPS lambat)
export function isModelCached(mode = "hd") {
  const cfg = MODELS[mode] || MODELS.hd;
  try {
    return fs.existsSync(path.join(env.cacheDir, ...cfg.id.split("/"), "onnx", "model.onnx"));
  } catch { return false; }
}

const MODELS = {
  hd: {
    id: "Xenova/swin2SR-lightweight-x2-64",
    scale: 2,
    tile: 544,   // input px per tile (RAM aman)
    maxSide: 640, // input di-resize max ini dulu biar proses cepat
    label: "Enhance HD (Local AI)",
  },
  real: {
    id: "Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr",
    scale: 4,
    tile: 416,
    maxSide: 384,
    label: "Remini Real 4x (Local AI)",
  },
};

const MARGIN = 16; // overlap antar tile (px input) — nyembunyiin seam
const pipeCache = new Map();

async function getPipe(id) {
  if (!pipeCache.has(id)) {
    const t = Date.now();
    const offline = ensureRemoteMode(id);
    console.log(`[HD-Local] load model ${id.split("/").pop()} (${offline ? "cache offline" : "download"})...`);
    // Load sekali per proses — pemakaian berikutnya instan
    pipeCache.set(id, await pipeline("image-to-image", id, { dtype: "fp32" }));
    console.log(`[HD-Local] model siap dalam ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
  return pipeCache.get(id);
}

// Posisi awal tile: menyusuri len dengan step, tile terakhir ditempel pas di ujung
function tileStarts(len, tile) {
  if (len <= tile) return [0];
  const step = Math.max(1, tile - 2 * MARGIN);
  const out = [];
  for (let x = 0; x < len - tile; x += step) out.push(x);
  out.push(len - tile);
  return out;
}

// enlarge=true → input kecil di-scale PERSIS ke maxSide dulu (hasil pas ukuran
// yang diminta user, contoh .remini real 4k → output 3840px). Default false →
// gambar kecil tetap ukuran asli (tanpa piksel palsu).
export async function enhanceLocal(buffer, mode = "hd", { maxSide: maxSideOverride, enlarge = false } = {}) {
  const cfg = MODELS[mode] || MODELS.hd;
  const maxSide = Math.max(128, Number(maxSideOverride) || cfg.maxSide);
  const scale = cfg.scale;
  const t0 = Date.now();

  // ── 1. Preprocess: EXIF rotate + resize (fit inside maxSide) + raw RGB ──
  let img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata().catch(() => null);
  const longest = Math.max(meta?.width || 0, meta?.height || 0);
  if (meta && (longest > maxSide || (enlarge && longest !== maxSide))) {
    img = img.resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: !enlarge });
  }
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  if (!W || !H) throw new Error("invalid_image");

  const up = await getPipe(cfg.id);

  // ── 2. Tiled upscale — tile diproses BERURUTAN (RAM terkendali) ──
  const xs = tileStarts(W, Math.min(cfg.tile, W));
  const ys = tileStarts(H, Math.min(cfg.tile, H));
  const rawBase = { width: W, height: H, channels: info.channels };
  const outW = W * scale;
  const outH = H * scale;
  // Canvas raw RGB hasil — tile di-copy langsung (memcpy per baris, tanpa composite)
  const canvas = Buffer.alloc(outW * outH * 3);
  let tilesDone = 0;

  for (const sy of ys) {
    for (const sx of xs) {
      const xe = Math.min(W, sx + Math.min(cfg.tile, W));
      const ye = Math.min(H, sy + Math.min(cfg.tile, H));
      // tile + margin (kalau ada tetangga) buat nyembunyiin seam
      const ms = Math.max(0, sx - MARGIN);
      const me = Math.min(W, xe + MARGIN);
      const ns = Math.max(0, sy - MARGIN);
      const ne = Math.min(H, ye + MARGIN);

      const tileRaw = await sharp(data, { raw: rawBase })
        .extract({ left: ms, top: ns, width: me - ms, height: ne - ns })
        .raw()
        .toBuffer();
      const tileImg = new RawImage(new Uint8ClampedArray(tileRaw), me - ms, ne - ns, info.channels);

      const out = await up(tileImg);
      const o = Array.isArray(out) ? out[0] : out; // RawImage hasil scale

      // Crop margin dari output → area tile asli aja → tempel di canvas
      const cropLeft = (sx - ms) * scale;
      const cropTop = (sy - ns) * scale;
      const cropW = (xe - sx) * scale;
      const cropH = (ye - sy) * scale;
      const oW = o.width;
      const oData = Buffer.from(o.data);
      for (let row = 0; row < cropH; row++) {
        const srcStart = ((cropTop + row) * oW + cropLeft) * 3;
        const dstStart = ((sy * scale + row) * outW + sx * scale) * 3;
        oData.copy(canvas, dstStart, srcStart, srcStart + cropW * 3);
      }
      tilesDone++;
    }
  }

  // ── 3. Encode canvas raw → jpeg ──
  const result = await sharp(canvas, { raw: { width: outW, height: outH, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    buffer: result,
    width: outW,
    height: outH,
    scale,
    model: cfg.id.split("/").pop(),
    label: cfg.label,
    ms: Date.now() - t0,
    tiles: tilesDone,
  };
}

// Status engine — buat info/health check
export function localHdInfo() {
  return {
    models: Object.fromEntries(Object.entries(MODELS).map(([k, v]) => [k, v.id.split("/").pop()])),
    cacheDir: env.cacheDir,
    loaded: [...pipeCache.keys()],
  };
}
