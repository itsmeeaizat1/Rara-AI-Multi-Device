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

// Simbol yang menandakan bot harus respon (tag, reply, atau pertanyaan)
function shouldRespondToMessage(m, probability) {
  // Selalu respon kalau di-tag atau di-reply
  if (m.quoted && m.quoted.fromMe) return true;
  if (m.mentionedJid && m.mentionedJid.length > 0) {
    // Cek apakah bot sendiri yang di-tag
    // (botNumber di-pass dari handler)
    return true;
  }
  // Respon kalau ada tanda tanya (pertanyaan)
  const text = (m.text || "").toLowerCase();
  if (text.includes("?") || text.includes("ngomong") || text.includes("bot")) {
    return Math.random() < (probability / 100) * 1.5; // sedikit lebih tinggi untuk pertanyaan
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

    // Cek apakah grup ini di-enable (atau global ON)
    // Kalau groups kosong tapi enabled=true → semua grup
    const groupEnabled = aigrup.groups[m.chat] || (Object.keys(aigrup.groups).length === 0);
    if (!groupEnabled && aigrup.enabled) {
      // Global ON, semua grup aktif
    } else if (!groupEnabled) {
      return false;
    }

    // Cooldown per grup
    const lastTime = groupCooldowns.get(m.chat);
    if (lastTime && Date.now() - lastTime < COOLDOWN_MS) return false;

    // Cek probability
    const shouldRespond = shouldRespondToMessage(m, aigrup.probability || 20);
    if (!shouldRespond) return false;

    // Set cooldown
    groupCooldowns.set(m.chat, Date.now());

    // Ambil context pesan + nama pengirim
    const senderName = m.pushName || m.senderName || "seseorang";
    const userMessage = m.text || "";

    if (!userMessage || userMessage.length < 2) return false;

    // Build AI request
    const aiHelp = config.aiHelp || {};
    const apiKey = aiHelp.openaiApiKey || aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) return false;

    const model = aiHelp.openaiModel || aiHelp.model || "deepseek-v4-flash:free";
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

    // Ambil history singkat
    const messages = [];
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: `${senderName}: ${userMessage}` });

    // Typing indicator
    await sock.sendPresenceUpdate("composing", m.chat);

    // Delay natural
    const delay = Math.min(userMessage.length * 15, 1500);
    await new Promise((r) => setTimeout(r, delay));

    const reply = await callAI({
      providerKey: "tio_openai",
      model: model,
      messages: messages,
      apiKey: apiKey,
      apiEndpoint: "https://ai.tioo.eu.org/v1/chat/completions",
      temperature: 0.8,
      maxTokens: 300,
    });

    if (!reply || reply.length < 2) return false;

    // Kirim respon (tanpa quote, biar natural)
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
