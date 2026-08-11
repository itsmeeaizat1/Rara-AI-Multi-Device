// ═══════════════════════════════════════════════
// Nova AI Grup - Auto nimbrung handler
// Dipanggil dari src/handler.js untuk setiap pesan grup
// ═══════════════════════════════════════════════
import { getDatabase } from "./nova-database.js";
import { callAI } from "./nova-ai-service.js";
import config from "../../config.js";

// Cooldown per group (30 detik antar respon otomatis)
const COOLDOWN_MS = 30000;
const groupCooldowns = new Map();

// Format definitions (sync dengan aigrup.js)
const TIO_FORMATS = {
  openai: {
    label: "OpenAI",
    emoji: "🟢",
    apiKeyField: "openaiApiKey",
    modelField: "openaiModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    providerKey: "tio_openai",
  },
  gemini: {
    label: "Gemini",
    emoji: "🔵",
    apiKeyField: "geminiApiKey",
    modelField: "geminiModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: null, // dynamic: /v1beta/models/{model}:generateContent
    providerKey: "tio_gemini",
  },
  anthropic: {
    label: "Anthropic",
    emoji: "🟣",
    apiKeyField: "anthropicApiKey",
    modelField: "anthropicModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: "https://ai.tioo.eu.org/v1/messages",
    providerKey: "tio_anthropic",
  },
};

function shouldRespondToMessage(m, probability) {
  // Selalu respon kalau di-reply (reply ke bot)
  if (m.quoted && m.quoted.fromMe) return true;
  // Selalu respon kalau di-tag/mention
  if (m.mentionedJid && m.mentionedJid.length > 0) return true;
  // Respon kalau ada tanda tanya (pertanyaan)
  const text = (m.text || "").toLowerCase();
  if (text.includes("?")) {
    return Math.random() < Math.min((probability / 100) * 1.5, 1);
  }
  // Random probability
  return Math.random() < (probability / 100);
}

export async function handleAiGrup(m, sock, botNumber) {
  try {
    const db = getDatabase();
    if (!db?.db?.data?.aigrup) return false;
    const aigrup = db.db.data.aigrup;
    if (!aigrup.enabled) return false;

    // Cooldown per grup
    const lastTime = groupCooldowns.get(m.chat);
    if (lastTime && Date.now() - lastTime < COOLDOWN_MS) return false;

    // Cek probability
    const shouldRespond = shouldRespondToMessage(m, aigrup.probability || 20);
    if (!shouldRespond) return false;

    // Ambil data
    const senderName = m.pushName || m.senderName || "seseorang";
    const userMessage = m.text || "";
    if (!userMessage || userMessage.length < 2) return false;

    // ═══ Resolve format & model dari database ═══
    const fmtKey = aigrup.format || "openai";
    const fmt = TIO_FORMATS[fmtKey] || TIO_FORMATS.openai;
    const model = aigrup.model || fmt.defaultModel;

    // ═══ Resolve API key ═══
    const aiHelp = config.aiHelp || {};
    const formatKey = aiHelp[fmt.apiKeyField] || "";
    const fallbackKey = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    const apiKey = formatKey || fallbackKey;
    if (!apiKey) return false;

    // ═══ Set endpoint (Gemini dynamic per model) ═══
    const apiEndpoint = fmtKey === "gemini"
      ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
      : fmt.endpoint;

    // ═══ System prompt ═══
    const systemPrompt = aiHelp.aigrupSystemPrompt ||
      `Kamu adalah teman dalam grup WhatsApp. Namamu Nova. ` +
      `Kamu sedang ikut nimbrung dalam percakapan grup. ` +
      `Jawab santai, singkat, dan natural seperti chat biasa. ` +
      `Jangan jawab terlalu panjang (maksimal 2-3 kalimat). ` +
      `Pakai bahasa gaul/sehari-hari. ` +
      `Yang ngomong bernama: ${senderName}. ` +
      `Boleh pakai emoji secukupnya. Jangan kaku. ` +
      `Jika pesan tidak perlu respon, balas dengan sangat singkat atau abaikan. ` +
      `JANGAN mengaku sebagai AI/bot. Kamu teman biasa.`;

    // Build messages
    const messages = [];
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: `${senderName}: ${userMessage}` });

    // Typing indicator
    await sock.sendPresenceUpdate("composing", m.chat);

    // Natural delay
    const delay = Math.min(userMessage.length * 15, 1500);
    await new Promise((r) => setTimeout(r, delay));

    // Call AI dengan format yang dipilih
    const reply = await callAI({
      providerKey: fmt.providerKey,
      model: model,
      messages: messages,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.8,
      maxTokens: 300,
    });

    if (!reply || reply.length < 2) return false;

    // Set cooldown
    groupCooldowns.set(m.chat, Date.now());

    // Kirim respon
    await sock.sendPresenceUpdate("paused", m.chat);
    await m.reply(reply);
    return true;
  } catch (error) {
    console.error("[aigrup-handler]", error.message);
    return false;
  }
}

export function isAiGrupEnabled() {
  const db = getDatabase();
  if (!db?.db?.data?.aigrup) return false;
  return db.db.data.aigrup.enabled || false;
}
