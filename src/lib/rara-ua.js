// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-ua.js — User-Agent toolkit (pasang 10 Okt 2026).
// Parser: UAParser.js v1.0.39 MIT, vendored di src/lib/vendor/ua-parser-1.0.39.cjs
// (sumber: github.com/faisalman/ua-parser-js — file asli tanpa modifikasi).
// Fitur: parse UA + kartu info, pool UA modern + rotasi acak
// (dipakai rara-http.js buat header User-Agent semua request bot → anti-block).
// CATATAN LISensi: v2.x ua-parser-js itu AGPL — WAJIB pakai line 1.x (MIT) ini.

import { createRequire } from "node:module";
import path from "node:path";

const require2 = createRequire(import.meta.url);
const UAParser = require2(path.join(process.cwd(), "src", "lib", "vendor", "ua-parser-1.0.39.cjs"));

// Pool UA modern (browser ver dikurangi UA-Reduction, tetap valid di API)
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0",
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0",
];

export function parseUA(uaString) {
  const ua = String(uaString || "").trim();
  if (!ua) return null;
  try {
    const p = new UAParser(ua);
    const r = p.getResult();
    return { raw: ua, ...r };
  } catch {
    return null;
  }
}

export function getRandomUserAgent() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

export function getUaPoolSize() {
  return UA_POOL.length;
}

export { UAParser };
