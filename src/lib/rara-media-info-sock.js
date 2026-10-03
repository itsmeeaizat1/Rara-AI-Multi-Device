// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-media-info-sock.js — KARTU FIELD OTOMATIS untuk SEMUA fitur yang mengirim media
// (3 Okt 2026, owner: "semua fitur memiliki field lengkapnya jadi seperti bot masa depan").
//
// Pola sama seperti rara-i18n-sock.js: pembungkus PER-EKSEKUSI command (dipasang di src/handler.js
// tepat di samping makeLangAwareSock). Hanya media yang dikirim OLEH COMMAND PLUGIN yang terkena —
// pesan internal / broadcast / status / notifikasi bot TIDAK lewat sini.
//
// Setelah media BERHASIL terkirim, bot membaca buffer/URL media yang sama untuk field NYATA:
//   jenis, format, ukuran, dimensi (gambar), durasi (audio/video), tanggal server (URL).
// Field yang tak diketahui dilewati (tidak pernah diisi tebakan). Kartu opsional: error apa pun
// di sini DIABAIKAN, media asli tetap terkirim apa adanya.
//
// SAKLAR: env RARA_MEDIA_INFO=off mematikan. Kategori sensitif di-skip (SKIP_CATEGORIES).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { probeMedia, mediaResultCard, detectFormat } from "./rara-media-result.js";

const execFileP = promisify(execFile);

// Kategori yang TIDAK diberi kartu otomatis: konten sensitif / admin / sistem.
export const SKIP_CATEGORIES = new Set(["nsfw", "owner", "ai-agent", "panel", "sewa-premium", "jpm", "store"]);
const MEDIA_KEYS = ["image", "video", "audio", "document", "sticker"];
const MAX_PROBE_BYTES = 60 * 1024 * 1024; // di atas ini jangan ffprobe/baca (hemat RAM/CPU)
const sleepTimeout = (ms) => new Promise((r) => setTimeout(() => r(null), ms));

export function isEnabled(env = process.env) {
  return String(env.RARA_MEDIA_INFO || "on").toLowerCase() !== "off";
}

// Plugin ini sudah menampilkan kartu field sendiri -> jangan dobel.
export function looksLikeOwnCard(text) {
  const t = String(text || "");
  return t.includes("「 ✦") || (/^\s*•\s*\S+\s*:\s/m.test(t) && /Ukuran|Format|Durasi/i.test(t));
}

// Teks balasan (m.reply) yang sudah berupa kartu ber-field: ada judul 「 ✦ ATAU >=2 baris berlabel field media.
export function replyLooksLikeFieldCard(text) {
  const t = String(text || "");
  if (t.includes("「 ✦") && /(Ukuran|Size|Durasi|Duration|Format|Resolusi|Kualitas|Quality|Bitrate)\s*[:：]/i.test(t)) return true;
  const labelled = t.split("\n").filter((l) => /^\s*[•▪▫\-*]?\s*(Ukuran|Size|Durasi|Duration|Format|Resolusi|Kualitas|Quality|Bitrate|Dimensi)\s*[:：]/i.test(l));
  return labelled.length >= 2;
}

export function pickMedia(content) {
  if (!content || typeof content !== "object") return null;
  for (const k of MEDIA_KEYS) {
    if (content[k] !== undefined && content[k] !== null) return { kind: k, src: content[k] };
  }
  return null;
}

// dimensi PNG/JPEG/GIF/WEBP dari header buffer (tanpa dependensi). Tidak dikenal -> null.
export function imageSize(buf) {
  try {
    if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; // PNG
    if (buf.toString("ascii", 0, 3) === "GIF") return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const t = buf.toString("ascii", 12, 16);
      if (t === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (t === "VP8L") { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
      if (t === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) { // JPEG: cari marker SOF
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const mk = buf[i + 1];
        if (mk >= 0xc0 && mk <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(mk)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch { /* dimensi opsional */ }
  return null;
}

// format dari magic bytes buffer (NYATA dari isi file, bukan dari nama). Tidak dikenal -> "".
export function sniffFormat(buf) {
  try {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return "";
    const a = (s, e) => buf.toString("ascii", s, e);
    if (buf[0] === 0x89 && a(1, 4) === "PNG") return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
    if (a(0, 3) === "GIF") return "image/gif";
    if (a(0, 4) === "RIFF" && a(8, 12) === "WEBP") return "image/webp";
    if (a(0, 4) === "RIFF" && a(8, 12) === "WAVE") return "audio/wav";
    if (a(4, 8) === "ftyp") return /^(M4A|M4B)/.test(a(8, 11)) ? "audio/mp4" : a(8, 12).startsWith("qt") ? "video/quicktime" : "video/mp4";
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
    if (a(0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return "audio/mpeg";
    if (a(0, 4) === "OggS") return "audio/ogg";
    if (a(0, 4) === "fLaC") return "audio/flac";
    if (a(0, 4) === "%PDF") return "application/pdf";
    if (a(0, 2) === "PK") return "application/zip";
  } catch { /* opsional */ }
  return "";
}

// durasi/bitrate/dimensi video lewat ffprobe dari buffer (file sementara). Gagal -> {}.
export async function probeBuffer(buf, { execFn = execFileP, timeoutMs = 8000 } = {}) {
  let tmp = null;
  try {
    if (!Buffer.isBuffer(buf) || buf.length === 0 || buf.length > MAX_PROBE_BYTES) return {};
    tmp = path.join(os.tmpdir(), `rara-mi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.writeFileSync(tmp, buf);
    const run = execFn("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", tmp], { timeout: timeoutMs });
    const r = await Promise.race([run, sleepTimeout(timeoutMs + 500)]);
    if (!r || !r.stdout) return {};
    const j = JSON.parse(r.stdout);
    const vs = (j.streams || []).find((s) => s.codec_type === "video");
    const as = (j.streams || []).find((s) => s.codec_type === "audio");
    const out = {};
    const dur = Number(j.format && j.format.duration);
    if (Number.isFinite(dur) && dur > 0) out.duration = dur;
    const br = Number(j.format && j.format.bit_rate);
    if (as && !vs && Number.isFinite(br) && br > 0) out.bitrate = Math.round(br / 1000);
    if (vs && Number(vs.width) > 0 && Number(vs.height) > 0) { out.width = Number(vs.width); out.height = Number(vs.height); }
    return out;
  } catch { return {}; }
  finally { try { if (tmp) fs.unlinkSync(tmp); } catch { /* skip */ } }
}

// Kumpulkan field NYATA dari satu media. Tidak pernah throw.
export async function collectMediaFacts({ kind, src }, deps = {}) {
  const probeUrl = deps.probeMedia || probeMedia;
  const probeBuf = deps.probeBuffer || probeBuffer;
  const facts = {};
  try {
    let buf = null, url = null;
    if (Buffer.isBuffer(src)) buf = src;
    else if (src && typeof src === "object" && Buffer.isBuffer(src.url)) buf = src.url;
    else if (src && typeof src === "object" && typeof src.url === "string") url = src.url;
    else if (typeof src === "string" && /^https?:\/\//i.test(src)) url = src;

    if (buf) {
      facts.size = buf.length;
      const sn = sniffFormat(buf);
      if (sn) facts.mime = sn;
      const dim = imageSize(buf);
      if (dim && dim.width > 0 && dim.height > 0) Object.assign(facts, dim);
      if (kind === "video" || kind === "audio" || (kind === "document" && !dim)) Object.assign(facts, await probeBuf(buf));
    } else if (url) {
      Object.assign(facts, await probeUrl(url));
      facts.url = url;
    }
  } catch { /* fakta opsional */ }
  return facts;
}

const KIND_TYPE = { image: "foto", video: "video", audio: "audio", sticker: "foto", document: "" };

export function buildCardFor({ kind, content, facts, header, platform, request }) {
  const mime = (content.mimetype && !/octet-stream/i.test(content.mimetype) ? content.mimetype : "") || facts.mime || "";
  const det = detectFormat({ mime, ext: content.fileName ? String(content.fileName).split(".").pop() : "", url: facts.url || "" });
  let type = KIND_TYPE[kind] || det.type || "";
  if (kind === "document" && det.type) type = det.type;
  if (content.gifPlayback) type = "gif";
  if (kind === "audio" && content.ptt) type = "audio";
  return mediaResultCard({
    header,
    title: content.fileName ? String(content.fileName).replace(/\.[^.]+$/, "") : "",
    type,
    mime,
    size: facts.size,
    duration: facts.duration,
    bitrate: facts.bitrate,
    width: facts.width,
    height: facts.height,
    lastModified: facts.lastModified,
    url: facts.url,
    platform,
    request,
  });
}

/**
 * @param sock   sock dasar
 * @param ctx    { command, category, header, chat } dari plugin yang sedang dieksekusi
 * @param deps   seam uji
 */
// Perintah yang menerima RAHASIA (kunci/token/kuki): input TIDAK pernah dipantulkan ke chat.
const SECRET_CMD = /(^|[^a-z])(setkey|apikey|token|cookie|cookies|password|passwd|login|secret|session|auth|pair|jadibot|9router|ytcookies)/i;
// Nilai yang terlihat seperti rahasia -> disamarkan.
export function maskSecrets(text) {
  return String(text == null ? "" : text)
    .replace(/\b(sk|pk|rk|AIza|ghp|gho|xox[bap]|AKIA|eyJ)[A-Za-z0-9_\-\.]{12,}/g, "[disamarkan]")
    .replace(/\b[A-Za-z0-9_\-]{32,}\b/g, "[disamarkan]")
    .replace(/([?&](?:key|token|apikey|api_key|secret|password|sig|signature|auth|access_token)=)[^&\s]+/gi, "$1[disamarkan]")
    .replace(/\b(\d[\d\- ]{11,}\d)\b/g, (m0) => (m0.replace(/\D/g, "").length >= 13 ? "[disamarkan]" : m0));
}

// Data PERMINTAAN pengguna yang nyata: perintah + teks/argumen yang diketik (dipotong) + bahasa model bila ada di ctx.
export function buildRequestFields(ctx = {}) {
  const out = [];
  const clip = (v, n = 80) => { const x = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); return x.length > n ? x.slice(0, n - 3) + "..." : x; };
  if (ctx.command) out.push(["Perintah", "." + clip(ctx.command, 30).replace(/^\./, "")]);
  const secretCmd = SECRET_CMD.test(String(ctx.command || "")) || SECRET_CMD.test(String(ctx.header || ""));
  const q = secretCmd ? "" : clip(maskSecrets(ctx.input));
  if (q) out.push(["Input", q]);
  if (ctx.quotedKind) out.push(["Dari", "balasan " + clip(ctx.quotedKind, 20)]);
  return out;
}

export function makeMediaInfoSock(sock, ctx = {}, deps = {}) {
  try {
    const env = deps.env || process.env;
    if (!sock || typeof sock.sendMessage !== "function") return sock;
    if (!isEnabled(env)) return sock;
    if (SKIP_CATEGORIES.has(String(ctx.category || "").toLowerCase())) return sock;

    const send = sock.sendMessage.bind(sock);
    const state = ctx.state || (ctx.state = { replyCard: false });
    // KEPUTUSAN DITUNDA sampai command selesai (flush): banyak plugin membalas kartu field lewat m.reply SESUDAH
    // mengirim media — kalau kartu otomatis langsung dikirim, hasilnya dobel. Media pertama dicatat di sini.
    const pending = { media: null, params: null, options: null, jid: null, done: false };

    const wrapped = async (jid, params = {}, options = {}) => {
      const result = await send(jid, params, options); // media ASLI dulu; error di sini DILEMPAR apa adanya
      try {
        if (pending.done || pending.media) return result;
        const media = pickMedia(params);
        if (!media) return result;
        if (jid !== ctx.chat) return result; // hanya balasan ke chat pemanggil (bukan broadcast/forward)
        if (looksLikeOwnCard(params.caption)) { pending.done = true; return result; } // plugin punya kartu sendiri di caption
        pending.media = media; pending.params = params; pending.options = options; pending.jid = jid;
      } catch { /* opsional */ }
      return result;
    };

    // Dipanggil handler SETELAH plugin.handler selesai. Tidak pernah throw. 1 kartu maksimal per command.
    ctx.flush = async () => {
      try {
        if (pending.done || !pending.media) return false;
        pending.done = true;
        if (state.replyCard) return false; // plugin sudah membalas kartu field via m.reply
        const facts = await collectMediaFacts(pending.media, deps);
        const card = buildCardFor({ kind: pending.media.kind, content: pending.params, facts, header: ctx.header || ctx.command, platform: "", request: buildRequestFields(ctx) });
        if (!card) return false;
        const q = pending.options && pending.options.quoted;
        await send(pending.jid, { text: card }, q ? { quoted: q } : {});
        return true;
      } catch { return false; }
    };

    const out = Object.create(sock);
    out.sendMessage = wrapped;
    return out;
  } catch {
    return sock;
  }
}

/**
 * Bungkus m.reply SATU eksekusi command: kalau plugin membalas dengan kartu ber-field, catat di ctx.state
 * agar kartu otomatis tidak dobel. Mengembalikan fungsi pelepas (restore). Tidak pernah throw.
 */
export function watchReplyCards(m, ctx) {
  try {
    if (!m || typeof m.reply !== "function" || !ctx) return () => {};
    const state = ctx.state || (ctx.state = { replyCard: false });
    const orig = m.reply;
    m.reply = async function (text, ...rest) {
      try { if (typeof text === "string" && replyLooksLikeFieldCard(text)) state.replyCard = true; } catch { /* skip */ }
      return orig.call(this, text, ...rest);
    };
    return () => { try { m.reply = orig; } catch { /* skip */ } };
  } catch { return () => {}; }
}

export default makeMediaInfoSock;
