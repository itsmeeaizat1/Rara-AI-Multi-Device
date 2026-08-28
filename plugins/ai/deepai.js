// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/deepai.js
 * Command .deepai — AI chat via DeepAI (API xemoz)
 * Support session-based conversation memory
 * API: https://api-xemoz-official.my.id/api/ai/deepai-chat.php
 */

const pluginConfig = {
  name: "deepai",
  alias: ["deepai"],
  category: "ai",
  description: "AI Chat powered by DeepAI (via API xemoz)",
  usage: ".deepai <pesan>\n.deepai reset — Reset sesi percakapan",
  example: ".deepai halo, siapa kamu?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/deepai-chat.php";

// Session storage per user
const sessions = new Map();

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

async function callDeepAI(message, sessionUuid) {
  const params = new URLSearchParams({ message });
  if (sessionUuid) params.set("session_uuid", sessionUuid);

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok || !data?.status) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return {
    response: data?.data?.response || "",
    sessionUuid: data?.data?.session_uuid || "",
  };
}

async function handler(m, { sock }) {
  const text = m.text || "";
  const args = m.args || [];
  const input = args.join(" ").trim();

  if (!input) {
    const help = `Kirim pesan setelah command.\n💡 *Contoh:* .deepai halo, siapa kamu?\n\n.deepai reset — Reset sesi percakapan`;
    return m.reply( claraWrap("DeepAI Chat", help));
  }

  // Reset session
  if (input.toLowerCase() === "reset") {
    const key = sessionKey(m);
    if (sessions.has(key)) {
      sessions.delete(key);
      return m.reply(claraWrap("DeepAI Chat", "Sesi percakapan direset. Kirim pesan baru untuk memulai."));
    }
    return m.reply(claraWrap("DeepAI Chat", "Tidak ada sesi aktif untuk direset."));
  }

  await m.react("🕒");

  try {
    const key = sessionKey(m);
    const sessionUuid = sessions.get(key) || "";
    const result = await callDeepAI(input, sessionUuid);

    if (result.sessionUuid) {
      sessions.set(key, result.sessionUuid);
    }

    await m.react("🐣");
    return m.reply(claraWrap("DeepAI", result.response || "Tidak ada response."));
  } catch (error) {
    await m.react("🐣");
    return m.reply(claraWrap("DeepAI Error", error.message || "Gagal hubungin AI nih"));
  }
}

export { pluginConfig as config, handler };
