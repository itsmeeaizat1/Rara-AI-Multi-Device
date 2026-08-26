// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-fun-ai.js
 * Helper untuk fitur "tanya" (mengapa, apakah, akankah, dll).
 * Coba jawab pakai AI dulu — kalau API down / no key / error,
 * fallback ke jawaban template random yang sudah ada.
 *
 * Cara pakai di plugin:
 *
 * import { askFunAI } from "../../src/lib/nova-fun-ai.js";
 *
 * const result = await askFunAI({
 *   botConfig,          // dari handler params
 *   question: text,      // pertanyaan user
 *   persona: "mengapa",  // tipe persona (lihat PERSONAS)
 *   fallbackAnswers: [...], // array jawaban random lama
 * });
 *
 * if (result.fromAI) { ... } else { ... pakai result.text }
 */

import { callAI } from "./nova-ai-service.js";

// Persona system prompt per tipe pertanyaan
const PERSONAS = {
  mengapa: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "mengapa" dengan jawaban singkat (1-3 kalimat), santai, kadang lucu, tapi tetap masuk akal. Jawab dalam bahasa Indonesia.`,

  apakah: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "apakah" dengan jawaban ya/tidak/iya, kadang dengan penjelasan singkat (maks 2 kalimat). Santai dan kadang lucu. Jawab dalam bahasa Indonesia.`,

  akankah: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "akankah" dengan jawaban seperti ramalan — kadang iya, kadang tidak, kadang mungkin, dengan sedikit drama/tebak-tebakan. Maks 2 kalimat. Jawab dalam bahasa Indonesia.`,

  bisakah: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "bisakah" dengan jawaban singkat (1-2 kalimat), kadang mendorong, kadang realistis, kadang lucu. Jawab dalam bahasa Indonesia.`,

  bagaimana: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "bagaimana" dengan jawaban singkat (1-3 kalimat), santai, dan kadang memberi saran simple. Jawab dalam bahasa Indonesia.`,

  kapan: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "kapan" dengan jawaban seperti ramalan waktu — kadang spesifik ("besar pagi", "bulan depan"), kadang tidak terduga. Maks 2 kalimat. Jawab dalam bahasa Indonesia.`,

  dimana: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "dimana" dengan jawaban singkat (1-2 kalimat), kadang realistis, kadang absurd dan lucu. Jawab dalam bahasa Indonesia.`,

  berapa: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "berapa" dengan jawaban singkat (1-2 kalimat), kadang dengan angka random yang lucu, kadang realistis. Jawab dalam bahasa Indonesia.`,

  siapa: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "siapa" dengan jawaban singkat (1-2 kalimat), kadang menyebut nama random, kadang menyebut orang di sekitar, lucu. Jawab dalam bahasa Indonesia.`,

  coba: `Kamu adalah bot WhatsApp yang memberi saran "coba" untuk masalah user — singkat (1-2 kalimat), praktis, kadang lucu. Jawab dalam bahasa Indonesia.`,

  haruskah: `Kamu adalah bot WhatsApp yang menjawab pertanyaan "haruskah" dengan jawaban singkat (1-2 kalimat) — ya/tidak/terserah, dengan alasan singkat yang kadang lucu. Jawab dalam bahasa Indonesia.`,

  kerang: `Kamu adalah kerang ajaib (magic conch shell). Jawab SANGAT singkat (1 kata - 1 kalimat), misterius, kadang bijak, kadang absurd. Seperti SpongeBob kerang ajaib. Jawab dalam bahasa Indonesia.`,

  default: `Kamu adalah bot WhatsApp WhatsApp yang menjawab pertanyaan user dengan jawaban singkat (1-2 kalimat), santai, kadang lucu. Jawab dalam bahasa Indonesia.`,
};

/**
 * Coba jawab pertanyaan pakai AI, fallback ke template kalau gagal.
 *
 * @param {object} opts
 * @param {object} opts.botConfig - botConfig dari handler
 * @param {string} opts.question - Pertanyaan user
 * @param {string} opts.persona - Tipe persona (mengapa, apakah, dll)
 * @param {Array<string>} opts.fallbackAnswers - Array jawaban random lama
 * @returns {Promise<{text: string, fromAI: boolean}>}
 */
async function askFunAI({ botConfig, question, persona = "default", fallbackAnswers = [] }) {
  // Coba AI dulu
  try {
    const aiConfig = botConfig?.aiHelp || {};
    const apiKey = aiConfig.openaiApiKey || aiConfig.apiKey || "";

    // Kalau gak ada API key, skip AI, langsung fallback
    if (!apiKey) {
      throw new Error("No API key");
    }

    const systemPrompt = PERSONAS[persona] || PERSONAS.default;
    const apiEndpoint = aiConfig.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions";
    const model = aiConfig.openaiModel || "kilo-auto/free";

    const reply = await callAI({
      providerKey: "openai",
      model,
      messages: [{ role: "user", content: question }],
      systemPrompt,
      apiKey,
      apiEndpoint,
      maxTokens: 150,
      temperature: 0.9,
      senderJid: botConfig?.__senderJid || "",
    });

    if (reply && reply.trim().length > 0) {
      return { text: reply.trim(), fromAI: true };
    }

    throw new Error("Empty AI response");
  } catch (e) {
    // AI gagal — fallback ke template random
    console.log(`[nova-fun-ai] AI gagal (${persona}), fallback ke template: ${e.message}`);
    if (fallbackAnswers.length > 0) {
      const answer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
      return { text: answer, fromAI: false };
    }
    return { text: "Hmm, aku belum bisa jawab itu sekarang.", fromAI: false };
  }
}

export { askFunAI, PERSONAS };

/**
 * Cek Fun AI — generate deskripsi lucu untuk fitur "cek" (cekganteng, cekcantik, dll).
 * Coba AI dulu, fallback ke deskripsi statis yang sudah ada.
 *
 * @param {object} opts
 * @param {object} opts.botConfig
 * @param {string} opts.cekType - Jenis cek (ganteng, cantik, bucin, dll)
 * @param {number} opts.percent - Persentase random
 * @param {string} opts.fallbackDesc - Deskripsi statis dari if/else
 * @returns {Promise<{text: string, fromAI: boolean}>}
 */
async function cekFunAI({ botConfig, cekType, percent, fallbackDesc = "" }) {
  try {
    const aiConfig = botConfig?.aiHelp || {};
    const apiKey = aiConfig.openaiApiKey || aiConfig.apiKey || "";

    if (!apiKey) throw new Error("No API key");

    const apiEndpoint = aiConfig.apiEndpoint || "https://ai.tioo.eu.org/v1/chat/completions";
    const model = aiConfig.openaiModel || "kilo-auto/free";

    const prompt = `Seseorang baru saja dicek "${cekType}" dan dapet skor ${percent}%. Kasih komentar lucu/santai 1 kalimat (maks 15 kata) tentang skor itu. Pakai emoji secukupnya. Jawab langsung tanpa pembuka.`;

    const reply = await callAI({
      providerKey: "openai",
      model,
      messages: [{ role: "user", content: prompt }],
      systemPrompt: "Kamu adalah bot WhatsApp yang memberi komentar lucu dan singkat. Jawab 1 kalimat saja dalam bahasa Indonesia.",
      apiKey,
      apiEndpoint,
      maxTokens: 80,
      temperature: 0.9,
      senderJid: botConfig?.__senderJid || "",
    });

    if (reply && reply.trim().length > 0) {
      return { text: reply.trim(), fromAI: true };
    }
    throw new Error("Empty response");
  } catch (e) {
    console.log(`[nova-fun-ai] cek AI gagal (${cekType}), fallback: ${e.message}`);
    return { text: fallbackDesc, fromAI: false };
  }
}

export { cekFunAI };
