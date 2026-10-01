// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/scraper/photiu.js — Image upscaler Photiu AI (https://www.photiu.ai)
// Request owner 11 Sep 2026: "skrg ganti fitur .remini pakai kode ini" — engine
// utama .remini pindah dari Remini mobile API ke endpoint internal Photiu AI.
// Port dari kode owner (axios + form-data, endpoint /api/tools/img_improve).
// Beda dari kode asli: hasil dikembalikan sebagai BUFFER (bot langsung kirim ke
// WhatsApp) — upload CDN zass.in opsional lewat opts.cdn (default OFF biar gak
// nambah round-trip + titik gagal baru).

import axios from "axios";
import FormData from "form-data";
import path from "path";
import fs from "fs";

const BASE_URL = "https://www.photiu.ai";
const CDN_UPLOAD_URL = "https://cdn.zass.in/upload";
const ENDPOINTS = {
  IMPROVE: "https://www.photiu.ai/api/tools/img_improve",
};

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://www.photiu.ai/id/image-upscaler",
  Origin: "https://www.photiu.ai",
};

function getMimeTypeByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "image/jpeg";
  }
}

function getExtensionByMimeType(mimeType) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
    case "image/jpg":
    default:
      return ".jpg";
  }
}

function extractServerError(response) {
  if (!response) return null;
  const rawParams = response.headers ? response.headers["x-paramsjs"] : null;
  if (rawParams) {
    try {
      const parsed = JSON.parse(rawParams);
      if (parsed.msg) return parsed.msg;
      if (parsed.error_msg) return parsed.error_msg;
    } catch {}
  }
  if (response.data) {
    try {
      const parsed = JSON.parse(Buffer.from(response.data).toString("utf8"));
      if (parsed.msg) return parsed.msg;
      if (parsed.message) return parsed.message;
    } catch {
      const text = Buffer.from(response.data).toString("utf8").trim();
      if (text) return text;
    }
  }
  return null;
}

// Upload buffer ke CDN zass.in — OPSIONAL (opts.cdn), bot langsung pakai buffer
async function uploadToCdn(buffer, filename = "upscaled.jpg", mimeType = "image/jpeg", timeout = 30000) {
  try {
    const form = new FormData();
    form.append("file", buffer, { filename, contentType: mimeType });
    const response = await axios.post(CDN_UPLOAD_URL, form.getBuffer(), {
      headers: { ...form.getHeaders(), "User-Agent": DEFAULT_HEADERS["User-Agent"] },
      timeout,
    });
    if (response.data && response.data.url) return response.data.url;
    throw new Error("Response CDN tidak berisi URL");
  } catch (err) {
    throw new Error(`Gagal mengupload gambar hasil ke CDN zass.in: ${err.message}`);
  }
}

async function resolveImageSource(source, timeout = 30000) {
  if (!source) throw new Error("Parameter source gambar tidak boleh kosong");

  if (Buffer.isBuffer(source)) {
    return { buffer: source, filename: "input.jpg", mimeType: "image/jpeg", sourceType: "buffer" };
  }

  if (typeof source === "string") {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      const response = await axios.get(source, {
        responseType: "arraybuffer",
        timeout,
        headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] },
      });

      let mimeType = "image/jpeg";
      const headerContentType = response.headers["content-type"];
      if (headerContentType) mimeType = headerContentType.split(";")[0].trim().toLowerCase();

      let filename = "input_image" + getExtensionByMimeType(mimeType);
      try {
        const urlParsed = new URL(source);
        const base = path.basename(urlParsed.pathname);
        if (base && base.includes(".")) filename = base;
      } catch {}

      return { buffer: Buffer.from(response.data), filename, mimeType, sourceType: "url" };
    }

    const resolvedPath = path.resolve(source);
    if (!fs.existsSync(resolvedPath)) throw new Error(`File lokal tidak ditemukan: ${resolvedPath}`);
    const buffer = fs.readFileSync(resolvedPath);
    const filename = path.basename(resolvedPath);
    return { buffer, filename, mimeType: getMimeTypeByExtension(filename), sourceType: "file" };
  }

  throw new Error("Tipe source tidak didukung. Harap berikan URL gambar, file path, atau Buffer.");
}

/**
 * Upscale/enhance gambar via Photiu AI.
 * @param {Buffer|string} source — buffer gambar, file path, atau URL
 * @param {object} options — { mode, level, timeout, output, cdn }
 * @returns {object} { status: true, data: { buffer, format, mime_type, size_bytes, url?, saved_path? } }
 */
async function upscaleImage(source, options = {}) {
  const timeout = typeof options.timeout === "number" ? options.timeout : 60000;
  const imageMeta = await resolveImageSource(source, timeout);

  const mode = options.mode || "upscale";
  const level = options.level || "default";
  const paramObject = { mode, level };
  const paramString = JSON.stringify(paramObject);

  const form = new FormData();
  form.append("upfile", imageMeta.buffer, {
    filename: imageMeta.filename,
    contentType: imageMeta.mimeType,
  });

  const headers = {
    ...form.getHeaders(),
    ...DEFAULT_HEADERS,
    "X-Paramsjs": paramString,
    "X-PriceParams": paramString,
  };

  let response;
  try {
    response = await axios.post(ENDPOINTS.IMPROVE, form.getBuffer(), {
      headers,
      responseType: "arraybuffer",
      timeout,
    });
  } catch (err) {
    const serverMsg = extractServerError(err.response);
    const reason = serverMsg || (err.response ? `HTTP ${err.response.status}` : err.message);
    throw new Error(`Gagal memproses gambar pada tahap upscale: ${reason}`);
  }

  const resultBuffer = Buffer.from(response.data);
  if (resultBuffer.length === 0) throw new Error("Hasil upscale dari server kosong");

  const contentType = response.headers["content-type"]
    ? response.headers["content-type"].split(";")[0].trim()
    : "image/jpeg";
  let format = "jpg";
  if (contentType.includes("png") || (resultBuffer[0] === 0x89 && resultBuffer[1] === 0x50)) {
    format = "png";
  } else if (contentType.includes("webp")) {
    format = "webp";
  }

  let savedFilePath = null;
  if (options.output) {
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, resultBuffer);
    savedFilePath = outputPath;
  }

  const responseData = {
    buffer: resultBuffer,
    filename: imageMeta.filename,
    format,
    mime_type: contentType,
    size_bytes: resultBuffer.length,
  };
  if (savedFilePath) responseData.saved_path = savedFilePath;

  // CDN zass.in opsional — default OFF (bot langsung kirim buffer ke WhatsApp)
  if (options.cdn) {
    const cdnFilename = "upscaled_" + Date.now() + "." + format;
    responseData.url = await uploadToCdn(resultBuffer, cdnFilename, contentType, timeout);
  }

  return { status: true, data: responseData };
}

export { upscaleImage as photiuUpscale, upscaleImage as default };
