import fs from "fs";
import path from "path";
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "nutrisi",
  alias: ["nutrition", "kalori", "calorie", "cekcalori"],
  category: "tools",
  desc: "Analisis kalori & gizi makanan dari foto dengan AI Vision",
  usage: ".nutrisi (kirim/reply foto makanan)",
  example: ".nutrisi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

// ─── Pilih API Vision yang available ───
function getVisionConfig(botConfig) {
  // Priority 1: aiHelp (OpenAI format)
  const aiHelp = botConfig.aiHelp || {};
  if (aiHelp.apiKey) {
    return {
      type: "openai",
      apiKey: aiHelp.apiKey,
      endpoint: aiHelp.apiEndpoint || aiHelp.openaiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
      model: aiHelp.openaiModel || aiHelp.model || "gpt-4o-mini",
    };
  }
  if (aiHelp.openaiApiKey) {
    return {
      type: "openai",
      apiKey: aiHelp.openaiApiKey,
      endpoint: aiHelp.openaiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions",
      model: aiHelp.openaiModel || "gpt-4o-mini",
    };
  }

  // Priority 2: Google Gemini (key dari APIkey.google)
  const googleKey = botConfig.APIkey?.google || "";
  if (googleKey) {
    return {
      type: "gemini",
      apiKey: googleKey,
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      model: "gemini-2.0-flash",
    };
  }

  return null;
}

// ─── Call OpenAI-format Vision API ───
async function callOpenAIVision(apiKey, endpoint, model, base64Image, prompt) {
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  const response = await axios.post(
    endpoint,
    {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1200,
      temperature: 0.4,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content || "";
}

// ─── Call Google Gemini Vision API ───
async function callGeminiVision(apiKey, endpoint, model, base64Image, prompt) {
  const url = `${endpoint}/${model}:generateContent?key=${apiKey}`;

  const response = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "";
}

// ─── Nutrition analysis prompt ───
const NUTRITION_PROMPT = `Kamu adalah ahli gizi dan nutrisi profesional. Analisis foto makanan/minuman ini dan berikan estimasi nutrisi dalam format BERIKUT INI persis (jangan ubah format):

🍽️ NAMA MAKANAN
[Nama makanan yang terdeteksi, singkat]

📊 ESTIMASI NUTRISI (per porsi)
❏ Kalori: [angka] kkal
❏ Protein: [angka] gram
❏ Karbohidrat: [angka] gram
❏ Lemak: [angka] gram
❏ Serat: [angka] gram
❏ Natrium: [angka] mg

⚖️ TINGKAT KESEHATAN
[Tulis: Sehat / Cukup Sehat / Kurang Sehat / Tidak Sehat]

💡 TIPS KESEHATAN
[Tips singkat 1-2 kalimat tentang makanan ini, manfaat atau hal yang perlu diperhatikan]

Catatan: Estimasi berdasarkan visual. Hasil bisa berbeda tergantung porsi asli dan cara masak. Jika bukan makanan, tulis "Bukan makanan/minuman".`;

// ─── Handler ───
async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";

  // Cek media
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  if (!isImage) {
    const text = claraWrap("Nutrisi Scanner", [
      `Kirim atau reply foto makanan dengan caption:`,
      ``,
      `*${prefix}nutrisi*`,
      ``,
      `Bot akan menganalisis:`,
      `❏ Kalori & gizi (protein, karbohidrat, lemak)`,
      `❏ Tingkat kesehatan makanan`,
      `❏ Tips kesehatan singkat`,
    ].join("\n"));
    await sendReplyWithNav(sock, m, text, "nutrisi");
    return;
  }

  // Cek API
  const visionCfg = getVisionConfig(botConfig);
  if (!visionCfg) {
    await m.reply(claraWrap("Nutrisi Scanner", [
      `API Vision belum dikonfigurasi.`,
      `Set salah satu di config.js:`,
      `❏ aiHelp.apiKey (OpenAI format)`,
      `❏ APIkey.google (Gemini)`,
    ].join("\n")));
    return;
  }

  await m.react("🕐");

  try {
    // Download image
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      await m.reply(claraWrap("Nutrisi Scanner", "Gagal mengunduh foto. Coba kirim ulang."));
      return;
    }

    // Convert to base64 (jpeg)
    const sharp = (await import("sharp")).default;
    const jpegBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const base64 = jpegBuffer.toString("base64");

    // Call Vision API
    let result = "";
    if (visionCfg.type === "openai") {
      result = await callOpenAIVision(
        visionCfg.apiKey,
        visionCfg.endpoint,
        visionCfg.model,
        base64,
        NUTRITION_PROMPT
      );
    } else if (visionCfg.type === "gemini") {
      result = await callGeminiVision(
        visionCfg.apiKey,
        visionCfg.endpoint,
        visionCfg.model,
        base64,
        NUTRITION_PROMPT
      );
    }

    if (!result || result.trim() === "") {
      await m.reply(claraWrap("Nutrisi Scanner", "AI tidak dapat menganalisis foto ini. Coba foto lain dengan pencahayaan lebih jelas."));
      return;
    }

    // Send result
    await m.reply(claraWrap("Nutrisi Scanner", result.trim()));
    await m.react("✅");
  } catch (err) {
    console.log("[Nutrisi] Error:", err.message);
    await m.reply(claraWrap("Nutrisi Scanner", [
      `Terjadi error saat menganalisis.`,
      `Detail: ${err.message?.slice(0, 100) || "Unknown error"}`,
    ].join("\n")));
  }
}

export default { config: pluginConfig, handler };
