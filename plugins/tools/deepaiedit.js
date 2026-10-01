// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// DeepAI Image Editor V2 — Edit gambar dengan text prompt, no API key needed (salt scraping)
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "deepaiedit",
  alias: ["deepaiedit"],
  category: "tools",
  description: "DeepAI Image Editor V2 — edit gambar dengan text prompt, gratis tanpa API key",
  usage: ".deepaiedit <prompt> (reply gambar)\n.deepaiedit list",
  example: ".deepaiedit change background to beach (reply gambar)",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const AGENT = "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";

const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const reverse = (s) => s.split("").reverse().join("");

async function getSalt() {
  const res = await fetch("https://deepai.org/machine-learning-model/image-editor");
  const text = await res.text();
  const match = text.match(/navigator\.userAgent\+myrandomstr\+'([^']+)'/);
  if (!match) throw new Error("Gagal ekstrak salt dari DeepAI.");
  return match[1];
}

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

function genKEY(salt) {
  const r = String(Math.floor(Math.random() * 1e11));
  const h1 = reverse(md5(AGENT + r + salt));
  const h2 = reverse(md5(AGENT + h1));
  const h3 = reverse(md5(AGENT + h2));
  return "tryit-" + r + "-" + h3;
}

async function editImage(imageBuffer, prompt, mime) {
  const salt = await getSalt();
  const spoofedIp = generateRandomIP();
  const apiKey = genKEY(salt);

  const formData = new FormData();
  formData.append("image", new Blob([imageBuffer], { type: mime || "image/jpeg" }), "image.jpg");
  formData.append("text", prompt);
  formData.append("image_generator_version", "standard");

  const response = await fetch("https://api.deepai.org/api/image-editor", {
    method: "POST",
    headers: {
      accept: "*/*",
      origin: "https://deepai.org",
      referer: "https://deepai.org/",
      "user-agent": AGENT,
      "api-key": apiKey,
      "x-forwarded-for": spoofedIp,
      "x-real-ip": spoofedIp,
      "client-ip": spoofedIp,
      "true-client-ip": spoofedIp,
      "x-originating-ip": spoofedIp,
      "x-cluster-client-ip": spoofedIp,
      forwarded: "for=" + spoofedIp,
    },
    body: formData,
  });

  const resText = await response.text();
  let resJson;
  try {
    resJson = JSON.parse(resText);
  } catch {
    resJson = { status: response.status, error: resText };
  }

  if (!response.ok) {
    throw new Error(resJson.error || resJson.err || ("HTTP " + response.status));
  }
  return resJson;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const sub = (args[0] || "").toLowerCase();

    // EXAMPLES
    if (sub === "list" || sub === "contoh" || sub === "example") {
      return m.reply(raraWrap("DeepAI Image Editor V2", [
        "CONTOH PROMPT EDITING:",
        "",
        "1. Change the background to a beach",
        "2. Make it look like a painting",
        "3. Add sunglasses to the person",
        "4. Turn the sky into a sunset",
        "5. Make it black and white",
        "6. Add a hat to the person",
        "7. Change hair color to blue",
        "8. Make it look like a cartoon",
        "9. Remove the background",
        "10. Add flowers around the person",
        "",
        "CARA PAKAI:",
        usedPrefix + "deepaiedit <prompt> (reply gambar)",
        "",
        "Gratis tanpa API key. Source: deepai.org",
      ], "info"));
    }

    // EDIT
    const prompt = text.trim();
    if (!prompt) {
      return m.reply(raraWrap("DeepAI Image Editor V2", [
        "Edit gambar dengan AI prompt. Gratis tanpa API key.",
        "",
        "CARA PAKAI:",
        "Reply gambar lalu ketik:",
        usedPrefix + "deepaiedit <prompt editing>",
        "",
        "Contoh:",
        usedPrefix + "deepaiedit change background to beach",
        usedPrefix + "deepaiedit make it look like a painting",
        "",
        "Ketik .deepaiedit list untuk contoh prompt lainnya",
      ]));
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = (q.message?.[Object.keys(q.message)[0]]?.mimetype) || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(raraWrap("DeepAI Image Editor V2", "Reply gambar yang mau di-edit, lalu ketik perintah ini!\n\n💡 *Contoh:* Reply gambar + .deepaiedit change background to beach"));
    }

    m.reply(raraWrap("DeepAI Image Editor V2", "Sedang mengedit gambar dengan DeepAI...\nPrompt: " + prompt));

    // Download image
    const imageBuffer = await q.download();
    if (!imageBuffer || imageBuffer.length === 0) {
      return m.reply(raraWrap("DeepAI Image Editor V2", "Gagal download gambar. Coba lagi!"));
    }

    // Edit image
    const result = await editImage(imageBuffer, prompt, mime);

    if (result.output_url) {
      // Send edited image
      try {
        await conn.sendMessage(m.key.remoteJid, {
          image: { url: result.output_url },
          caption: raraWrap("DeepAI Image Editor V2", [
            "EDIT BERHASIL",
            "",
            "Prompt: " + prompt,
            "Source: deepai.org",
            "API: Image Editor (no key)",
          ], "success"),
        }, { quoted: m });
      } catch (sendErr) {
        // Fallback: send URL
        return m.reply(raraWrap("DeepAI Image Editor V2", [
          "EDIT BERHASIL",
          "",
          "Prompt: " + prompt,
          "Hasil: " + result.output_url,
          "",
          "Buka link untuk lihat hasil edit.",
        ], "success"));
      }
    } else if (result.output) {
      // Some responses use 'output' instead
      try {
        await conn.sendMessage(m.key.remoteJid, {
          image: { url: result.output },
          caption: raraWrap("DeepAI Image Editor V2", [
            "EDIT BERHASIL",
            "",
            "Prompt: " + prompt,
            "Source: deepai.org",
          ], "success"),
        }, { quoted: m });
      } catch {
        return m.reply(raraWrap("DeepAI Image Editor V2", [
          "EDIT BERHASIL",
          "",
          "Hasil: " + result.output,
        ], "success"));
      }
    } else {
      await m.react("🐣");
      return m.reply(raraWrap("DeepAI Image Editor V2", [
        "Response tidak dikenali.",
        "Prompt: " + prompt,
        "Response: " + JSON.stringify(result).substring(0, 500),
      ], "warn"));
    }
  } catch (e) {
    await m.react("❌");
    console.error("[DeepAI Image Editor V2]", e);
    m.reply(raraWrap("DeepAI Image Editor V2", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. DeepAI sedang maintenance",
      "2. IP diblokir sementara (coba lagi nanti)",
      "3. Gambar terlalu besar (max ~10MB)",
      "4. Prompt tidak valid",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
