// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-kyio.js — KyioAPI (api.kyio.web.id) engine: 330 endpoint v2.
// Kategori: AI 69 · Downloader 50 · Tools 72 · Search 49 · Image 9 · News 12 ·
// Islamic 6 · Maker 9 · Fun 7 · Games 5 · Information 17 · Movie & Anime 21 · TTS 4.
// FREE TIER TANPA KEY (10 RPM). Key OPSIONAL: .setkey kyio <api_key> → 120 RPM +
// endpoint premium (tanpa key premium dibatasi 3x percobaan → 403 IP_NOT_WHITELISTED).
// Arsitektur: engine ini NUMPANG; TABEL per kategori ada di file plugin masing-masing
// (plugins/*/kyio*.js) biar gampang diedit satu-satu per kategori.
import axios from "axios";
import { getApiKey } from "./nova-api-keys.js";
import { uploadImage } from "./nova-uploader.js";

const KYIO_BASE = "https://api.kyio.web.id";
const KYIO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MEDIA_RE = /\.(mp4|mp3|m4a|opus|ogg|wav|webm|3gp|jpg|jpeg|png|webp|gif)(?:[?#]|$)/i;

// ── SEAM TEST ─────────────────────────────────────────────
let _http = null; // async (method, path, params) => {status, headers, data}
let _upload = null; // async (buffer) => url
let _mediaHttp = null; // async (url) => {status, headers, data}

export function _setKyioHttpForTest(fn) { _http = fn; }
export function _setKyioUploadForTest(fn) { _upload = fn; }
export function _setKyioMediaHttpForTest(fn) { _mediaHttp = fn; }
export function _resetKyioSeamsForTest() { _http = null; _upload = null; _mediaHttp = null; }

function uploadSeam(buffer) { return (_upload || uploadImage)(buffer); }

export function getKyioApiKey() {
  try { return getApiKey("kyio") || ""; } catch { return ""; }
}

// ── HTTP DASAR ─────────────────────────────────────────────
async function rawRequest(method, path, params, timeoutMs) {
  if (_http) return _http(method, path, params);
  const key = getKyioApiKey();
  const headers = { "User-Agent": KYIO_UA };
  if (key) headers["x-api-key"] = key;
  const url = `${KYIO_BASE}${path.startsWith("/") ? path : "/" + path}`;
  if ((method || "GET").toUpperCase() === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const res = await axios.post(url, new URLSearchParams(params || {}).toString(), {
      headers, timeout: timeoutMs || 60000, responseType: "arraybuffer", validateStatus: () => true,
    });
    return { status: res.status, headers: res.headers, data: res.data };
  }
  const res = await axios.get(url, {
    headers, params: params || {}, timeout: timeoutMs || 60000, responseType: "arraybuffer", validateStatus: () => true,
  });
  return { status: res.status, headers: res.headers, data: res.data };
}

async function rawFetchUrl(url) {
  if (_mediaHttp) return _mediaHttp(url);
  const res = await axios.get(url, {
    headers: { "User-Agent": KYIO_UA }, timeout: 120000, responseType: "arraybuffer", validateStatus: () => true,
  });
  return { status: res.status, headers: res.headers, data: res.data };
}

// ── PESAN ERROR MANUSIAWI ──────────────────────────────────
export function kyioHumanizeError(status, json) {
  const msg = json?.error?.message || json?.message || "";
  if (status === 403) {
    if (/whitelist|premium/i.test(msg)) {
      return "🔒 Endpoint PREMIUM Kyio — batas 3x percobaan gratis udah habis. Aktifkan key `.setkey kyio <api_key>` (plan berbayar mulai Rp 5.000/bln) atau whitelist IP di api.kyio.web.id/pricing.";
    }
    return `🔒 Ditolak Kyio: ${msg || "akses ditolak"}`;
  }
  if (status === 429) return "⏳ Rate limit Kyio kena (free tier 10 permintaan/menit). Tunggu sebentar lalu coba lagi ya.";
  if (status === 400) return `⚠️ ${msg || "parameter kurang atau gak valid — cek cara pakai command."}`;
  if (status === 404) return "❌ Endpoint gak ketemu — mungkin udah dipindah Kyio.";
  if (status >= 500) return `❌ Server Kyio error (${status}). Upstream-nya lagi bermasalah — coba lagi nanti.`;
  return `❌ Gagal (${status}): ${msg || "kesalahan tak dikenal"}`;
}

// ── RENDER GENERIK (key: value, rekursif, rapi, cap) ───────
export function kyioRenderValue(value, depth = 0, lines = []) {
  const pad = "  ".repeat(Math.min(depth, 4));
  if (value === null || value === undefined) return lines;
  if (typeof value === "string") {
    const t = value.length > 400 ? value.slice(0, 400) + "…" : value;
    lines.push(t);
    return lines;
  }
  if (typeof value === "number" || typeof value === "boolean") { lines.push(String(value)); return lines; }
  if (Array.isArray(value)) {
    value.slice(0, 12).forEach((item, i) => {
      if (item && typeof item === "object") {
        lines.push(`${pad}${i + 1}.`);
        kyioRenderValue(item, depth + 1, lines);
      } else {
        lines.push(`${pad}${i + 1}. ${String(item).slice(0, 300)}`);
      }
    });
    if (value.length > 12) lines.push(`${pad}… +${value.length - 12} lainnya`);
    return lines;
  }
  for (const [k, v] of Object.entries(value)) {
    const label = k.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (v && typeof v === "object") {
      lines.push(`${pad}▸ ${label}:`);
      kyioRenderValue(v, depth + 1, lines);
    } else if (typeof v === "string" && v.length > 500) {
      lines.push(`${pad}▸ ${label}:`);
      lines.push(`${pad}  ${v.slice(0, 400)}…`);
    } else {
      lines.push(`${pad}▸ ${label}: ${String(v).slice(0, 300)}`);
    }
  }
  return lines;
}

export function kyioRenderResult(data, cap = 3000) {
  const r = data?.result !== undefined ? data.result : data;
  // Field jawaban utama biasa dipakai endpoint AI — tampilkan langsung.
  if (r && typeof r === "object" && !Array.isArray(r)) {
    const primary = r.answer ?? (typeof r.result === "string" ? r.result : undefined) ?? (typeof r.data === "string" ? r.data : undefined) ?? (typeof r.message === "string" ? r.message : undefined);
    if (primary) {
      let out = String(primary);
      if (r.reasoning && typeof r.reasoning === "string" && r.reasoning.length < 600) out += `\n\n🧠 ${r.reasoning.slice(0, 500)}`;
      return out.slice(0, cap);
    }
  }
  if (typeof r === "string") return r.slice(0, cap);
  const lines = kyioRenderValue(r, 0, []);
  return lines.join("\n").slice(0, cap) || "⚠️ Respon kosong dari Kyio.";
}

// ── CARI URL MEDIA DI DALAM JSON ───────────────────────────
export function kyioFindMediaUrl(value, depth = 0) {
  if (!value || depth > 5) return null;
  if (typeof value === "string") return MEDIA_RE.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = kyioFindMediaUrl(item, depth + 1); if (found) return found; }
    return null;
  }
  if (typeof value === "object") {
    // Prioritas: video → audio → gambar
    const pools = [
      k => /\.(mp4|webm|3gp)(?:[?#]|$)/i.test(String(value[k] || "")),
      k => /\.(mp3|m4a|opus|ogg|wav)(?:[?#]|$)/i.test(String(value[k] || "")),
    ];
    for (const match of pools) {
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === "string" && match(k)) return v;
      }
    }
    for (const [k, v] of Object.entries(value)) {
      if (/no ?wm|download|media|video|audio|image|thumb|url|link|gambar|foto/i.test(k)) {
        const found = kyioFindMediaUrl(v, depth + 1);
        if (found) return found;
      }
    }
    for (const v of Object.values(value)) {
      const found = kyioFindMediaUrl(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function mimeToKind(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return null;
}

async function sendBuffer(sock, m, buffer, mime, caption) {
  const kind = mimeToKind(mime);
  if (kind === "image") return sock.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
  if (kind === "audio") return sock.sendMessage(m.chat, { audio: buffer, mimetype: mime, ptt: false }, { quoted: m });
  if (kind === "video") return sock.sendMessage(m.chat, { video: buffer, caption }, { quoted: m });
  return sock.sendMessage(m.chat, { document: buffer, mimetype: mime || "application/octet-stream", fileName: "kyio-file" }, { quoted: m });
}

async function trySendMediaUrl(sock, m, url, caption, claraWrap) {
  try {
    const { status, headers, data } = await rawFetchUrl(url);
    if (status === 200 && data && data.byteLength > 512) {
      await sendBuffer(sock, m, Buffer.from(data), String(headers?.["content-type"] || ""), caption);
      return true;
    }
  } catch { /* fallback di bawah */ }
  await sock.sendMessage(m.chat, { text: `${caption ? caption + "\n\n" : ""}🔗 ${url}` }, { quoted: m });
  return false;
}

// ── PARSE PARAM DARI PESAN ─────────────────────────────────
async function buildParams(m, entry, claraWrap) {
  const argsText = typeof m.text === "string" && m.text.trim() ? m.text.trim() : (m.args || []).join(" ").trim();
  const spec = entry.param || "q";
  if (spec === "none") return { ok: true, params: {} };
  if (spec === "voice-text") {
    if (!argsText) return { ok: false, err: panduan(entry, claraWrap) };
    if (argsText.includes("|")) {
      const i = argsText.indexOf("|");
      const voice = argsText.slice(0, i).trim();
      const text = argsText.slice(i + 1).trim();
      if (!text) return { ok: false, err: panduan(entry, claraWrap) };
      return { ok: true, params: { voice, text } };
    }
    return { ok: true, params: { text: argsText } };
  }
  if (spec === "url" && !argsText) {
    // Reply foto → upload jadi URL → pakai sebagai param url
    const q = m.quoted;
    if (q && (q.mtype === "imageMessage" || q.image || q.isImage)) {
      try {
        const raw = await q.download();
        const url = await uploadSeam(Buffer.from(raw));
        return { ok: true, params: { url } };
      } catch { /* lempar ke panduan */ }
    }
  }
  if (!argsText) return { ok: false, err: panduan(entry, claraWrap) };
  return { ok: true, params: { [spec]: argsText } };
}

function panduan(entry, claraWrap) {
  const label = entry.hint || `.${entry.cmd} <${entry.param && entry.param !== "none" ? entry.param : "teks"}>`;
  return claraWrap("Kyio API", `Cara pakai:\n${label}${entry.note ? `\n\n${entry.note}` : ""}`);
}

// ── RUNNER TABEL (dipanggil tiap plugin kategori) ──────────
export async function runKyioTable(m, sock, table, opts = {}) {
  const claraWrap = opts.claraWrap || (await import("./nova-menu-style.js")).claraWrap;
  const cmd = String(m.command || "").toLowerCase();
  const entry = table.find(e => e.cmd === cmd || (e.aliases || []).includes(cmd));
  if (!entry) return false;

  const built = await buildParams(m, entry, claraWrap);
  if (!built.ok) { await m.reply(built.err); return true; }

  let status = 0, headers = {}, data = null;
  try {
    ({ status, headers, data } = await rawRequest(entry.method || "GET", entry.path, built.params, entry.timeout));
  } catch (e) {
    await m.reply(claraWrap("Kyio API", `❌ Gagal nyambung ke Kyio: ${e.message || e}`));
    return true;
  }

  const ct = String(headers?.["content-type"] || "");
  const title = `${opts.title || "Kyio API"} · ${entry.label || entry.cmd}`;

  // Respon binary langsung (gambar/audio/video dari endpoint media)
  if (!ct.includes("json") && data && data.byteLength > 512) {
    const kind = mimeToKind(ct);
    if (kind) {
      try {
        await sendBuffer(sock, m, Buffer.from(data), ct, entry.caption || "");
        return true;
      } catch { /* jatuh ke error */ }
    }
    // binary gak dikenal → document
    try {
      await sock.sendMessage(m.chat, { document: Buffer.from(data), mimetype: ct || "application/octet-stream", fileName: `kyio-${entry.cmd}` }, { quoted: m });
      return true;
    } catch { /* lanjut */ }
  }

  // Respon JSON
  let json = null;
  try {
    const txt = Buffer.from(data || "").toString("utf-8");
    json = JSON.parse(txt);
  } catch { /* bukan JSON */ }

  if (!json) {
    await m.reply(claraWrap(opts.title || "Kyio API", status >= 400 ? kyioHumanizeError(status) : `⚠️ Respon gak dikenal dari Kyio (${status}).`));
    return true;
  }

  if (json?.error || status >= 400) {
    await m.reply(claraWrap(opts.title || "Kyio API", kyioHumanizeError(status, json)));
    return true;
  }

  const payload = json?.status !== undefined ? json : { status: true, result: json };

  // Media URL terkandung di JSON → kirim file-nya
  const mediaUrl = kyioFindMediaUrl(payload.result ?? payload);
  if (mediaUrl) {
    const teks = kyioRenderResult(payload, 1200);
    await trySendMediaUrl(sock, m, mediaUrl, teks.length > 60 ? teks : entry.caption || "", claraWrap);
    return true;
  }

  const teks = kyioRenderResult(payload);
  await m.reply(claraWrap(opts.title || "Kyio API", teks));
  return true;
}
