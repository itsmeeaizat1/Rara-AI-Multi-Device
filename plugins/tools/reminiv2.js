// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Remini V2 — AI Photo Enhance via Replicate Real-ESRGAN
// Sumber: https://replicate.com/nightmareai/real-esrgan
// Butuh: REPLICATE_API_TOKEN di environment (daftar gratis di replicate.com)
// Strategy: Replicate API primary, Sharp local fallback
import sharp from "sharp";
import { novaError, novaEmpty, novaGuide, novaNoInput, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

// === Replicate Config ===
const REPLICATE_MODEL = "nightmareai/real-esrgan";
const getReplicateToken = () => process.env.REPLICATE_API_TOKEN || "";

// === Uguu.se upload (temp host, gratis, no API key, direct URL) ===
async function uploadToUguu(buffer, filename = "image.jpg") {
  const formData = new FormData();
  formData.append("files[]", new Blob([buffer], { type: "image/jpeg" }), filename);

  const res = await fetch("https://uguu.se/upload.php", {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (!data.success || !data.files?.[0]?.url) {
    throw new Error("Uguu upload failed: " + JSON.stringify(data).slice(0, 200));
  }
  return data.files[0].url;
}

// === GoFile upload (fallback temp host) ===
async function uploadToGoFile(buffer, filename = "image.jpg") {
  // Get server
  const serverRes = await fetch("https://api.gofile.io/servers", {
    signal: AbortSignal.timeout(10000),
  });
  const serverData = await serverRes.json();
  const server = serverData.data.servers[0].name;

  // Upload
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: "image/jpeg" }), filename);

  const res = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (data.status !== "ok") {
    throw new Error("GoFile upload failed");
  }

  // GoFile returns download page, not direct link.
  // Need to get content details for direct link
  const contentId = data.data.code;
  const contentRes = await fetch(
    `https://api.gofile.io/contents/${contentId}?wt=4fd63689-fed6-45c2-b63c-15c7c5b1d0d1`,
    { signal: AbortSignal.timeout(10000) }
  );
  const contentData = await contentRes.json();

  if (contentData.status === "ok") {
    const files = Object.values(contentData.data.contents || {});
    if (files.length > 0 && files[0].link) {
      return files[0].link;
    }
  }

  throw new Error("GoFile: no direct link available");
}

// === Upload image to temp host with fallback ===
async function uploadImageTemp(buffer, filename = "image.jpg") {
  // Try Uguu first (fastest, returns direct URL)
  try {
    return await uploadToUguu(buffer, filename);
  } catch {}

  // Fallback to GoFile
  try {
    return await uploadToGoFile(buffer, filename);
  } catch {}

  // Last resort: use data URI (Replicate supports base64 data URIs)
  // Works but has size limits (~10MB base64)
  const base64 = buffer.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}

// === Replicate API: create prediction ===
async function createPrediction(imageUrl, scale, token) {
  // Get model version
  const modelRes = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!modelRes.ok) {
    throw new Error(`Replicate model fetch error: ${modelRes.status}`);
  }

  const modelData = await modelRes.json();
  const version = modelData.latest_version?.id;

  if (!version) {
    throw new Error("Tidak bisa dapat model version dari Replicate");
  }

  // Create prediction
  const predRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      input: {
        image: imageUrl,
        scale: scale,
        face_enhance: true,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!predRes.ok) {
    const errText = await predRes.text();
    throw new Error(`Replicate API error: ${predRes.status} — ${errText.slice(0, 200)}`);
  }

  return await predRes.json();
}

// === Poll prediction status ===
async function pollPrediction(predictionId, token, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) continue;
    const data = await res.json();

    if (data.status === "succeeded") {
      return data;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate ${data.status}: ${data.error || "unknown error"}`);
    }
  }

  throw new Error("Replicate timeout — proses terlalu lama (max 2 menit)");
}

// === Download result image ===
async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Download hasil gagal: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// === Sharp fallback (local upscaler — gratis, no API) ===
async function sharpFallback(buffer, scale = 2) {
  const meta = await sharp(buffer).metadata();
  const newWidth = meta.width * scale;
  const newHeight = meta.height * scale;

  const result = await sharp(buffer)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .sharpen({ sigma: 1.2, flat: 1.0, jagged: 0.8 })
    .modulate({ brightness: 1.03, saturation: 1.08 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();

  return { buffer: result, width: newWidth, height: newHeight, engine: "Sharp Local" };
}

const pluginConfig = {
  name: "reminiv2",
  alias: ["reminiv2", "enhance2", "reminiai"],
  category: "tools",
  description: "Enhance gambar jadi HD (AI Replicate Real-ESRGAN, fallback Sharp)",
  usage: ".reminiv2 (reply gambar)\n.reminiv2 4x (custom scale 2-4)\n.reminiv2 doc (kirim sebagai dokumen)",
  example: ".reminiv2\n.reminiv2 4x doc",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    const helpText = bracketBox("🖼️", toSC("Remini V2 — AI Enhance"), [
      `${toSC("Enhance gambar jadi HD pakai AI")}`,
      `${toSC("Replicate Real-ESRGAN + face enhance")}`,
      "",
      `${toSC("Cara pakai")}:`,
      `📌 ${m.prefix}reminiv2 (reply gambar)`,
      `📌 ${m.prefix}reminiv2 4x (custom scale 2-4)`,
      `📌 ${m.prefix}reminiv2 doc (kirim sebagai dokumen)`,
      "",
      tipText(toSC("Auto fallback ke Sharp local kalau API down")),
    ]);

    return m.reply(helpText);
  }

  try {
    // Parse args
    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");
    const scaleArg = argList.find((a) => /^\d+x?$/.test(a));
    let scale = scaleArg ? parseInt(scaleArg.replace("x", "")) : 2;
    scale = Math.max(2, Math.min(4, scale || 2)); // Replicate max 4x

    await m.react("🕒");

    // Download gambar dari WhatsApp
    const buffer = m.quoted?.isMedia
      ? await m.quoted.download()
      : await m.download();

    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(bracketBox("❌", toSC("Error"), [toSC("Gagal download gambar! Coba lagi.")]));
    }

    // Cek size — Replicate max ~10MB input
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    if (buffer.length > 10 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(bracketBox("❌", toSC("File Terlalu Besar"), [
        `${toSC("Ukuran")}: ${sizeMB}MB`,
        `${toSC("Maksimal")}: 10MB`,
        tipText(toSC("Kompres gambar dulu atau pakai .remini (local)")),
      ]));
    }

    const token = getReplicateToken();
    let result = null;
    let engineUsed = "";
    let apiStatus = "";

    if (token) {
      // === Replicate API path ===
      try {
        // 1. Upload ke temp host untuk dapat URL publik
        const imageUrl = await uploadImageTemp(buffer, "remini-input.jpg");

        // 2. Create prediction di Replicate
        const prediction = await createPrediction(imageUrl, scale, token);

        // 3. Poll sampai selesai (max 2 menit)
        const resultData = await pollPrediction(prediction.id, token, 60);

        // 4. Download hasil
        const outputUrl = Array.isArray(resultData.output)
          ? resultData.output[0]
          : resultData.output;

        if (!outputUrl) throw new Error("Replicate tidak return output URL");

        const resultBuffer = await downloadImage(outputUrl);
        const meta = await sharp(resultBuffer).metadata();

        result = { buffer: resultBuffer, width: meta.width, height: meta.height };
        engineUsed = "AI Replicate Real-ESRGAN";
        apiStatus = "✅";
      } catch (replicateErr) {
        // Replicate gagal — fallback ke Sharp
        console.error("[ReminiV2] Replicate failed, falling back:", replicateErr.message);
        const fb = await sharpFallback(buffer, scale);
        result = fb;
        engineUsed = fb.engine + " (API down)";
        apiStatus = "⚠️";
      }
    } else {
      // === No token — Sharp fallback ===
      const fb = await sharpFallback(buffer, scale);
      result = fb;
      engineUsed = fb.engine;
      apiStatus = "ℹ️";
    }

    await m.react("🐣");

    const outSizeMB = (result.buffer.length / (1024 * 1024)).toFixed(2);

    const caption = bracketBox("🖼️", toSC("HD Enhanced"), [
      `${apiStatus} ${toSC("Engine")}: ${toSC(engineUsed)}`,
      `${toSC("Scale")}: ${scale}x (${result.width}x${result.height})`,
      `${toSC("Size")}: ${outSizeMB}MB`,
    ]);

    // Kirim hasil — kalau > 5MB atau mau doc, kirim sebagai dokumen
    if (wantDoc || result.buffer.length > 5 * 1024 * 1024) {
      await sock.sendMessage(
        m.chat,
        {
          document: result.buffer,
          mimetype: "image/jpeg",
          fileName: `remini-v2-${scale}x.jpg`,
          caption,
        },
        { quoted: m }
      );
    } else {
      await sock.sendMessage(
        m.chat,
        { image: result.buffer, caption },
        { quoted: m }
      );
    }
  } catch (e) {
    console.error("[ReminiV2] Error:", e.message);
    await m.react("❌");
    m.reply(bracketBox("❌", toSC("Error"), [
      toSC("Gagal enhance gambar!"),
      `${e.message}`,
      tipText(toSC("Coba .remini untuk local upscaler (tanpa API)")),
    ]));
  }
}

export { pluginConfig as config, handler };
