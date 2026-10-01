// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/deepseekv4flash.js
 * Command .deepseekv4flash — DeepSeek V4 Flash (API xemoz)
 * Beda dari .deepseek (V4 scraper lama) dan .deepseekv2 (v3.2 thinking, API xemoz)
 * API: https://api-xemoz-official.my.id/api/ai/deepseek-v4-flash.php
 *
 * Params: pesan, session (id percakapan), reset (opsional, value apa saja = reset)
 * Response: result.answer (jawaban), result.reasoning (proses berpikir), result.conversation_id
 */

const pluginConfig = {
  name: "deepseekv4flash",
  alias: ["deepseekv4flash"],
  category: "ai",
  description: "DeepSeek V4 Flash via API xemoz (session-based, dengan reasoning)",
  usage: ".deepseekv4flash <pertanyaan>\n.deepseekv4flash reset — Reset sesi percakapan",
  example: ".deepseekv4flash halo siapa kamu?",
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

      // Reset calls return empty answer — that's expected
      if (reset) return result;

      // Normal calls should have answer — retry if empty
      if (result.answer && result.answer.trim()) {
        return result;
      }

      // Empty answer on normal call — might be temp server issue
      lastError = new Error("AI sedang memproses, coba lagi...");
    } catch (error) {

      lastError = error;
    }

    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
  }

  // If all retries failed but we have a conversation_id, the session is valid
  throw lastError || new Error("AI balas kosong nih, udah dicoba beberapa kali");
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const sessionId = toSessionId(key);

  if (!text) {
    return m.reply(novaGuideV2("deepseekv4flash", {
 kaomoji: "(๑˘ᘿ˂๑)",
 sapaan: "ngobrol sama DeepSeek V4 Flash, inget sesi percakapanmu lho! (≧◡≦) ♡",
      cara: "kirim pertanyaannya setelah command, reset buat hapus sesi",
      contoh: `${m.prefix}deepseekv4flash halo siapa kamu? · ${m.prefix}deepseekv4flash reset`,
      note: "bot inget obrolan sebelumnya per user",
      spec: ["⏱ 5dtk", "💸 gratis"],
    }));
  }

  // Reset session — reset param terima value apa saja
  if (text.toLowerCase() === "reset") {
    try {
    await m.react("🕒");
      await callDeepSeekV4Flash("reset", sessionId, true);
    } catch (e) { console.error('[deepseekv4flash.js]:', e.message); }
    return m.reply(novaWrap("DeepSeek V4 Flash", "Sesi percakapan direset. Kirim pesan baru untuk memulai."));
  }
  try {
    const result = await callWithRetry(text, sessionId, false);

    if (result.answer && result.answer.trim()) {
      return m.reply(novaWrap("DeepSeek V4 Flash", result.answer));
    }
    throw new Error("AI sedang sibuk, coba kirim ulang pertanyaan kamu.");
  } catch (error) {
    return m.reply(novaWrap("DeepSeek V4 Flash Error", error.message || "Gagal hubungin AI nih"));
  }
}

export { pluginConfig as config, handler };
