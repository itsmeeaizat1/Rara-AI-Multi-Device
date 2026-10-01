// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .tmpfilesorg — upload media ke tmpfiles.org (temporary file hosting, auto-hapus).
// API publik gratis tanpa akun: POST https://tmpfiles.org/api/v1/upload (multipart).
// Expire 60–172800 detik (1 menit–48 jam), default 1 jam. Max 100 MB per file.
// Alias pendek .tmporg. NB: alias .tmpfiles MILIK fileio.js (file.io) — jangan dipakai di sini.
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const TMPFILES_API = "https://tmpfiles.org/api/v1/upload";
const TMPFILES_MAX_BYTES = 104857600; // 100 MB (batas server)
const TMPFILES_MIN_EXPIRE = 60; // 1 menit
const TMPFILES_MAX_EXPIRE = 172800; // 48 jam

// parsing durasi expire: "30" (menit), "30s", "10m", "2h", "1d", "48h", "7200s" → detik
// return null kalau gak valid; hasil di-clamp ke rentang server
export function parseExpireSec(arg) {
  const m = /^(\d{1,6})(s|m|h|d|menit|jam|hari)?$/i.exec(String(arg || "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] || "m").toLowerCase();
  const mult = unit === "s" ? 1 : unit === "h" || unit === "jam" ? 3600 : unit === "d" || unit === "hari" ? 86400 : 60;
  const sec = n * mult;
  return Math.min(TMPFILES_MAX_EXPIRE, Math.max(TMPFILES_MIN_EXPIRE, sec));
}

function formatExpiryWib(sec) {
  const t = new Date(Date.now() + sec * 1000);
  const fmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return fmt.format(t) + " WIB";
}

function formatSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

function getMediaTarget(m) {
  const quoted = m.quoted;
  const ownType = String(m.mtype || m.type || "");
  const quotedType = String(quoted?.mtype || quoted?.type || "");
  const mediaPattern = /(?:image|video|audio|document|sticker)Message/i;
  if (mediaPattern.test(ownType) && typeof m.download === "function") return m;
  if (mediaPattern.test(quotedType) && typeof quoted?.download === "function") return quoted;
  return null;
}

function mediaFilename(target) {
  const name = target?.fileName || target?.msg?.fileName || target?.message?.documentMessage?.fileName;
  if (name) return String(name).replace(/[\\/\0]/g, "_").slice(0, 180) || "file";
  const mime = String(target?.mimetype || target?.msg?.mimetype || "application/octet-stream").split(";")[0];
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "audio/mpeg": "mp3", "audio/ogg": "ogg" }[mime] || "bin";
  return `rara-upload.${ext}`;
}

// seam untuk e2e: override fetch seluruhnya
let _http = null;
export function _setTmpfilesHttpForTest(fn) { _http = fn; }

// upload ke tmpfiles.org → { url, expireSec }
export async function uploadToTmpfiles(buffer, filename, mime, expireSec) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime || "application/octet-stream" }), filename);
  if (expireSec) form.append("expire", String(expireSec));
  const doFetch = _http || ((u, o) => fetch(u, o));
  const res = await doFetch(TMPFILES_API, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120000),
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" },
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || data?.status !== "success" || !data?.data?.url) {
    throw new Error(`tmpfiles.org HTTP ${res?.status}: ${data?.data?.message || data?.message || "respons tidak valid"}`);
  }
  return { url: data.data.url, expireSec: expireSec || 3600 };
}

// ambil link download langsung dari halaman share (pola href="/dl/<token>/<id>/<nama>")
export async function extractDirectLink(shareUrl) {
  const doFetch = _http || ((u, o) => fetch(u, o));
  const res = await doFetch(shareUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m = /href="(https:\/\/tmpfiles\.org\/dl\/[^"]+)"/.exec(html);
  return m ? m[1] : null;
}

const pluginConfig = {
  name: "tmpfilesorg",
  alias: ["tmpfilesorg"],
  aliases: ["tmpfilesorg", "tmporg", "tempfiles"],
  category: "convert",
  description: "Upload media sementara ke tmpfiles.org — link share otomatis terhapus (default 1 jam)",
  usage: ".tmpfilesorg [durasi] (reply/kirim media)",
  example: ".tmpfilesorg · .tmpfilesorg 10m · .tmpfilesorg 2h · .tmpfilesorg 1d",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m) {
  const args = m.args || [];

  const target = getMediaTarget(m);
  if (!target) {
    return m.reply(raraWrap("tmpfiles.org", `Reply atau kirim media${args.length ? "" : " dengan caption " + m.prefix + "tmpfilesorg"} untuk dapat link sementara.\n\nDurasi opsional: angka = menit, atau pakai satuan s/m/h/d (1 menit sampai 48 jam, default 1 jam).\nContoh: ${m.prefix}tmpfilesorg 10m — terhapus dalam 10 menit.`, "guide"));
  }

  try {
    await m.react("🕒");
    const buffer = await target.download();
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("media kosong");
    if (buffer.length > TMPFILES_MAX_BYTES) {
      await m.react("❌");
      return m.reply(raraWrap("tmpfiles.org", `Ukuran file ${formatSize(buffer.length)} melebihi batas server 100 MB. Kompres dulu atau pakai ${m.prefix}tourl.`, "error"));
    }
    const mime = String(target.mimetype || target.msg?.mimetype || "application/octet-stream").split(";")[0];
    const filename = mediaFilename(target);
    const expireSec = args.length ? (parseExpireSec(args[0]) ?? 3600) : 3600;
    const up = await uploadToTmpfiles(buffer, filename, mime, expireSec);
    // link download langsung (halaman share embed /dl/<token>/...) — gagal ambil = senyap skip
    let directLink = null;
    try { directLink = await extractDirectLink(up.url); } catch { directLink = null; }
    await m.react("🐣");
    const lines = [
      "File berhasil di-upload.",
      `Nama: ${filename}`,
      `Ukuran: ${formatSize(buffer.length)}`,
      `Link share: ${up.url}`,
    ];
    if (directLink) lines.push(`Download langsung: ${directLink}`);
    lines.push(`Terhapus otomatis: ${formatExpiryWib(up.expireSec)}`);
    return m.reply(raraWrap("tmpfiles.org", lines.join("\n"), "success"));
  } catch (e) {
    console.error("tmpfilesorg error:", e?.message || e);
    await m.react("❌");
    return m.reply(raraWrap("tmpfiles.org", `Upload gagal: ${String(e?.message || e).slice(0, 180)}`, "error"));
  }
}

export { pluginConfig as config, handler };
