import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "reminiv2",
  alias: ["hd4", "hdv2tool", "hd4kualitas"],
  category: "tools",
  description: "Enhance gambar jadi HD v2 (Remini V2 - image-upscaling.net)",
  usage: ".reminiv2 (reply gambar)",
  example: ".reminiv2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const SERVER = "https://image-upscaling.net";
const MODELS = ["general", "plus", "diffuser"];
const MAX_POLL = 60;
const POLL_INTERVAL = 2000;

function generateClientId() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function uploadImage(buffer, clientId, scale = 4, model = "general") {
  const form = new FormData();
  form.append("image", buffer, { filename: "image.jpg", contentType: "image/jpeg" });
  form.append("scale", String(scale));
  form.append("model", model);
  form.append("prompt", "");
  form.append("use_webp", "true");

  const res = await axios.post(`${SERVER}/upscaling_upload`, form, {
    headers: {
      ...form.getHeaders(),
      Cookie: `client_id=${clientId}`,
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.data) {
    throw new Error(`Upload gagal: ${res.status}`);
  }

  return res.data;
}

async function pollStatus(clientId, originalFilename) {
  for (let i = 0; i < MAX_POLL; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const res = await axios.get(`${SERVER}/upscaling_get_status_v2`, {
      headers: { Cookie: `client_id=${clientId}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (res.status !== 200 || !Array.isArray(res.data)) continue;

    for (const entry of res.data) {
      if (entry.original_filename === originalFilename && entry.completed) {
        return entry.image_url;
      }
    }
  }

  throw new Error("Timeout menunggu hasil upscale");
}

async function downloadResult(imageUrl, clientId) {
  const res = await axios.get(imageUrl, {
    headers: { Cookie: `client_id=${clientId}` },
    params: { delete_after_download: "" },
    responseType: "arraybuffer",
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    throw new Error(`Download gagal: ${res.status}`);
  }

  return Buffer.from(res.data);
}

async function handler(m, { sock, args }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    let txt = `*HD IMAGE V2*\n\n`;
    txt += `> Reply gambar untuk enhance\n\n`;
    txt += `\`\`\`${m.prefix}reminiv2\`\`\`\n\n`;
    txt += `*Opsi:*\n`;
    txt += `1. \`${m.prefix}reminiv2\` (default: 4x, general)\n`;
    txt += `2. \`${m.prefix}reminiv2 2\` (2x scale)\n`;
    txt += `3. \`${m.prefix}reminiv2 4 plus\` (4x, model plus)\n`;
    txt += `4. \`${m.prefix}reminiv2 fx\` (4x + face enhance)`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "reminiv2" });
  }

  await m.react("🕐");

  try {
    const buffer = m.quoted?.isMedia
      ? await m.quoted.download()
      : await m.download();

    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal download gambar");
    }

    const input = (args.join(" ") || "").trim().toLowerCase();
    let scale = 4;
    let model = "general";
    let useFx = false;

    const parts = input.split(/\s+/);
    for (const part of parts) {
      if (["2", "4", "8"].includes(part)) {
        scale = parseInt(part);
      } else if (MODELS.includes(part)) {
        model = part;
      } else if (part === "fx" || part === "face") {
        useFx = true;
      }
    }

    const clientId = generateClientId();

    const uploadData = { scale, model, prompt: "", use_webp: "true" };
    if (useFx) uploadData.fx = "";

    const form = new FormData();
    form.append("image", buffer, { filename: "image.jpg", contentType: "image/jpeg" });
    for (const [key, val] of Object.entries(uploadData)) {
      form.append(key, String(val));
    }

    const uploadRes = await axios.post(`${SERVER}/upscaling_upload`, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: `client_id=${clientId}`,
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (uploadRes.status !== 200 || !uploadRes.data) {
      throw new Error(`Upload gagal: ${uploadRes.status}`);
    }

    const originalFilename = uploadRes.data;

    const imageUrl = await pollStatus(clientId, originalFilename);

    const resultBuffer = await downloadResult(imageUrl, clientId);

    await m.react("✅");

    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);
    const wantDoc = input.includes("doc") || input.includes("document");

    let caption = `*HD V2 - DONE*\n`;
    caption += `> Scale: ${scale}x\n`;
    caption += `> Model: ${model}\n`;
    caption += `> Size: ${sizeMB}MB\n`;
    if (useFx) caption += `> Face enhance: yes\n`;
    caption += `> Source: image-upscaling.net`;

    if (wantDoc || resultBuffer.length > 5 * 1024 * 1024) {
      // Document mode — no compress, full HD
      if (resultBuffer.length > 5 * 1024 * 1024) {
        caption += `> Mode: Auto-Document (size > 5MB)`;
      } else {
        caption += `> Mode: Document (no compress)`;
      }
      await sock.sendMessage(
        m.chat,
        {
          document: resultBuffer,
          mimetype: "image/jpeg",
          fileName: `HD-V2-${scale}x-${Date.now()}.jpg`,
          caption,
        },
        { quoted: m },
      );
    } else {
      caption += `> Quality: Full HD`;
      await sock.sendMessage(
        m.chat,
        { image: resultBuffer, caption, jpegQuality: 100 },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error("[HD4] Error:", e.message);
    let txt = `❌ Gagal enhance gambar!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `> Coba lagi atau gunakan \`${m.prefix}remini\` / \`${m.prefix}hd3\``;
    await m.reply(claraWrap("reminiv2", txt));
  }
}

export { pluginConfig as config, handler };
