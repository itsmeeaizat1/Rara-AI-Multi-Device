// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// UnblurImage AI — Unblur & upscale gambar via unblurimage.ai API, no token needed
// Tested: v1 PASS (53KB->4.1MB), v2 PASS (53KB->663KB), v3 FAIL (Cloudflare block)
import crypto from "node:crypto";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "unblurimg",
  alias: ["unblurimg"],
  category: "tools",
  description: "UnblurImage AI — unblur & upscale gambar ke HD via unblurimage.ai, gratis tanpa token",
  usage: ".unblurimg (reply gambar)\n.unblurimg 2x (reply gambar)\n.unblurimg 4x v1 (reply gambar)",
  example: ".unblurimg (reply gambar)\n.unblurimg 4x",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

// Model yang tersedia (v3 diblokir Cloudflare, dihapus)
const VALID_MODELS = ["v1", "v2"];
// Code processing dari API
const PROCESSING_CODES = [100000, 100001, 300006];
// Code error dari API
const ERROR_CODES = [300008, 300009, 300010, 500000];

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

async function unblurImage(imageBuffer, scaleFactor, model, mime) {
  const serial = crypto.randomBytes(16).toString("hex");
  const spoofedIp = generateRandomIP();
  const fname = "Image_" + crypto.randomBytes(6).toString("hex") + "." + (mime === "image/png" ? "png" : "jpg");
  const baseUrl = "https://api.unblurimage.ai/api/imgupscaler/" + model + "/ai-image-unblur";

  const formData = new FormData();
  formData.append("original_image_file", new Blob([imageBuffer], { type: mime || "image/jpeg" }), fname);
  formData.append("scale_factor", String(scaleFactor));
  formData.append("upscale_type", "image-upscale");

  const headers = {
    "product-serial": serial,
    "X-Forwarded-For": spoofedIp,
    "X-Real-IP": spoofedIp,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  // Step 1: Create job
  const createRes = await fetch(baseUrl + "/create-job", { method: "POST", headers, body: formData });
  const createText = await createRes.text();

  // Check if response is HTML (Cloudflare block)
  if (createText.trim().startsWith("<") || createText.includes("<!DOCTYPE")) {
    throw new Error("API " + model + " diblokir (Cloudflare). Gunakan model v1 atau v2.");
  }

  let createData;
  try {
    createData = JSON.parse(createText);
  } catch {
    throw new Error("Response API tidak valid. Coba lagi.");
  }

  const jobId = createData?.result?.job_id;
  if (!jobId) {
    const errMsg = createData?.message?.en || createData?.message?.id || JSON.stringify(createData).substring(0, 200);
    throw new Error("Gagal bikin nih job: " + errMsg);
  }

  // Step 2: Poll for result
  let outputUrl = null;
  let attempts = 0;
  const maxAttempts = 90; // ~90 seconds max (1s interval)

  while (!outputUrl && attempts < maxAttempts) {
    attempts++;
    const pollRes = await fetch(baseUrl + "/get-job/" + jobId, { headers });
    const pollText = await pollRes.text();

    let pollData;
    try {
      pollData = JSON.parse(pollText);
    } catch {
      // Not JSON, skip and retry
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    // Success
    if (pollData.code === 100000 && pollData.result?.output_url?.[0]) {
      outputUrl = pollData.result.output_url[0];
      break;
    }

    // Error codes
    if (ERROR_CODES.includes(pollData.code)) {
      const errMsg = pollData.message?.en || pollData.message?.id || "Gagal proses nih gambar";
      throw new Error("API error (code " + pollData.code + "): " + errMsg);
    }

    // Unknown code that's not processing
    if (!PROCESSING_CODES.includes(pollData.code)) {
      const errMsg = pollData.message?.en || pollData.message?.id || JSON.stringify(pollData).substring(0, 200);
      throw new Error("API error (code " + pollData.code + "): " + errMsg);
    }

    // Still processing, wait
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!outputUrl) throw new Error("Timeout menunggu hasil (" + maxAttempts + " detik). Coba lagi.");

  // Step 3: Download result
  const resultRes = await fetch(outputUrl);
  if (!resultRes.ok) throw new Error("Gagal download hasil: HTTP " + resultRes.status);
  const resultBuffer = Buffer.from(await resultRes.arrayBuffer());
  return { buffer: resultBuffer, url: outputUrl };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    // Parse args: [scale] [model]
    let scale = "4";
    let model = "v2";

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (["2", "2x", "4", "4x", "8", "8x"].includes(lower)) {
        scale = lower.replace("x", "");
      }
      if (VALID_MODELS.includes(lower)) {
        model = lower;
      }
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = (q.message?.[Object.keys(q.message)[0]]?.mimetype) || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(raraWrap("UnblurImage AI", [
        "Unblur & upscale gambar ke HD via unblurimage.ai",
        "Gratis tanpa token, IP spoofing otomatis",
        "",
        "CARA PAKAI:",
        "Reply gambar lalu ketik:",
        usedPrefix + "unblurimg (default 4x v2)",
        "",
        "OPSI:",
        usedPrefix + "unblurimg 2x - Upscale 2x",
        usedPrefix + "unblurimg 4x - Upscale 4x (default)",
        usedPrefix + "unblurimg 8x - Upscale 8x",
        usedPrefix + "unblurimg 4x v1 - Pakai model v1",
        usedPrefix + "unblurimg 4x v2 - Pakai model v2",
        "",
        "Scale: 2x, 4x, 8x",
        "Model: v1, v2 (default v2)",
        "Source: unblurimage.ai",
      ]));
    }
    // Download image
    const imageBuffer = await q.download();
    if (!imageBuffer || imageBuffer.length === 0) {
      return m.reply(raraWrap("UnblurImage AI", "Gagal download gambar. Coba lagi!"));
    }

    // Validate size (min 5KB, max 10MB)
    if (imageBuffer.length < 5000) {
      return m.reply(raraWrap("UnblurImage AI", "Gambar terlalu kecil (min 5KB). Gunakan gambar yang lebih besar."));
    }
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return m.reply(raraWrap("UnblurImage AI", "Gambar terlalu besar (max 10MB)."));
    }

    // Unblur/upscale
    const result = await unblurImage(imageBuffer, scale, model, mime);

    // Send result
    try {
      await conn.sendMessage(m.key.remoteJid, {
        image: result.buffer,
        caption: raraWrap("UnblurImage AI", [
          "UNBLUR & UPSCALE BERHASIL",
          "",
          "Scale: " + scale + "x",
          "Model: " + model,
          "Source: unblurimage.ai",
          "",
          "Ukuran asli: " + (imageBuffer.length / 1024).toFixed(1) + " KB",
          "Ukuran hasil: " + (result.buffer.length / 1024).toFixed(1) + " KB",
        ], "success"),
      }, { quoted: m });
    } catch (sendErr) {
      // Fallback: send URL
      await m.react("🐣");
      return m.reply(raraWrap("UnblurImage AI", [
        "UNBLUR & UPSCALE BERHASIL",
        "",
        "Scale: " + scale + "x | Model: " + model,
        "Hasil: " + result.url,
        "",
        "Buka link untuk download hasil.",
      ], "success"));
    }
  } catch (e) {
    await m.react("❌");
    console.error("[UnblurImage AI]", e);
    m.reply(raraWrap("UnblurImage AI", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. API unblurimage.ai sedang maintenance",
      "2. IP diblokir sementara",
      "3. Gambar terlalu kecil (min 5KB)",
      "4. Gambar terlalu besar (max 10MB)",
      "5. Timeout (coba lagi)",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
