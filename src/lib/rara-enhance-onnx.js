// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-enhance-onnx.js — ENHANCER foto 100% LOKAL (ONNX Runtime murni, tanpa API luar, tanpa watermark).
// Pengganti jalur utama .remini. Beda dari rara-hd-local (Swin2SR = cuma perbesar), ini RESTORASI:
//   1. Real-ESRGAN x2 : restorasi seluruh gambar (noise / blur / kompresi) + perbesar 2x, per-tile kecil
//   2. SCRFD          : deteksi wajah + 5 landmark (3 MB, ±100 ms)
//   3. GPEN-BFR-256   : pemulih wajah per wajah (align → model → tempel balik, tepi halus)
// Semua model dari rilis resmi FaceFusion (huggingface.co/facefusion/models-3.0.0), diunduh SEKALI ke
// src/data/models/ff/ lalu cache permanen & diverifikasi CRC32 (file .hash resmi) — file rusak ditolak.
//
// ANTI-CPU-NAIK (akar keluhan "CPU naik + gagal render") — hasil ukur nyata:
//   - ONNX default pakai SEMUA core (±3,7 core sekaligus). Di sini dipaksa intraOpNumThreads=ENHANCE_THREADS
//     (default 1 → ±1 core; total kerja CPU hampir sama, cuma lebih panjang & server tetap responsif).
//   - Tile kecil (128px) berurutan: tile 128→256 bikin waktu 4x & RAM +200MB.
//   - Input dibatasi maxSide biar waktu render terukur & terduga.
//   - Jalan di worker thread (lihat rara-hd-pool) → event loop bot gak keblok.
// Model fp16 SENGAJA tidak dipakai: onnxruntime-node 1.17.3 di repo menolak tensor float16 di Node 20/22.
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { createRequire } from "module";
import sharp from "sharp";
import {
  TEMPLATE_ARCFACE_128, estimateSimilarity, warpAffineRGB, boxMask, pasteBack, nms, scrfdDecode,
} from "./rara-enhance-geom.js";

const require = createRequire(import.meta.url);

const MODEL_DIR = path.join(process.cwd(), "src", "data", "models", "ff");
const HF = "https://huggingface.co/facefusion/models-3.0.0/resolve/main";

export const ENHANCE_MODELS = {
  esrgan: { file: "real_esrgan_x2.onnx", mb: 66, label: "Real-ESRGAN x2" },
  scrfd: { file: "scrfd_2.5g.onnx", mb: 3, label: "SCRFD deteksi wajah" },
  gpen: { file: "gpen_bfr_256.onnx", mb: 76, label: "GPEN pemulih wajah" },
};

const THREADS = Math.max(1, Math.min(8, Number(process.env.ENHANCE_THREADS) || 1));
const TILE = 128;          // input px per tile Real-ESRGAN (hasil ukur: 1,4 dtk/tile @1 thread, RAM ±370MB)
const TILE_PAD = 8;        // overlap tiap sisi — nyembunyiin seam
const DET = 640;           // kanvas detektor
const FACE = 256;          // ukuran crop GPEN
const MIN_FACE_SCORE = 0.5;
const MAX_FACES = 6;       // batas keras: banyak wajah = banyak waktu

let ortMod = null;
function ort() { return ortMod || (ortMod = require("onnxruntime-node")); }

// ───────────────────────── verifikasi & unduh model ─────────────────────────

function crc32Hex(buf) {
  // zlib.crc32 ada di Node >=22.2; fallback tabel manual untuk Node 20
  if (typeof zlib.crc32 === "function") return (zlib.crc32(buf) >>> 0).toString(16).padStart(8, "0");
  let table = crc32Hex._t;
  if (!table) {
    table = crc32Hex._t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

/** CRC32 bertahap untuk unduhan streaming (tanpa buffer penuh di RAM). crc = nilai internal (mulai 0xffffffff). */
const _CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32Update(crc, chunk) { for (let i = 0; i < chunk.length; i++) crc = _CRC_T[(crc ^ chunk[i]) & 0xff] ^ (crc >>> 8); return crc; }
function crc32Finish(crc) { return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0"); }

function modelPath(key) { return path.join(MODEL_DIR, ENHANCE_MODELS[key].file); }

/** Cek cepat tanpa network: semua model sudah ada? (buat notice UX "akan unduh ±145MB"). */
export function isEnhanceCached(keys = Object.keys(ENHANCE_MODELS)) {
  return keys.every((k) => { try { return fs.statSync(modelPath(k)).size > 1_000_000; } catch { return false; } });
}

/** Berapa MB yang belum ada (untuk notice). */
export function enhanceMissingMb(keys = Object.keys(ENHANCE_MODELS)) {
  return keys.filter((k) => !isEnhanceCached([k])).reduce((s, k) => s + ENHANCE_MODELS[k].mb, 0);
}

const _dl = new Map(); // dedupe unduhan paralel per model
const _verified = new Set(); // model yang CRC32-nya sudah dicek di proses ini (cek penuh = baca 66MB, cukup sekali)
let _hashFetch = fetch; // seam tes

/** CRC32 resmi (file .hash FaceFusion); null kalau tidak bisa diambil (offline) -> jangan menghukum file lokal. */
async function officialCrc(file, fetchImpl) {
  try {
    const r = await fetchImpl(`${HF}/${file.replace(/\.onnx$/, ".hash")}`);
    if (!r.ok) return null;
    const t = (await r.text()).trim().toLowerCase();
    return /^[0-9a-f]{8}$/.test(t) ? t : null;
  } catch { return null; }
}

/** Pastikan model ada & valid (CRC32 == file .hash resmi). Unduh ke file .part lalu rename atomik. */
export async function ensureModel(key, { fetchImpl = fetch, timeoutMs = 10 * 60 * 1000, onProgress = null } = {}) {
  const meta = ENHANCE_MODELS[key];
  if (!meta) throw new Error(`model_tidak_dikenal:${key}`);
  const dest = modelPath(key);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
    if (_verified.has(key)) return dest;
    // Pertama kali dipakai di proses ini: cocokkan CRC32 dengan hash resmi. File korup (unduhan terpotong /
    // disk rusak) dulu lolos karena cuma dicek ukuran -> fitur rusak PERMANEN. Sekarang dibuang & diunduh ulang.
    // Offline / hash tak bisa diambil -> percaya file lokal (jangan matikan fitur hanya karena internet mati).
    const want = await officialCrc(meta.file, fetchImpl === fetch ? _hashFetch : fetchImpl);
    if (!want) { _verified.add(key); return dest; }
    const got = crc32Hex(fs.readFileSync(dest));
    if (got === want) { _verified.add(key); return dest; }
    console.error(`[ENHANCE] model ${meta.file} korup (crc ${got} != ${want}), dibuang & diunduh ulang`);
    try { fs.rmSync(dest, { force: true }); } catch {}
  }
  if (_dl.has(key)) return _dl.get(key);
  const job = (async () => {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
    const part = dest + ".part";
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const [hashRes, res] = await Promise.all([
        fetchImpl(`${HF}/${meta.file.replace(/\.onnx$/, ".hash")}`, { signal: ac.signal }),
        fetchImpl(`${HF}/${meta.file}`, { signal: ac.signal }),
      ]);
      if (!res.ok) throw new Error(`unduh_model_gagal:${meta.file}:HTTP_${res.status}`);
      // STREAMING ke disk (3 Okt 2026): dulu seluruh file (66-76MB) dibuffer di RAM (+228MB RSS) -> di VPS kecil
      // bisa di-kill OOM tanpa pesan apa pun. Sekarang ditulis per potongan + CRC bertahap. Mock tanpa body stream
      // (tes) tetap jatuh ke arrayBuffer().
      let size = 0, got;
      const total = Number(res.headers && typeof res.headers.get === "function" ? res.headers.get("content-length") : 0) || 0;
      const emit = () => { try { onProgress && onProgress({ key, file: meta.file, label: meta.label, done: size, total: total || meta.mb * 1_000_000 }); } catch {} };
      if (res.body && typeof res.body.getReader === "function") {
        const out = fs.openSync(part, "w");
        let crc = 0xffffffff;
        try {
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
            fs.writeSync(out, chunk);
            crc = crc32Update(crc, chunk);
            size += chunk.length;
            emit();
          }
        } finally { try { fs.closeSync(out); } catch {} }
        got = crc32Finish(crc);
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        size = buf.length;
        got = crc32Hex(buf);
        fs.writeFileSync(part, buf);
        emit();
      }
      if (size < 1_000_000) throw new Error(`unduh_model_terlalu_kecil:${meta.file}:${size}B`);
      if (hashRes.ok) {
        const want = (await hashRes.text()).trim().toLowerCase();
        if (/^[0-9a-f]{8}$/.test(want) && got !== want) throw new Error(`model_korup:${meta.file}:crc_${got}_harusnya_${want}`);
      }
      fs.renameSync(part, dest);
      _verified.add(key);
      return dest;
    } finally {
      clearTimeout(timer);
      try { fs.rmSync(part, { force: true }); } catch {}
    }
  })().finally(() => _dl.delete(key));
  _dl.set(key, job);
  return job;
}

/** Alasan gagal unduh -> kalimat singkat untuk user (kode teknis tetap di log). */
export function describeDownloadError(err) {
  const msg = String((err && err.message) || err || "");
  if (/HTTP_(401|403)/.test(msg)) return "server model menolak akses (403), IP VPS mungkin diblokir Hugging Face";
  if (/HTTP_429/.test(msg)) return "server model sedang membatasi permintaan (429), coba lagi beberapa menit";
  if (/HTTP_5\d\d/.test(msg)) return "server model sedang bermasalah (5xx)";
  if (/HTTP_404/.test(msg)) return "file model tidak ditemukan di server (404)";
  if (/terlalu_kecil/.test(msg)) return "server membalas halaman error, bukan file model (kemungkinan diblokir jaringan)";
  if (/model_korup/.test(msg)) return "file terunduh rusak (checksum tidak cocok)";
  if (/abort/i.test(msg)) return "unduhan terlalu lama dan dibatalkan (koneksi VPS lambat)";
  if (/ENOSPC/.test(msg)) return "disk VPS penuh";
  if (/EACCES|EPERM/.test(msg)) return "folder model tidak bisa ditulis (izin)";
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|fetch failed|terminated|network|socket/i.test(msg)) return "VPS tidak bisa menjangkau huggingface.co (DNS/koneksi)";
  return "unduhan gagal (" + msg.slice(0, 80) + ")";
}

/**
 * Pra-unduh SEMUA model yang belum ada, berurutan, DI LUAR worker render (batas waktu render tidak ikut terpakai).
 * onProgress({ index, count, label, done, total }) — pemanggil yang membatasi laju. Melempar error model pertama yang gagal.
 */
export async function prefetchEnhanceModels({ keys = Object.keys(ENHANCE_MODELS), onProgress = null, fetchImpl = fetch } = {}) {
  const todo = keys.filter((k) => !isEnhanceCached([k]));
  for (let i = 0; i < todo.length; i++) {
    const k = todo[i];
    await ensureModel(k, {
      fetchImpl,
      onProgress: (x) => { try { onProgress && onProgress({ index: i + 1, count: todo.length, label: ENHANCE_MODELS[k].label, done: x.done, total: x.total }); } catch {} },
    });
  }
  return todo.length;
}

const _sess = new Map();
async function getSession(key) {
  if (_sess.has(key)) return _sess.get(key);
  const p = await ensureModel(key);
  const s = await ort().InferenceSession.create(p, {
    executionProviders: ["cpu"],
    intraOpNumThreads: THREADS,   // ← kunci anti-CPU-naik
    interOpNumThreads: 1,
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,          // bungkam ratusan peringatan "Initializer ... appears in graph inputs"
  });
  _sess.set(key, s);
  return s;
}

/** Lepas semua sesi (hemat RAM setelah idle / untuk tes). */
export function releaseEnhanceSessions() { _sess.clear(); }

// ───────────────────────── 1. Real-ESRGAN x2 per tile ─────────────────────────

async function esrganUpscale(rgb, W, H, onTile) {
  const sess = await getSession("esrgan");
  const inName = sess.inputNames[0], outName = sess.outputNames[0];
  const S = 2;
  const outW = W * S, outH = H * S;
  const out = Buffer.alloc(outW * outH * 3);
  const step = TILE - 2 * TILE_PAD;
  const xs = [], ys = [];
  for (let x = 0; x < W; x += step) xs.push(x);
  for (let y = 0; y < H; y += step) ys.push(y);
  const total = xs.length * ys.length;
  let done = 0;
  for (const ty of ys) for (const tx of xs) {
    // area inti tile + padding (dijepit ke tepi gambar)
    const x0 = Math.max(0, tx - TILE_PAD), y0 = Math.max(0, ty - TILE_PAD);
    const x1 = Math.min(W, tx + step + TILE_PAD), y1 = Math.min(H, ty + step + TILE_PAD);
    const tw = x1 - x0, th = y1 - y0;
    const inp = new Float32Array(3 * tw * th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const o = ((y0 + y) * W + (x0 + x)) * 3, p = y * tw + x;
      inp[p] = rgb[o] / 255; inp[tw * th + p] = rgb[o + 1] / 255; inp[2 * tw * th + p] = rgb[o + 2] / 255;
    }
    const res = (await sess.run({ [inName]: new (ort().Tensor)("float32", inp, [1, 3, th, tw]) }))[outName];
    const od = res.data, ow = tw * S, oh = th * S;
    // salin HANYA area inti (tanpa padding) ke kanvas hasil
    const cx0 = (tx - x0) * S, cy0 = (ty - y0) * S;
    const cw = Math.min(step, W - tx) * S, ch = Math.min(step, H - ty) * S;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const sp = (cy0 + y) * ow + (cx0 + x);
      const dp = ((ty * S + y) * outW + (tx * S + x)) * 3;
      for (let c = 0; c < 3; c++) {
        const v = od[c * ow * oh + sp];
        out[dp + c] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
      }
    }
    done++;
    if (onTile) onTile(done, total);
    // beri napas event loop (worker) antar tile — kontrol CPU & bisa diabort
    await new Promise((r) => setImmediate(r));
  }
  return { rgb: out, W: outW, H: outH, tiles: total };
}

// ───────────────────────── 2. SCRFD deteksi wajah ─────────────────────────

async function detectFaces(rgb, W, H) {
  const sess = await getSession("scrfd");
  const scale = Math.min(DET / W, DET / H, 1);
  const tw = Math.max(1, Math.round(W * scale)), th = Math.max(1, Math.round(H * scale));
  const small = scale < 1
    ? await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).resize(tw, th).raw().toBuffer()
    : rgb;
  // kanvas DET x DET, gambar di pojok kiri-atas (BUKAN di-stretch), BGR, (x-127.5)/128, NCHW
  const data = new Float32Array(3 * DET * DET);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const o = (y * tw + x) * 3, p = y * DET + x;
    data[p] = (small[o + 2] - 127.5) / 128;
    data[DET * DET + p] = (small[o + 1] - 127.5) / 128;
    data[2 * DET * DET + p] = (small[o] - 127.5) / 128;
  }
  const out = await sess.run({ [sess.inputNames[0]]: new (ort().Tensor)("float32", data, [1, 3, DET, DET]) });
  const outs = sess.outputNames.map((n) => ({ data: out[n].data, dims: out[n].dims }));
  const r = scrfdDecode(outs, DET, DET, MIN_FACE_SCORE);
  const keep = nms(r.boxes, r.scores, 0.4).slice(0, MAX_FACES);
  return keep.map((i) => ({
    score: r.scores[i],
    box: r.boxes[i].map((v) => v / scale),
    landmarks: r.landmarks[i].map(([x, y]) => [x / scale, y / scale]),
  }));
}

// ───────────────────────── 3. GPEN pemulih wajah ─────────────────────────

async function restoreFace(base, W, H, face, strength) {
  const sess = await getSession("gpen");
  const tmpl = TEMPLATE_ARCFACE_128.map(([x, y]) => [x * FACE, y * FACE]);
  const m = estimateSimilarity(face.landmarks, tmpl);
  const crop = warpAffineRGB(base, W, H, m, FACE, FACE);
  const inp = new Float32Array(3 * FACE * FACE);
  for (let i = 0; i < FACE * FACE; i++) for (let c = 0; c < 3; c++) inp[c * FACE * FACE + i] = (crop[i * 3 + c] / 255 - 0.5) / 0.5;
  const o = (await sess.run({ [sess.inputNames[0]]: new (ort().Tensor)("float32", inp, [1, 3, FACE, FACE]) }))[sess.outputNames[0]].data;
  const res = Buffer.alloc(FACE * FACE * 3);
  for (let i = 0; i < FACE * FACE; i++) for (let c = 0; c < 3; c++) {
    const v = Math.min(1, Math.max(-1, o[c * FACE * FACE + i]));
    res[i * 3 + c] = Math.round(((v + 1) / 2) * 255);
  }
  pasteBack(base, W, H, res, FACE, boxMask(FACE, 0.18), m, strength);
}

// ───────────────────────── API publik ─────────────────────────

/**
 * Enhance foto: Real-ESRGAN x2 (seluruh gambar) → deteksi wajah → GPEN per wajah.
 * @param {Buffer} buffer gambar apa saja yang dikenal sharp
 * @param {object} [o]
 * @param {number} [o.maxSide=640]   sisi terpanjang input (lebih besar → di-perkecil dulu). Hasil = 2x ini.
 * @param {boolean}[o.faces=true]    pulihkan wajah
 * @param {boolean}[o.upscale=true]  jalankan Real-ESRGAN (false = wajah saja, jauh lebih cepat)
 * @param {number} [o.faceStrength=1] 0..1 kekuatan tempel wajah
 * @param {(stage:string, done?:number, total?:number)=>void} [o.onProgress]
 * @returns {{buffer:Buffer,width:number,height:number,faces:number,tiles:number,ms:number,label:string,stages:string[]}}
 */
export async function enhancePhoto(buffer, o = {}) {
  const t0 = Date.now();
  const maxSide = Math.max(128, Math.min(1280, Number(o.maxSide) || 640));
  const wantFaces = o.faces !== false, wantUp = o.upscale !== false;
  const strength = Math.min(1, Math.max(0, o.faceStrength ?? 1));
  const prog = typeof o.onProgress === "function" ? o.onProgress : () => {};
  const stages = [];

  let img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("gambar_tidak_valid");
  if (Math.max(meta.width, meta.height) > maxSide) img = img.resize({ width: maxSide, height: maxSide, fit: "inside" });
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let rgb = data, W = info.width, H = info.height, tiles = 0;

  if (wantUp) {
    prog("upscale", 0, 1);
    const r = await esrganUpscale(rgb, W, H, (d, t) => prog("upscale", d, t));
    rgb = r.rgb; W = r.W; H = r.H; tiles = r.tiles;
    stages.push("Real-ESRGAN x2");
  }

  let faceCount = 0, faceFailed = 0, faceFound = 0;
  if (wantFaces) {
    prog("faces");
    const faces = await detectFaces(rgb, W, H);
    faceFound = faces.length;
    for (const f of faces) {
      try { await restoreFace(rgb, W, H, f, strength); faceCount++; }
      catch (e) { faceFailed++; console.error("[ENHANCE] satu wajah gagal dipulihkan, dilewati:", e.message); }
      await new Promise((r) => setImmediate(r));
    }
    if (faceCount) stages.push(`GPEN ${faceCount} wajah`);
    // Jujur ke pemanggil: ada wajah tapi pemulihannya gagal (jangan dilabeli seolah tidak ada wajah)
    if (faceFailed) stages.push(`${faceFailed} wajah gagal dipulihkan`);
  }

  const out = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 93, mozjpeg: true }).toBuffer();
  return {
    buffer: out, width: W, height: H, faces: faceCount, facesFound: faceFound, facesFailed: faceFailed, tiles, ms: Date.now() - t0,
    label: `Enhance Lokal ONNX (${stages.join(" + ") || "tanpa perubahan"})`, stages,
  };
}

/** Hanya untuk tes: ganti fetch yang dipakai cek hash. */
export function _setHashFetchForTest(f) { _hashFetch = f || fetch; _verified.clear(); }

export const ENHANCE_CONFIG = { THREADS, TILE, TILE_PAD, DET, FACE, MAX_FACES };
