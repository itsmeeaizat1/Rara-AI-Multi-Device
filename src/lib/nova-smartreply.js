// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./nova-database.js";
import config from "../../config.js";

/**
 * Smart Reply Event Handler
 * Hook ke messages non-command di grup, cek keyword match,
 * AI generate jawaban otomatis berdasarkan context FAQ
 */

const COOLDOWN_MS = 5000;
const lastReplyTime = new Map();

function isSmartReplyEnabled(m, sock) {
  if (!m.isGroup) return false;
  if (m.fromMe) return false;
  if (m.isNewsletter) return false;

  const db = getDatabase();
  const groupData = db.getGroup(m.chat) || {};
  const smartReply = groupData.smartReply;

  if (!smartReply || !smartReply.enabled) return false;
  if (!smartReply.topics || smartReply.topics.length === 0) return false;

  // Skip command messages
  const body = (m.body || "").trim();
  if (body.startsWith(".") || body.startsWith("!") || body.startsWith("/") || body.startsWith("#")) {
    return false;
  }

  // Skip if bot mentioned only (let command handle it)
  if (body.length < 3) return false;

  return true;
}

function checkKeywordMatch(message, topics) {
  const lower = message.toLowerCase();
  return topics.some((t) => {
    const kw = t.keyword.toLowerCase();
    // Match jika keyword ada di pesan (partial match)
    return lower.includes(kw);
  });
}

async function handleSmartReply(m, sock) {
  const db = getDatabase();
  const groupData = db.getGroup(m.chat) || {};
  const smartReply = groupData.smartReply;
  const topics = smartReply.topics;

  const body = (m.body || "").trim();
  if (!checkKeywordMatch(body, topics)) return false;

  // Cooldown check per chat
  const now = Date.now();
  const lastTime = lastReplyTime.get(m.chat) || 0;
  if (now - lastTime < COOLDOWN_MS) return false;
  lastReplyTime.set(m.chat, now);

  const provider = smartReply.provider || "puter";
  const aiConfig = config.aiHelp || {};

  // Build context
  const contextLines = topics.map((t) => `- ${t.keyword}: ${t.context}`).join("\n");
  const matchedTopics = topics.filter((t) =>
    body.toLowerCase().includes(t.keyword.toLowerCase())
  );

  const matchedContext = matchedTopics
    .map((t) => `${t.keyword}: ${t.context}`)
    .join("\n");

  const systemPrompt = `Kamu adalah asisten otomatis untuk grup WhatsApp. Jawab pertanyaan user berdasarkan konteks yang diberikan. Jawab SINGKAT (maksimal 3 kalimat), ramah, dan to the point. Jika pertanyaan tidak relevan dengan konteks, jawab "Maaf, saya belum punya info tentang itu." Jangan mengaku sebagai AI/bot.

Konteks FAQ grup:
${contextLines}

Pertanyaan ini berkaitan dengan:
${matchedContext}`;

  let reply = "";

  try {
    if (provider === "tio") {
      const apiKey = String(aiConfig.openaiApiKey || aiConfig.apiKey || "");
      if (apiKey) {
        const response = await fetch("https://ai.tioo.eu.org/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: String(aiConfig.openaiModel || aiConfig.model || "deepseek-v4-flash:free"),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: body },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const data = await response.json();
          reply = data?.choices?.[0]?.message?.content || "";
        }
      }
    }

    // Fallback ke Puter jika tio gagal atau provider = puter
    if (!reply) {
      const response = await fetch(
        "https://api.puter.com/puterai/openai/v1/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: body },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        reply = data?.choices?.[0]?.message?.content || "";
      }
    }
  } catch (err) {
    if (config.dev?.debugLog) console.error("[SmartReply]", err.message);
    return false;
  }

  if (!reply || reply.trim().length === 0) return false;

  try {
    await sock.sendMessage(m.chat, { text: reply }, { quoted: m });
  } catch {
    return false;
  }

  return true;
}

export { isSmartReplyEnabled, handleSmartReply };
