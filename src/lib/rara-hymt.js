// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/rara-hymt.js — Engine Tencent Hunyuan-MT via SiliconFlow (OpenAI-compatible)
//
// OWNER 10 Okt: "fitur translate jangan pakai MyMemory, bisa pakai immersive
// translate?" → Riset LIVE: immersivetranslate.com/en/translate itu WEB APP,
// TANPA API publik; api resmi lama (api.immersivetranslate.com) MATI (Deno
// Deploy sunset Jul 2026); endpoint internal api2.immersivetranslate.com
// butuh token akun & engine gratisnya (GLM-4.5-Air) udah di-disable Jul 2025.
// FAKTA KUNCI: engine gratisan Immersive = model open-source TENCENT HUNYUAN
// (HY-MT, WMT champion, github.com/Tencent-Hunyuan/HY-MT) yang dihosting di
// SiliconFlow. Jadi engine kelas Immersive = HY-MT via API SiliconFlow —
// legal, berdokumentasi, OpenAI-compatible, support bahasa Indonesia.
//
// Prioritas: key siliconflow (.setkey > apikeys.json > env). Tanpa key →
// caller fallback ke MyMemory (engine lama tetap jalan).

import { getApiKey } from "./rara-api-keys.js";

const SF_URL = "https://api.siliconflow.cn/v1/chat/completions";
const HY_MODEL_DEFAULT = "Hunyuan/Hunyuan-MT-7B";
const HY_BATCH_LINES = 15; // baris per request (numbered lines)
const HY_BATCH_CHARS = 3500; // maks chars (versi masked) per request
const HY_TIMEOUT = 30000;
const HY_DELAY = 300; // jeda antar request

// Nama bahasa ENGLISH FULL NAME (prompt HY-MT wajib full names, bukan kode)
const LANG_EN_NAME = {
  id: "Indonesian", en: "English", jv: "Javanese", su: "Sundanese",
  ar: "Arabic", ja: "Japanese", ko: "Korean", "zh-CN": "Chinese",
  zh: "Chinese", es: "Spanish", fr: "French", de: "German", ru: "Russian",
  ms: "Malay", th: "Thai", vi: "Vietnamese", tl: "Filipino", hi: "Hindi",
  tr: "Turkish", pt: "Portuguese", it: "Italian", nl: "Dutch",
  uk: "Ukrainian", pl: "Polish", fa: "Persian", ur: "Urdu",
};

export function hyMtKey() {
  return getApiKey("siliconflow") || process.env.SILICONFLOW_API_KEY || "";
}

export function hasHyMtKey() {
  return !!hyMtKey();
}

export function hyMtModel() {
  return getApiKey("siliconflow_model") || process.env.SILICONFLOW_MODEL || HY_MODEL_DEFAULT;
}

export function hyMtLangName(code) {
  return LANG_EN_NAME[String(code || "").trim()] || null;
}

// ── PROTEKSI MARKUP (pola sama dengan i18n MyMemory engine) ──
// Box-drawing/kartu & bold wajib selamat round-trip model MT —
// mask pakai placeholder {Pn} sebelum kirim, restore setelahnya.
const PROTECT_RE = /(https?:\/\/\S+)|([\u256d\u2570\u2502\u2500\u300e\u300f\u221a\u25aa\u1bd3*`_]+)/g;

function maskLine(line) {
  const parts = [];
  const masked = String(line).replace(PROTECT_RE, (run, _u, _c, offset, full) => {
    const lg = offset > 0 && !/\s/.test(full[offset - 1]);
    const end = offset + run.length;
    const rg = end < full.length && !/\s/.test(full[end]);
    parts.push({ run, lg, rg });
    return "{P" + (parts.length - 1) + "}";
  });
  return { masked, parts };
}

function unmaskLine(text, parts) {
  return String(text).replace(/(\s*)\{\s*P(\d+)\s*\}(\s*)/g, (m, ls, numStr, rs) => {
    const p = parts[parseInt(numStr, 10)];
    if (!p) return m;
    return (p.lg ? "" : ls) + p.run + (p.rg ? "" : rs);
  });
}

function lineNeedsApi(line) {
  return /[a-zA-Z\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(line);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── satu request chat-completions ke SiliconFlow ──
async function hymtOnce(prompt) {
  const key = hyMtKey();
  if (!key) return null;
  const body = JSON.stringify({
    model: hyMtModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    top_p: 0.6,
    top_k: 20,
    max_tokens: 4096,
    stream: false,
  });
  const res = await fetch(SF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body,
    signal: AbortSignal.timeout(HY_TIMEOUT),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const out = data?.choices?.[0]?.message?.content;
  return typeof out === "string" && out.trim() ? out.trim() : null;
}

// parse jawaban numbered lines: "3| foo" → {3: "foo"}
function parseNumbered(text) {
  const map = {};
  for (const ln of String(text).split("\n")) {
    const m = ln.match(/^\s*(\d+)\s*\|\s?(.*)$/);
    if (m) map[parseInt(m[1], 10)] = m[2];
  }
  return map;
}

/**
 * Translate teks multi-baris pakai Hunyuan-MT via SiliconFlow.
 * Baris dikirim bernomor ("1| teks") supaya alignment terjaga —
 * baris yang parse-nya gak ketemu tetap pakai teks asli (gak rusak kartu).
 * Returns teks hasil atau null (gagal / tanpa key).
 */
export async function translateTextHYMT(text, targetLang, sourceLang = "id") {
  if (!hasHyMtKey()) return null;
  const langName = hyMtLangName(targetLang);
  if (!langName || targetLang === sourceLang) return null;

  const lines = String(text).split("\n");
  const masked = {};
  const idxNeed = [];
  lines.forEach((ln, i) => {
    if (lineNeedsApi(ln)) {
      masked[i] = maskLine(ln);
      idxNeed.push(i);
    }
  });
  if (!idxNeed.length) return null;

  // batching
  const batches = [];
  let cur = [], curLen = 0, curLines = 0;
  for (const i of idxNeed) {
    const need = masked[i].masked.length;
    if ((curLen + need > HY_BATCH_CHARS || curLines >= HY_BATCH_LINES) && cur.length) {
      batches.push(cur); cur = []; curLen = 0; curLines = 0;
    }
    cur.push(i); curLen += need; curLines++;
  }
  if (cur.length) batches.push(cur);

  let changed = false;
  for (const batch of batches) {
    const numbered = batch.map((i, j) => `${j + 1}| ${masked[i].masked}`).join("\n");
    const prompt =
      `Translate the following numbered lines into ${langName}, without additional explanation. ` +
      `Keep the line numbers exactly as "N| " at the start of each line, one output line per input line. ` +
      `Keep every {Pn} placeholder exactly as-is without translating or removing it.\n\n${numbered}`;
    let out = await hymtOnce(prompt);
    if (!out) { await sleep(500); out = await hymtOnce(prompt); } // retry 1x
    if (out) {
      const map = parseNumbered(out);
      batch.forEach((lineIdx, j) => {
        const got = map[j + 1];
        if (typeof got === "string" && got.trim()) {
          lines[lineIdx] = unmaskLine(got.trim(), masked[lineIdx].parts);
          changed = true;
        }
      });
    }
    await sleep(HY_DELAY);
  }
  return changed ? lines.join("\n") : null;
}

// seam test
export function __resetHyMtForTest() {
  // tanpa state lokal — key dibaca via getApiKey tiap call
}
