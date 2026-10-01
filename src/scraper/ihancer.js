// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/ihancer.js — AI Photo Enhancer ihancer.com (ala app Remini)
// Request owner 17 Sep 2026: "cba fitur remini ganti pakai api ini" — port
// verbatim dari kode owner (axios + form-data, endpoint /api/enhance).
// Beda dari kode asli: (1) ESM, (2) error informatif di-throw (bukan return
// status 500 — biar chain fallback remini bisa nangkep), (3) validasi MAGIC
// BYTE hasil (pelajaran .sdxl: halaman HTML error bisa lolos kalau cuma
// ngecek length), (4) seam _setIhancerHttpForTest buat e2e tanpa internet.

import axios from "axios";
import FormData from "form-data";

const ENHANCE_URL = "https://ihancer.com/api/enhance";
const IHANCER_429_WAIT_MS = 3000; // jeda antar retry pas kena rate-limit
const IHANCER_429_RETRIES = 2; // total 3 percobaan
const DEFAULT_HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://ihancer.com/app/",
};

// 🔹 seam e2e — function = mock; null = DISABLED; undefined = axios asli
let _http = undefined;
export function _setIhancerHttpForTest(fn) { _http = fn; }
export function _clearIhancerHttpForTest() { _http = undefined; }

function _looksLikeImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  // JPEG SOI / PNG / WebP (RIFF....WEBP) / GIF
  return (
    (buf[0] === 0xff && buf[1] === 0xd8) ||
    (buf[0] === 0x89 && buf[1] === 0x50) ||
    (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45) ||
    (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
  );
}

// jeda retry 429 — bisa dipendekin dari e2e biar test cepat
let _429WaitMsForTest = null;
function _429WaitMs() { return _429WaitMsForTest ?? IHANCER_429_WAIT_MS; }
export function _setIhancer429WaitForTest(ms) { _429WaitMsForTest = typeof ms === "number" ? ms : null; }

/**
 * Enhance gambar via ihancer.com.
 * @param {Buffer} imageBuffer - buffer gambar asli
 * @param {object} options
 *   method: "1".."4" (default "4")
 *   isProVersion: boolean (default false)
 *   isEnhancingMore: boolean (default false)
 *   maxImageSize: "high"|"low" (default "high")
 *   filename: string (default kuro-<ts>.jpg)
 *   timeoutMs: number (default 120000)
 * @returns {Promise<Buffer>} buffer gambar hasil enhance
 */
export async function ihancerEnhance(imageBuffer, options = {}) {
  if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) {
    throw new Error("input bukan buffer gambar yang valid");
  }
  const {
    method = "4",
    isProVersion = false,
    isEnhancingMore = false,
    maxImageSize = "high",
    filename = `kuro-${Date.now()}.jpg`,
    timeoutMs = 120000,
  } = options;

  const formData = new FormData();
  formData.append("method", String(method));
  formData.append("is_pro_version", String(!!isProVersion));
  formData.append("is_enhancing_more", String(!!isEnhancingMore));
  formData.append("max_image_size", String(maxImageSize));
  formData.append("file", imageBuffer, { filename, contentType: "image/jpg" });

  // FIX 19 Sep 2026 (owner: "remini di enhance lbh tinggi biar jernihnya HD bgt"):
  // ihancer gratis kena 429 kalau dipanggil rapat (ketemu live pas tes
  // param pro) — sekarang retry otomatis dgn jeda, bukan gagal total.
  const send = async () => {
    if (typeof _http === "function") {
      // jalur e2e — mock baca { url, data } kaya axios
      return await _http({
        url: ENHANCE_URL,
        data: formData,
        headers: { ...formData.getHeaders(), ...DEFAULT_HEADERS },
      });
    }
    if (_http === null) throw new Error("ihancer disabled (test)");
    return await axios.post(ENHANCE_URL, formData, {
      headers: { ...formData.getHeaders(), ...DEFAULT_HEADERS },
      responseType: "arraybuffer",
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: timeoutMs,
      validateStatus: () => true,
    });
  };

  let res;
  for (let attempt = 0; ; attempt++) {
    res = await send();
    if ((res?.status ?? 0) === 429 && attempt < IHANCER_429_RETRIES) {
      await new Promise((r) => setTimeout(r, _429WaitMs()));
      continue; // 429 = antrean rame, key tetep valid — coba lagi
    }
    break;
  }

  const status = res?.status ?? 0;
  if (status !== 200) {
    let detail = "";
    try {
      detail = Buffer.from(res?.data || "").toString("utf-8").slice(0, 180);
    } catch {}
    throw new Error(`ihancer HTTP ${status}${detail ? " — " + detail : ""}`);
  }
  const out = Buffer.from(res.data);
  if (!_looksLikeImage(out)) {
    // bukan gambar = server balikin HTML error/quota page (pelajaran sdxl)
    const head = out.toString("utf-8").slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`ihancer balikin non-gambar (mungkin quota habis/down): ${head}`);
  }
  return out;
}
