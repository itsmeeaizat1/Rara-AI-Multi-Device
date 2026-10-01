// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ImgUpscaler — Upscale & enhance gambar via imgupscaler.com API, no token needed
// Supports scale 2x and 4x
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "imgupscale",
  alias: ["imgupscale"],
  category: "tools",
  description: "ImgUpscaler — upscale & enhance gambar via imgupscaler.com API, gratis tanpa token",
  usage: ".imgupscale (reply gambar)\n.imgupscale 2 (reply gambar)\n.imgupscale 4 (reply gambar)",
  example: ".imgupscale (reply gambar)\n.imgupscale 4",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const VALID_SCALES = ["2", "4"];
const API_UPLOAD = "https://imgupscaler.com/api/legacy/upload";
const API_STATUS = "https://imgupscaler.com/api/legacy/status";

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

function getCommonHeaders() {
  const spoofedIp = generateRandomIP();
  return {
    "User-Agent": "Mozilla/5.0 (Linux; Android 9; CPH2083 Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.179 Mobile Safari/537.36",
    "X-Forwarded-For": spoofedIp,
    "X-Real-IP": spoofedIp,
    "Client-IP": spoofedIp,
    "True-Client-IP": spoofedIp,
    "X-Originating-IP": spoofedIp,
    "X-Cluster-Client-IP": spoofedIp,
    Forwarded: "for=" + spoofedIp,
    Referer: "https://imgupscaler.com/",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

async function upscaleImage(imageBuffer, scale, mime, fileName) {
  const headers = getCommonHeaders();

  // Step 1: Upload
  const formData = new FormData();
  formData.append("file", new Blob([imageBuffer], { type: mime || "image/jpeg" }), fileName || "image.jpg");

  const uploadRes = await fetch(API_UPLOAD, { method: "POST", headers, body: formData });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error("Upload gagal: HTTP " + uploadRes.status + (errText ? " - " + errText.substring(0, 200) : ""));
  }

  const uploadData = await uploadRes.json();
  const taskId = uploadData.taskId || uploadData.raw?.data?.code;

  if (!taskId) {
    throw new Error("Gagal mendapat taskId: " + JSON.stringify(uploadData).substring(0, 300));
  }

  // Step 2: Poll status
  let result = null;
  let attempts = 0;
  const maxAttempts = 120; // ~2 minutes max (1s interval)

  while (!result && attempts < maxAttempts) {
    attempts++;

    const statusRes = await fetch(API_STATUS, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "upscaler",
        taskId: taskId,
        scaleRadio: String(scale),
      }),
    });

    if (!statusRes.ok) {
      // Retry on 5xx, throw on 4xx
      if (statusRes.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const errText = await statusRes.text().catch(() => "");
      throw new Error("Status check gagal: HTTP " + statusRes.status + (errText ? " - " + errText.substring(0, 200) : ""));
    }

    const statusData = await statusRes.json();

    // Check success
    const isSuccess =
      statusData.status === "success" ||
      statusData.raw?.data?.status === "success";

    if (isSuccess) {
      result = statusData;
      break;
    }

    // Check failed
    const isFailed =
      statusData.status === "failed" ||
      statusData.raw?.data?.status === "failed";

    if (isFailed) {
      throw new Error("Upscaling gagal: " + JSON.stringify(statusData).substring(0, 300));
    }

    // Still processing, wait 1 second
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!result) throw new Error("Timeout menunggu hasil (" + maxAttempts + " detik). Coba lagi.");

  // Extract image URL from result
  let imageUrl = null;

  // Try multiple possible response formats
  if (result.raw?.data?.result) {
    imageUrl = result.raw.data.result;
  } else if (result.raw?.data?.output_url) {
    imageUrl = result.raw.data.output_url;
  } else if (result.raw?.data?.url) {
    imageUrl = result.raw.data.url;
  } else if (result.result) {
    imageUrl = typeof result.result === "string" ? result.result : result.result.url || result.result.output_url;
  } else if (result.output_url) {
    imageUrl = result.output_url;
  } else if (result.url) {
    imageUrl = result.url;
  } else if (result.data?.result) {
    imageUrl = typeof result.data.result === "string" ? result.data.result : result.data.result.url;
  }

  if (!imageUrl) {
    // Can't find URL, return raw response
    throw new Error("URL hasil tidak ditemukan. Response: " + JSON.stringify(result).substring(0, 500));
  }

  // Download result
  const dlRes = await fetch(imageUrl);
  if (!dlRes.ok) throw new Error("Gagal download hasil: HTTP " + dlRes.status);
  const resultBuffer = Buffer.from(await dlRes.arrayBuffer());

  return { buffer: resultBuffer, url: imageUrl, taskId };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    // Parse scale from args (default 2)
    let scale = "2";
    for (const arg of args) {
      const lower = arg.toLowerCase().replace("x", "");
      if (VALID_SCALES.includes(lower)) {
        scale = lower;
      }
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = (q.message?.[Object.keys(q.message)[0]]?.mimetype) || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(raraWrap("ImgUpscaler", [
        "Upscale & enhance gambar via imgupscaler.com",
        "Gratis tanpa token, IP spoofing otomatis",
        "",
        "CARA PAKAI:",
        "Reply gambar lalu ketik:",
        usedPrefix + "imgupscale (default 2x)",
        "",
        "OPSI:",
        usedPrefix + "imgupscale 2 - Upscale 2x (default)",
        usedPrefix + "imgupscale 4 - Upscale 4x",
        "",
        "Scale: 2x, 4x",
        "Source: imgupscaler.com",
      ]));
    }

    m.reply(raraWrap("ImgUpscaler", "Sedang upscaling gambar...\nScale: " + scale + "x\nEstimasi: 10-60 detik."));

    // Download image
    const imageBuffer = await q.download();
    if (!imageBuffer || imageBuffer.length === 0) {
      return m.reply(raraWrap("ImgUpscaler", "Gagal download gambar. Coba lagi!"));
    }

    // Validate size (min 5KB, max 10MB)
    if (imageBuffer.length < 5000) {
      return m.reply(raraWrap("ImgUpscaler", "Gambar terlalu kecil (min 5KB)."));
    }
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return m.reply(raraWrap("ImgUpscaler", "Gambar terlalu besar (max 10MB)."));
    }

    // Get filename
    const ext = mime === "image/png" ? "png" : "jpg";
    const fileName = "image_" + Date.now() + "." + ext;

    // Upscale
    const result = await upscaleImage(imageBuffer, scale, mime, fileName);

    // Send result
    try {
      await conn.sendMessage(m.key.remoteJid, {
        image: result.buffer,
        caption: raraWrap("ImgUpscaler", [
          "UPSCALE BERHASIL",
          "",
          "Scale: " + scale + "x",
          "Task ID: " + result.taskId,
          "Source: imgupscaler.com",
          "",
          "Ukuran asli: " + (imageBuffer.length / 1024).toFixed(1) + " KB",
          "Ukuran hasil: " + (result.buffer.length / 1024).toFixed(1) + " KB",
        ], "success"),
      }, { quoted: m });
    } catch (sendErr) {
      // Fallback: send URL
      await m.react("🐣");
      return m.reply(raraWrap("ImgUpscaler", [
        "UPSCALE BERHASIL",
        "",
        "Scale: " + scale + "x",
        "Hasil: " + result.url,
        "",
        "Buka link untuk download hasil.",
      ], "success"));
    }
  } catch (e) {
    await m.react("❌");
    console.error("[ImgUpscaler]", e);
    m.reply(raraWrap("ImgUpscaler", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. imgupscaler.com sedang maintenance",
      "2. IP diblokir sementara",
      "3. Gambar terlalu kecil (min 5KB)",
      "4. Gambar terlalu besar (max 10MB)",
      "5. Timeout (coba lagi)",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
