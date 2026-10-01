// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Gemini Vision — Analisis gambar dengan Google Gemini (gratis, pakai API key)
// Requires: GEMINI_API_KEY di .env atau set via .setkey gemini
// Dapatkan API key gratis: https://aistudio.google.com/apikey

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "../lib/rara-api-keys.js";

/**
 * Analisis gambar dengan Gemini Vision
 * @param {Object} opts
 * @param {Buffer} opts.imageBuffer - Buffer gambar (jpg/png/webp)
 * @param {string} opts.prompt - Pertanyaan/instruksi tentang gambar
 * @param {string} opts.model - Model Gemini (default: gemini-3.6-flash)
 * @returns {Object} { status, text, model }
 */
async function GeminiVision({
  imageBuffer,
  prompt = "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.",
  model = "gemini-3.6-flash",
  instruction = "",
}) {
  try {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      return { status: false, text: "", error: "Image buffer tidak valid" };
    }

    // Get API key
    const apiKey = getApiKey("gemini");
    if (!apiKey) {
      return {
        status: false,
        text: "",
        error: "GEMINI_API_KEY belum di-set. Dapatkan gratis di https://aistudio.google.com/apikey lalu set dengan .setkey gemini <key>",
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Detect MIME type dari buffer
    const mimeTypes = {
      "/9j/": "image/jpeg",
      iVBOR: "image/png",
      UklGR: "image/webp",
      R0lGO: "image/gif",
      Qk2w: "image/bmp",
    };
    const header = imageBuffer.slice(0, 4).toString("base64").substring(0, 4);
    let mimeType = "image/jpeg"; // default
    for (const [sig, mime] of Object.entries(mimeTypes)) {
      if (header.startsWith(sig) || header.includes(sig)) {
        mimeType = mime;
        break;
      }
    }

    // Juga cek magic bytes
    if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) mimeType = "image/jpeg";
    else if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    // Setup model
    const generativeModel = genAI.getGenerativeModel({
      model: model,
      ...(instruction
        ? { systemInstruction: instruction }
        : {}),
    });

    // Build request dengan gambar + teks
    const result = await generativeModel.generateContent([
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return {
        status: false,
        text: "",
        error: "Gemini tidak memberikan respons untuk gambar ini",
      };
    }

    return {
      status: true,
      text: text.trim(),
      model: model,
      mimeType: mimeType,
    };
  } catch (err) {
    console.error("GeminiVision error:", err.message);
    let errorMsg = err.message || "Unknown error";

    // Handle common errors
    if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid")) {
      errorMsg = "API key Gemini tidak valid. Set ulang dengan .setkey gemini <key>";
    } else if (errorMsg.includes("quota") || errorMsg.includes("RATE_LIMIT")) {
      errorMsg = "Kuota Gemini API habis. Coba lagi nanti atau gunakan API key lain.";
    } else if (errorMsg.includes("SAFETY")) {
      errorMsg = "Gambar ditolak oleh filter keamanan Gemini.";
    } else if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      errorMsg = "Model tidak tersedia. Coba gunakan gemini-3.6-flash atau gemini-3.5-flash";
    }

    return {
      status: false,
      text: "",
      error: errorMsg,
    };
  }
}

export { GeminiVision };
