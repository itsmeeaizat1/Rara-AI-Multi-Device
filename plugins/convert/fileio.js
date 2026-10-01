// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .fileio / .tmpfiles — upload media ke file.io (temporary, one-time download)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const FILEIO_URL = "https://file.io/uploads";
const FILEIO_EXPIRES = "14d";

const pluginConfig = {
  name: "fileio",
  alias: ["fileio"],
  aliases: ["fileio", "tmpfiles", "temporaryfile"],
  category: "convert",
  description: "Upload media sementara ke file.io",
  usage: ".fileio (reply/kirim media)",
  example: ".fileio",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
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
  return `rara-upload.${ext}`;
}

async function uploadToFileio(buffer, filename, mime) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime || "application/octet-stream" }), filename);
  const res = await fetch(`${FILEIO_URL}?expires=${FILEIO_EXPIRES}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60000),
    headers: { Accept: "application/json", "User-Agent": "Rara-WhatsApp-Bot/1.0" },
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || !data?.success || !data?.link) {
    throw new Error(`file.io HTTP ${res.status}: ${data?.message || "respons tidak valid"}`);
  }
  return data;
}

async function handler(m) {
  const target = getMediaTarget(m);
  if (!target) {
    return m.reply(raraWrap("file.io", `Reply atau kirim media dengan caption ${m.prefix}fileio. File.io menghapus file setelah diunduh atau setelah masa berlaku habis.`, "guide"));
  }

  try {
    await m.react("🕒");
    const buffer = await target.download();
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("media kosong");
    const mime = String(target.mimetype || target.msg?.mimetype || "application/octet-stream").split(";")[0];
    const filename = mediaFilename(target);
    const data = await uploadToFileio(buffer, filename, mime);
    await m.react("🐣");
    return m.reply(raraWrap("file.io", `File berhasil di-upload.\nNama: ${filename}\nLink: ${data.link}\nBerlaku: ${data.expiry || FILEIO_EXPIRES}\nCatatan: file.io menghapus file setelah diunduh.`, "success"));
  } catch (e) {
    console.error("fileio error:", e?.message || e);
    await m.react("❌");
    return m.reply(raraWrap("file.io", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, uploadToFileio };
