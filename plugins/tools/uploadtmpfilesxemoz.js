// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import FormData from "form-data";
import fetch from "node-fetch";
import mime from "mime-types";
import { downloadMediaMessage, getContentType } from "nova";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/tools/uploadtmpfilesxemoz.js
 * Command .uploadtmpfilesxemoz — Upload media ke tmpfiles via API xemoz
 * API: https://api-xemoz-official.my.id/api/uploader/tempfile.php
 */

const pluginConfig = {
  name: "uploadtmpfilesxemoz",
  alias: ["tmpfilesxemoz", "tmpfilexemoz", "uptmpxemoz"],
  category: "tools",
  description: "Upload media ke tmpfiles.org via API xemoz",
  usage: ".uploadtmpfilesxemoz (reply/kirim media)",
  example: ".uploadtmpfilesxemoz",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/uploader/tempfile.php";

function getFileExtension(mimetype) {
  const ext = mime.extension(mimetype) || "";
  return ext || "bin";
}

async function uploadToXemoz(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch(API_URL, {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
    },
    timeout: 120000,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: Upload gagal`);
  const data = await res.json();

  if (!data?.status) {
    throw new Error(data?.message || "Upload ditolak server");
  }

  const url = data?.result?.url || data?.url || null;
  if (!url) throw new Error("URL tidak ditemukan dari response");

  return { url, creator: data?.creator || "xemoz" };
}

async function handler(m, { sock }) {
  let media = null;
  let mimetype = null;
  let filename = "file";

  if (m.quoted?.message) {
    const type = getContentType(m.quoted.message);
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      return m.reply(claraWrap("UploadTmpFiles", "Reply ke file (gambar/video/audio/berkas) ya!"));
    }

    try {
      media = await downloadMediaMessage(
        { key: m.quoted.key, message: m.quoted.message },
        "buffer",
        {},
      );
      const content = m.quoted.message[type];
      mimetype = content?.mimetype || "application/octet-stream";
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`;
    } catch {
      return m.reply(claraWrap("uploadtmpfilesxemoz", te(m.prefix, m.command, m.pushName), "error"));
    }
  } else if (m.message) {
    const type = getContentType(m.message);
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      const help = `Cara pakai:\n1. Kirim media dengan caption ${m.prefix}uploadtmpfilesxemoz\n2. Atau reply media dengan ${m.prefix}uploadtmpfilesxemoz`;
      return m.reply( claraWrap("UploadTmpFiles", help));
    }

    try {
      media = await downloadMediaMessage(
        { key: m.key, message: m.message },
        "buffer",
        {},
      );
      const content = m.message[type];
      mimetype = content?.mimetype || "application/octet-stream";
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`;
    } catch {
      return m.reply(claraWrap("uploadtmpfilesxemoz", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  if (!media || media.length === 0) {
    return m.reply(claraWrap("UploadTmpFiles", "Media tidak terbaca. Coba kirim ulang."));
  }

  await m.react("🕒");

  try {
    const result = await uploadToXemoz(media, filename);
    await m.react("✅");

    const response = `*Upload TmpFiles*\n\nFile: ${filename}\nSize: ${formatBytes(media.length)}\nURL: ${result.url}`;
    return m.reply(claraWrap("UploadTmpFiles", response));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("UploadTmpFiles Error", error.message || "Gagal upload file."));
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export { pluginConfig as config, handler };
