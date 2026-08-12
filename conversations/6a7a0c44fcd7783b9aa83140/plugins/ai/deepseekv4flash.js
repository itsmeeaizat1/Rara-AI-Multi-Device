import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/deepseekv4flash.js
 * Command .deepseekv4flash — DeepSeek V4 Flash (API xemoz)
 * Beda dari .deepseek (V4 scraper lama) dan .deepseekv2 (v3.2 thinking, API xemoz)
 * API: https://api-xemoz-official.my.id/api/ai/deepseek-v4-flash.php
 *
 * Params: pesan, session (id percakapan), reset (opsional, reset sesi)
 * Response: result.answer (jawaban), result.reasoning (proses berpikir), result.conversation_id
 */

const pluginConfig = {
  name: "deepseekv4flash",
  alias: ["dsv4f", "ds4flash", "deepseekflash"],
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

// Session storage per user — pakai sender sebagai session id biar konsisten
const activeSessions = new Set();

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

function toSessionId(rawKey) {
  // API cuma butuh string bebas sebagai session id, pakai hash sederhana dari jid
  return String(rawKey).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || "novauser";
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

  const answer = data?.result?.answer || "";
  if (!answer) throw new Error("Response AI kosong.");

  return {
    answer,
    reasoning: data?.result?.reasoning || "",
    conversationId: data?.result?.conversation_id || "",
  };
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const sessionId = toSessionId(key);

  if (!text) {
    const help = `Kirim pertanyaan setelah command.\nContoh: .deepseekv4flash halo siapa kamu?\n\n.deepseekv4flash reset — Reset sesi percakapan`;
    return sendReplyWithNav(m, sock, claraWrap("DeepSeek V4 Flash", help));
  }

  if (text.toLowerCase() === "reset") {
    activeSessions.delete(key);
    try {
      await callDeepSeekV4Flash("reset session", sessionId, true);
    } catch {}
    return m.reply(claraWrap("DeepSeek V4 Flash", "Sesi percakapan direset."));
  }

  await m.react("🕐");

  try {
    const result = await callDeepSeekV4Flash(text, sessionId, false);
    activeSessions.add(key);
    await m.react("✅");
    return m.reply(claraWrap("DeepSeek V4 Flash", result.answer));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("DeepSeek V4 Flash Error", error.message || "Gagal menghubungi AI."));
  }
}

export { pluginConfig as config, handler };
