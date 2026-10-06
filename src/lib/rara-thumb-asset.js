// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Resolver thumbnail ASSET bersama (kartu usage + kartu notif).
// Request owner 6 Okt 2026: thumbnail custom per KATEGORI + NAMA fitur,
// tipe GAMBAR (jpg/jpeg/png/webp) ATAU GIF/VIDEO (gif/mp4/webm) kayak
// .menu/.allmenu, dan bisa GANTI MODE (auto | image | video).
//
// Urutan cari (per mode):
//   <dir>/<kategori>/<nama>.<ext>  →  <dir>/<nama>.<ext>
//   →  <dir>/<kategori>/placeholder.<ext>  →  <dir>/placeholder.<ext>
// Mode:
//   auto  (default) : video/gif menang kalau ada, kalau gak ada pakai gambar
//   image           : gambar saja (gif/mp4 diabaikan)
//   video           : gif/mp4 saja (kalau gak ada → fallback gambar)
import fs from "fs";
import path from "path";
import { prepareWAMessageMedia } from "rara";

export const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
export const VIDEO_EXTS = [".mp4", ".gif", ".webm"];
export const THUMB_MODES = ["auto", "image", "video"];

const MODE_SETTING = {
  usage: "usageThumbMode",
  notif: "notifThumbMode",
};

export function isVideoPath(p) {
  return VIDEO_EXTS.includes(path.extname(String(p || "")).toLowerCase());
}

export function normalizeMode(raw) {
  const v = String(raw || "").toLowerCase().trim();
  if (["image", "gambar", "foto", "img", "picture", "v1", "1"].includes(v)) return "image";
  if (["video", "gif", "vid", "clip", "mp4", "v2", "2"].includes(v)) return "video";
  if (["auto", "otomatis", "default"].includes(v)) return "auto";
  return null;
}

// baca mode dari db setting ("usage" | "notif"); gagal baca → auto
export function getThumbMode(kind, dbGetter) {
  try {
    const key = MODE_SETTING[kind];
    if (!key) return "auto";
    const db = typeof dbGetter === "function" ? dbGetter() : null;
    const v = db && typeof db.setting === "function" ? db.setting(key) : null;
    return normalizeMode(v) || "auto";
  } catch {
    return "auto";
  }
}

function sanitize(s, re) {
  return String(s || "").toLowerCase().replace(re, "");
}

function extsFor(mode) {
  if (mode === "image") return IMAGE_EXTS;
  if (mode === "video") return VIDEO_EXTS;
  return [...VIDEO_EXTS, ...IMAGE_EXTS]; // auto: video/gif didahulukan
}

function firstExisting(base, exts) {
  for (const ext of exts) {
    const p = base + ext;
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

/**
 * Cari file thumbnail. Return { path, isVideo } atau null.
 * Nama file case-sensitive di Linux → nama fitur dipakai apa adanya (hanya
 * karakter aman), kategori lowercase.
 */
export function resolveThumbAsset({ dir, name, category, mode = "auto" }) {
  const n = String(name || "").replace(/[^a-zA-Z0-9-]/g, "");
  const c = sanitize(category, /[^a-z0-9-]/g);
  const tryModes = mode === "video" ? ["video", "image"] : mode === "image" ? ["image"] : ["auto"];

  for (const md of tryModes) {
    const exts = extsFor(md);
    const bases = [];
    if (n && c) bases.push(path.join(dir, c, n));
    if (n) bases.push(path.join(dir, n));
    if (c) bases.push(path.join(dir, c, "placeholder"));
    bases.push(path.join(dir, "placeholder"));
    for (const b of bases) {
      const hit = firstExisting(b, exts);
      if (hit) return { path: hit, isVideo: isVideoPath(hit) };
    }
  }
  return null;
}

const _bufCache = new Map();
export function readThumbBuffer(p) {
  try {
    const st = fs.statSync(p);
    const hit = _bufCache.get(p);
    if (hit && hit.mtimeMs === st.mtimeMs) return hit.buf;
    const buf = fs.readFileSync(p);
    _bufCache.set(p, { mtimeMs: st.mtimeMs, buf });
    return buf;
  } catch {
    return null;
  }
}

/**
 * Upload thumbnail ke server WA jadi header interactiveMessage.
 * Gambar → imageMessage, gif/mp4 → videoMessage + gifPlayback (persis menu).
 * Return objek header atau null kalau gagal (caller fallback polos).
 */
export async function buildThumbHeader(sock, asset) {
  if (!asset || !asset.path) return null;
  const buf = readThumbBuffer(asset.path);
  if (!buf) return null;
  const prep = await prepareWAMessageMedia(
    asset.isVideo ? { video: buf, gifPlayback: true } : { image: buf },
    { upload: sock.waUploadToServer }
  );
  if (asset.isVideo && prep && prep.videoMessage) {
    return { hasMediaAttachment: true, videoMessage: prep.videoMessage };
  }
  if (prep && prep.imageMessage) {
    return { hasMediaAttachment: true, imageMessage: prep.imageMessage };
  }
  return null;
}

// ── DETEKSI PESAN HELPER (request owner 6 Okt 2026: pesan helper juga
// pakai kartu thumbnail ala .menu + chip tag di bawah, thumbnail custom per
// kategori/nama fitur). Helper (raraError/raraEmpty/raraNoInput/raraNoQuoted/
// raraSuccess/raraGuide/raraSalah) TIDAK diubah outputnya (banyak kode lain
// pakai string-nya langsung) — m.reply mengenali POLA teks helper-nya:
//   「 ✦ NAMA ✦ 」 + baris status (❌ ⚠ ✅ 📝 💡), atau ❗ Cara pemakaian salah.
// Teks smallcaps/bukan, header diambil dari baris pertama.
const SC_MAP = { "ᴀ": "a", "ʙ": "b", "ᴄ": "c", "ᴅ": "d", "ᴇ": "e", "ꜰ": "f", "ɢ": "g", "ʜ": "h", "ɪ": "i", "ᴊ": "j", "ᴋ": "k", "ʟ": "l", "ᴍ": "m", "ɴ": "n", "ᴏ": "o", "ᴘ": "p", "ǫ": "q", "ʀ": "r", "ꜱ": "s", "ᴛ": "t", "ᴜ": "u", "ᴠ": "v", "ᴡ": "w", "ʏ": "y", "ᴢ": "z" };
function fromSC(str) {
  return String(str || "").replace(/[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ]/g, (c) => SC_MAP[c] || c);
}
const HEAD_RE = /^「 ✦ (.+?) ✦ 」\n([❌⚠✅📝💡])/u;
const SALAH_RE = /^❗ /u;

// → { name } kalau teks = pesan helper, null kalau bukan
export function detectHelper(text, fallbackName = "") {
  if (typeof text !== "string" || text.length > 1500) return null;
  const head = HEAD_RE.exec(text);
  if (head) {
    const name = fromSC(head[1]).toLowerCase().replace(/[^a-z0-9-]/g, "");
    return { name: name || String(fallbackName || "").toLowerCase() };
  }
  if (SALAH_RE.test(text) && /cara pemakaian salah|ᴄᴀʀᴀ ᴘᴇᴍᴀᴋᴀɪᴀɴ ꜱᴀʟᴀʜ/i.test(text.split("\n")[0])) {
    return { name: String(fallbackName || "").toLowerCase().replace(/[^a-z0-9-]/g, "") };
  }
  return null;
}
