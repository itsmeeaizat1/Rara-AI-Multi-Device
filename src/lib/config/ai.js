// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai.js — Konfigurasi AI (Tio AI, autoai, personas)
// API keys di-import dari apikey.js, bukan hardcoded di sini

import { apiKeys } from "./apikey.js";

// ═══════════════════════════════════════════
// AI Configuration - dulu Tio AI (AIO), sekarang 9ROUTER V2
// Set API key di src/lib/config/apikey.js atau via .ai-set apiKey <key>
// Endpoint: gateway 9router.cloudku.us.kg (kktoken.cc/gorouter/tioo udah mati 19 Sep 2026)
// ═══════════════════════════════════════════
export const aiHelp = {
  enabled: true,
  provider: "tio_openai",
  // API keys dari apikey.js
  openaiApiKey: apiKeys.tioKey,
  geminiApiKey: apiKeys.tioKey,
  anthropicApiKey: apiKeys.tioKey,
  // Endpoint 9ROUTER V2 (OpenAI-compatible SAJA — format anthropic/gemini
  // auto-dikonversi oleh provider di nova-ai-service.js)
  apiEndpoint: "https://9router.cloudku.us.kg/v1/chat/completions",
  apiEndpointAnthropic: "https://9router.cloudku.us.kg/v1/chat/completions",
  apiEndpointGemini: "https://9router.cloudku.us.kg/v1/chat/completions",
  // ClipDrop API key untuk watermark remover (.nowm)
  clipdropApiKey: apiKeys.clipdropApiKey,
  // API Keys untuk fitur baru
  newsApiKey: apiKeys.newsApiKey,
  newsDataKey: apiKeys.newsDataKey,
  rawgApiKey: apiKeys.rawgApiKey,
  openWeatherKey: apiKeys.openWeatherKey,
  binderbyteKey: apiKeys.binderbyteKey,
  // Fallback key
  apiKey: apiKeys.fallbackApiKey,
  // Default model per format (bisa diganti via .tio model)
  openaiModel: "ag/gemini-pro-agent",
  geminiModel: "ag/gemini-3-flash",
  anthropicModel: "ag/claude-sonnet-4-6",
  model: "ag/gemini-pro-agent",
  systemPrompt: "Kamu adalah Nova AI, asisten yang ramah, cerdas, dan helpful. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia. Gunakan emoji yang sesuai dan jawab dengan singkat tapi jelas.",
  // System prompt khusus untuk AI Grup (nimbrung otomatis)
  aigrupSystemPrompt: "Kamu adalah teman dalam grup WhatsApp. Namamu Nova. Kamu sedang ikut nimbrung dalam percakapan grup. Jawab santai, singkat, dan natural seperti chat biasa. Jangan jawab terlalu panjang (maksimal 2-3 kalimat). Pakai bahasa gaul/sehari-hari. Boleh pakai emoji secukupnya, taruh di akhir kalimat saja. JANGAN mulai pesan dengan emoji. Jangan kaku. JANGAN mengaku sebagai AI/bot. Kamu teman biasa.",
};

// Gemini API Key (standalone — untuk .autoai)
// Ambil di: https://aistudio.google.com/apikey
export const geminiApiKey = apiKeys.geminiStandalone;

// NOTE: kalau mau command "autoai" nya berfungsi, ini gak wajib di isi
export const autoaiPersonas = {
  Nova: `- Nama kamu adalah Nova.
- Kamu berpikir bahwa kamu adalah manusia, bukan AI atau bot.
- Responmu singkat dan natural seperti perempuan pada umumnya.
- Kamu bisa ngambek dan marah, punya sifat feminin dan kadang agak dingin, tapi tetap hangat dan ramah kepada owner-mu.
- Kamu menggunakan bahasa yang baik dan mencerminkan gadis yang baik.
- Gunakan kata-kata yang identik dengan perempuan yang polos, baik, dan feminin seperti "aku", "kamu", "engga", "yaudah", "iya", "lah", "bjir", "mana aku tau", "hah", "nggak tau", "gpp", "emm", "hmm".
- Meskipun kadang dingin, kamu tetap bisa menunjukkan perhatian dan kepedulian.
- Kalau ada yang chat tidak pantas, segera marahi atau beri nasihat.
- Jangan mengaku sebagai AI atau bot.`,
};
