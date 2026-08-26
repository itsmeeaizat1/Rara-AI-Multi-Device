// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "reminiv2",
  alias: ["reminiv2", "hd4", "hdv2tool", "hd4kualitas", "enhancev2", "reminihd"],
  category: "tools",
  description: "Enhance gambar all-in-one: remini, recolor, unblur, upscale 4x/8x",
  usage: ".reminiv2 (reply gambar) | .reminiv2 <mode> | .reminiv2 <scale> <mode> doc",
  example: ".reminiv2 | .reminiv2 recolor | .reminiv2 8 unblur doc",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const SERVER = "https://image-upscaling.net";
const MAX_POLL = 90;
const POLL_INTERVAL = 2000;

function generateClientId() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function upscaleImage(buffer, scale, model, useFx) {
  const clientId = generateClientId();
  const form = new FormData();
  form.append("image", buffer, { filename: "image.jpg", contentType: "image/jpeg" });
  form.append("scale", String(scale));
  form.append("model", model);
  form.append("prompt", "");
  form.append("use_webp", "true");
  if (useFx) form.append("fx", "");

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

  // Poll for result
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
        // Download result
        const dlRes = await axios.get(entry.image_url, {
          headers: { Cookie: `client_id=${clientId}` },
          params: { delete_after_download: "" },
          responseType: "arraybuffer",
          timeout: 60000,
          validateStatus: () => true,
        });
        if (dlRes.status === 200) {
          return Buffer.from(dlRes.data);
        }
      }
    }
  }

  throw new Error("Timeout menunggu hasil dari server");
}

async function colorizeImage(buffer) {
  // Local colorize using sharp - enhance B&W/faded photos
  // Convert to LAB, boost color channels, auto-levels
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;

  // Step 1: Auto-normalize (stretch histogram)
  let processed = sharp(buffer)
    .resize(Math.min(width, 1024), Math.min(height, 1024), { fit: "inside" })
    .normalise();

  // Step 2: Boost saturation and add warm tones
  // Using sharp's modulate for basic enhancement
  const enhanced = await processed
    .modulate({
      brightness: 1.1,
      saturation: 1.8,
      hue: 5,
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  return enhanced;
}

async function unblurImage(buffer) {
  // Use sharp for local sharpening + image-upscaling.net for AI enhance
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;

  // Local sharpen first
  const sharpened = await sharp(buffer)
    .resize(Math.min(width, 1024), Math.min(height, 1024), { fit: "inside" })
    .sharpen({
      sigma: 1.5,
      flat: 1.0,
      jagged: 0.8,
    })
    .modulate({
      brightness: 1.05,
      saturation: 1.2,
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  return sharpened;
}

async function handler(m, { sock, args }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    return m.reply( claraWrap("Remini V2", [
      "All-in-one image enhancer: remini, recolor, unblur, upscale.",
      "",
      "CARA PAKAI (reply gambar):",
      m.prefix + "reminiv2 — Enhance default (4x)",
      m.prefix + "reminiv2 2 — Upscale 2x (cepat)",
      m.prefix + "reminiv2 4 — Upscale 4x (recommended)",
      m.prefix + "reminiv2 8 — Upscale 8x (max HD)",
      m.prefix + "reminiv2 recolor — Warna foto B&W",
      m.prefix + "reminiv2 unblur — Tajamkan foto blur",
      m.prefix + "reminiv2 fx — Face enhance (potret)",
      m.prefix + "reminiv2 doc — Kirim sebagai dokumen",
      "",
      "KOMBINASI:",
      m.prefix + "reminiv2 8 recolor — 8x + recolor",
      m.prefix + "reminiv2 4 unblur doc — 4x + unblur + doc",
      m.prefix + "reminiv2 2 fx — 2x + face enhance",
    ].join("\n")), "reminiv2");
  }

  await m.react("🕒");

  try {
    const buffer = m.quoted?.isMedia
      ? await m.quoted.download()
      : await m.download();

    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal download gambar");
    }

    // Parse args
    const input = (args.join(" ") || "").trim().toLowerCase();
    const parts = input.split(/\s+/).filter(Boolean);

    let scale = 4;
    let model = "general";
    let useFx = false;
    let wantRecolor = false;
    let wantUnblur = false;
    let wantDoc = false;
    let wantEnhance = true; // default: always enhance

    for (const part of parts) {
      if (["2", "4", "8"].includes(part)) {
        scale = parseInt(part);
      } else if (part === "recolor" || part === "colorize" || part === "warna") {
        wantRecolor = true;
        wantEnhance = false;
      } else if (part === "unblur" || part === "tajam" || part === "sharpen") {
        wantUnblur = true;
        wantEnhance = false;
      } else if (part === "fx" || part === "face") {
        useFx = true;
        model = "plus";
      } else if (part === "plus") {
        model = "plus";
      } else if (part === "diffuser") {
        model = "diffuser";
      } else if (part === "doc" || part === "document") {
        wantDoc = true;
      } else if (part === "enhance" || part === "remini" || part === "hd") {
        wantEnhance = true;
      }
    }

    // If recolor or unblur without scale, default to 2x (faster)
    if (wantRecolor || wantUnblur) {
      if (!parts.some((p) => ["2", "4", "8"].includes(p))) {
        scale = 2;
      }
    }

    const modeLabel = [];
    if (wantEnhance) modeLabel.push("Enhance " + scale + "x");
    if (wantRecolor) modeLabel.push("Recolor");
    if (wantUnblur) modeLabel.push("Unblur");
    if (useFx) modeLabel.push("Face FX");
    if (!wantEnhance && !wantRecolor && !wantUnblur) modeLabel.push("Enhance " + scale + "x");

    await m.reply(claraWrap("Remini V2", [
      "Status: Memproses gambar...",
      "Mode: " + modeLabel.join(" + "),
      "Scale: " + scale + "x",
      "Model: " + model,
      wantFx = useFx ? "Face enhance: ON" : "",
      "Engine: image-upscaling.net + sharp",
    ].filter(Boolean).join("\n")));

    let processedBuffer = buffer;
    const steps = [];

    // Step 1: Recolor (local sharp)
    if (wantRecolor) {
      processedBuffer = await colorizeImage(processedBuffer);
      steps.push("Recolor (sharp)");
    }

    // Step 2: Unblur (local sharp)
    if (wantUnblur) {
      processedBuffer = await unblurImage(processedBuffer);
      steps.push("Unblur (sharp)");
    }

    // Step 3: Upscale/Enhance (image-upscaling.net)
    if (wantEnhance || wantRecolor || wantUnblur) {
      try {
        processedBuffer = await upscaleImage(processedBuffer, scale, model, useFx);
        steps.push("Upscale " + scale + "x (" + model + ")");
      } catch (upscaleErr) {
        // Fallback: local sharp upscale
        steps.push("Upscale fallback (sharp)");
        const meta = await sharp(processedBuffer).metadata();
        const newWidth = (meta.width || 512) * Math.min(scale, 2);
        const newHeight = (meta.height || 512) * Math.min(scale, 2);
        processedBuffer = await sharp(processedBuffer)
          .resize(newWidth, newHeight, { fit: "inside", kernel: "lanczos3" })
          .sharpen({ sigma: 1.0 })
          .jpeg({ quality: 95 })
          .toBuffer();
      }
    }

    m.react("🐣");

    const sizeKB = (processedBuffer.length / 1024).toFixed(0);
    const sizeMB = (processedBuffer.length / (1024 * 1024)).toFixed(2);
    const sizeLabel = sizeKB > 1024 ? sizeMB + "MB" : sizeKB + "KB";

    let caption = claraWrap("Remini V2 - Done", [
      "Mode: " + modeLabel.join(" + "),
      "Scale: " + scale + "x",
      "Model: " + model,
      "Size: " + sizeLabel,
      "Steps: " + steps.join(" -> "),
      "Engine: image-upscaling.net + sharp",
    ].join("\n"));

    if (wantDoc || processedBuffer.length > 5 * 1024 * 1024) {
      const autoDoc = processedBuffer.length > 5 * 1024 * 1024;
      await sock.sendMessage(
        m.chat,
        {
          document: processedBuffer,
          mimetype: "image/jpeg",
          fileName: "Nova-HD-" + scale + "x-" + Date.now() + ".jpg",
          caption: caption + (autoDoc ? "\nMode: Auto-Document (>5MB)" : "\nMode: Document (no compress)"),
        },
        { quoted: m },
      );
    } else {
      await sock.sendMessage(
        m.chat,
        { image: processedBuffer, caption, jpegQuality: 100 },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error("[ReminiV2] Error:", e.message);
    m.react("❌");
    m.reply(claraWrap("Remini V2", [
      "Gagal: " + e.message,
      "",
      "Coba: " + m.prefix + "remini | " + m.prefix + "hd | " + m.prefix + "reminiv3",
    ].join("\n")));
  }
}

export { pluginConfig as config, handler };
