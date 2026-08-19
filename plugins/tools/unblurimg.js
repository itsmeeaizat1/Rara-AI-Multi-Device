// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// UnblurImage AI — Unblur & upscale gambar via unblurimage.ai API, no token needed
import crypto from "node:crypto";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "unblurimg",
  alias: ["unblur", "unblurimage", "hdai", "sharpenai", "jernihkan"],
  category: "tools",
  description: "UnblurImage AI — unblur & upscale gambar ke HD via unblurimage.ai, gratis tanpa token",
  usage: ".unblurimg (reply gambar)\n.unblurimg 2x (reply gambar)\n.unblurimg 4x v2 (reply gambar)",
  example: ".unblurimg (reply gambar)\n.unblurimg 4x",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

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

  // Create job
  const createRes = await fetch(baseUrl + "/create-job", { method: "POST", headers, body: formData });
  const createData = await createRes.json();
  const jobId = createData?.result?.job_id;

  if (!jobId) {
    throw new Error("Gagal membuat job: " + JSON.stringify(createData).substring(0, 300));
  }

  // Poll for result
  let outputUrl = null;
  let attempts = 0;
  const maxAttempts = 120; // ~2 minutes max

  while (!outputUrl && attempts < maxAttempts) {
    attempts++;
    const pollRes = await fetch(baseUrl + "/get-job/" + jobId, { headers });
    const pollData = await pollRes.json();

    if (pollData.code === 100000 && pollData.result?.output_url?.[0]) {
      outputUrl = pollData.result.output_url[0];
      break;
    }

    const processingCodes = [100000, 100001, 300006];
    if (!processingCodes.includes(pollData.code)) {
      throw new Error("API error: " + (pollData.message || JSON.stringify(pollData).substring(0, 200)));
    }

    // Small delay to avoid hammering
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!outputUrl) throw new Error("Timeout menunggu hasil. Coba lagi.");

  // Download result
  const resultRes = await fetch(outputUrl);
  const resultBuffer = Buffer.from(await resultRes.arrayBuffer());
  return { buffer: resultBuffer, url: outputUrl };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    // Parse args: [scale] [model]
    // scale: 2, 4, 8 (default 4)
    // model: v1, v2, v3 (default v2)
    let scale = "4";
    let model = "v2";

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (["2", "2x", "4", "4x", "8", "8x"].includes(lower)) {
        scale = lower.replace("x", "");
      }
      if (["v1", "v2", "v3"].includes(lower)) {
        model = lower;
      }
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = (q.message?.[Object.keys(q.message)[0]]?.mimetype) || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("UnblurImage AI", [
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
        usedPrefix + "unblurimg 4x v3 - Pakai model v3",
        "",
        "Scale: 2x, 4x, 8x",
        "Model: v1, v2, v3 (default v2)",
        "Source: unblurimage.ai",
      ]));
    }

    m.reply(claraWrap("UnblurImage AI", "Sedang memproses gambar...\nScale: " + scale + "x | Model: " + model + "\nMungkin butuh 30-60 detik."));

    // Download image
    const imageBuffer = await q.download();
    if (!imageBuffer || imageBuffer.length === 0) {
      return m.reply(claraWrap("UnblurImage AI", "Gagal download gambar. Coba lagi!"));
    }

    // Unblur/upscale
    const result = await unblurImage(imageBuffer, scale, model, mime);

    // Send result
    try {
      await conn.sendMessage(m.key.remoteJid, {
        image: result.buffer,
        caption: claraWrap("UnblurImage AI", [
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
      return m.reply(claraWrap("UnblurImage AI", [
        "UNBLUR & UPSCALE BERHASIL",
        "",
        "Scale: " + scale + "x | Model: " + model,
        "Hasil: " + result.url,
        "",
        "Buka link untuk download hasil.",
      ], "success"));
    }
  } catch (e) {
    console.error("[UnblurImage AI]", e);
    m.reply(claraWrap("UnblurImage AI", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. API unblurimage.ai sedang maintenance",
      "2. IP diblokir sementara",
      "3. Gambar terlalu besar (max ~10MB)",
      "4. Timeout (coba lagi)",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
