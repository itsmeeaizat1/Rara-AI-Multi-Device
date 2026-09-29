// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .vexfile — upload file ke vexfile.com (file host PPD, file tersimpan permanen di akun owner,
// link share https://vexfile.com/download/XXXX). API vexfile = REMOTE upload: bot staging file
// ke tmpfiles.org dulu → kirim URL-nya → vexfile nyedot → link permanen.
// Format arsip/APK/ISO/dst aja (43 format) — format lain otomatis dibungkus .zip.
// Key: .setkey vexfile <key> — OWNER-ONLY (file masuk akun vexfile owner, PPD = duit owner).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  getVexfileToken, stageToTmpfiles, vexfileRemoteUpload, vexZipWrap,
  isVexAllowedFormat, STAGING_MAX_BYTES,
} from "../../src/lib/nova-vexfile.js";

const pluginConfig = {
  name: "vexfile",
  alias: ["vexfile"],
  aliases: ["vexfile", "vexfiles", "vex", "vexupload"],
  category: "convert",
  description: "Upload file ke vexfile.com (permanen, bayar per download) — arsip/APK/ISO, format lain dibungkus .zip otomatis",
  usage: ".vexfile (reply/kirim file)",
  example: ".vexfile — reply file .zip/.apk/.obb/.rar",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

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
  return `nova-upload.${ext}`;
}

function formatSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

async function handler(m) {
  const token = getVexfileToken();
  if (!token) {
    return m.reply(claraWrap("vexfile", `API key belum diset.\nOwner ketik: ${m.prefix}setkey vexfile <api-key>\nAmbil key dari dashboard akun vexfile.com kamu.`, "guide"));
  }

  const target = getMediaTarget(m);
  if (!target) {
    return m.reply(claraWrap("vexfile", `Reply atau kirim file dengan caption ${m.prefix}vexfile.\n\nDiterima: arsip/paket game (zip, rar, 7z, apk, xapk, obb, aab, iso, jar, pak, dll) sampai 100 MB.\nFormat lain (foto, mp4, pdf, dokumen) otomatis dibungkus .zip.\nFile tersimpan permanen di akun vexfile.com kamu — tiap download dapat poin PPD.`, "guide"));
  }

  try {
    await m.react("🕒");
    let buffer = await target.download();
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("media kosong");
    if (buffer.length > STAGING_MAX_BYTES) {
      await m.react("❌");
      return m.reply(claraWrap("vexfile", `Ukuran file ${formatSize(buffer.length)} melebihi 100 MB (batas staging). VexFile sendiri menerima 5 GB, tapi jalur bot lewat relay sementara yang dibatasi 100 MB.`, "error"));
    }
    let filename = mediaFilename(target);
    const mime = String(target.mimetype || target.msg?.mimetype || "application/octet-stream").split(";")[0];
    let wrapped = false;
    if (!isVexAllowedFormat(filename)) {
      buffer = await vexZipWrap(buffer, filename);
      filename = filename.replace(/\.[^.]+$/, "") + ".zip";
      wrapped = true;
    }
    const staged = await stageToTmpfiles(buffer, filename, mime);
    const up = await vexfileRemoteUpload(token, staged.directUrl);
    await m.react("🐣");
    const lines = [
      "File berhasil di-upload ke VexFile.",
      `Nama: ${up.file || filename}${wrapped ? " (dibungkus .zip otomatis — VexFile hanya menerima arsip)" : ""}`,
      `Ukuran: ${formatSize(buffer.length)}`,
      `Link: ${up.url}`,
    ];
    if (up.id) lines.push(`ID file: ${up.id}`);
    lines.push("File tersimpan permanen di akun vexfile.com kamu — tiap download menghasilkan poin.");
    return m.reply(claraWrap("vexfile", lines.join("\n"), "success"));
  } catch (e) {
    console.error("vexfile error:", e?.message || e);
    await m.react("❌");
    return m.reply(claraWrap("vexfile", `Upload gagal: ${String(e?.message || e).slice(0, 200)}`, "error"));
  }
}

export { pluginConfig as config, handler };
