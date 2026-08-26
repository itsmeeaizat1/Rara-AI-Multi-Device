// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/deepseekv4flashxemoz.js
 * Command .deepseekv4flashxemoz — DeepSeek V4 Flash (API xemoz)
 * Beda dari .deepseek (V4 scraper lama) dan .deepseekv2xemoz (v3.2 thinking)
 * API: https://api-xemoz-official.my.id/api/ai/deepseek-v4-flash.php
 *
 * Params: pesan, session (id percakapan), reset (opsional, value apa saja = reset)
 * Response: result.answer (jawaban), result.reasoning (proses berpikir), result.conversation_id
 */

const pluginConfig = {
  name: "deepseekv4flashxemoz",
  alias: ["deepseekv4flashxemoz"],
  category: "ai",
  description: "DeepSeek V4 Flash via API xemoz (session-based, dengan reasoning)",
  usage: ".deepseekv4flashxemoz <pertanyaan>\n.deepseekv4flashxemoz reset — Reset sesi percakapan",
  example: ".deepseekv4flashxemoz halo siapa kamu?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/deepseek-v4-flash.php";
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

function toSessionId(rawKey) {
  return String(rawKey).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || "novauser";
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function callDeepSeekV4Flash(pesan, session, reset) {
  const params = new URLSearchParams({ pesan, session });
  if (reset) params.set("reset", "true");

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return {
    answer: data?.result?.answer || "",
    reasoning: data?.result?.reasoning || "",
    conversationId: data?.result?.conversation_id || "",
  };
}

async function callWithRetry(pesan, session, reset) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callDeepSeekV4Flash(pesan, session, reset);
      if (reset) return result;
      if (result.answer && result.answer.trim()) return result;
      lastError = new Error("AI sedang memproses, coba lagi...");
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
  }

  throw lastError || new Error("Response AI kosong setelah beberapa percobaan.");
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const sessionId = toSessionId(key);

  if (!text) {
    const help = `Kirim pertanyaan setelah command.\nContoh: .deepseekv4flashxemoz halo siapa kamu?\n\n.deepseekv4flashxemoz reset — Reset sesi percakapan`;
    return m.reply( claraWrap("DeepSeek V4 Flash", help));
  }

  if (text.toLowerCase() === "reset") {
    try {
      await callDeepSeekV4Flash("reset", sessionId, true);
    } catch (e) { console.error('[deepseekv4flashxemoz.js]:', e.message); }
    return m.reply(claraWrap("DeepSeek V4 Flash", "Sesi percakapan direset. Kirim pesan baru untuk memulai."));
  }

  await m.react("🕒");

  try {
    const result = await callWithRetry(text, sessionId, false);

    if (!result.answer || !result.answer.trim()) {
      await m.react("🐣");
      return m.reply(claraWrap("DeepSeek V4 Flash", "AI sedang sibuk, coba kirim ulang pertanyaan kamu."));
    }

    await m.react("🐣");
    return m.reply(claraWrap("DeepSeek V4 Flash", result.answer));
  } catch (error) {
    await m.react("🐣");
    return m.reply(claraWrap("DeepSeek V4 Flash Error", error.message || "Gagal menghubungi AI."));
  }
}

export { pluginConfig as config, handler };
